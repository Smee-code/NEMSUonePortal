import logging

from django.db import transaction
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models import AuditLog
from authentication.permissions import IsFaculty, IsRegistrarOrAdmin, IsStudent, get_client_ip
from enrollment.models import AcademicTerm, EnrollmentRequest, EnrollmentSubject
from grades.models import TeachingAssignment

from .models import ClassSchedule
from .serializers import (
    ClassScheduleReadSerializer,
    ClassScheduleWriteSerializer,
    FacultySlotCreateSerializer,
    ScheduleSlotSerializer,
)
from .throttles import (
    FacultyScheduleReadThrottle,
    FacultyScheduleWriteThrottle,
    RegistrarScheduleManageThrottle,
    StudentScheduleReadThrottle,
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


def _check_conflicts(room, day_of_week, start_time, end_time, teaching_assignment, exclude_id=None):
    """Returns list of conflict error strings. Empty = no conflicts."""
    overlap = Q(start_time__lt=end_time) & Q(end_time__gt=start_time)
    qs = ClassSchedule.objects.filter(overlap, day_of_week=day_of_week)
    if exclude_id is not None:
        qs = qs.exclude(id=exclude_id)

    errors = []
    if qs.filter(room__iexact=room).exists():
        errors.append(f'Room "{room}" is already occupied on {day_of_week} during this time slot.')
    if qs.filter(teaching_assignment__faculty=teaching_assignment.faculty).exists():
        errors.append(
            f'{teaching_assignment.faculty.full_name} already has a class on '
            f'{day_of_week} during this time slot.'
        )
    return errors


# ── Student ────────────────────────────────────────────────────────────────────

class StudentScheduleView(APIView):
    """GET /api/schedules/student/?term_id=X
    Returns the student's enrolled subjects with schedule slots for the term.
    Subjects without a schedule slot are included (slots=[]) so the student
    knows they're enrolled but the schedule has not been posted yet."""
    permission_classes = [IsStudent]
    throttle_classes = [StudentScheduleReadThrottle]

    def get(self, request):
        ip = get_client_ip(request)
        term_id = request.query_params.get('term_id')

        if term_id:
            try:
                term = AcademicTerm.objects.get(pk=term_id)
            except AcademicTerm.DoesNotExist:
                return Response({'error': 'Term not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            term = AcademicTerm.objects.filter(is_active=True).first()
            if not term:
                return Response([])

        # Scope: student sees only their own approved enrollment (RBAC / A01)
        try:
            enrollment = EnrollmentRequest.objects.get(
                student=request.user,
                academic_term=term,
                status='approved',
            )
        except EnrollmentRequest.DoesNotExist:
            _audit(request.user, request.user.role, 'student_schedule_view',
                   f'term:{term.id}', ip, 'success', {'note': 'no_approved_enrollment'})
            return Response([])

        _audit(request.user, request.user.role, 'student_schedule_view',
               f'term:{term.id}', ip, 'success', {'term': str(term)})

        result = []
        for subject in enrollment.subjects.filter(is_active=True).order_by('code'):
            ta = TeachingAssignment.objects.filter(
                subject=subject,
                academic_term=term,
            ).select_related('faculty').first()

            slots_qs = ClassSchedule.objects.none()
            faculty_name = 'TBA'
            ta_id = None
            if ta:
                ta_id = ta.id
                faculty_name = ta.faculty.full_name
                slots_qs = ClassSchedule.objects.filter(teaching_assignment=ta)

            result.append({
                'teaching_assignment_id': ta_id,
                'subject_code': subject.code,
                'subject_name': subject.name,
                'subject_units': subject.units,
                'faculty_name': faculty_name,
                'term': str(term),
                'term_id': term.id,
                'slots': ScheduleSlotSerializer(slots_qs, many=True).data,
            })

        return Response(result)


# ── Faculty ────────────────────────────────────────────────────────────────────

class FacultyScheduleView(APIView):
    """GET /api/schedules/faculty/?term_id=X
    Returns the faculty's teaching assignments with schedule slots and enrolled student count."""
    permission_classes = [IsFaculty]
    throttle_classes = [FacultyScheduleReadThrottle]

    def get(self, request):
        ip = get_client_ip(request)
        term_id = request.query_params.get('term_id')

        ta_qs = TeachingAssignment.objects.filter(
            faculty=request.user,
        ).select_related('subject', 'academic_term')

        if term_id and term_id.isdigit():
            ta_qs = ta_qs.filter(academic_term_id=int(term_id))

        _audit(request.user, request.user.role, 'faculty_schedule_view',
               'teaching_assignments', ip, 'success',
               {'count': ta_qs.count(), 'term_id': term_id})

        result = []
        for ta in ta_qs:
            student_count = EnrollmentSubject.objects.filter(
                enrollment__academic_term=ta.academic_term,
                enrollment__status='approved',
                subject=ta.subject,
            ).count()

            result.append({
                'teaching_assignment_id': ta.id,
                'subject_code': ta.subject.code,
                'subject_name': ta.subject.name,
                'subject_units': ta.subject.units,
                'section': ta.section,
                'term': str(ta.academic_term),
                'term_id': ta.academic_term.id,
                'student_count': student_count,
                'slots': ScheduleSlotSerializer(
                    ClassSchedule.objects.filter(teaching_assignment=ta),
                    many=True,
                ).data,
            })

        return Response(result)


# ── Registrar / Admin ──────────────────────────────────────────────────────────

class ScheduleListCreateView(generics.ListCreateAPIView):
    """GET /api/schedules/ — list (registrar/admin)
    POST /api/schedules/ — create with room + faculty conflict detection"""
    permission_classes = [IsRegistrarOrAdmin]
    throttle_classes = [RegistrarScheduleManageThrottle]

    def get_serializer_class(self):
        return ClassScheduleWriteSerializer if self.request.method == 'POST' else ClassScheduleReadSerializer

    def get_queryset(self):
        qs = ClassSchedule.objects.select_related(
            'teaching_assignment__subject',
            'teaching_assignment__faculty',
            'teaching_assignment__academic_term',
        )
        p = self.request.query_params
        if p.get('term_id', '').isdigit():
            qs = qs.filter(teaching_assignment__academic_term_id=int(p['term_id']))
        if p.get('faculty_id'):
            qs = qs.filter(teaching_assignment__faculty_id=p['faculty_id'])
        if p.get('subject_id', '').isdigit():
            qs = qs.filter(teaching_assignment__subject_id=int(p['subject_id']))
        return qs

    def create(self, request, *args, **kwargs):
        write_ser = ClassScheduleWriteSerializer(data=request.data)
        write_ser.is_valid(raise_exception=True)
        self.perform_create(write_ser)
        read_ser = ClassScheduleReadSerializer(write_ser.instance)
        return Response(read_ser.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        data = serializer.validated_data
        ta = data['teaching_assignment']
        # S-02: wrap conflict check + insert in atomic block to prevent TOCTOU race
        with transaction.atomic():
            conflicts = _check_conflicts(
                data['room'], data['day_of_week'],
                data['start_time'], data['end_time'], ta,
            )
            if conflicts:
                raise DRFValidationError({'non_field_errors': conflicts})
            instance = serializer.save()
        _audit(
            self.request.user, self.request.user.role,
            'schedule_created', f'schedule:{instance.id}',
            get_client_ip(self.request), 'success',
            {'subject': ta.subject.code, 'day': data['day_of_week'], 'room': data['room']},
        )


class ScheduleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/schedules/<pk>/"""
    permission_classes = [IsRegistrarOrAdmin]
    throttle_classes = [RegistrarScheduleManageThrottle]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_serializer_class(self):
        return ClassScheduleWriteSerializer if self.request.method == 'PATCH' else ClassScheduleReadSerializer

    def get_queryset(self):
        return ClassSchedule.objects.select_related(
            'teaching_assignment__subject',
            'teaching_assignment__faculty',
            'teaching_assignment__academic_term',
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        write_ser = ClassScheduleWriteSerializer(instance, data=request.data, partial=partial)
        write_ser.is_valid(raise_exception=True)
        self.perform_update(write_ser)
        read_ser = ClassScheduleReadSerializer(write_ser.instance)
        return Response(read_ser.data)

    def perform_update(self, serializer):
        data = serializer.validated_data
        inst = serializer.instance

        # S-02: only run conflict check when scheduling fields are changing;
        # non-scheduling changes (e.g. building-only) skip it to avoid false positives
        # from other slots that legitimately share the same room/time.
        scheduling_fields = {'teaching_assignment', 'room', 'day_of_week', 'start_time', 'end_time'}
        if any(f in data for f in scheduling_fields):
            ta = data.get('teaching_assignment', inst.teaching_assignment)
            room = data.get('room', inst.room)
            day = data.get('day_of_week', inst.day_of_week)
            start = data.get('start_time', inst.start_time)
            end = data.get('end_time', inst.end_time)
            with transaction.atomic():
                conflicts = _check_conflicts(room, day, start, end, ta, exclude_id=inst.id)
                if conflicts:
                    raise DRFValidationError({'non_field_errors': conflicts})
                serializer.save()
        else:
            serializer.save()

        _audit(
            self.request.user, self.request.user.role,
            'schedule_updated', f'schedule:{inst.id}',
            get_client_ip(self.request), 'success',
        )

    def perform_destroy(self, instance):
        _audit(
            self.request.user, self.request.user.role,
            'schedule_deleted', f'schedule:{instance.id}',
            get_client_ip(self.request), 'success',
            {'subject': instance.teaching_assignment.subject.code},
        )
        instance.delete()


# ── Faculty — self-service schedule slots ─────────────────────────────────────

class FacultyScheduleSlotCreateView(APIView):
    """POST /api/schedules/faculty/slots/ — faculty adds a schedule slot to their own assignment."""
    permission_classes = [IsFaculty]
    throttle_classes = [FacultyScheduleWriteThrottle]

    def post(self, request):
        raw_slots = request.data.get('slots')
        is_bulk = isinstance(raw_slots, list)
        if is_bulk:
            if not raw_slots:
                return Response(
                    {'error': 'At least one meeting schedule is required.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if len(raw_slots) > 3:
                return Response(
                    {'error': 'A subject can be scheduled up to 3 meetings per week at a time.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            payloads = [
                {
                    **slot,
                    'teaching_assignment_id': request.data.get('teaching_assignment_id'),
                }
                for slot in raw_slots
            ]
        else:
            payloads = [request.data]

        validated_slots = []
        for payload in payloads:
            serializer = FacultySlotCreateSerializer(data=payload)
            serializer.is_valid(raise_exception=True)
            validated_slots.append(serializer.validated_data)

        assignment_ids = {slot['teaching_assignment_id'] for slot in validated_slots}
        if len(assignment_ids) != 1:
            return Response(
                {'error': 'All meeting schedules must belong to the same teaching assignment.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        first_slot = validated_slots[0]
        ip = get_client_ip(request)

        try:
            ta = TeachingAssignment.objects.select_related(
                'subject', 'academic_term', 'faculty'
            ).get(pk=first_slot['teaching_assignment_id'], faculty=request.user)
        except TeachingAssignment.DoesNotExist:
            return Response(
                {'error': 'Teaching assignment not found or does not belong to you.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        slots = []
        with transaction.atomic():
            for data in validated_slots:
                conflicts = _check_conflicts(
                    data['room'], data['day_of_week'],
                    data['start_time'], data['end_time'], ta,
                )
                if conflicts:
                    raise DRFValidationError({'non_field_errors': conflicts})

                slots.append(ClassSchedule.objects.create(
                    teaching_assignment=ta,
                    room=data['room'],
                    building=data.get('building', ''),
                    day_of_week=data['day_of_week'],
                    start_time=data['start_time'],
                    end_time=data['end_time'],
                ))

        _audit(
            request.user, request.user.role,
            'schedule_slot_added', f'assignment:{ta.id}', ip, 'success',
            {'subject': ta.subject.code, 'slot_count': len(slots)},
        )

        if is_bulk:
            return Response(ScheduleSlotSerializer(slots, many=True).data, status=status.HTTP_201_CREATED)
        return Response(ScheduleSlotSerializer(slots[0]).data, status=status.HTTP_201_CREATED)


class FacultyScheduleSlotDeleteView(APIView):
    """DELETE /api/schedules/faculty/slots/<pk>/ — faculty removes their own schedule slot."""
    permission_classes = [IsFaculty]
    throttle_classes = [FacultyScheduleWriteThrottle]

    def delete(self, request, pk):
        ip = get_client_ip(request)

        try:
            slot = ClassSchedule.objects.select_related(
                'teaching_assignment__faculty',
                'teaching_assignment__subject',
            ).get(pk=pk, teaching_assignment__faculty=request.user)
        except ClassSchedule.DoesNotExist:
            return Response(
                {'error': 'Schedule slot not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        subject_code = slot.teaching_assignment.subject.code
        slot.delete()

        _audit(
            request.user, request.user.role,
            'schedule_slot_removed', f'slot:{pk}', ip, 'success',
            {'subject': subject_code},
        )

        return Response(status=status.HTTP_204_NO_CONTENT)
