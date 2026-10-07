from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from rest_framework import serializers

from authentication.models import User
from enrollment.models import AcademicTerm, Block, Subject

from .models import GradeRecord, TeachingAssignment


class TeachingAssignmentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.full_name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_units = serializers.DecimalField(
        source='subject.units', max_digits=4, decimal_places=2,
        coerce_to_string=False, read_only=True
    )
    term_display = serializers.SerializerMethodField(read_only=True)
    term_id = serializers.IntegerField(source='academic_term.id', read_only=True)
    block_name = serializers.SerializerMethodField(read_only=True)

    faculty_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='faculty'),
        source='faculty',
        write_only=True,
    )
    subject_id = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.filter(is_active=True),
        source='subject',
        write_only=True,
    )
    academic_term_id = serializers.PrimaryKeyRelatedField(
        queryset=AcademicTerm.objects.filter(is_active=True),
        source='academic_term',
        write_only=True,
    )

    class Meta:
        model = TeachingAssignment
        fields = [
            'id', 'faculty_id', 'faculty_name',
            'subject_id', 'subject_code', 'subject_name', 'subject_units',
            'academic_term_id', 'term_id', 'term_display',
            'block_name', 'section', 'assigned_at',
        ]

    def get_term_display(self, obj):
        return str(obj.academic_term)

    def get_block_name(self, obj):
        return obj.block.name if obj.block_id else None

    def create(self, validated_data):
        validated_data['assigned_by'] = self.context['request'].user
        return super().create(validated_data)


class StudentGradeSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_units = serializers.DecimalField(
        source='subject.units', max_digits=4, decimal_places=2,
        coerce_to_string=False, read_only=True
    )
    term_display = serializers.SerializerMethodField()
    term_year = serializers.CharField(source='academic_term.year', read_only=True)
    term_semester = serializers.CharField(source='academic_term.semester', read_only=True)
    term_semester_display = serializers.CharField(
        source='academic_term.get_semester_display', read_only=True
    )
    section = serializers.CharField(source='teaching_assignment.section', read_only=True, default='')
    faculty_name = serializers.SerializerMethodField()

    def get_faculty_name(self, obj):
        ta = obj.teaching_assignment
        if ta and ta.faculty_id:
            return ta.faculty.full_name
        # The record lost its link (its class was deleted or re-declared, which
        # SET_NULL's the assignment). Resolve the instructor from the class
        # currently declared for this student's block, so the student still
        # sees who teaches the course.
        fallback = self._fallback_assignment(obj)
        return fallback.faculty.full_name if fallback and fallback.faculty_id else None

    @staticmethod
    def _fallback_assignment(obj):
        from enrollment.models import EnrollmentRequest
        from grades.models import TeachingAssignment
        block_id = (
            EnrollmentRequest.objects
            .filter(student_id=obj.student_id,
                    academic_term_id=obj.academic_term_id,
                    status='approved')
            .values_list('block_id', flat=True)
            .first()
        )
        if not block_id:
            return None
        return (
            TeachingAssignment.objects
            .filter(subject_id=obj.subject_id,
                    academic_term_id=obj.academic_term_id,
                    block_id=block_id)
            .select_related('faculty')
            .first()
        )

    class Meta:
        model = GradeRecord
        fields = [
            'id', 'subject_code', 'subject_name', 'subject_units',
            'section', 'faculty_name',
            'term_display', 'term_year', 'term_semester', 'term_semester_display',
            'midterm_grade', 'final_grade', 'grade', 'remarks',
            'is_submitted', 'submitted_at',
            'midterm_submitted', 'final_submitted', 'is_dropped',
        ]

    def get_term_display(self, obj):
        return str(obj.academic_term)

    def to_representation(self, obj):
        data = super().to_representation(obj)
        # Grades appear stage by stage (paper rule): the midterm once the faculty
        # submits midterms, the final and the combined result once finals are in.
        if not obj.midterm_submitted:
            data['midterm_grade'] = None
        if not obj.final_submitted:
            data['final_grade'] = None
        if not obj.result_visible:
            data['grade'] = None
            data['remarks'] = None
            data['submitted_at'] = None
        return data


class GradeEncodeSerializer(serializers.Serializer):
    """One stage (midterm|final) of one student's grade. `status` picks the kind of
    entry: a numeric grade, INC (incomplete), or DRP (dropped — whole row)."""
    student_id = serializers.UUIDField()
    teaching_assignment_id = serializers.IntegerField()
    stage = serializers.ChoiceField(choices=['midterm', 'final'])
    status = serializers.ChoiceField(choices=['grade', 'inc', 'drp'])
    value = serializers.DecimalField(
        max_digits=4, decimal_places=2,
        min_value=Decimal('1.00'), max_value=Decimal('5.00'),
        required=False, allow_null=True,
    )
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate_value(self, value):
        if value is None:
            return value
        try:
            value = Decimal(value)
        except (InvalidOperation, TypeError):
            raise serializers.ValidationError('Grade must be a valid number.')
        return value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def validate(self, data):
        faculty = self.context['request'].user

        try:
            assignment = TeachingAssignment.objects.select_related(
                'subject', 'academic_term'
            ).get(pk=data['teaching_assignment_id'], faculty=faculty)
        except TeachingAssignment.DoesNotExist:
            raise serializers.ValidationError(
                'Teaching assignment not found or does not belong to you.'
            )

        # Verify the student is on this course's roster (the instructor added them
        # via class-list import or individually — one GradeRecord per roster member).
        from .models import GradeRecord
        if not GradeRecord.objects.filter(
            student_id=data['student_id'],
            teaching_assignment=assignment,
        ).exists():
            raise serializers.ValidationError(
                'This student is not in your class roster for this course.'
            )

        # A numeric entry must carry a value; INC/DRP carry no number.
        if data['status'] == 'grade' and data.get('value') is None:
            raise serializers.ValidationError('Enter a grade value to save.')

        # Note: stage-lock / finals-gate checks happen in the view under a DB lock.
        data['assignment'] = assignment
        return data


class GradeSubmitSerializer(serializers.Serializer):
    teaching_assignment_id = serializers.IntegerField()
    stage = serializers.ChoiceField(choices=['midterm', 'final'])
    force = serializers.BooleanField(default=False, required=False)

    def validate_teaching_assignment_id(self, value):
        faculty = self.context['request'].user
        try:
            return TeachingAssignment.objects.select_related(
                'subject', 'academic_term'
            ).get(pk=value, faculty=faculty)
        except TeachingAssignment.DoesNotExist:
            raise serializers.ValidationError(
                'Teaching assignment not found or does not belong to you.'
            )


class MidtermReopenRequestSerializer(serializers.ModelSerializer):
    teaching_assignment_id = serializers.PrimaryKeyRelatedField(
        queryset=TeachingAssignment.objects.all(),
        source='teaching_assignment',
        write_only=True,
    )
    subject_code = serializers.CharField(source='teaching_assignment.subject.code', read_only=True)
    subject_name = serializers.CharField(source='teaching_assignment.subject.name', read_only=True)
    section = serializers.CharField(source='teaching_assignment.section', read_only=True, default='')
    term_display = serializers.SerializerMethodField()
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, default=None)

    class Meta:
        from .models import MidtermReopenRequest
        model = MidtermReopenRequest
        fields = [
            'id', 'teaching_assignment_id',
            'subject_code', 'subject_name', 'section', 'term_display',
            'reason', 'status', 'admin_note',
            'requested_by_name', 'reviewed_by_name',
            'created_at', 'reviewed_at',
        ]
        read_only_fields = ['status', 'admin_note', 'created_at', 'reviewed_at']

    def get_term_display(self, obj):
        return str(obj.teaching_assignment.academic_term)


class MidtermReopenReviewSerializer(serializers.Serializer):
    """Admin approve/reject payload."""
    status = serializers.ChoiceField(choices=['approved', 'rejected'])
    admin_note = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class FacultyAssignmentCreateSerializer(serializers.Serializer):
    subject_id = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.filter(
            is_active=True,
            program__isnull=False,
            program__is_active=True,
            program__department__is_active=True,
        ),
    )
    academic_term_id = serializers.PrimaryKeyRelatedField(
        queryset=AcademicTerm.objects.filter(is_active=True),
        source='academic_term',
        required=False,
    )
    term_semester = serializers.ChoiceField(
        choices=[('first', 'First Term'), ('second', 'Second Term')],
        required=False,
        write_only=True,
    )
    block_id = serializers.PrimaryKeyRelatedField(
        queryset=Block.objects.all(),
        source='block',
    )
    # Optional meeting schedule declared by the faculty. If given, a room-less
    # ClassSchedule slot is created per day (same time) for the registrar to
    # assign rooms to. Omit to just declare the course and add slots later.
    days = serializers.ListField(
        child=serializers.ChoiceField(choices=['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
        required=False, default=list,
    )
    start_time = serializers.TimeField(required=False, allow_null=True)
    end_time = serializers.TimeField(required=False, allow_null=True)

    def validate(self, data):
        days = data.get('days') or []
        start = data.get('start_time')
        end = data.get('end_time')
        if days or start is not None or end is not None:
            if not days:
                raise serializers.ValidationError({'days': 'Pick at least one meeting day.'})
            if start is None or end is None:
                raise serializers.ValidationError('Enter both a start and end time for the schedule.')
            if start >= end:
                raise serializers.ValidationError({'end_time': 'End time must be after the start time.'})
            # De-duplicate while preserving order.
            data['days'] = list(dict.fromkeys(days))
        return data


class RegistrarGradeSerializer(serializers.ModelSerializer):
    student_uuid = serializers.UUIDField(source='student.id', read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id_no = serializers.CharField(source='student.student_id', read_only=True)
    student_email = serializers.CharField(source='student.institutional_email', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    term_display = serializers.SerializerMethodField()
    encoded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GradeRecord
        fields = [
            'id', 'student_uuid', 'student_name', 'student_id_no', 'student_email',
            'subject_code', 'subject_name', 'term_display',
            'midterm_grade', 'final_grade', 'grade', 'remarks', 'is_submitted',
            'encoded_by_name', 'encoded_at', 'submitted_at',
        ]

    def get_term_display(self, obj):
        return str(obj.academic_term)

    def get_encoded_by_name(self, obj):
        return obj.encoded_by.full_name if obj.encoded_by else None
