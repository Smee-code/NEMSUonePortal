import csv
import io
import logging
import os
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError, transaction
from datetime import timedelta
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models import AuditLog
from authentication.permissions import (
    IsAdmin,
    IsRegistrarOrAdmin,
    IsStudent,
    IsStudentOrRegistrarOrAdmin,
    get_client_ip,
)

from announcements.models import Announcement

from .models import AcademicTerm, Block, CurriculumDocument, Department, EnrollmentRequest, EnrollmentSchedule, EnrollmentSubject, PendingEnrollment, PreEnrollmentDocument, Program, Subject
from .serializers import (
    AcademicTermSerializer,
    AdminSubjectSerializer,
    CurriculumDocumentSerializer,
    DepartmentSerializer,
    EnrollmentRequestSerializer,
    EnrollmentScheduleSerializer,
    EnrollmentSubmitSerializer,
    PendingEnrollmentCreateSerializer,
    PendingEnrollmentListSerializer,
    PendingEnrollmentReviewSerializer,
    PreEnrollmentDocumentSerializer,
    ProgramSerializer,
    RegistrarReviewSerializer,
    StudentOwnEnrollmentSerializer,
    SubjectSerializer,
)
from .terms import current_regular_term_parts, get_current_regular_term
from .throttles import EnrollmentManageThrottle, EnrollmentSubmitThrottle, RegistrarReviewThrottle

logger = logging.getLogger('security')


# ── Public landing-page data ───────────────────────────────────────────────────

class PublicLandingView(APIView):
    """GET /api/enrollment/public/landing/ — no authentication required.
    Returns active-term info, per-student-type enrollment schedules, active
    programs, and the latest three public announcements."""
    permission_classes = [AllowAny]

    def get(self, request):
        term = (
            AcademicTerm.objects.filter(is_active=True, enrollment_open=True).first()
            or AcademicTerm.objects.filter(is_active=True).first()
        )

        schedules = (
            EnrollmentSchedule.objects.filter(term=term)
            if term else EnrollmentSchedule.objects.none()
        )

        announcements = (
            Announcement.objects
            .filter(is_active=True, target_audience='public')
            .order_by('-is_pinned', '-created_at')[:3]
        )

        programs = Program.objects.filter(is_active=True).select_related('department').order_by('name')

        return Response({
            'term': AcademicTermSerializer(term).data if term else None,
            'enrollment_schedules': EnrollmentScheduleSerializer(schedules, many=True).data,
            'programs': ProgramSerializer(programs, many=True).data,
            'announcements': [
                {
                    'id':         str(a.id),
                    'title':      a.title,
                    'body':       a.body,
                    'is_pinned':  a.is_pinned,
                    'created_at': a.created_at.isoformat(),
                }
                for a in announcements
            ],
        })


class PublicPreEnrollView(APIView):
    """POST /api/enrollment/public/pre-enroll/ — no authentication required.
    Accepts a pre-enrollment submission from a freshman or transferee."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PendingEnrollmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        program = None
        if d.get('program_name'):
            program = Program.objects.filter(
                name__icontains=d['program_name'], is_active=True
            ).first()

        pending = PendingEnrollment.objects.create(
            student_type   = d['student_type'],
            first_name     = d['first_name'],
            last_name      = d['last_name'],
            middle_name    = d.get('middle_name', ''),
            suffix         = d.get('suffix', ''),
            email          = d['email'],
            contact_number = d.get('contact_number', ''),
            date_of_birth  = d.get('date_of_birth'),
            sex            = d.get('sex', ''),
            program        = program,
            year_level     = d.get('year_level', 1),
            academic_term  = d.get('term_id'),
        )

        _audit(
            None, '', 'pre_enrollment_submitted',
            request.path, get_client_ip(request), 'success',
            {'reference_number': pending.reference_number, 'email': pending.email},
        )

        return Response(
            {
                'pending_id':       str(pending.id),
                'reference_number': pending.reference_number,
                'message':          'Pre-enrollment submitted successfully.',
            },
            status=status.HTTP_201_CREATED,
        )


# ── Enrollment schedule CRUD (registrar / admin) ───────────────────────────────

class EnrollmentScheduleListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/enrollment/schedules/"""
    serializer_class   = EnrollmentScheduleSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get_queryset(self):
        qs = EnrollmentSchedule.objects.select_related('term')
        term_id = self.request.query_params.get('term')
        if term_id and term_id.isdigit():
            qs = qs.filter(term_id=int(term_id))
        return qs


class EnrollmentScheduleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/enrollment/schedules/<pk>/"""
    serializer_class   = EnrollmentScheduleSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    queryset           = EnrollmentSchedule.objects.select_related('term')
    http_method_names  = ['get', 'patch', 'delete', 'head', 'options']


def _audit(user, role, action, resource, ip, result, extra=None):
    try:
        AuditLog.objects.create(
            user=user, role=role or '', action=action, resource=resource,
            ip_address=ip, result=result, extra=extra or {},
        )
    except Exception:
        logger.error('Audit log write failed', exc_info=True)


# ── Shared ─────────────────────────────────────────────────────────────────────

class AcademicTermListView(generics.ListAPIView):
    """GET /api/enrollment/terms/ — students see enrollment-open terms only; all other authenticated users see all active terms."""
    serializer_class = AcademicTermSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AcademicTerm.objects.filter(is_active=True)
        if self.request.user.role == 'student':
            qs = qs.filter(enrollment_open=True)
        return qs


class SubjectListView(generics.ListAPIView):
    """GET /api/enrollment/subjects/ — students and faculty (for load declaration)."""
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        qs = Subject.objects.filter(is_active=True).select_related('program__department', 'prerequisite')
        program_id = self.request.query_params.get('program')
        if program_id and program_id.isdigit():
            qs = qs.filter(program_id=int(program_id))
        year_level = self.request.query_params.get('year_level')
        if year_level and year_level.isdigit():
            qs = qs.filter(year_level=int(year_level))
        semester = self.request.query_params.get('semester')
        if semester in ('first', 'second', 'summer'):
            qs = qs.filter(semester=semester)
        term_id = self.request.query_params.get('term')
        if term_id and term_id.isdigit():
            try:
                term = AcademicTerm.objects.get(pk=int(term_id), is_active=True)
                qs = qs.filter(semester=term.semester)
            except AcademicTerm.DoesNotExist:
                qs = qs.none()
        if self.request.query_params.get('current_term') in ('1', 'true', 'yes'):
            _, semester = current_regular_term_parts()
            if semester:
                qs = qs.filter(semester=semester)
            else:
                qs = qs.none()
        return qs


class CurrentTermView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        expected_year, expected_semester = current_regular_term_parts()
        term = get_current_regular_term()
        semester_display = dict(AcademicTerm.SEMESTER_CHOICES).get(expected_semester)
        data = {
            'year': expected_year,
            'semester': expected_semester,
            'semester_display': semester_display,
            'label': f'{semester_display} {expected_year}' if expected_year and semester_display else 'No regular term this month',
            'term': AcademicTermSerializer(term).data if term else None,
        }
        return Response(data)


class DepartmentListView(generics.ListAPIView):
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    queryset = Department.objects.filter(is_active=True)


class ProgramListView(generics.ListAPIView):
    serializer_class = ProgramSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Program.objects.filter(is_active=True).select_related('department')
        dept_id = self.request.query_params.get('department')
        if dept_id and dept_id.isdigit():
            qs = qs.filter(department_id=int(dept_id))
        return qs


# ── Block assignment ───────────────────────────────────────────────────────────

def _assign_block(enrollment):
    """Assign the student to a block with available slots, creating a new one if needed.
    Must be called inside transaction.atomic()."""
    blocks = list(
        Block.objects
        .select_for_update()
        .filter(
            program=enrollment.program,
            academic_term=enrollment.academic_term,
            year_level=enrollment.year_level,
        )
        .order_by('name')
    )

    for block in blocks:
        if block.available_slots > 0:
            enrollment.block = block
            enrollment.save(update_fields=['block'])
            return

    count = len(blocks)
    block_name = f"Block {chr(65 + count)}" if count < 26 else f"Block {count + 1}"
    block = Block.objects.create(
        program=enrollment.program,
        academic_term=enrollment.academic_term,
        year_level=enrollment.year_level,
        name=block_name,
    )
    enrollment.block = block
    enrollment.save(update_fields=['block'])


# ── Student ────────────────────────────────────────────────────────────────────

class EnrollmentSubmitView(APIView):
    """POST /api/enrollment/submit/"""
    permission_classes = [IsAuthenticated, IsStudent]
    throttle_classes = [EnrollmentSubmitThrottle]

    def post(self, request):
        serializer = EnrollmentSubmitSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        term = serializer.validated_data['academic_term_id']
        year_level = serializer.validated_data['year_level']
        subjects = serializer.validated_data['subject_ids']
        ip = get_client_ip(request)

        # Defense-in-depth: check count at view layer too (A04)
        if len(subjects) > 10:
            return Response(
                {'error': 'Cannot enroll in more than 10 subjects per term.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Duplicate-submission check done here (not serializer) so we can audit it (A09)
        if EnrollmentRequest.objects.filter(student=request.user, academic_term=term).exists():
            _audit(
                request.user, request.user.role,
                'enrollment_duplicate_attempt', request.path, ip, 'failure',
                {'term': str(term)},
            )
            return Response(
                {'error': 'You have already submitted an enrollment request for this term.'},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            # Atomic block prevents orphaned EnrollmentRequest if bulk_create fails (A08)
            with transaction.atomic():
                enrollment = EnrollmentRequest.objects.create(
                    student=request.user,
                    academic_term=term,
                    year_level=year_level,
                    program=serializer.validated_data['program_id'],
                    student_type=serializer.validated_data.get('student_type', 'regular'),
                )
                EnrollmentSubject.objects.bulk_create([
                    EnrollmentSubject(enrollment=enrollment, subject=s) for s in subjects
                ])
        except IntegrityError:
            # Race condition guard — unique_together catches concurrent duplicate submissions
            _audit(
                request.user, request.user.role,
                'enrollment_duplicate_attempt', request.path, ip, 'failure',
                {'term': str(term), 'reason': 'race_condition'},
            )
            return Response(
                {'error': 'You have already submitted an enrollment request for this term.'},
                status=status.HTTP_409_CONFLICT,
            )

        _audit(
            request.user, request.user.role,
            'enrollment_submitted', request.path, ip, 'success',
            {'term': str(term), 'subject_count': len(subjects)},
        )

        return Response(
            {'message': 'Enrollment request submitted successfully.', 'id': str(enrollment.id)},
            status=status.HTTP_201_CREATED,
        )


class StudentEnrollmentHistoryView(generics.ListAPIView):
    """GET /api/enrollment/my/ — student sees their own requests only.
    Uses StudentOwnEnrollmentSerializer to avoid echoing PII back to the student (A02)."""
    serializer_class = StudentOwnEnrollmentSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        return (
            EnrollmentRequest.objects
            .filter(student=self.request.user)
            .select_related('academic_term', 'processed_by', 'program', 'block')
            .prefetch_related('subjects')
        )


# ── Registrar / Admin ──────────────────────────────────────────────────────────

class RegistrarEnrollmentListView(generics.ListAPIView):
    """GET /api/enrollment/requests/ — registrar/admin sees all requests."""
    serializer_class = EnrollmentRequestSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get_queryset(self):
        qs = (
            EnrollmentRequest.objects
            .select_related('student', 'academic_term', 'processed_by', 'program', 'block')
            .prefetch_related('subjects')
        )
        status_filter = self.request.query_params.get('status')
        if status_filter in (
            EnrollmentRequest.STATUS_PENDING,
            EnrollmentRequest.STATUS_APPROVED,
            EnrollmentRequest.STATUS_REJECTED,
        ):
            qs = qs.filter(status=status_filter)

        # Validate term_id as integer before filtering to avoid unhandled ValueError (A03)
        term_id = self.request.query_params.get('term')
        if term_id and term_id.isdigit():
            qs = qs.filter(academic_term_id=int(term_id))

        return qs


class RegistrarReviewView(APIView):
    """PATCH /api/enrollment/requests/<pk>/review/"""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    throttle_classes = [RegistrarReviewThrottle]

    def patch(self, request, pk):
        ip = get_client_ip(request)

        try:
            enrollment = (
                EnrollmentRequest.objects
                .select_related('student', 'academic_term', 'program')
                .get(pk=pk)
            )
        except EnrollmentRequest.DoesNotExist:
            return Response(
                {'error': 'Enrollment request not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if enrollment.status != EnrollmentRequest.STATUS_PENDING:
            _audit(
                request.user, request.user.role,
                'enrollment_review_invalid', request.path, ip, 'failure',
                {'enrollment_id': str(enrollment.id), 'current_status': enrollment.status},
            )
            return Response(
                {'error': 'Only pending enrollment requests can be reviewed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RegistrarReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']

        with transaction.atomic():
            enrollment.status = new_status
            enrollment.remarks = serializer.validated_data.get('remarks', '')
            enrollment.processed_at = timezone.now()
            enrollment.processed_by = request.user
            enrollment.save(update_fields=['status', 'remarks', 'processed_at', 'processed_by'])

            if new_status == EnrollmentRequest.STATUS_APPROVED and enrollment.program_id:
                _assign_block(enrollment)

        _audit(
            request.user, request.user.role,
            f'enrollment_{enrollment.status}', request.path, ip, 'success',
            {'enrollment_id': str(enrollment.id), 'student': str(enrollment.student.id)},
        )

        return Response({'message': f'Enrollment request {enrollment.status}.'})


class RegistrarPendingEnrollmentListView(generics.ListAPIView):
    """GET /api/enrollment/pending/ — list pre-enrollment applications (registrar/admin)."""
    serializer_class   = PendingEnrollmentListSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get_queryset(self):
        qs = PendingEnrollment.objects.select_related('program', 'academic_term', 'reviewed_by')
        status_filter = self.request.query_params.get('status')
        if status_filter in ('pending', 'approved', 'rejected', 'activated'):
            qs = qs.filter(status=status_filter)
        term_id = self.request.query_params.get('term')
        if term_id and term_id.isdigit():
            qs = qs.filter(academic_term_id=int(term_id))
        return qs


class RegistrarPendingEnrollmentReviewView(APIView):
    """PATCH /api/enrollment/pending/<uuid>/review/ — approve or reject a pre-enrollment."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def patch(self, request, pk):
        ip = get_client_ip(request)
        try:
            pending = PendingEnrollment.objects.select_related('academic_term', 'program').get(pk=pk)
        except PendingEnrollment.DoesNotExist:
            return Response({'error': 'Pre-enrollment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if pending.status != 'pending':
            return Response(
                {'error': 'Only pending applications can be reviewed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PendingEnrollmentReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data['status']

        pending.status      = new_status
        pending.remarks     = serializer.validated_data.get('remarks', '')
        pending.reviewed_by = request.user
        pending.reviewed_at = timezone.now()

        if new_status == 'approved':
            import uuid as _uuid
            pending.activation_token         = _uuid.uuid4()
            pending.activation_token_expires = timezone.now() + timedelta(days=7)

        pending.save()

        if new_status == 'approved':
            _send_activation_email(pending)

        _audit(
            request.user, request.user.role,
            f'pre_enrollment_{new_status}', request.path, ip, 'success',
            {'pre_enrollment_id': str(pending.id), 'email': pending.email},
        )

        return Response({'message': f'Pre-enrollment application {new_status}.'})


class PublicPreEnrollUploadView(APIView):
    """POST /api/enrollment/public/pre-enroll/<uuid:pk>/upload/
    Accepts a PDF file for one requirement and attaches it to the PendingEnrollment.
    No authentication required — called immediately after pre-enrollment submission."""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser]

    def post(self, request, pk):
        try:
            pending = PendingEnrollment.objects.get(pk=pk, status='pending')
        except PendingEnrollment.DoesNotExist:
            return Response({'error': 'Pre-enrollment not found.'}, status=status.HTTP_404_NOT_FOUND)

        label = request.data.get('requirement_label', '').strip()
        file  = request.FILES.get('file')

        if not label:
            return Response({'error': 'requirement_label is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        if not file.name.lower().endswith('.pdf'):
            return Response({'error': 'Only PDF files are accepted.'}, status=status.HTTP_400_BAD_REQUEST)
        if file.size > 10 * 1024 * 1024:
            return Response({'error': 'File size must not exceed 10 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        doc = PreEnrollmentDocument.objects.create(
            pending=pending,
            requirement_label=label,
            file=file,
            file_name=file.name,
            file_size=file.size,
        )
        return Response(
            {'id': doc.id, 'requirement_label': doc.requirement_label, 'file_name': doc.file_name},
            status=status.HTTP_201_CREATED,
        )


class RegistrarPreEnrollDocumentsView(generics.ListAPIView):
    """GET /api/enrollment/pending/<uuid:pk>/documents/"""
    serializer_class = PreEnrollmentDocumentSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get_queryset(self):
        return PreEnrollmentDocument.objects.filter(pending_id=self.kwargs['pk'])

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class RegistrarPreEnrollFollowupView(APIView):
    """POST /api/enrollment/pending/<uuid:pk>/followup-email/
    Send a custom follow-up email to the applicant about missing requirements."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def post(self, request, pk):
        try:
            pending = PendingEnrollment.objects.get(pk=pk)
        except PendingEnrollment.DoesNotExist:
            return Response({'error': 'Pre-enrollment not found.'}, status=status.HTTP_404_NOT_FOUND)

        message = request.data.get('message', '').strip()
        if not message:
            return Response({'error': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.conf import settings as _settings
        from django.core.mail import send_mail
        subject = f"Follow-up on Your NEMSU Cantilan Pre-Enrollment Application (Ref: {pending.reference_number})"
        body = (
            f"Dear {pending.full_name},\n\n"
            f"{message}\n\n"
            f"Reference Number: {pending.reference_number}\n\n"
            f"If you have any questions, please contact the Registrar's Office at cantilan@nemsu.edu.ph.\n\n"
            f"— NEMSU Cantilan Registrar's Office"
        )
        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=_settings.DEFAULT_FROM_EMAIL,
                recipient_list=[pending.email],
                fail_silently=False,
            )
        except Exception:
            logger.error('Failed to send follow-up email to %s', pending.email, exc_info=True)
            return Response({'error': 'Failed to send email. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        _audit(
            request.user, request.user.role,
            'pre_enrollment_followup_email', request.path, get_client_ip(request), 'success',
            {'pre_enrollment_id': str(pending.id), 'email': pending.email},
        )
        return Response({'message': f'Follow-up email sent to {pending.email}.'})


def _send_activation_email(pending):
    from django.conf import settings as _settings
    from django.core.mail import send_mail
    import logging
    _logger = logging.getLogger('security')
    frontend_url = getattr(_settings, 'FRONTEND_URL', 'http://localhost:5173')
    activation_link = f"{frontend_url}/activate/{pending.activation_token}"
    subject = "Your NEMSU Cantilan Pre-Enrollment Has Been Approved"
    body = (
        f"Dear {pending.full_name},\n\n"
        f"Your pre-enrollment application (Ref: {pending.reference_number}) has been approved by the Registrar.\n\n"
        f"You may now create your student account by clicking the link below:\n\n"
        f"  {activation_link}\n\n"
        f"This link will expire in 7 days. Do not share it with anyone.\n\n"
        f"After creating your account, you will be able to log in to your student dashboard.\n\n"
        f"— NEMSU Cantilan Registrar's Office"
    )
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=_settings.DEFAULT_FROM_EMAIL,
            recipient_list=[pending.email],
            fail_silently=False,
        )
    except Exception:
        _logger.error('Failed to send activation email to %s', pending.email, exc_info=True)


class EnrollmentTermStatusView(APIView):
    """PATCH /api/enrollment/terms/<pk>/enrollment/ — registrar/admin opens or closes enrollment."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    throttle_classes = [EnrollmentManageThrottle]

    def patch(self, request, pk):
        ip = get_client_ip(request)
        enrollment_open = request.data.get('enrollment_open')
        if not isinstance(enrollment_open, bool):
            return Response(
                {'error': 'enrollment_open must be true or false.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            term = AcademicTerm.objects.get(pk=pk, is_active=True)
        except AcademicTerm.DoesNotExist:
            return Response(
                {'error': 'Academic term not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            if enrollment_open:
                AcademicTerm.objects.exclude(pk=term.pk).update(enrollment_open=False)
            term.enrollment_open = enrollment_open
            term.save(update_fields=['enrollment_open'])

        _audit(
            request.user, request.user.role,
            'enrollment_window_updated', request.path, ip, 'success',
            {'term': str(term), 'enrollment_open': term.enrollment_open},
        )

        return Response(AcademicTermSerializer(term).data)


# ── Admin — Term & Subject management ─────────────────────────────────────────

class AdminTermListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/enrollment/admin/terms/"""
    serializer_class = AcademicTermSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = AcademicTerm.objects.all()


class AdminTermDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/enrollment/admin/terms/<pk>/ — PUT is blocked (A01)."""
    serializer_class = AcademicTermSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = AcademicTerm.objects.all()
    http_method_names = ['get', 'patch', 'head', 'options']


class AdminSubjectListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/enrollment/admin/subjects/"""
    serializer_class = AdminSubjectSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get_queryset(self):
        qs = Subject.objects.select_related('program__department', 'prerequisite')
        program_id = self.request.query_params.get('program')
        if program_id and program_id.isdigit():
            qs = qs.filter(program_id=int(program_id))
        return qs


class AdminSubjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/enrollment/admin/subjects/<pk>/ — PUT is blocked (A01)."""
    serializer_class = AdminSubjectSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    queryset = Subject.objects.select_related('program__department', 'prerequisite')
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def perform_destroy(self, instance):
        from django.db.models import ProtectedError
        try:
            instance.delete()
        except ProtectedError:
            from rest_framework.exceptions import ValidationError as DRFValidationError
            raise DRFValidationError(
                'This subject cannot be deleted because it is referenced by enrollment or grade records. '
                'Deactivate it instead.'
            )


# ── Admin — Department & Program management ────────────────────────────────────

class AdminDepartmentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/enrollment/admin/departments/"""
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    queryset = Department.objects.all()


class AdminDepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/enrollment/admin/departments/<pk>/ — PUT is blocked (A01)."""
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    queryset = Department.objects.all()
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def perform_destroy(self, instance):
        from django.db.models import ProtectedError
        try:
            instance.delete()
        except ProtectedError:
            from rest_framework.exceptions import ValidationError as DRFValidationError
            raise DRFValidationError(
                'This department cannot be deleted because it has programs assigned to it. '
                'Remove all programs first or deactivate the department.'
            )


class AdminProgramListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/enrollment/admin/programs/"""
    serializer_class = ProgramSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get_queryset(self):
        qs = Program.objects.select_related('department')
        dept_id = self.request.query_params.get('department')
        if dept_id and dept_id.isdigit():
            qs = qs.filter(department_id=int(dept_id))
        return qs


class AdminProgramDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/enrollment/admin/programs/<pk>/ — PUT is blocked (A01)."""
    serializer_class = ProgramSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    queryset = Program.objects.select_related('department')
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']


def _parse_csv_import(file_bytes: bytes, program) -> dict:
    """Parse CSV bytes and upsert subjects for the given program.
    Returns {'created': N, 'updated': M, 'errors': [...], 'total': N+M}."""
    VALID_SEMESTERS = {'first', 'second', 'summer'}
    VALID_YEARS = {1, 2, 3, 4}
    VALID_SUBJECT_TYPES = {'major', 'minor'}

    try:
        decoded = file_bytes.decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(decoded))
        reader.fieldnames = [
            h.strip().lower().replace(' ', '_') for h in (reader.fieldnames or [])
        ]
    except Exception:
        return {
            'created': 0, 'updated': 0, 'total': 0,
            'errors': ['Could not parse the CSV. Ensure it is a valid UTF-8 CSV file.'],
        }

    created = updated = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        code = (row.get('code') or row.get('subject_code') or '').strip().upper()
        name = (row.get('name') or row.get('subject_name') or '').strip()
        units_raw = (row.get('units') or '').strip()
        subject_type = (row.get('subject_type') or row.get('type') or 'minor').strip().lower()
        year_raw = (row.get('year_level') or '').strip()
        semester_raw = (row.get('semester') or '').strip().lower()
        prerequisite_code = (
            row.get('prerequisite_code') or row.get('prerequisite') or ''
        ).strip().upper()
        description = (row.get('description') or '').strip()

        if not code or not name:
            errors.append(f'Row {i}: "code" and "name" are required.')
            continue

        if subject_type not in VALID_SUBJECT_TYPES:
            errors.append(f'Row {i} ({code}): "subject_type" must be "major" or "minor".')
            continue

        try:
            units = Decimal(units_raw)
            decimal_part = units_raw.split('.', 1)[1] if '.' in units_raw else ''
            if len(decimal_part) > 2 or units <= 0 or units > 12:
                raise ValueError
            units = units.quantize(Decimal('0.01'))
        except (InvalidOperation, ValueError, TypeError):
            errors.append(
                f'Row {i} ({code}): "units" must be a number between 0.5 and 12 '
                'with at most 2 decimal places (e.g. 1, 1.25, 3).'
            )
            continue

        year_level = None
        if year_raw:
            try:
                year_level = int(year_raw)
                if year_level not in VALID_YEARS:
                    raise ValueError
            except (ValueError, TypeError):
                errors.append(f'Row {i} ({code}): "year_level" must be 1, 2, 3, or 4.')
                continue

        semester = None
        if semester_raw:
            if semester_raw not in VALID_SEMESTERS:
                errors.append(
                    f'Row {i} ({code}): "semester" must be "first", "second", or "summer".'
                )
                continue
            semester = semester_raw

        prerequisite = None
        if prerequisite_code:
            if prerequisite_code == code:
                errors.append(f'Row {i} ({code}): A course cannot be its own prerequisite.')
                continue
            try:
                prerequisite = Subject.objects.get(code=prerequisite_code, program=program)
            except Subject.DoesNotExist:
                errors.append(
                    f'Row {i} ({code}): prerequisite_code "{prerequisite_code}" '
                    'must match an existing course in this program.'
                )
                continue

        _, was_created = Subject.objects.update_or_create(
            code=code,
            defaults={
                'name': name,
                'units': units,
                'subject_type': subject_type,
                'description': description,
                'program': program,
                'year_level': year_level,
                'semester': semester,
                'prerequisite': prerequisite,
                'is_active': True,
            },
        )
        if was_created:
            created += 1
        else:
            updated += 1

    return {'created': created, 'updated': updated, 'errors': errors, 'total': created + updated}


def _save_curriculum_document_upload(request, program, uploaded):
    ext = os.path.splitext(uploaded.name.lower())[1]
    if ext not in CurriculumDocument.ALLOWED_EXTENSIONS:
        allowed = ', '.join(sorted(CurriculumDocument.ALLOWED_EXTENSIONS))
        return (
            {'error': f'File type not allowed. Accepted: {allowed}'},
            status.HTTP_400_BAD_REQUEST,
        )

    if uploaded.size > CurriculumDocument.MAX_FILE_SIZE:
        return (
            {'error': 'File exceeds the 10 MB size limit.'},
            status.HTTP_400_BAD_REQUEST,
        )

    # Read CSV content before FileField save moves the file pointer.
    csv_bytes = None
    if ext == '.csv':
        csv_bytes = uploaded.read()
        uploaded.seek(0)

    doc = CurriculumDocument.objects.create(
        program=program,
        file=uploaded,
        file_name=uploaded.name,
        file_size=uploaded.size,
        uploaded_by=request.user,
    )

    result = {
        'document': CurriculumDocumentSerializer(doc, context={'request': request}).data,
        'import': None,
    }
    if csv_bytes is not None:
        result['import'] = _parse_csv_import(csv_bytes, program)

    return result, status.HTTP_201_CREATED


class AdminProgramCurriculumUploadView(APIView):
    """POST /api/enrollment/admin/programs/<pk>/curriculum/ — legacy upload alias."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    parser_classes = [MultiPartParser]

    def post(self, request, pk):
        try:
            program = Program.objects.get(pk=pk)
        except Program.DoesNotExist:
            return Response({'error': 'Program not found.'}, status=status.HTTP_404_NOT_FOUND)

        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
        result, response_status = _save_curriculum_document_upload(request, program, uploaded)
        return Response(result, status=response_status)


class AdminCurriculumDocumentView(APIView):
    """GET  /api/enrollment/admin/programs/<pk>/documents/ — list uploaded documents.
    POST /api/enrollment/admin/programs/<pk>/documents/ — upload a document.
         CSV files are also parsed and subjects are imported automatically."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    parser_classes = [MultiPartParser]

    def get(self, request, pk):
        try:
            program = Program.objects.get(pk=pk)
        except Program.DoesNotExist:
            return Response({'error': 'Program not found.'}, status=status.HTTP_404_NOT_FOUND)

        docs = CurriculumDocument.objects.filter(program=program)
        return Response(CurriculumDocumentSerializer(docs, many=True, context={'request': request}).data)

    def post(self, request, pk):
        try:
            program = Program.objects.get(pk=pk)
        except Program.DoesNotExist:
            return Response({'error': 'Program not found.'}, status=status.HTTP_404_NOT_FOUND)

        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        result, response_status = _save_curriculum_document_upload(request, program, uploaded)
        return Response(result, status=response_status)


class AdminCurriculumDocumentDeleteView(APIView):
    """DELETE /api/enrollment/admin/programs/<pk>/documents/<doc_pk>/"""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def delete(self, request, pk, doc_pk):
        try:
            doc = CurriculumDocument.objects.get(pk=doc_pk, program_id=pk)
        except CurriculumDocument.DoesNotExist:
            return Response({'error': 'Document not found.'}, status=status.HTTP_404_NOT_FOUND)

        doc.file.delete(save=False)
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
