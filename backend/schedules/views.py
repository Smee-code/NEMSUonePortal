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
from grades.models import GradeRecord, TeachingAssignment

from .models import Building, ClassSchedule, Room
from .serializers import (
    BuildingSerializer,
    ClassScheduleReadSerializer,
    ClassScheduleWriteSerializer,
    FacultySlotCreateSerializer,
    RoomSerializer,
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
    # Block (student cohort) clash: a block can't be in two classes at once,
    # regardless of room or instructor.
    if teaching_assignment.block_id and qs.filter(
        teaching_assignment__block_id=teaching_assignment.block_id
    ).exists():
        errors.append(
            f'{teaching_assignment.block} already has a class on '
            f'{day_of_week} during this time slot.'
        )
    return errors


# ── Facilities: buildings & rooms (registrar / admin) ──────────────────────────

class FacilityBuildingListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/schedules/facilities/buildings/
    List every building (with nested rooms) or create one. A building may belong
    to a department, or be shared (department omitted)."""
    permission_classes = [IsRegistrarOrAdmin]
    serializer_class = BuildingSerializer

    def get_queryset(self):
        return Building.objects.select_related('department').prefetch_related('rooms')

    def perform_create(self, serializer):
        obj = serializer.save()
        _audit(self.request.user, self.request.user.role, 'building_created',
               f'building:{obj.id}', get_client_ip(self.request), 'success', {'name': obj.name})


class FacilityBuildingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/schedules/facilities/buildings/<pk>/"""
    permission_classes = [IsRegistrarOrAdmin]
    serializer_class = BuildingSerializer
    queryset = Building.objects.select_related('department').prefetch_related('rooms')
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def perform_update(self, serializer):
        obj = serializer.save()
        _audit(self.request.user, self.request.user.role, 'building_updated',
               f'building:{obj.id}', get_client_ip(self.request), 'success', {'name': obj.name})

    def perform_destroy(self, instance):
        _audit(self.request.user, self.request.user.role, 'building_deleted',
               f'building:{instance.id}', get_client_ip(self.request), 'success', {'name': instance.name})
        instance.delete()


class FacilityRoomCreateView(APIView):
    """POST /api/schedules/facilities/buildings/<building_id>/rooms/ — add a room."""
    permission_classes = [IsRegistrarOrAdmin]

    def post(self, request, building_id):
        try:
            building = Building.objects.get(pk=building_id)
        except Building.DoesNotExist:
            return Response({'error': 'Building not found.'}, status=status.HTTP_404_NOT_FOUND)
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'error': 'Room name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        room_type = request.data.get('room_type', 'lecture')
        if room_type not in dict(Room.ROOM_TYPES):
            room_type = 'lecture'
        if Room.objects.filter(building=building, name__iexact=name).exists():
            return Response({'error': 'That room already exists in this building.'},
                            status=status.HTTP_400_BAD_REQUEST)
        room = Room.objects.create(building=building, name=name, room_type=room_type)
        _audit(request.user, request.user.role, 'room_created', f'room:{room.id}',
               get_client_ip(request), 'success', {'name': name, 'building': building.name})
        return Response(RoomSerializer(room).data, status=status.HTTP_201_CREATED)


class FacilityRoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH/DELETE /api/schedules/facilities/rooms/<pk>/"""
    permission_classes = [IsRegistrarOrAdmin]
    serializer_class = RoomSerializer
    queryset = Room.objects.all()
    http_method_names = ['patch', 'delete', 'head', 'options']

    def perform_update(self, serializer):
        obj = serializer.save()
        _audit(self.request.user, self.request.user.role, 'room_updated',
               f'room:{obj.id}', get_client_ip(self.request), 'success', {'name': obj.name})

    def perform_destroy(self, instance):
        _audit(self.request.user, self.request.user.role, 'room_deleted',
               f'room:{instance.id}', get_client_ip(self.request), 'success', {'name': instance.name})
        instance.delete()


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

        # Scope (RBAC / A01): the student's classes are the courses a professor
        # has added them to — one GradeRecord per roster membership — for this term.
        records = (
            GradeRecord.objects
            .filter(
                student=request.user,
                academic_term=term,
                teaching_assignment__isnull=False,
            )
            .select_related(
                'teaching_assignment',
                'teaching_assignment__subject',
                'teaching_assignment__faculty',
            )
        )

        seen = set()
        result = []
        for rec in records:
            ta = rec.teaching_assignment
            if ta.id in seen:
                continue
            seen.add(ta.id)
            subject = ta.subject
            slots_qs = ClassSchedule.objects.filter(teaching_assignment=ta)
            result.append({
                'teaching_assignment_id': ta.id,
                'subject_code': subject.code,
                'subject_name': subject.name,
                'subject_units': subject.units,
                'faculty_name': ta.faculty.full_name if ta.faculty_id else 'TBA',
                'section': ta.section,
                'term': str(term),
                'term_id': term.id,
                'slots': ScheduleSlotSerializer(slots_qs, many=True).data,
            })
        result.sort(key=lambda r: r['subject_code'])

        _audit(request.user, request.user.role, 'student_schedule_view',
               f'term:{term.id}', ip, 'success', {'term': str(term), 'courses': len(result)})

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
            # Roster size = students the instructor added to this course.
            student_count = GradeRecord.objects.filter(teaching_assignment=ta).count()

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
