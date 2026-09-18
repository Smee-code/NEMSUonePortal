import logging
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models import AuditLog, User
from authentication.permissions import (
    IsFaculty,
    IsRegistrarOrAdmin,
    IsStudent,
    get_client_ip,
)
from enrollment.models import AcademicTerm, EnrollmentSubject
from enrollment.terms import current_academic_year, regular_term_date_range
from .models import GradeRecord, TeachingAssignment
from .serializers import (
    FacultyAssignmentCreateSerializer,
    GradeEncodeSerializer,
    GradeSubmitSerializer,
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
    """GET /api/grades/my/ — student sees their own submitted grades only."""
    serializer_class = StudentGradeSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        return (
            GradeRecord.objects
            .filter(student=self.request.user, is_submitted=True)
            .select_related('subject', 'academic_term')
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
        assignment_id = request.query_params.get('assignment')
        if not assignment_id or not assignment_id.isdigit():
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

        enrolled = EnrollmentSubject.objects.filter(
            enrollment__academic_term=assignment.academic_term,
            enrollment__status='approved',
            subject=assignment.subject,
        ).select_related('enrollment__student')

        student_ids = [es.enrollment.student_id for es in enrolled]

        grade_map = {
            gr.student_id: gr
            for gr in GradeRecord.objects.filter(
                teaching_assignment=assignment,
                student_id__in=student_ids,
            )
        }

        result = []
        for es in enrolled:
            student = es.enrollment.student
            record = grade_map.get(student.id)
            result.append({
                'student_uuid': str(student.id),
                'student_name': student.full_name,
                'student_id_no': student.student_id,
                'grade_record_id': str(record.id) if record else None,
                'midterm_grade': str(record.midterm_grade) if record and record.midterm_grade is not None else '',
                'final_grade': str(record.final_grade) if record and record.final_grade is not None else '',
                'grade': record.grade if record else '',
                'remarks': record.remarks if record else '',
                'is_submitted': record.is_submitted if record else False,
                'encoded_at': record.encoded_at.isoformat() if record else None,
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
        ip = get_client_ip(request)

        # G-01: select_for_update() prevents race condition where a concurrent submit
        # flips is_submitted=True between the serializer check and the write
        with transaction.atomic():
            existing = GradeRecord.objects.select_for_update().filter(
                student_id=data['student_id'],
                subject=assignment.subject,
                academic_term=assignment.academic_term,
            ).first()

            if existing and existing.is_submitted:
                return Response(
                    {'error': 'Grades have already been submitted for this student in this subject.'},
                    status=status.HTTP_409_CONFLICT,
                )

            if existing:
                existing.midterm_grade = data['midterm_grade']
                existing.final_grade = data['final_grade']
                existing.grade = str(data['grade'])
                existing.remarks = data.get('remarks', '')
                existing.encoded_by = request.user
                existing.teaching_assignment = assignment
                existing.save()
                created = False
                record = existing
            else:
                record = GradeRecord.objects.create(
                    student_id=data['student_id'],
                    subject=assignment.subject,
                    academic_term=assignment.academic_term,
                    midterm_grade=data['midterm_grade'],
                    final_grade=data['final_grade'],
                    grade=str(data['grade']),
                    remarks=data.get('remarks', ''),
                    encoded_by=request.user,
                    teaching_assignment=assignment,
                )
                created = True

        action = 'grade_encoded' if created else 'grade_updated'
        _audit(
            request.user, request.user.role, action, request.path, ip, 'success',
            {
                'student': str(data['student_id']),
                'subject': assignment.subject.code,
                'term': str(assignment.academic_term),
                'midterm_grade': str(data['midterm_grade']),
                'final_grade': str(data['final_grade']),
                'grade': str(data['grade']),
            },
        )

        return Response(
            {'message': 'Grade saved.', 'id': str(record.id), 'created': created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class GradeSubmitView(APIView):
    """POST /api/grades/faculty/submit/ — submit all encoded grades for an assignment.
    G-02: count() and exists() are inside transaction.atomic() with select_for_update().
    G-03: blocks submission if any enrolled student is missing a grade (use force=true to override)."""
    permission_classes = [IsAuthenticated, IsFaculty]
    throttle_classes = [GradeSubmitThrottle]

    def post(self, request):
        serializer = GradeSubmitSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        assignment = serializer.validated_data['teaching_assignment_id']
        force = serializer.validated_data.get('force', False)
        ip = get_client_ip(request)
        now = timezone.now()

        # G-02: everything inside atomic + select_for_update to prevent stale count and TOCTOU
        with transaction.atomic():
            records = GradeRecord.objects.select_for_update().filter(
                teaching_assignment=assignment,
                is_submitted=False,
            ).exclude(grade='')

            count = records.count()
            if count == 0:
                return Response(
                    {'error': 'No encoded grades to submit for this assignment.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # G-03: enforce complete gradesheet before submission unless force=true
            enrolled_ids = set(
                EnrollmentSubject.objects.filter(
                    enrollment__academic_term=assignment.academic_term,
                    enrollment__status='approved',
                    subject=assignment.subject,
                ).values_list('enrollment__student_id', flat=True)
            )
            graded_ids = set(
                GradeRecord.objects.filter(
                    teaching_assignment=assignment,
                ).exclude(grade='').values_list('student_id', flat=True)
            )
            missing_count = len(enrolled_ids - graded_ids)

            if missing_count > 0 and not force:
                return Response(
                    {
                        'error': (
                            f'{missing_count} enrolled student(s) have no grade encoded. '
                            'Encode a grade (including INC or DRP) for all students, '
                            'or resubmit with force=true to submit only the encoded grades.'
                        ),
                        'missing_count': missing_count,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            records.update(is_submitted=True, submitted_at=now)

        _audit(
            request.user, request.user.role,
            'grades_submitted', request.path, ip, 'success',
            {
                'assignment_id': assignment.id,
                'subject': assignment.subject.code,
                'term': str(assignment.academic_term),
                'count': count,
                'forced': force,
            },
        )

        return Response({'message': f'{count} grade(s) submitted successfully.'})


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
            .select_related('department')
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
                'department_code': f.department.code if f.department else None,
                'department_name': f.department.name if f.department else None,
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
