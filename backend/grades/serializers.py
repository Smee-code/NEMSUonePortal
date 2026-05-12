from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from rest_framework import serializers

from authentication.models import User
from enrollment.models import AcademicTerm, Subject

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
            'academic_term_id', 'term_id', 'term_display', 'assigned_at',
        ]

    def get_term_display(self, obj):
        return str(obj.academic_term)

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

    class Meta:
        model = GradeRecord
        fields = [
            'id', 'subject_code', 'subject_name', 'subject_units',
            'term_display', 'term_year', 'term_semester', 'term_semester_display',
            'midterm_grade', 'final_grade', 'grade', 'remarks', 'submitted_at',
        ]

    def get_term_display(self, obj):
        return str(obj.academic_term)


class GradeEncodeSerializer(serializers.Serializer):
    student_id = serializers.UUIDField()
    teaching_assignment_id = serializers.IntegerField()
    midterm_grade = serializers.DecimalField(max_digits=4, decimal_places=2, min_value=Decimal('1.00'), max_value=Decimal('5.00'))
    final_grade = serializers.DecimalField(max_digits=4, decimal_places=2, min_value=Decimal('1.00'), max_value=Decimal('5.00'))
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate_midterm_grade(self, value):
        return self._validate_grade_precision(value, 'midterm_grade')

    def validate_final_grade(self, value):
        return self._validate_grade_precision(value, 'final_grade')

    def _validate_grade_precision(self, value, field):
        try:
            value = Decimal(value)
        except (InvalidOperation, TypeError):
            raise serializers.ValidationError(f'{field} must be a valid number.')
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

        # Verify student is approved-enrolled in this subject/term
        from enrollment.models import EnrollmentSubject
        if not EnrollmentSubject.objects.filter(
            enrollment__student_id=data['student_id'],
            enrollment__academic_term=assignment.academic_term,
            enrollment__status='approved',
            subject=assignment.subject,
        ).exists():
            raise serializers.ValidationError(
                'Student is not approved-enrolled in this subject for this term.'
            )

        # Note: is_submitted re-check happens in the view under a DB lock (G-01 fix)
        data['assignment'] = assignment
        data['grade'] = ((data['midterm_grade'] + data['final_grade']) / Decimal('2')).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        return data


class GradeSubmitSerializer(serializers.Serializer):
    teaching_assignment_id = serializers.IntegerField()
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
