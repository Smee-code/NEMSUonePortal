import csv
import io
import logging
import os
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError, transaction
from django.db.models import Count
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
    IsRegistrar,
    IsRegistrarOrAdmin,
    IsStudent,
    IsStudentOrRegistrarOrAdmin,
    get_client_ip,
)

from announcements.models import Announcement

from .academics import eligible_offered
from .models import AcademicTerm, Block, BlockExpansionRequest, Curriculum, CurriculumDocument, Department, EnrollmentRequest, EnrollmentSchedule, EnrollmentSubject, PendingEnrollment, PreEnrollmentDocument, Program, Subject
from .serializers import (
    AcademicTermSerializer,
    AdminSubjectSerializer,
    BlockExpansionRequestSerializer,
    BlockSerializer,
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
        if d.get('program_id'):
            program = Program.objects.filter(pk=d['program_id'], is_active=True).first()
        if program is None and d.get('program_name'):
            name = d['program_name']
            program = (
                Program.objects.filter(name__iexact=name, is_active=True).first()
                or Program.objects.filter(code__iexact=name, is_active=True).first()
                or Program.objects.filter(name__icontains=name, is_active=True).first()
            )

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
        role = self.request.user.role
        if role in ('registrar', 'admin'):
            return AcademicTerm.objects.all().order_by('-year', 'semester')
        qs = AcademicTerm.objects.filter(is_active=True)
        if role == 'student':
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
        # Always use the admin-designated active term (is_active=True).
        # The old calendar-based calculation ignored what the admin set.
        term = AcademicTerm.objects.filter(is_active=True).first()
        if not term:
            return Response({
                'id': None,
                'year': None,
                'semester': None,
                'semester_display': None,
                'is_active': False,
                'enrollment_open': False,
                'label': 'No active term set.',
                'term': None,
            })
        data = AcademicTermSerializer(term).data
        data['label'] = f"{term.get_semester_display()} {term.year}"
        data['term'] = data.copy()  # keep nested 'term' key for backwards compat
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


class StudentOfferedCoursesView(APIView):
    """GET /api/enrollment/offered/ — for a continuing student: the courses
    offered for their program + year level in the active term, each marked
    eligible or blocked (prerequisite not yet passed)."""
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student = request.user
        term = AcademicTerm.objects.filter(is_active=True).first()
        program = student.program
        year_level = student.year_level

        already = bool(term and EnrollmentRequest.objects.filter(
            student=student, academic_term=term).exists())

        courses = []
        if term and program and year_level:
            for row in eligible_offered(student, program, year_level, term.semester):
                s = row['subject']
                courses.append({
                    'id': s.id, 'code': s.code, 'name': s.name, 'units': s.units,
                    'subject_type': s.subject_type,
                    'prerequisite_code': row['prereq'].code if row['prereq'] else '',
                    'eligible': row['eligible'],
                    'blocked_reason': row['blocked_reason'],
                })

        return Response({
            'term': {
                'id': term.id, 'label': str(term), 'semester': term.semester,
                'enrollment_open': term.enrollment_open,
            } if term else None,
            'program': {'id': program.id, 'name': program.name, 'code': program.code} if program else None,
            'year_level': year_level,
            'already_submitted': already,
            'courses': courses,
        })


class ContinuingEnrollmentSubmitView(APIView):
    """POST /api/enrollment/enroll/continuing/ — a continuing student submits
    their enrollment: all offered courses they're eligible for (any course whose
    prerequisite is unmet is excluded). The registrar validates and can adjust."""
    permission_classes = [IsAuthenticated, IsStudent]
    throttle_classes = [EnrollmentSubmitThrottle]

    def post(self, request):
        student = request.user
        ip = get_client_ip(request)
        term = AcademicTerm.objects.filter(is_active=True).first()

        if not term:
            return Response({'error': 'There is no active term open for enrollment.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not term.enrollment_open:
            return Response({'error': 'Enrollment is not open for this term.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not (student.program_id and student.year_level):
            return Response({'error': 'Your program and year level aren’t set yet — please contact the registrar.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if EnrollmentRequest.objects.filter(student=student, academic_term=term).exists():
            return Response({'error': 'You have already submitted an enrollment request for this term.'},
                            status=status.HTTP_409_CONFLICT)

        eligible = [r['subject'] for r in
                    eligible_offered(student, student.program, student.year_level, term.semester)
                    if r['eligible']]
        if not eligible:
            return Response({'error': 'No eligible courses are available for you this term — please contact the registrar.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                enrollment = EnrollmentRequest.objects.create(
                    student=student, academic_term=term,
                    program=student.program, year_level=student.year_level,
                    student_type='continuing',
                )
                EnrollmentSubject.objects.bulk_create([
                    EnrollmentSubject(enrollment=enrollment, subject=s) for s in eligible
                ])
        except IntegrityError:
            return Response({'error': 'You have already submitted an enrollment request for this term.'},
                            status=status.HTTP_409_CONFLICT)

        _audit(student, student.role, 'enrollment_submitted', request.path, ip, 'success',
               {'term': str(term), 'subject_count': len(eligible), 'type': 'continuing'})
        return Response({
            'message': 'Enrollment submitted. The registrar will review it.',
            'id': str(enrollment.id), 'subject_count': len(eligible),
        }, status=status.HTTP_201_CREATED)


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
            # The registrar may adjust the enrolled courses while reviewing
            # (validate a continuing student, tailor a transferee/returnee load).
            raw_ids = request.data.get('subject_ids')
            if isinstance(raw_ids, list):
                valid_ids = list(
                    Subject.objects.filter(id__in=raw_ids).values_list('id', flat=True)
                )
                EnrollmentSubject.objects.filter(enrollment=enrollment).delete()
                EnrollmentSubject.objects.bulk_create([
                    EnrollmentSubject(enrollment=enrollment, subject_id=sid) for sid in valid_ids
                ])

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


class EnrollmentBlockAssignView(APIView):
    """PATCH /api/enrollment/requests/<pk>/block/ — registrar assigns or clears the block for an enrollment."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def patch(self, request, pk):
        from django.shortcuts import get_object_or_404
        enrollment = get_object_or_404(
            EnrollmentRequest.objects.select_related('block'),
            pk=pk,
        )
        block_id = request.data.get('block_id')

        if block_id is None:
            enrollment.block = None
        else:
            try:
                block = Block.objects.get(pk=int(block_id))
            except (Block.DoesNotExist, ValueError, TypeError):
                return Response({'error': 'Block not found.'}, status=status.HTTP_404_NOT_FOUND)
            enrollment.block = block

        enrollment.save(update_fields=['block'])
        _audit(
            request.user, request.user.role,
            'enrollment_block_assigned', request.path, get_client_ip(request), 'success',
            {'enrollment_id': str(enrollment.id), 'block': str(block_id)},
        )
        return Response({
            'block_id':   enrollment.block_id,
            'block_name': enrollment.block.name if enrollment.block_id else None,
        })


class RegistrarPendingEnrollmentListView(generics.ListAPIView):
    """
    GET /api/enrollment/pending/ — list freshman/transferee admission applications.
    Reviewed by the registrar/admin.
    """
    serializer_class   = PendingEnrollmentListSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get_queryset(self):
        qs = (PendingEnrollment.objects
              .select_related('program', 'program__department', 'academic_term', 'reviewed_by')
              .prefetch_related('documents'))
        status_filter = self.request.query_params.get('status')
        if status_filter in ('pending', 'approved', 'rejected', 'activated'):
            qs = qs.filter(status=status_filter)
        term_id = self.request.query_params.get('term')
        if term_id and term_id.isdigit():
            qs = qs.filter(academic_term_id=int(term_id))
        return qs


class RegistrarPendingEnrollmentReviewView(APIView):
    """
    PATCH /api/enrollment/pending/<uuid>/review/ — approve or reject a freshman/
    transferee admission application. Reviewed by the registrar/admin. Approval does
    NOT create an account or activation link — the applicant is only notified that
    they qualify for the entrance exam; the student ID and account come later, after
    they are enrolled.
    """
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def patch(self, request, pk):
        ip = get_client_ip(request)
        try:
            pending = PendingEnrollment.objects.select_related('academic_term', 'program', 'program__department').get(pk=pk)
        except PendingEnrollment.DoesNotExist:
            return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)

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
        pending.save()

        _send_admission_decision_email(pending, new_status)

        _audit(
            request.user, request.user.role,
            f'pre_enrollment_{new_status}', request.path, ip, 'success',
            {'pre_enrollment_id': str(pending.id), 'email': pending.email},
        )

        return Response({'message': f'Application {new_status}.'})


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


def _send_admission_decision_email(pending, decision):
    """
    Notify a freshman/transferee applicant of the registrar/admin's decision.
    Approval does NOT create an account — it only invites them to the entrance exam.
    """
    from django.conf import settings as _settings
    from django.core.mail import send_mail
    import logging
    _logger = logging.getLogger('security')

    dept = pending.program.department.name if (pending.program_id and pending.program.department_id) else 'the department'
    program = pending.program.name if pending.program_id else 'your chosen program'

    if decision == 'approved':
        subject = "NEMSU Cantilan — You Qualify for the Entrance Examination"
        body = (
            f"Dear {pending.full_name},\n\n"
            f"Your application (Ref: {pending.reference_number}) for {program} has been "
            f"reviewed and approved by {dept}.\n\n"
            f"You are now qualified to take the college entrance examination. Please wait "
            f"for the schedule and further instructions from the department, and bring the "
            f"original copies of your submitted documents on exam day.\n\n"
            f"Please note: you are not yet officially enrolled. Your student ID and portal "
            f"account will be issued once you have completed enrollment.\n\n"
            f"— NEMSU Cantilan Admissions"
        )
    else:
        reason = f"\n\nReason: {pending.remarks}" if pending.remarks else ''
        subject = "NEMSU Cantilan — Update on Your Admission Application"
        body = (
            f"Dear {pending.full_name},\n\n"
            f"Thank you for your interest in {program}. After review by {dept}, we regret "
            f"to inform you that your application (Ref: {pending.reference_number}) was not "
            f"approved at this time.{reason}\n\n"
            f"If you have questions or wish to reapply, please contact the department.\n\n"
            f"— NEMSU Cantilan Admissions"
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
        _logger.error('Failed to send admission decision email to %s', pending.email, exc_info=True)


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
            term = AcademicTerm.objects.get(pk=pk)
        except AcademicTerm.DoesNotExist:
            return Response(
                {'error': 'Academic term not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Enrollment can only be opened on the current term (is_active).
        # Closing a window on any term stays allowed.
        if enrollment_open:
            if not term.is_active:
                return Response(
                    {'error': 'Enrollment can only be opened on the current term.'},
                    status=status.HTTP_409_CONFLICT,
                )
            # A term whose end date has passed can no longer accept enrollment.
            if term.end_date and term.end_date < timezone.localdate():
                return Response(
                    {'error': 'This term has already ended; enrollment cannot be opened for a past term.'},
                    status=status.HTTP_409_CONFLICT,
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
    queryset = AcademicTerm.objects.all().order_by('-start_date', '-id')

    def perform_create(self, serializer):
        with transaction.atomic():
            instance = serializer.save()
            # A newly added term becomes the current term, closing any enrollment
            # window left open on the term it replaces. The admin can switch the
            # current term afterwards via the set-current endpoint.
            AcademicTerm.set_current(instance)
        instance.refresh_from_db()
        _audit(
            self.request.user, self.request.user.role,
            'academic_term_created', self.request.path,
            get_client_ip(self.request), 'success',
            {'term_id': instance.pk, 'term': str(instance)},
        )


class AdminTermDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/enrollment/admin/terms/<pk>/ — PUT is blocked (A01)."""
    serializer_class = AcademicTermSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = AcademicTerm.objects.all()
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def perform_update(self, serializer):
        # Editing a term (dates, year, semester) never changes which term is
        # current — that is controlled only by creation, set-current, or the
        # deletion of the current term. This keeps a manual selection stable.
        serializer.save()
        _audit(
            self.request.user, self.request.user.role,
            'academic_term_updated', self.request.path,
            get_client_ip(self.request), 'success',
            {'term_id': serializer.instance.pk, 'term': str(serializer.instance)},
        )

    def perform_destroy(self, instance):
        if instance.enrollment_requests.exists():
            from rest_framework.exceptions import ValidationError as DRFValidationError
            raise DRFValidationError(
                'This term cannot be deleted because students have enrollment records linked to it. '
                'Deactivate it instead.'
            )
        _audit(
            self.request.user, self.request.user.role,
            'academic_term_deleted', self.request.path,
            get_client_ip(self.request), 'success',
            {'term_id': instance.pk, 'term': str(instance)},
        )
        was_current = instance.is_active
        instance.delete()
        # If the term just deleted was the current one, promote the next-newest
        # so the system always has exactly one current term.
        if was_current:
            AcademicTerm.promote_newest()


class AdminTermSetCurrentView(APIView):
    """POST /api/enrollment/admin/terms/<pk>/set-current/ — admin override.

    Makes the given term the single current term. Any term can be chosen,
    including one that has already ended (useful for testing/demo); enrollment
    still cannot be opened on an ended term.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_classes = [EnrollmentManageThrottle]

    def post(self, request, pk):
        try:
            term = AcademicTerm.objects.get(pk=pk)
        except AcademicTerm.DoesNotExist:
            return Response({'error': 'Academic term not found.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            AcademicTerm.set_current(term)

        _audit(
            request.user, request.user.role,
            'academic_term_set_current', request.path,
            get_client_ip(request), 'success',
            {'term_id': term.pk, 'term': str(term)},
        )
        return Response(AcademicTermSerializer(term).data)


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

        # Codes are unique per program, so match on (program, code): importing a
        # code used by another program creates this program's own copy rather
        # than overwriting the other program's course.
        _, was_created = Subject.objects.update_or_create(
            code=code,
            program=program,
            defaults={
                'name': name,
                'units': units,
                'subject_type': subject_type,
                'description': description,
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


# ── Admin — Reports ────────────────────────────────────────────────────────────

class AdminEnrollmentSummaryReportView(APIView):
    """GET /api/enrollment/admin/reports/enrollment-summary/?term=<id>"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        term_id = request.query_params.get('term')
        if not term_id or not term_id.isdigit():
            return Response(
                {'error': 'term query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            term = AcademicTerm.objects.get(pk=int(term_id))
        except AcademicTerm.DoesNotExist:
            return Response({'error': 'Academic term not found.'}, status=status.HTTP_404_NOT_FOUND)

        qs = EnrollmentRequest.objects.filter(academic_term=term)

        # Aggregate by program + status, then pivot into one row per program
        by_program_raw = (
            qs.values('program__code', 'program__name', 'status')
            .annotate(count=Count('id'))
        )
        program_map = {}
        for row in by_program_raw:
            key = row['program__code'] or '__none__'
            if key not in program_map:
                program_map[key] = {
                    'program_code': row['program__code'] or '—',
                    'program_name': row['program__name'] or 'No Program',
                    'pending': 0, 'approved': 0, 'rejected': 0, 'total': 0,
                }
            s = row['status']
            if s in ('pending', 'approved', 'rejected'):
                program_map[key][s] += row['count']
            program_map[key]['total'] += row['count']

        # Aggregate by year level + status, then pivot
        by_year_raw = (
            qs.values('year_level', 'status')
            .annotate(count=Count('id'))
        )
        year_labels = {1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year'}
        year_map = {}
        for row in by_year_raw:
            yl = row['year_level'] or 0
            if yl not in year_map:
                year_map[yl] = {
                    'year_level': yl,
                    'year_level_display': year_labels.get(yl, 'Unknown'),
                    'pending': 0, 'approved': 0, 'rejected': 0, 'total': 0,
                }
            s = row['status']
            if s in ('pending', 'approved', 'rejected'):
                year_map[yl][s] += row['count']
            year_map[yl]['total'] += row['count']

        by_status_raw = qs.values('status').annotate(count=Count('id'))
        by_status = {'pending': 0, 'approved': 0, 'rejected': 0}
        for row in by_status_raw:
            if row['status'] in by_status:
                by_status[row['status']] = row['count']

        return Response({
            'term': AcademicTermSerializer(term).data,
            'total': qs.count(),
            'by_status': by_status,
            'by_program': sorted(program_map.values(), key=lambda x: x['program_code']),
            'by_year_level': sorted(year_map.values(), key=lambda x: x['year_level']),
        })


# ── Block Management ────────────────────────────────────────────────────────────

class BlockListView(generics.ListAPIView):
    """GET /api/enrollment/blocks/?term=<id>&program=<id>&year_level=<n>"""
    serializer_class   = BlockSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Block.objects.select_related('program', 'academic_term')
        p  = self.request.query_params
        if p.get('term',       '').isdigit(): qs = qs.filter(academic_term_id=int(p['term']))
        if p.get('program',    '').isdigit(): qs = qs.filter(program_id=int(p['program']))
        if p.get('year_level', '').isdigit(): qs = qs.filter(year_level=int(p['year_level']))
        return qs.order_by('program__code', 'year_level', 'name')


class BlockDetailView(APIView):
    """GET /api/enrollment/blocks/<pk>/ — block detail + enrolled student list"""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get(self, request, pk):
        from django.shortcuts import get_object_or_404
        block = get_object_or_404(
            Block.objects.select_related('program', 'academic_term'), pk=pk
        )
        data = BlockSerializer(block).data
        enrollments = (
            block.enrollment_requests
            .filter(status='approved')
            .select_related('student')
            .order_by('student__full_name')
        )
        data['students'] = [
            {
                'enrollment_id': str(e.id),
                'student_name':  e.student.full_name,
                'student_id':    getattr(e.student, 'student_id', '') or '',
                'year_level':    e.get_year_level_display(),
            }
            for e in enrollments
        ]
        return Response(data)


class BlockExpansionRequestListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/enrollment/block-expansion-requests/  — admin + registrar
    POST /api/enrollment/block-expansion-requests/  — registrar only
    """
    serializer_class = BlockExpansionRequestSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsRegistrar()]
        return [IsAuthenticated(), IsRegistrarOrAdmin()]

    def get_queryset(self):
        qs = BlockExpansionRequest.objects.select_related(
            'block__program', 'block__academic_term', 'requested_by', 'reviewed_by'
        )
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        return qs

    def perform_create(self, serializer):
        block = serializer.validated_data['block']
        serializer.save(
            requested_by=self.request.user,
            current_capacity=block.capacity,
        )
        _audit(
            self.request.user, self.request.user.role,
            'block_expansion_requested', self.request.path,
            get_client_ip(self.request), 'success',
            {'block_id': block.pk, 'block': str(block), 'requested': serializer.validated_data['requested_capacity']},
        )


class BlockExpansionRequestDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/enrollment/block-expansion-requests/<pk>/ — admin + registrar
    PATCH /api/enrollment/block-expansion-requests/<pk>/ — admin only
    """
    serializer_class     = BlockExpansionRequestSerializer
    http_method_names    = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        return BlockExpansionRequest.objects.select_related(
            'block__program', 'block__academic_term', 'requested_by', 'reviewed_by'
        )

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated(), IsRegistrarOrAdmin()]

    def perform_update(self, serializer):
        new_status = serializer.validated_data.get('status')
        instance   = serializer.instance
        with transaction.atomic():
            if new_status == 'approved' and instance.status != 'approved':
                block = Block.objects.select_for_update().get(pk=instance.block_id)
                block.capacity = instance.requested_capacity
                block.save(update_fields=['capacity'])
            serializer.save(
                reviewed_by=self.request.user,
                reviewed_at=timezone.now(),
            )
        _audit(
            self.request.user, self.request.user.role,
            f'block_expansion_{new_status or "updated"}', self.request.path,
            get_client_ip(self.request), 'success',
            {'request_id': instance.pk, 'block': str(instance.block), 'new_status': new_status},
        )
