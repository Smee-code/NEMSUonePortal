import logging

from django.db.models import Count, Exists, OuterRef, Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditLog, User
from .permissions import IsAdmin, IsRegistrarOrAdmin, get_client_ip
from .serializers import (
    AdminUserListSerializer,
    AdminUserUpdateSerializer,
    AuditLogSerializer,
    RegistrarStudentListSerializer,
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


# ── User management ───────────────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    """GET /api/auth/admin/users/ — paginated user list with filters."""
    serializer_class   = AdminUserListSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_classes   = [AdminUserListThrottle]
    pagination_class   = AdminPagination

    def get_queryset(self):
        qs = User.objects.all()
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


class AdminUserDetailView(APIView):
    """GET + PATCH /api/auth/admin/users/<uuid:pk>/"""
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
        from enrollment.models import AcademicTerm, Block, EnrollmentRequest, Program
        from grades.models import GradeRecord, TeachingAssignment

        user_counts = {
            r: User.objects.filter(role=r).count()
            for r in ['student', 'faculty', 'registrar', 'admin']
        }
        user_counts['total']      = sum(user_counts.values())
        user_counts['locked']     = User.objects.filter(locked_until__gt=timezone.now()).count()
        user_counts['unverified'] = User.objects.filter(is_verified=False).count()
        user_counts['inactive']   = User.objects.filter(is_active=False).count()

        enrollment_counts = {
            r: EnrollmentRequest.objects.filter(status=r).count()
            for r in ['pending', 'approved', 'rejected']
        }

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

        # ── Enrollment by program ──
        if active_term:
            rows = (
                EnrollmentRequest.objects
                .filter(academic_term=active_term, status='approved', program__isnull=False)
                .values('program__code', 'program__name')
                .annotate(enrolled=Count('id'))
                .order_by('-enrolled')
            )
            enrollment_by_program = [
                {
                    'program_code': r['program__code'],
                    'program_name': r['program__name'],
                    'enrolled':     r['enrolled'],
                }
                for r in rows
            ]
        else:
            enrollment_by_program = []

        # ── Block fill rate ──
        if active_term:
            from collections import defaultdict
            blocks_qs = list(
                Block.objects.filter(academic_term=active_term)
                .select_related('program')
                .annotate(
                    approved_count=Count(
                        'enrollment_requests',
                        filter=Q(enrollment_requests__status='approved')
                    )
                )
            )
            total_blocks = len(blocks_qs)
            if total_blocks > 0:
                full_blocks = sum(
                    1 for b in blocks_qs if b.approved_count >= b.BLOCK_CAPACITY
                )
                avg_fill_pct = round(
                    sum(b.approved_count / b.BLOCK_CAPACITY * 100 for b in blocks_qs) / total_blocks,
                    1,
                )
            else:
                full_blocks = 0
                avg_fill_pct = 0.0

            prog_map = defaultdict(lambda: {'enrolled': 0, 'capacity': 0})
            for b in blocks_qs:
                code = b.program.code if b.program else 'N/A'
                prog_map[code]['enrolled'] += b.approved_count
                prog_map[code]['capacity'] += Block.BLOCK_CAPACITY
            by_program = [
                {'program_code': code, 'enrolled': v['enrolled'], 'capacity': v['capacity']}
                for code, v in sorted(prog_map.items(), key=lambda x: -x[1]['enrolled'])
            ]

            block_fill = {
                'total_blocks': total_blocks,
                'full_blocks':  full_blocks,
                'avg_fill_pct': avg_fill_pct,
                'by_program':   by_program,
            }
        else:
            block_fill = {'total_blocks': 0, 'full_blocks': 0, 'avg_fill_pct': 0.0, 'by_program': []}

        return Response({
            'users':                 user_counts,
            'enrollments':           enrollment_counts,
            'documents':             doc_counts,
            'grade_submission':      grade_submission,
            'enrollment_by_program': enrollment_by_program,
            'block_fill':            block_fill,
            'active_term_label':     term_label,
            'generated_at':          timezone.now().isoformat(),
        })
