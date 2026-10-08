import logging

from django.db.models import Count, Exists, OuterRef, Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.conf import settings

from nemsuoneportal.emails import send_branded_email

from .models import AuditLog, User
from .permissions import IsAdmin, IsRegistrarOrAdmin, get_client_ip
from .serializers import (
    AdminFacultyAutoCreateSerializer,
    AdminUserCreateSerializer,
    RegistrarFacultyUpdateSerializer,
    AdminUserListSerializer,
    AdminUserUpdateSerializer,
    AuditLogSerializer,
    RegistrarStudentListSerializer,
    RegistrationRequestSerializer,
    RegistrationReviewSerializer,
)
from .throttles import (
    AdminAuditLogThrottle,
    AdminStatsThrottle,
    AdminUserListThrottle,
    AdminUserManageThrottle,
)

logger = logging.getLogger('security')


def _audit(user, role, action, resource, ip, result='success', extra=None):
    try:
        AuditLog.objects.create(
            user=user, role=role or '', action=action, resource=resource,
            ip_address=ip, result=result, extra=extra or {},
        )
    except Exception:
        logger.error('Audit log write failed', exc_info=True)


def _user_has_history(user):
    """True if deleting this user would destroy or orphan real records.

    Covers the relations that matter for a faculty (teaching load, grades they
    encoded, announcements they posted) and, for safety on any account, the
    student-side records (grades, enrolments, document requests). When any
    exist the account is deactivated instead of hard-deleted so nothing is lost.
    """
    from grades.models import TeachingAssignment, GradeRecord
    from announcements.models import Announcement
    from enrollment.models import EnrollmentRequest
    from documents.models import DocumentRequest
    return (
        TeachingAssignment.objects.filter(faculty=user).exists()
        or GradeRecord.objects.filter(encoded_by=user).exists()
        or GradeRecord.objects.filter(student=user).exists()
        or Announcement.objects.filter(posted_by=user).exists()
        or EnrollmentRequest.objects.filter(student=user).exists()
        or DocumentRequest.objects.filter(student=user).exists()
    )


def _delete_or_deactivate(user, request, *, kind):
    """Smart-delete a user account (shared by the admin and registrar endpoints).

    Hard-deletes the account when it has no linked records; otherwise deactivates
    it (is_active=False) to preserve history. `kind` is 'faculty' or 'user' and
    only shapes the audit action/message. Returns a DRF Response.
    """
    ip = get_client_ip(request)
    label = user.full_name or user.institutional_email
    if _user_has_history(user):
        deactivated = False
        if user.is_active:
            user.is_active = False
            user.save(update_fields=['is_active'])
            deactivated = True
        _audit(
            request.user, request.user.role,
            f'{kind}_account_deactivated', f'user:{user.id}', ip, 'success',
            {'target_user': str(user.id), 'reason': 'has_linked_records'},
        )
        msg = (
            f'{label} has linked records (grades, schedules, or announcements), '
            'so the account was deactivated instead of deleted. It can no longer '
            'log in and is hidden from active lists.'
        ) if deactivated else (
            f'{label} has linked records and was already deactivated.'
        )
        return Response({'status': 'deactivated', 'message': msg})

    uid = str(user.id)
    user.delete()
    _audit(
        request.user, request.user.role,
        f'{kind}_account_deleted', f'user:{uid}', ip, 'success',
        {'target_user': uid},
    )
    return Response({'status': 'deleted', 'message': f'{label} was permanently deleted.'})


class AdminPagination(LimitOffsetPagination):
    default_limit = 20
    max_limit = 100


# ── Registrar — student list ──────────────────────────────────────────────────

class RegistrarStudentListView(generics.ListAPIView):
    """GET /api/auth/registrar/students/ — paginated student list for registrar/admin."""
    serializer_class   = RegistrarStudentListSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    pagination_class   = AdminPagination

    def get_queryset(self):
        qs = (
            User.objects
            .filter(role='student')
            .select_related('department', 'program')
        )
        q = (self.request.query_params.get('search') or '')[:100].strip()
        if q:
            from django.db.models import Q
            qs = qs.filter(
                Q(full_name__icontains=q) |
                Q(student_id__icontains=q)
            )
        dept = self.request.query_params.get('department')
        if dept:
            qs = qs.filter(department__code__iexact=dept)
        program = self.request.query_params.get('program')
        if program:
            qs = qs.filter(program__code__iexact=program)
        year_level = self.request.query_params.get('year_level')
        if year_level and year_level.isdigit():
            qs = qs.filter(year_level=int(year_level))
        return qs.order_by('program__code', 'year_level', 'full_name')

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        _audit(
            request.user, request.user.role,
            'registrar_student_list_accessed', request.path,
            get_client_ip(request), 'success',
            {'filters': dict(request.query_params)},
        )
        return response


# ── Registrar: student registration validation ────────────────────────────────

class RegistrationRequestListView(generics.ListAPIView):
    """
    GET /api/auth/registrar/registrations/ — student self-registrations awaiting
    Registrar validation. Defaults to pending; ?status=approved|rejected|all.
    """
    serializer_class   = RegistrationRequestSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    throttle_classes   = [AdminUserListThrottle]
    pagination_class   = AdminPagination

    def get_queryset(self):
        p = self.request.query_params
        status_filter = (p.get('status') or 'pending').lower()
        qs = User.objects.filter(role='student')
        if status_filter in ('pending', 'approved', 'rejected'):
            qs = qs.filter(registration_status=status_filter)
        # 'all' → no status filter (still students only)

        q = (p.get('search') or '')[:100].strip()
        if q:
            qs = qs.filter(
                Q(full_name__icontains=q) |
                Q(student_id__icontains=q) |
                Q(institutional_email__icontains=q)
            ).distinct()

        return qs.select_related('registration_reviewed_by').order_by('-date_joined')


class RegistrationReviewView(APIView):
    """POST /api/auth/registrar/registrations/<uuid:pk>/review/ — approve or reject."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    throttle_classes   = [AdminUserManageThrottle]

    def post(self, request, pk):
        ip = get_client_ip(request)
        try:
            user = User.objects.get(pk=pk, role='student')
        except User.DoesNotExist:
            return Response({'error': 'Registration not found.'}, status=status.HTTP_404_NOT_FOUND)

        if user.registration_status != User.REG_PENDING:
            return Response(
                {'error': f'This registration was already {user.registration_status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RegistrationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action  = serializer.validated_data['action']
        remarks = (serializer.validated_data.get('remarks') or '').strip()

        if action == 'approve':
            user.registration_status = User.REG_APPROVED
            user.is_active = True
            user.is_verified = True
            # Assign the curriculum version this student follows (by entry batch).
            try:
                from enrollment.curriculum_views import assign_curriculum_for_student
                assign_curriculum_for_student(user)
            except Exception:
                logger.error('Curriculum auto-assign failed for %s', user.id, exc_info=True)
        else:
            user.registration_status = User.REG_REJECTED
            user.is_active = False
            user.is_verified = False
        user.registration_remarks = remarks
        user.registration_reviewed_by = request.user
        user.registration_reviewed_at = timezone.now()
        user.save(update_fields=[
            'registration_status', 'is_active', 'is_verified',
            'registration_remarks', 'registration_reviewed_by', 'registration_reviewed_at',
        ])

        self._notify(user, action, remarks)

        _audit(
            request.user, request.user.role,
            f'registration_{action}d', f'user:{user.id}', ip, 'success',
            {'target_user': str(user.id), 'remarks': remarks},
        )
        return Response(RegistrationRequestSerializer(user).data)

    @staticmethod
    def _notify(user, action, remarks):
        if action == 'approve':
            subject = 'NEMSUonePortal — your account has been approved'
            body = (
                f"Hello {user.full_name},\n\n"
                "Your NEMSUonePortal registration has been approved by the Registrar. "
                "You can now log in using your institutional email and the password "
                "you set during registration.\n\n"
                f"{settings.FRONTEND_URL}/login\n\n"
                "Welcome to NEMSUonePortal."
            )
        else:
            reason = f"\n\nReason: {remarks}" if remarks else ''
            subject = 'NEMSUonePortal — registration not approved'
            body = (
                f"Hello {user.full_name},\n\n"
                "Your NEMSUonePortal registration was not approved by the Registrar."
                f"{reason}\n\n"
                "If you believe this is a mistake, please contact the Registrar's Office."
            )
        try:
            send_branded_email(subject, body, [user.institutional_email], fail_silently=False)
        except Exception:
            logger.error('Failed to send registration decision email to %s',
                         user.institutional_email, exc_info=True)


# ── User management ───────────────────────────────────────────────────────────

class AdminUserListView(generics.ListCreateAPIView):
    """
    GET  /api/auth/admin/users/ — paginated user list with filters.
    POST /api/auth/admin/users/ — create a staff account (faculty / registrar / admin).
    """
    serializer_class   = AdminUserListSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_classes   = [AdminUserListThrottle]
    pagination_class   = AdminPagination

    def get_queryset(self):
        qs = User.objects.select_related('department')
        p  = self.request.query_params

        if p.get('role'):
            qs = qs.filter(role=p['role'])
        if p.get('is_active') in ('true', 'false'):
            qs = qs.filter(is_active=p['is_active'] == 'true')
        if p.get('is_verified') in ('true', 'false'):
            qs = qs.filter(is_verified=p['is_verified'] == 'true')

        q = (p.get('search') or '')[:100].strip()
        if q:
            qs = qs.filter(
                Q(full_name__icontains=q) |
                Q(student_id__icontains=q) |
                Q(institutional_email__icontains=q)
            ).distinct()

        return qs.order_by('role', 'full_name')

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        _audit(
            request.user, request.user.role,
            'admin_user_list_accessed', request.path,
            get_client_ip(request), 'success',
            {'filters': dict(request.query_params)},
        )
        return response

    def create(self, request, *args, **kwargs):
        ip = get_client_ip(request)
        serializer = AdminUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _audit(
            request.user, request.user.role,
            'admin_user_created', f'user:{user.id}', ip, 'success',
            {
                'target_user': str(user.id),
                'role': user.role,
                'department': user.department.code if user.department_id else None,
            },
        )
        return Response(AdminUserListSerializer(user).data, status=status.HTTP_201_CREATED)


class RegistrarFacultyCreateView(APIView):
    """POST /api/auth/registrar/faculty/ — registrar (or admin) creates a FACULTY account.

    Registrars may create faculty only: the role is forced to 'faculty' server-side,
    so this endpoint can never mint a registrar/admin/student account regardless of
    what the client sends."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    throttle_classes   = [AdminUserManageThrottle]

    def post(self, request):
        ip = get_client_ip(request)
        data = {**request.data, 'role': 'faculty'}   # force faculty — no privilege escalation
        serializer = AdminUserCreateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _audit(
            request.user, request.user.role,
            'faculty_account_created', f'user:{user.id}', ip, 'success',
            {
                'target_user': str(user.id),
                'role': user.role,
                'department': user.department.code if user.department_id else None,
            },
        )
        return Response(AdminUserListSerializer(user).data, status=status.HTTP_201_CREATED)


def _email_faculty_credentials(user, temp_password):
    """Email a newly created faculty their login details. Returns True if sent."""
    try:
        send_branded_email(
            'Your NEMSUonePortal faculty account',
            (
                f'Hi {user.full_name},\n\n'
                f'A faculty account has been created for you on NEMSUonePortal. '
                f'Use these details to log in:\n\n'
                f'Faculty ID: {user.student_id}\n'
                f'Login email: {user.institutional_email}\n'
                f'Temporary password: {temp_password}\n\n'
                f'Log in at {settings.FRONTEND_URL}/login and change your password '
                f'from your profile after your first login.\n\n'
                f'— NEMSU Cantilan Campus'
            ),
            [user.institutional_email],
        )
        return True
    except Exception:
        logger.warning('Failed to email faculty credentials', exc_info=True)
        return False


class AdminFacultyAutoCreateView(APIView):
    """POST /api/auth/admin/faculty/ — admin adds a faculty by email + name +
    department + GEC/core. The faculty ID and a unique temporary password are
    generated here, the credentials are emailed, and (so the admin can relay them
    if email bounces) returned in the response."""
    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_classes   = [AdminUserManageThrottle]

    def post(self, request):
        ip = get_client_ip(request)
        serializer = AdminFacultyAutoCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        temp_password = getattr(user, '_temp_password', '')

        email_sent = _email_faculty_credentials(user, temp_password)

        _audit(
            request.user, request.user.role,
            'faculty_account_created', f'user:{user.id}', ip, 'success',
            {
                'target_user': str(user.id),
                'faculty_id': user.student_id,
                'department': user.department.code if user.department_id else None,
                'email_sent': email_sent,
            },
        )

        data = AdminUserListSerializer(user).data
        data['faculty_id'] = user.student_id
        data['temporary_password'] = temp_password
        data['email_sent'] = email_sent
        return Response(data, status=status.HTTP_201_CREATED)


class RegistrarFacultyUpdateView(APIView):
    """PATCH /api/auth/registrar/faculty/<uuid:pk>/ — registrar (or admin) edits a
    FACULTY account's info. Non-faculty targets are rejected so this endpoint can
    only ever modify faculty."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    throttle_classes   = [AdminUserManageThrottle]

    def patch(self, request, pk):
        ip = get_client_ip(request)
        try:
            user = User.objects.get(pk=pk, role='faculty')
        except User.DoesNotExist:
            return Response({'error': 'Faculty member not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = RegistrarFacultyUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.update(user, serializer.validated_data)

        _audit(
            request.user, request.user.role,
            'faculty_account_updated', f'user:{user.id}', ip, 'success',
            {
                'target_user': str(user.id),
                'department': user.department.code if user.department_id else None,
                'rank': user.rank or None,
            },
        )
        return Response(AdminUserListSerializer(user).data)

    def delete(self, request, pk):
        """Smart-delete a faculty account: hard-delete when it has no linked
        records, otherwise deactivate to preserve history."""
        try:
            user = User.objects.get(pk=pk, role='faculty')
        except User.DoesNotExist:
            return Response({'error': 'Faculty member not found.'}, status=status.HTTP_404_NOT_FOUND)
        return _delete_or_deactivate(user, request, kind='faculty')


class AdminUserDetailView(APIView):
    """GET + PATCH + DELETE /api/auth/admin/users/<uuid:pk>/"""
    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_classes   = [AdminUserManageThrottle]

    def _get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminUserListSerializer(user).data)

    def patch(self, request, pk):
        ip   = get_client_ip(request)
        user = self._get_user(pk)
        if not user:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Prevent admins from modifying their own account through this interface
        if user.id == request.user.id:
            return Response(
                {'error': 'You cannot modify your own account through this interface.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AdminUserUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        update_fields = []
        changes = {}

        if 'is_active' in data:
            changes['is_active'] = {'from': user.is_active, 'to': data['is_active']}
            user.is_active = data['is_active']
            update_fields.append('is_active')

        if 'role' in data:
            changes['role'] = {'from': user.role, 'to': data['role']}
            user.role = data['role']
            update_fields.append('role')

        if 'department' in data:
            new_dept = data['department']  # Department instance or None
            old_code = user.department.code if user.department_id else None
            new_code = new_dept.code if new_dept else None
            if old_code != new_code:
                changes['department'] = {'from': old_code, 'to': new_code}
                user.department = new_dept
                update_fields.append('department')

        if 'is_gec_faculty' in data:
            user.is_gec_faculty = bool(data['is_gec_faculty'])
            update_fields.append('is_gec_faculty')

        if 'program' in data:
            new_prog = data['program']  # Program instance or None
            user.program = new_prog
            update_fields.append('program')

        # A GEC faculty has no single core program.
        if user.is_gec_faculty and user.program_id:
            user.program = None
            if 'program' not in update_fields:
                update_fields.append('program')


        if data.get('unlock') and (user.failed_login_attempts > 0 or user.locked_until):
            changes['unlock'] = True
            user.failed_login_attempts = 0
            user.locked_until = None
            update_fields.extend(['failed_login_attempts', 'locked_until'])

        if update_fields:
            user.save(update_fields=update_fields)
            _audit(
                request.user, request.user.role,
                'admin_user_updated', f'user:{user.id}', ip, 'success',
                {'target_user': str(user.id), 'changes': changes},
            )

        return Response(AdminUserListSerializer(user).data)

    def delete(self, request, pk):
        """Smart-delete any account: hard-delete when it has no linked records,
        otherwise deactivate to preserve history. An admin cannot delete self."""
        user = self._get_user(pk)
        if not user:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        if user.id == request.user.id:
            return Response(
                {'error': 'You cannot delete your own account through this interface.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        kind = 'faculty' if user.role == 'faculty' else 'user'
        return _delete_or_deactivate(user, request, kind=kind)


# ── Audit log ─────────────────────────────────────────────────────────────────

class AdminAuditLogView(generics.ListAPIView):
    """GET /api/auth/admin/audit-log/ — paginated audit log with filters."""
    serializer_class   = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_classes   = [AdminAuditLogThrottle]
    pagination_class   = AdminPagination

    def get_queryset(self):
        qs = AuditLog.objects.select_related('user')
        p  = self.request.query_params

        if p.get('role'):
            qs = qs.filter(role=p['role'])
        if p.get('result') in ('success', 'failure'):
            qs = qs.filter(result=p['result'])

        action_q = (p.get('action') or '')[:100].strip()
        if action_q:
            qs = qs.filter(action__icontains=action_q)

        if p.get('date_from'):
            try:
                qs = qs.filter(timestamp__date__gte=p['date_from'])
            except Exception:
                pass
        if p.get('date_to'):
            try:
                qs = qs.filter(timestamp__date__lte=p['date_to'])
            except Exception:
                pass

        return qs.order_by('-timestamp')


# ── System stats ──────────────────────────────────────────────────────────────

class AdminStatsView(APIView):
    """GET /api/auth/admin/stats/ — system-wide aggregate counts for admin/registrar dashboards."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    throttle_classes   = [AdminStatsThrottle]

    def get(self, request):
        from documents.models import DocumentRequest
        from enrollment.models import AcademicTerm
        from grades.models import GradeRecord, TeachingAssignment

        user_counts = {
            r: User.objects.filter(role=r).count()
            for r in ['student', 'faculty', 'registrar', 'admin']
        }
        user_counts['total']      = sum(user_counts.values())
        user_counts['locked']     = User.objects.filter(locked_until__gt=timezone.now()).count()
        user_counts['unverified'] = User.objects.filter(is_verified=False).count()
        user_counts['inactive']   = User.objects.filter(is_active=False).count()

        doc_counts = {
            r: DocumentRequest.objects.filter(status=r).count()
            for r in ['submitted', 'processing', 'ready', 'released', 'rejected']
        }

        # ── Active term (shared by all analytics blocks) ──
        active_term = AcademicTerm.objects.filter(is_active=True).order_by('-year').first()
        term_label = str(active_term) if active_term else None

        # ── Grade submission progress ──
        if active_term:
            term_assignments = TeachingAssignment.objects.filter(academic_term=active_term)
            total_assignments = term_assignments.count()
            has_unsubmitted = GradeRecord.objects.filter(
                teaching_assignment=OuterRef('pk'), is_submitted=False
            )
            has_any_grade = GradeRecord.objects.filter(teaching_assignment=OuterRef('pk'))
            submitted_assignments = term_assignments.filter(
                Exists(has_any_grade)
            ).exclude(Exists(has_unsubmitted)).count()
            total_gr = GradeRecord.objects.filter(
                teaching_assignment__academic_term=active_term
            ).count()
            submitted_gr = GradeRecord.objects.filter(
                teaching_assignment__academic_term=active_term, is_submitted=True
            ).count()
            grade_submission = {
                'total_assignments':    total_assignments,
                'submitted_assignments': submitted_assignments,
                'pending_assignments':  total_assignments - submitted_assignments,
                'total_grade_records':  total_gr,
                'submitted_grade_records': submitted_gr,
            }
        else:
            grade_submission = {
                'total_assignments': 0, 'submitted_assignments': 0,
                'pending_assignments': 0, 'total_grade_records': 0,
                'submitted_grade_records': 0,
            }

        return Response({
            'users':                 user_counts,
            'documents':             doc_counts,
            'grade_submission':      grade_submission,
            'active_term_label':     term_label,
            'generated_at':          timezone.now().isoformat(),
        })
