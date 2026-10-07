from rest_framework import serializers

from .models import Building, ClassSchedule, Room


class RoomSerializer(serializers.ModelSerializer):
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)

    class Meta:
        model = Room
        fields = ['id', 'name', 'room_type', 'room_type_display', 'is_active']


class BuildingSerializer(serializers.ModelSerializer):
    rooms = RoomSerializer(many=True, read_only=True)
    room_count = serializers.IntegerField(source='rooms.count', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)

    class Meta:
        model = Building
        fields = ['id', 'name', 'code', 'department', 'department_name',
                  'is_active', 'rooms', 'room_count']


class ScheduleSlotSerializer(serializers.ModelSerializer):
    day_display = serializers.CharField(source='get_day_of_week_display', read_only=True)

    class Meta:
        model = ClassSchedule
        fields = ['id', 'day_of_week', 'day_display', 'start_time', 'end_time', 'room', 'building']


class ClassScheduleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassSchedule
        fields = ['id', 'teaching_assignment', 'room', 'building', 'day_of_week', 'start_time', 'end_time']

    def validate(self, data):
        start = data.get('start_time', self.instance.start_time if self.instance else None)
        end = data.get('end_time', self.instance.end_time if self.instance else None)
        if start and end and start >= end:
            raise serializers.ValidationError({'end_time': 'End time must be after start time.'})
        return data


class ClassScheduleReadSerializer(serializers.ModelSerializer):
    day_display = serializers.CharField(source='get_day_of_week_display', read_only=True)
    subject_id = serializers.IntegerField(source='teaching_assignment.subject.id', read_only=True)
    subject_code = serializers.CharField(source='teaching_assignment.subject.code', read_only=True)
    subject_name = serializers.CharField(source='teaching_assignment.subject.name', read_only=True)
    section = serializers.CharField(source='teaching_assignment.section', read_only=True)
    subject_units = serializers.DecimalField(
        source='teaching_assignment.subject.units', max_digits=4,
        decimal_places=2, coerce_to_string=False, read_only=True
    )
    faculty_name = serializers.CharField(source='teaching_assignment.faculty.full_name', read_only=True)
    faculty_id = serializers.UUIDField(source='teaching_assignment.faculty.id', read_only=True)
    block_name = serializers.SerializerMethodField()
    block_program = serializers.SerializerMethodField()
    block_year_level = serializers.SerializerMethodField()
    department_id = serializers.SerializerMethodField()
    department_code = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    term_display = serializers.SerializerMethodField()
    term_id = serializers.IntegerField(source='teaching_assignment.academic_term.id', read_only=True)
    teaching_assignment_id = serializers.IntegerField(source='teaching_assignment.id', read_only=True)

    class Meta:
        model = ClassSchedule
        fields = [
            'id', 'teaching_assignment_id',
            'subject_id', 'subject_code', 'subject_name', 'subject_units', 'section',
            'block_name', 'block_program', 'block_year_level',
            'department_id', 'department_code', 'department_name',
            'faculty_name', 'faculty_id', 'term_display', 'term_id',
            'day_of_week', 'day_display', 'start_time', 'end_time', 'room', 'building',
        ]

    def get_term_display(self, obj):
        return str(obj.teaching_assignment.academic_term)

    @staticmethod
    def _department(obj):
        """The department a class belongs to: the block's program department,
        then the subject's program department, then the instructor's
        department. Lets the schedule be grouped by owning department."""
        ta = obj.teaching_assignment
        block = ta.block
        if block and block.program_id and block.program.department_id:
            return block.program.department
        subj = ta.subject
        if subj and subj.program_id and subj.program.department_id:
            return subj.program.department
        fac = ta.faculty
        return getattr(fac, 'department', None)

    def get_department_id(self, obj):
        d = self._department(obj)
        return d.id if d else None

    def get_department_code(self, obj):
        d = self._department(obj)
        return d.code if d else ''

    def get_department_name(self, obj):
        d = self._department(obj)
        return d.name if d else ''

    def get_block_name(self, obj):
        b = obj.teaching_assignment.block
        return b.name if b else ''

    def get_block_program(self, obj):
        b = obj.teaching_assignment.block
        return b.program_id if b else None

    def get_block_year_level(self, obj):
        b = obj.teaching_assignment.block
        return b.year_level if b else None


class FacultySlotCreateSerializer(serializers.Serializer):
    teaching_assignment_id = serializers.IntegerField()
    # Room is optional — the registrar assigns rooms. Faculty may still pre-fill one.
    room = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    building = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    day_of_week = serializers.ChoiceField(choices=[c[0] for c in ClassSchedule.DAY_CHOICES])
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()

    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError({'end_time': 'End time must be after start time.'})
        return data
