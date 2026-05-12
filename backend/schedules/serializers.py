from rest_framework import serializers

from .models import ClassSchedule


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
    subject_code = serializers.CharField(source='teaching_assignment.subject.code', read_only=True)
    subject_name = serializers.CharField(source='teaching_assignment.subject.name', read_only=True)
    subject_units = serializers.DecimalField(
        source='teaching_assignment.subject.units', max_digits=4,
        decimal_places=2, coerce_to_string=False, read_only=True
    )
    faculty_name = serializers.CharField(source='teaching_assignment.faculty.full_name', read_only=True)
    faculty_id = serializers.UUIDField(source='teaching_assignment.faculty.id', read_only=True)
    term_display = serializers.SerializerMethodField()
    term_id = serializers.IntegerField(source='teaching_assignment.academic_term.id', read_only=True)
    teaching_assignment_id = serializers.IntegerField(source='teaching_assignment.id', read_only=True)

    class Meta:
        model = ClassSchedule
        fields = [
            'id', 'teaching_assignment_id',
            'subject_code', 'subject_name', 'subject_units',
            'faculty_name', 'faculty_id', 'term_display', 'term_id',
            'day_of_week', 'day_display', 'start_time', 'end_time', 'room', 'building',
        ]

    def get_term_display(self, obj):
        return str(obj.teaching_assignment.academic_term)


class FacultySlotCreateSerializer(serializers.Serializer):
    teaching_assignment_id = serializers.IntegerField()
    room = serializers.CharField(max_length=50)
    building = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    day_of_week = serializers.ChoiceField(choices=[c[0] for c in ClassSchedule.DAY_CHOICES])
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()

    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError({'end_time': 'End time must be after start time.'})
        return data
