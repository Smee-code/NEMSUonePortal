import logging
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.conf import settings
from django.core.mail import send_mass_mail
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models import AuditLog, User
from authentication.permissions import (
    IsAdmin,
    IsFaculty,
    IsRegistrarOrAdmin,
    IsStudent,
    get_client_ip,
)
from enrollment.models import AcademicTerm, Block, EnrollmentSubject, Program, Subject
from enrollment.terms import current_academic_year, regular_term_date_range
from .models import GradeRecord, MidtermReopenRequest, TeachingAssignment
from .serializers import (
    FacultyAssignmentCreateSerializer,
    GradeEncodeSerializer,
    GradeSubmitSerializer,
    MidtermReopenRequestSerializer,
    MidtermReopenReviewSerializer,
    RegistrarGradeSerializer,
    StudentGradeSerializer,
    TeachingAssignmentSerializer,
)
from .throttles import (
    FacultyStudentGradeReadThrottle,
    GradeEncodeThrottle,
    GradeSubmitThrottle,
    RegistrarGradeReadThrottle,
)

logger = logging.getLogger('security')


def _audit(user, role, action, resource, ip, result, extra=None):
    try:
        AuditLog.objects.create(
            user=user, role=role or '', action=action, resource=resource,
            ip_address=ip, result=result, extra=extra or {},
        )
    except Exception:
        logger.error('Audit log write failed', exc_info=True)


class GradePagination(LimitOffsetPagination):
    default_limit = 50
    max_limit = 200


# ── Student ────────────────────────────────────────────────────────────────────

class StudentGradeListView(generics.ListAPIView):
    """
    GET /api/grades/my/ — the student's enrolled courses (the roster rows an
    instructor added them to) with midterm/final grades. Grade values are only
    revealed once the faculty has submitted them; unsubmitted courses show as
    'not yet posted'.
    """
    serializer_class = StudentGradeSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        return (
            GradeRecord.objects
            .filter(student=self.request.user)
            .select_related(
                'subject', 'academic_term',
                'teaching_assignment', 'teaching_assignment__faculty',
            )
            .order_by('-academic_term__year', 'academic_term__semester', 'subject__code')
        )


# ── Faculty ────────────────────────────────────────────────────────────────────

class FacultyTeachingLoadView(generics.ListAPIView):
    """GET /api/grades/teaching-load/"""
    serializer_class = TeachingAssignmentSerializer
    permission_classes = [IsAuthenticated, IsFaculty]

    def get_queryset(self):
        qs = (
            TeachingAssignment.objects
            .filter(faculty=self.request.user)
            .select_related('subject', 'academic_term')
        )
        term_id = self.request.query_params.get('term')
        if term_id and term_id.isdigit():
            qs = qs.filter(academic_term_id=int(term_id))
        return qs


class FacultyStudentGradeListView(APIView):
    """GET /api/grades/faculty/students/?assignment=<id>
    Returns enrolled students with their current grade for the assignment (G-07 audited)."""
    permission_classes = [IsAuthenticated, IsFaculty]
    throttle_classes = [FacultyStudentGradeReadThrottle]

    def get(self, request):
        # Accept both `assignment` and `assignment_id` for backwards compatibility.
        assignment_id = request.query_params.get('assignment') or request.query_params.get('assignment_id')
        if not assignment_id or not str(assignment_id).isdigit():
            return Response(
                {'error': 'assignment query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            assignment = TeachingAssignment.objects.select_related(
                'subject', 'academic_term'
            ).get(pk=int(assignment_id), faculty=request.user)
        except TeachingAssignment.DoesNotExist:
            return Response(
                {'error': 'Teaching assignment not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # The roster is the set of students the instructor added to this course
        # (one GradeRecord per student in the course), not the old subject-selection
        # enrollment. Grades are encoded on these same records.
        records = (
            GradeRecord.objects
            .filter(teaching_assignment=assignment)
            .select_related('student', 'student__curriculum', 'student__program')
            .order_by('student__full_name', 'student__student_id')
        )

        # Programs that have more than one curriculum — only then is the old/new
        # curriculum tag meaningful (per the design).
        from django.db.models import Count
        from enrollment.models import Curriculum
        multi_curriculum_programs = {
            row['program_id']
            for row in Curriculum.objects.values('program_id')
                .annotate(n=Count('id')).filter(n__gt=1)
        }

        result = []
        for record in records:
            student = record.student
            show_curr = student.program_id in multi_curriculum_programs
            result.append({
                'student_uuid': str(student.id),
                'student_name': student.full_name,
                'student_id_no': student.student_id,
                'is_placeholder': student.is_placeholder,
                'curriculum_code': student.curriculum.code if student.curriculum_id else None,
                'curriculum_year': student.curriculum.year_effective if student.curriculum_id else None,
                'show_curriculum': show_curr,
                'grade_record_id': str(record.id),
                'midterm_grade': str(record.midterm_grade) if record.midterm_grade is not None else '',
                'final_grade': str(record.final_grade) if record.final_grade is not None else '',
                'grade': record.grade,
                'remarks': record.remarks,
                'is_submitted': record.is_submitted,
                'is_dropped': record.is_dropped,
                'midterm_is_inc': record.midterm_is_inc,
                'final_is_inc': record.final_is_inc,
                'midterm_submitted': record.midterm_submitted,
                'final_submitted': record.final_submitted,
                'encoded_at': record.encoded_at.isoformat() if record.encoded_at else None,
            })

        # G-07: audit student PII access (RA 10173)
        _audit(
            request.user, request.user.role,
            'grade_student_list_accessed', request.path,
            get_client_ip(request), 'success',
            {
                'assignment_id': assignment.id,
                'subject': assignment.subject.code,
                'term': str(assignment.academic_term),
                'student_count': len(result),
            },
        )

        return Response(result)


class GradeEncodeView(APIView):
    """POST /api/grades/faculty/encode/ — upsert a grade with race-condition protection (G-01)."""
    permission_classes = [IsAuthenticated, IsFaculty]
    throttle_classes = [GradeEncodeThrottle]

    def post(self, request):
        serializer = GradeEncodeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        assignment = data['assignment']
        stage = data['stage']          # 'midterm' | 'final'
        st = data['status']            # 'grade' | 'inc' | 'drp'
        value = data.get('value')
        has_remarks = 'remarks' in data
        ip = get_client_ip(request)

        # G-01: select_for_update() prevents the concurrent-submit race where a stage
        # flips *_submitted=True between the lock check and the write.
        with transaction.atomic():
            record = GradeRecord.objects.select_for_update().filter(
                student_id=data['student_id'],
                teaching_assignment=assignment,
            ).first()
            if record is None:
                return Response(
                    {'error': 'This student is not in your class roster for this course.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Finals gate: no final entry until every non-dropped student's midterm is in.
            if stage == 'final':
                midterms_pending = GradeRecord.objects.filter(
                    teaching_assignment=assignment, is_dropped=False, midterm_submitted=False,
                ).exists()
                if midterms_pending:
                    return Response(
                        {'error': 'Submit all midterm grades before entering final grades.'},
                        status=status.HTTP_409_CONFLICT,
                    )

            # Stage locks: a submitted NUMERIC grade is locked (needs an admin reopen for
            # the midterm). INC stays editable so it can be completed later.
            if stage == 'midterm' and record.midterm_submitted and not record.midterm_is_inc:
                return Response(
                    {'error': 'This midterm grade is locked. Request an admin reopen to change it.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if stage == 'final' and record.final_submitted and not record.final_is_inc:
                return Response(
                    {'error': 'This final grade is locked and can no longer be changed.'},
                    status=status.HTTP_409_CONFLICT,
                )
            # Changing a dropped student back requires the midterm stage to be open,
            # since DRP is captured with the midterm submission.
            if st == 'drp' and record.midterm_submitted and not record.midterm_is_inc:
                return Response(
                    {'error': 'Midterms are locked. Request an admin reopen to change this student.'},
                    status=status.HTTP_409_CONFLICT,
                )

            if st == 'drp':
                record.is_dropped = True
                record.midterm_grade = None
                record.final_grade = None
                record.midterm_is_inc = False
                record.final_is_inc = False
            else:
                record.is_dropped = False
                if stage == 'midterm':
                    record.midterm_is_inc = (st == 'inc')
                    record.midterm_grade = None if st == 'inc' else value
                else:
                    record.final_is_inc = (st == 'inc')
                    record.final_grade = None if st == 'inc' else value

            if has_remarks:
                record.remarks = data.get('remarks', '')

            record.recompute_grade()
            record.encoded_by = request.user
            record.teaching_assignment = assignment
            record.save()

        mid_str = str(record.midterm_grade) if record.midterm_grade is not None else ''
        fin_str = str(record.final_grade) if record.final_grade is not None else ''
        _audit(
            request.user, request.user.role, 'grade_encoded', request.path, ip, 'success',
            {
                'student': str(data['student_id']),
                'subject': assignment.subject.code,
                'term': str(assignment.academic_term),
                'stage': stage,
                'status': st,
                'grade': record.grade,
            },
        )

        return Response({
            'message': 'Grade saved.', 'id': str(record.id),
            'midterm_grade': mid_str, 'final_grade': fin_str, 'grade': record.grade,
            'is_dropped': record.is_dropped,
            'midterm_is_inc': record.midterm_is_inc,
            'final_is_inc': record.final_is_inc,
            'midterm_submitted': record.midterm_submitted,
            'final_submitted': record.final_submitted,
        })


class GradeSubmitView(APIView):
    """POST /api/grades/faculty/submit/ — submit one stage (midterm|final) of the roster.
    Midterms must be fully submitted before finals may be submitted. INC/DRP count as
    settled; DRP students are skipped. G-02: everything inside atomic + select_for_update."""
    permission_classes = [IsAuthenticated, IsFaculty]
    throttle_classes = [GradeSubmitThrottle]

    def post(self, request):
        serializer = GradeSubmitSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        assignment = serializer.validated_data['teaching_assignment_id']
        stage = serializer.validated_data['stage']
        force = serializer.validated_data.get('force', False)
        ip = get_client_ip(request)
        now = timezone.now()

        def stage_ready(r):
            # A non-dropped record is ready for its stage once it has a number or INC.
            if stage == 'midterm':
                return r.midterm_grade is not None or r.midterm_is_inc
            return r.final_grade is not None or r.final_is_inc

        with transaction.atomic():
            # Finals can only be submitted once every non-dropped midterm is submitted.
            if stage == 'final' and GradeRecord.objects.filter(
                teaching_assignment=assignment, is_dropped=False, midterm_submitted=False,
            ).exists():
                return Response(
                    {'error': 'Submit all midterm grades before submitting final grades.'},
                    status=status.HTTP_409_CONFLICT,
                )

            roster = list(
                GradeRecord.objects.select_for_update().select_related('student').filter(
                    teaching_assignment=assignment,
                )
            )
            if not roster:
                return Response(
                    {'error': 'No students on this course roster.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            already = 'midterm_submitted' if stage == 'midterm' else 'final_submitted'
            missing = [r for r in roster if not r.is_dropped and not stage_ready(r)]
            missing_count = len(missing)

            if missing_count > 0 and not force:
                return Response(
                    {
                        'error': (
                            f'{missing_count} student(s) have no {stage} grade. '
                            'Enter a grade, INC, or DRP for everyone, '
                            'or use "Submit anyway" to submit only the completed ones.'
                        ),
                        'missing_count': missing_count,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            # Records to mark for this stage: dropped students are settled by the midterm
            # submission; everyone else who is ready and not already submitted.
            to_mark, notify = [], []
            for r in roster:
                if getattr(r, already):
                    continue
                submit_this = (stage == 'midterm' and r.is_dropped) or stage_ready(r)
                if not submit_this:
                    continue
                if stage == 'midterm':
                    r.midterm_submitted = True
                    r.midterm_submitted_at = now
                else:
                    r.final_submitted = True
                    r.final_submitted_at = now
                    r.is_submitted = True
                    r.submitted_at = now
                r.recompute_grade()
                to_mark.append(r)
                # Notify registered, non-dropped students (dropped students aren't emailed).
                s = r.student
                email = (getattr(s, 'institutional_email', '') or '').strip()
                if (not r.is_dropped and s and not getattr(s, 'is_placeholder', False)
                        and email and 'placeholder' not in email.lower()):
                    notify.append((email, s.full_name or 'Student'))

            count = len(to_mark)
            if count == 0:
                return Response(
                    {'error': f'No {stage} grades ready to submit for this assignment.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            fields = (
                ['midterm_submitted', 'midterm_submitted_at', 'grade']
                if stage == 'midterm'
                else ['final_submitted', 'final_submitted_at', 'is_submitted', 'submitted_at', 'grade']
            )
            GradeRecord.objects.bulk_update(to_mark, fields)

        _audit(
            request.user, request.user.role,
            f'grades_submitted_{stage}', request.path, ip, 'success',
            {
                'assignment_id': assignment.id,
                'subject': assignment.subject.code,
                'term': str(assignment.academic_term),
                'stage': stage,
                'count': count,
                'forced': force,
                'notified': len(notify),
            },
        )

        # Notify each student that their grade is posted (best-effort; grades stay
        # in-app for privacy — the email only says a grade is available to view).
        try:
            if notify:
                subj_code = assignment.subject.code
                subj_name = assignment.subject.name
                term = str(assignment.academic_term)
                stage_word = 'midterm' if stage == 'midterm' else 'final'
                messages = [(
                    f'Your {stage_word} grade for {subj_code} has been posted',
                    (
                        f'Hi {name},\n\n'
                        f'Your {stage_word} grade for {subj_code} - {subj_name} ({term}) has been '
                        f'submitted by your instructor and is now available in your NEMSUonePortal '
                        f'account. Log in and open "My Grades" to view it.\n\n'
                        f'— NEMSU Cantilan Campus'
                    ),
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                ) for (email, name) in notify]
                send_mass_mail(messages, fail_silently=True)
        except Exception:
            logger.warning('Failed to send grade-posted notification emails', exc_info=True)

        return Response({'message': f'{count} {stage} grade(s) submitted successfully.'})


# ── Midterm reopen requests ─────────────────────────────────────────────────────

class FacultyMidtermReopenView(generics.ListCreateAPIView):
    """GET  /api/grades/faculty/midterm-reopen/  — faculty's own requests
    POST /api/grades/faculty/midterm-reopen/  — request an admin reopen a subject's midterms."""
    serializer_class = MidtermReopenRequestSerializer
    permission_classes = [IsAuthenticated, IsFaculty]

    def get_queryset(self):
        return MidtermReopenRequest.objects.select_related(
            'teaching_assignment__subject', 'teaching_assignment__academic_term',
            'requested_by', 'reviewed_by',
        ).filter(requested_by=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assignment = serializer.validated_data['teaching_assignment']

        if assignment.faculty_id != request.user.id:
            return Response(
                {'error': 'That course is not one of your teaching assignments.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Nothing to reopen unless at least one midterm has actually been submitted.
        if not GradeRecord.objects.filter(
            teaching_assignment=assignment, midterm_submitted=True,
        ).exists():
            return Response(
                {'error': 'This subject has no submitted midterm grades to reopen.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if MidtermReopenRequest.objects.filter(
            teaching_assignment=assignment, status='pending',
        ).exists():
            return Response(
                {'error': 'A reopen request for this subject is already pending.'},
                status=status.HTTP_409_CONFLICT,
            )

        self.perform_create(serializer)
        _audit(
            request.user, request.user.role, 'midterm_reopen_requested',
            request.path, get_client_ip(request), 'success',
            {'assignment_id': assignment.id, 'subject': assignment.subject.code},
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)


class AdminMidtermReopenListView(generics.ListAPIView):
    """GET /api/grades/admin/midterm-reopen/ — admin reviews reopen requests."""
    serializer_class = MidtermReopenRequestSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        qs = MidtermReopenRequest.objects.select_related(
            'teaching_assignment__subject', 'teaching_assignment__academic_term',
            'requested_by', 'reviewed_by',
        )
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        return qs


class AdminMidtermReopenReviewView(APIView):
    """PATCH /api/grades/admin/midterm-reopen/<pk>/ — approve or reject.
    Approval reopens the whole subject's midterms (only where finals aren't in yet)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        serializer = MidtermReopenReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data['status']
        note = serializer.validated_data.get('admin_note', '')

        try:
            req = MidtermReopenRequest.objects.select_related('teaching_assignment__subject').get(pk=pk)
        except MidtermReopenRequest.DoesNotExist:
            return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)
        if req.status != 'pending':
            return Response(
                {'error': 'This request has already been reviewed.'},
                status=status.HTTP_409_CONFLICT,
            )

        reopened = 0
        with transaction.atomic():
            if new_status == 'approved':
                # Unlock midterms for the class — but never for students whose finals
                # are already submitted (their grade is fully settled).
                reopened = GradeRecord.objects.select_for_update().filter(
                    teaching_assignment=req.teaching_assignment,
                    midterm_submitted=True,
                    final_submitted=False,
                ).update(midterm_submitted=False, midterm_submitted_at=None)
            req.status = new_status
            req.admin_note = note
            req.reviewed_by = request.user
            req.reviewed_at = timezone.now()
            req.save(update_fields=['status', 'admin_note', 'reviewed_by', 'reviewed_at'])

        _audit(
            request.user, request.user.role, f'midterm_reopen_{new_status}',
            request.path, get_client_ip(request), 'success',
            {'request_id': req.pk, 'subject': req.teaching_assignment.subject.code, 'reopened': reopened},
        )
        return Response(MidtermReopenRequestSerializer(req).data)


# ── Registrar / Admin ──────────────────────────────────────────────────────────

class RegistrarGradeListView(generics.ListAPIView):
    """GET /api/grades/all/ — paginated, with audit logging (G-04, G-07)."""
    serializer_class = RegistrarGradeSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    pagination_class = GradePagination
    throttle_classes = [RegistrarGradeReadThrottle]

    def get_queryset(self):
        qs = GradeRecord.objects.select_related(
            'student', 'subject', 'academic_term', 'encoded_by'
        )

        term_id = self.request.query_params.get('term')
        if term_id and term_id.isdigit():
            qs = qs.filter(academic_term_id=int(term_id))

        # G-06: truncate to prevent slow LIKE queries on long search strings
        student_q = (self.request.query_params.get('student') or '')[:100].strip()
        if student_q:
            qs = qs.filter(student__full_name__icontains=student_q) | \
                 qs.filter(student__student_id__icontains=student_q)

        submitted = self.request.query_params.get('submitted')
        if submitted == 'true':
            qs = qs.filter(is_submitted=True)
        elif submitted == 'false':
            qs = qs.filter(is_submitted=False)

        return qs.order_by('-academic_term__year', 'student__full_name', 'subject__code')

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # G-07: audit bulk PII access (RA 10173)
        _audit(
            request.user, request.user.role,
            'grade_list_accessed', request.path,
            get_client_ip(request), 'success',
            {'filters': dict(request.query_params)},
        )
        return response


# ── Registrar — Faculty overview ──────────────────────────────────────────────

class RegistrarFacultyListView(APIView):
    """GET /api/grades/registrar/faculty/ — list all faculty with teaching load summary."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get(self, request):
        current_term_ids = set(
            AcademicTerm.objects.filter(is_active=True).values_list('id', flat=True)
        )
        faculty = (
            User.objects.filter(role='faculty')
            .select_related('department', 'program')
            .prefetch_related('teaching_assignments')
            .order_by('department__code', 'full_name')
        )
        data = []
        for f in faculty:
            current_load = f.teaching_assignments.filter(
                academic_term_id__in=current_term_ids
            ).count()
            data.append({
                'id': str(f.id),
                'faculty_id': f.student_id,
                'full_name': f.full_name,
                'email': f.institutional_email,
                'contact_number': f.contact_number,
                'department_code': f.department.code if f.department else None,
                'department_name': f.department.name if f.department else None,
                'program_id': f.program_id,
                'program_name': f.program.name if f.program_id else None,
                'is_gec_faculty': f.is_gec_faculty,
                'classification': f.faculty_classification,
                'rank': f.rank,
                'current_term_load': current_load,
                'total_assignments': f.teaching_assignments.count(),
            })
        return Response(data)


class RegistrarFacultyDetailView(APIView):
    """GET /api/grades/registrar/faculty/<pk>/ — full teaching history for one faculty member."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get(self, request, pk):
        from collections import defaultdict
        from enrollment.models import EnrollmentSubject

        try:
            f = User.objects.select_related('department').get(id=pk, role='faculty')
        except (User.DoesNotExist, Exception):
            return Response({'error': 'Faculty not found.'}, status=404)

        current_term_ids = set(
            AcademicTerm.objects.filter(is_active=True).values_list('id', flat=True)
        )

        assignments = (
            TeachingAssignment.objects
            .filter(faculty=f)
            .select_related('subject', 'academic_term')
            .prefetch_related('class_schedules', 'grade_records')
            .order_by('-academic_term__year', 'academic_term__semester', 'subject__code')
        )

        terms_map = {}
        for ta in assignments:
            term = ta.academic_term
            tid = term.id
            if tid not in terms_map:
                terms_map[tid] = {
                    'term_id': tid,
                    'term_display': str(term),
                    'year': term.year,
                    'semester': term.semester,
                    'semester_display': term.get_semester_display(),
                    'is_current': tid in current_term_ids,
                    'assignments': [],
                }

            student_count = EnrollmentSubject.objects.filter(
                enrollment__academic_term=term,
                enrollment__status='approved',
                subject=ta.subject,
            ).count()

            grades_submitted = ta.grade_records.filter(is_submitted=True).count()
            grades_encoded = ta.grade_records.exclude(grade='').count()

            schedule = ta.class_schedules.first()
            sched_data = None
            if schedule:
                sched_data = {
                    'day': schedule.get_day_of_week_display(),
                    'start_time': schedule.start_time.strftime('%H:%M'),
                    'end_time': schedule.end_time.strftime('%H:%M'),
                    'room': schedule.room,
                }

            terms_map[tid]['assignments'].append({
                'id': ta.id,
                'subject_code': ta.subject.code,
                'subject_name': ta.subject.name,
                'subject_units': float(ta.subject.units),
                'year_level': ta.subject.year_level,
                'year_level_display': (
                    ta.subject.get_year_level_display()
                    if ta.subject.year_level else None
                ),
                'subject_type': ta.subject.subject_type,
                'subject_type_display': ta.subject.get_subject_type_display(),
                'student_count': student_count,
                'grades_submitted': grades_submitted,
                'grades_encoded': grades_encoded,
                'schedule': sched_data,
            })

        current_terms = sorted(
            [t for t in terms_map.values() if t['is_current']],
            key=lambda t: t['year'], reverse=True,
        )
        past_terms = sorted(
            [t for t in terms_map.values() if not t['is_current']],
            key=lambda t: t['year'], reverse=True,
        )
        sorted_terms = current_terms + past_terms

        return Response({
            'id': str(f.id),
            'faculty_id': f.student_id,
            'full_name': f.full_name,
            'email': f.institutional_email,
            'department_code': f.department.code if f.department else None,
            'department_name': f.department.name if f.department else None,
            'terms': sorted_terms,
        })


class RegistrarStudentGradeHistoryView(APIView):
    """GET /api/grades/registrar/student/<uuid:pk>/
    Full grade history for one student grouped by term, with per-term and cumulative GPA.
    Ordered oldest-to-newest (1st year → 4th year) for academic validation.
    G-07 audited (PII access, RA 10173)."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get(self, request, pk):
        try:
            student = User.objects.select_related('program', 'department').get(
                id=pk, role='student'
            )
        except (User.DoesNotExist, Exception):
            return Response({'error': 'Student not found.'}, status=404)

        records = (
            GradeRecord.objects
            .filter(student=student, is_submitted=True)
            .select_related('subject', 'academic_term', 'encoded_by')
            .order_by('academic_term__year', 'academic_term__semester', 'subject__code')
        )

        current_term_ids = set(
            AcademicTerm.objects.filter(is_active=True).values_list('id', flat=True)
        )

        terms_map = {}
        for record in records:
            term = record.academic_term
            tid = term.id
            if tid not in terms_map:
                terms_map[tid] = {
                    'term_id': tid,
                    'term_display': str(term),
                    'year': term.year,
                    'semester': term.semester,
                    'semester_display': term.get_semester_display(),
                    'is_current': tid in current_term_ids,
                    'grades': [],
                    '_units_total': Decimal('0'),
                    '_quality_points': Decimal('0'),
                }

            entry = {
                'id': str(record.id),
                'subject_code': record.subject.code,
                'subject_name': record.subject.name,
                'subject_units': float(record.subject.units),
                'midterm_grade': str(record.midterm_grade) if record.midterm_grade is not None else None,
                'final_grade': str(record.final_grade) if record.final_grade is not None else None,
                'grade': record.grade,
                'remarks': record.remarks,
                'encoded_by_name': record.encoded_by.full_name if record.encoded_by else None,
                'submitted_at': record.submitted_at.isoformat() if record.submitted_at else None,
            }
            terms_map[tid]['grades'].append(entry)

            try:
                g = Decimal(record.grade)
                u = Decimal(str(record.subject.units))
                terms_map[tid]['_units_total'] += u
                terms_map[tid]['_quality_points'] += g * u
            except (InvalidOperation, TypeError, ValueError):
                pass

        # Compute year level per term from the student's current year level
        # and the gap between each term's academic year and the latest one.
        YEAR_LEVEL_LABELS = {1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year'}
        current_yl = student.year_level
        try:
            latest_start = max(
                int(td['year'].split('-')[0]) for td in terms_map.values()
            )
        except (ValueError, AttributeError):
            latest_start = None

        terms_list = []
        cumulative_units = Decimal('0')
        cumulative_qp = Decimal('0')

        for term_data in terms_map.values():
            units = term_data.pop('_units_total')
            qp = term_data.pop('_quality_points')
            if units > 0:
                term_data['term_gpa'] = str(
                    (qp / units).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                )
                term_data['units_earned'] = float(units)
                cumulative_units += units
                cumulative_qp += qp
            else:
                term_data['term_gpa'] = None
                term_data['units_earned'] = 0.0

            # Year level the student was in during this term
            yl = None
            if current_yl and latest_start:
                try:
                    term_start = int(term_data['year'].split('-')[0])
                    yl = current_yl - (latest_start - term_start)
                    if not (1 <= yl <= 4):
                        yl = None
                except (ValueError, AttributeError):
                    yl = None
            term_data['year_level'] = yl
            term_data['year_level_display'] = YEAR_LEVEL_LABELS.get(yl) if yl else None

            terms_list.append(term_data)

        cumulative_gpa = None
        if cumulative_units > 0:
            cumulative_gpa = str(
                (cumulative_qp / cumulative_units).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            )

        _audit(
            request.user, request.user.role,
            'student_grade_history_accessed', request.path,
            get_client_ip(request), 'success',
            {
                'student': str(student.id),
                'student_id_no': student.student_id,
                'term_count': len(terms_list),
            },
        )

        return Response({
            'student': {
                'id': str(student.id),
                'student_id': student.student_id,
                'full_name': student.full_name,
                'email': student.institutional_email,
                'program_name': student.program.name if student.program else None,
                'program_code': student.program.code if student.program else None,
                'department_name': student.department.name if student.department else None,
                'year_level': student.year_level,
                'year_level_display': student.get_year_level_display() if student.year_level else None,
            },
            'summary': {
                'cumulative_gpa': cumulative_gpa,
                'total_units_earned': float(cumulative_units),
                'total_terms': len(terms_list),
            },
            'terms': terms_list,
        })


# ── Admin / Registrar — Teaching Assignment management ────────────────────────

class AdminTeachingAssignmentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/grades/admin/assignments/"""
    serializer_class = TeachingAssignmentSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def get_queryset(self):
        qs = TeachingAssignment.objects.select_related('faculty', 'subject', 'academic_term')
        term_id = self.request.query_params.get('term')
        if term_id and term_id.isdigit():
            qs = qs.filter(academic_term_id=int(term_id))
        return qs

    def perform_create(self, serializer):
        serializer.save()
        _audit(
            self.request.user, self.request.user.role,
            'teaching_assignment_created', self.request.path,
            get_client_ip(self.request), 'success',
        )


class AdminTeachingAssignmentResolveView(APIView):
    """POST /api/grades/admin/assignments/resolve/

    Find (or create) the teaching assignment for a (subject, faculty, term,
    section) combination and return it. Lets the Class Schedules screen assign
    an instructor to a class in one step — if that subject+faculty+section
    class doesn't exist yet for the term, it's created here."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

    def post(self, request):
        subject_id = request.data.get('subject_id')
        faculty_id = request.data.get('faculty_id')
        term_id    = request.data.get('academic_term_id')
        program_id = request.data.get('program_id')
        year_level = request.data.get('year_level')
        block_name = (request.data.get('block_name') or '').strip()

        if not (subject_id and faculty_id and term_id):
            return Response({'error': 'Subject, faculty, and term are required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not (program_id and year_level and block_name):
            return Response({'error': 'Program, year level and block are required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            subject = Subject.objects.get(pk=subject_id, is_active=True)
        except (Subject.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Subject not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            faculty = User.objects.get(pk=faculty_id, role='faculty')
        except (User.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Faculty member not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            term = AcademicTerm.objects.get(pk=term_id)
        except (AcademicTerm.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Academic term not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            program = Program.objects.get(pk=program_id)
        except (Program.DoesNotExist, ValueError, TypeError):
            return Response({'error': 'Program not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            year_level = int(year_level)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid year level.'}, status=status.HTTP_400_BAD_REQUEST)

        # Find (or create) the block — this is the student cohort the class is for.
        block, _ = Block.objects.get_or_create(
            program=program, academic_term=term, year_level=year_level, name=block_name,
        )
        # The block's name doubles as the section label on the assignment.
        section = block.name
        ta, created = TeachingAssignment.objects.get_or_create(
            faculty=faculty, subject=subject, academic_term=term, section=section,
            defaults={'assigned_by': request.user, 'block': block},
        )
        if ta.block_id != block.id:
            ta.block = block
            ta.save(update_fields=['block'])
        if created:
            _audit(request.user, request.user.role, 'teaching_assignment_created',
                   request.path, get_client_ip(request), 'success',
                   {'subject': subject.code, 'faculty': faculty.full_name, 'block': str(block)})
        data = TeachingAssignmentSerializer(ta, context={'request': request}).data
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class AdminTeachingAssignmentDetailView(generics.DestroyAPIView):
    """DELETE /api/grades/admin/assignments/<pk>/"""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    queryset = TeachingAssignment.objects.all()

    def perform_destroy(self, instance):
        _audit(
            self.request.user, self.request.user.role,
            'teaching_assignment_deleted', self.request.path,
            get_client_ip(self.request), 'success',
            {'assignment': str(instance)},
        )
        instance.delete()


# ── Faculty — self-service teaching load ──────────────────────────────────────

class FacultyTeachingAssignmentCreateView(APIView):
    """POST /api/grades/faculty/assignments/ — faculty self-declares a teaching assignment."""
    permission_classes = [IsAuthenticated, IsFaculty]

    def post(self, request):
        serializer = FacultyAssignmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        subject = serializer.validated_data['subject_id']
        term = serializer.validated_data.get('academic_term')
        term_semester = serializer.validated_data.get('term_semester')
        block = serializer.validated_data.get('block')
        section = serializer.validated_data.get('section', '')
        ip = get_client_ip(request)

        if term is None:
            if not term_semester:
                return Response(
                    {'error': 'Please select First Term or Second Term.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            academic_year = current_academic_year()
            start_date, end_date = regular_term_date_range(academic_year, term_semester)
            term, _ = AcademicTerm.objects.get_or_create(
                year=academic_year,
                semester=term_semester,
                defaults={
                    'start_date': start_date,
                    'end_date': end_date,
                    'is_active': True,
                    'enrollment_open': False,
                },
            )

        if subject.semester != term.semester:
            return Response(
                {'error': f'{subject.code} is not available in the selected term ({term.get_semester_display()}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                assignment = TeachingAssignment.objects.create(
                    faculty=request.user,
                    subject=subject,
                    academic_term=term,
                    block=block,
                    section=section,
                    assigned_by=request.user,
                )
        except IntegrityError:
            sec = f' section {section}' if section else ''
            return Response(
                {'error': f'You already have a course for {subject.code}{sec} in this term.'},
                status=status.HTTP_409_CONFLICT,
            )

        _audit(
            request.user, request.user.role,
            'teaching_assignment_self_declared', f'assignment:{assignment.id}',
            ip, 'success', {'subject': subject.code, 'term': str(term)},
        )

        return Response(
            TeachingAssignmentSerializer(assignment).data,
            status=status.HTTP_201_CREATED,
        )


class AdminGradeSubmissionReportView(APIView):
    """GET /api/grades/admin/reports/submission-progress/?term=<id>"""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]

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

        assignments = (
            TeachingAssignment.objects
            .filter(academic_term=term)
            .select_related('faculty', 'subject')
            .prefetch_related('grade_records')
        )

        total = assignments.count()
        submitted_count = 0
        result = []

        for ta in assignments:
            enrolled_count = EnrollmentSubject.objects.filter(
                enrollment__academic_term=term,
                enrollment__status='approved',
                subject=ta.subject,
            ).count()

            grades_submitted = ta.grade_records.filter(is_submitted=True).count()
            grades_pending = max(0, enrolled_count - grades_submitted)
            fully_submitted = enrolled_count > 0 and grades_pending == 0
            if fully_submitted:
                submitted_count += 1

            result.append({
                'id': ta.id,
                'faculty_name': ta.faculty.full_name,
                'faculty_email': ta.faculty.institutional_email,
                'subject_code': ta.subject.code,
                'subject_name': ta.subject.name,
                'enrolled_count': enrolled_count,
                'grades_submitted': grades_submitted,
                'grades_pending': grades_pending,
                'fully_submitted': fully_submitted,
            })

        return Response({
            'term': str(term),
            'term_id': term.pk,
            'total_assignments': total,
            'submitted_count': submitted_count,
            'pending_count': total - submitted_count,
            'assignments': result,
        })


class FacultyTeachingAssignmentDeleteView(APIView):
    """DELETE /api/grades/faculty/assignments/<pk>/ — faculty removes their own assignment (blocks if submitted grades exist)."""
    permission_classes = [IsAuthenticated, IsFaculty]

    def delete(self, request, pk):
        ip = get_client_ip(request)

        try:
            assignment = TeachingAssignment.objects.select_related(
                'subject', 'academic_term'
            ).get(pk=pk, faculty=request.user)
        except TeachingAssignment.DoesNotExist:
            return Response(
                {'error': 'Teaching assignment not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if assignment.grade_records.filter(is_submitted=True).exists():
            return Response(
                {'error': 'Cannot remove an assignment that has submitted grades.'},
                status=status.HTTP_409_CONFLICT,
            )

        subject_code = assignment.subject.code
        term_str = str(assignment.academic_term)
        assignment.delete()

        _audit(
            request.user, request.user.role,
            'teaching_assignment_self_removed', f'assignment:{pk}',
            ip, 'success', {'subject': subject_code, 'term': term_str},
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Instructor-driven roster: class-list import + individual add ───────────────

class _CourseRosterBase(APIView):
    """Shared helpers for adding students to a course (TeachingAssignment)."""
    permission_classes = [IsAuthenticated, IsFaculty]

    def _get_course(self, request, pk):
        return TeachingAssignment.objects.select_related('subject', 'academic_term').get(
            pk=pk, faculty=request.user
        )

    def _add_student(self, course, user):
        """Create the course roster row (GradeRecord) for a student if absent.
        Returns 'added', 'already', or 'elsewhere' (already has this subject/term
        in another section)."""
        existing = GradeRecord.objects.filter(
            student=user, subject=course.subject, academic_term=course.academic_term
        ).first()
        if existing:
            if existing.teaching_assignment_id == course.id:
                return 'already'
            return 'elsewhere'
        GradeRecord.objects.create(
            student=user,
            subject=course.subject,
            academic_term=course.academic_term,
            teaching_assignment=course,
        )
        return 'added'


class FacultyCourseImportView(_CourseRosterBase):
    """POST /api/grades/faculty/courses/<pk>/import/ — upload a class list (.xlsx/.csv)."""
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        from .rostering import parse_classlist, resolve_student
        ip = get_client_ip(request)
        try:
            course = self._get_course(request, pk)
        except TeachingAssignment.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)

        upload = request.FILES.get('file')
        if not upload:
            return Response({'error': 'No file was uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > 5 * 1024 * 1024:
            return Response({'error': 'File is too large (max 5 MB).'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rows = parse_classlist(upload)
        except Exception:
            logger.error('Class-list parse failed', exc_info=True)
            return Response({'error': 'Could not read the file. Upload a valid .xlsx or .csv class list.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if rows is None:
            return Response({'error': 'Could not find the IDNO and Name columns in the file.'},
                            status=status.HTTP_400_BAD_REQUEST)

        added = already = elsewhere = matched = placeholders = 0
        seen = set()
        with transaction.atomic():
            for idno, name in rows:
                if idno in seen:
                    continue
                seen.add(idno)
                user, created = resolve_student(idno, name)
                if created:
                    placeholders += 1
                elif not user.is_placeholder:
                    matched += 1
                outcome = self._add_student(course, user)
                if outcome == 'added':
                    added += 1
                elif outcome == 'already':
                    already += 1
                else:
                    elsewhere += 1

        _audit(request.user, request.user.role, 'course_classlist_imported',
               f'assignment:{course.id}', ip, 'success',
               {'subject': course.subject.code, 'section': course.section,
                'rows': len(rows), 'added': added})

        return Response({
            'total_rows':   len(rows),
            'added':        added,
            'already':      already,
            'elsewhere':    elsewhere,
            'new_placeholders': placeholders,
            'matched_accounts': matched,
            'message': f'{added} student(s) added to {course.subject.code}'
                       + (f' [{course.section}]' if course.section else '') + '.',
        }, status=status.HTTP_200_OK)


class FacultyCourseAddStudentView(_CourseRosterBase):
    """POST /api/grades/faculty/courses/<pk>/add-student/ — add one student by IDNO + name."""

    def post(self, request, pk):
        from .rostering import resolve_student
        ip = get_client_ip(request)
        try:
            course = self._get_course(request, pk)
        except TeachingAssignment.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=status.HTTP_404_NOT_FOUND)

        student_id = (request.data.get('student_id') or '').strip()
        name = (request.data.get('name') or '').strip()
        if not student_id:
            return Response({'error': 'Student ID (IDNO) is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user, created = resolve_student(student_id, name)
        outcome = self._add_student(course, user)
        if outcome == 'already':
            return Response({'error': f'{user.student_id} is already in this course.'},
                            status=status.HTTP_409_CONFLICT)
        if outcome == 'elsewhere':
            return Response({'error': f'{user.student_id} already has {course.subject.code} in this term under another section.'},
                            status=status.HTTP_409_CONFLICT)

        _audit(request.user, request.user.role, 'course_student_added',
               f'assignment:{course.id}', ip, 'success',
               {'subject': course.subject.code, 'student_id': user.student_id,
                'placeholder': created})

        return Response({
            'student_uuid':  str(user.id),
            'student_name':  user.full_name,
            'student_id_no': user.student_id,
            'is_placeholder': user.is_placeholder,
            'message': f'{user.full_name or user.student_id} added.',
        }, status=status.HTTP_201_CREATED)
