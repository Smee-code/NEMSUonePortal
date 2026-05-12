from rest_framework import serializers

from .models import AcademicTerm, CurriculumDocument, Department, EnrollmentRequest, EnrollmentSchedule, EnrollmentSubject, PendingEnrollment, PreEnrollmentDocument, Program, Subject


class AcademicTermSerializer(serializers.ModelSerializer):
    semester_display = serializers.CharField(source='get_semester_display', read_only=True)

    class Meta:
        model = AcademicTerm
        fields = [
            'id', 'year', 'semester', 'semester_display',
            'is_active', 'enrollment_open', 'start_date', 'end_date',
        ]


class SubjectSerializer(serializers.ModelSerializer):
    units = serializers.DecimalField(max_digits=4, decimal_places=2, coerce_to_string=False)
    program = serializers.IntegerField(source='program_id', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    program_code = serializers.CharField(source='program.code', read_only=True)
    year_level_display = serializers.CharField(source='get_year_level_display', read_only=True)
    semester_display = serializers.CharField(source='get_semester_display', read_only=True)
    subject_type_display = serializers.CharField(source='get_subject_type_display', read_only=True)
    prerequisite_code = serializers.CharField(source='prerequisite.code', read_only=True)
    prerequisite_name = serializers.CharField(source='prerequisite.name', read_only=True)

    class Meta:
        model = Subject
        fields = [
            'id', 'code', 'name', 'units', 'subject_type', 'subject_type_display', 'description',
            'program', 'program_name', 'program_code',
            'year_level', 'year_level_display',
            'semester', 'semester_display',
            'prerequisite', 'prerequisite_code', 'prerequisite_name',
        ]


class DepartmentSerializer(serializers.ModelSerializer):
    program_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'is_active', 'program_count']

    def get_program_count(self, obj):
        return obj.programs.count()


class ProgramSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_code = serializers.CharField(source='department.code', read_only=True)
    subject_count = serializers.SerializerMethodField()

    class Meta:
        model = Program
        fields = [
            'id', 'name', 'code', 'department', 'department_name', 'department_code',
            'description', 'is_active', 'subject_count',
        ]

    def get_subject_count(self, obj):
        return obj.subjects.count()


class AdminSubjectSerializer(serializers.ModelSerializer):
    units = serializers.DecimalField(max_digits=4, decimal_places=2, coerce_to_string=False)
    program_name = serializers.CharField(source='program.name', read_only=True)
    program_code = serializers.CharField(source='program.code', read_only=True)
    year_level_display = serializers.CharField(source='get_year_level_display', read_only=True)
    semester_display = serializers.CharField(source='get_semester_display', read_only=True)
    subject_type_display = serializers.CharField(source='get_subject_type_display', read_only=True)
    prerequisite_code = serializers.CharField(source='prerequisite.code', read_only=True)
    prerequisite_name = serializers.CharField(source='prerequisite.name', read_only=True)

    class Meta:
        model = Subject
        fields = [
            'id', 'code', 'name', 'units', 'subject_type', 'subject_type_display',
            'description', 'is_active',
            'program', 'program_name', 'program_code',
            'year_level', 'year_level_display',
            'semester', 'semester_display',
            'prerequisite', 'prerequisite_code', 'prerequisite_name',
        ]

    def validate(self, attrs):
        prerequisite = attrs.get(
            'prerequisite',
            getattr(self.instance, 'prerequisite', None),
        )
        program = attrs.get('program', getattr(self.instance, 'program', None))

        if self.instance and prerequisite and prerequisite.pk == self.instance.pk:
            raise serializers.ValidationError({
                'prerequisite': 'A course cannot be its own prerequisite.'
            })

        if self.instance and prerequisite and prerequisite.prerequisite_id == self.instance.pk:
            raise serializers.ValidationError({
                'prerequisite': 'This prerequisite would create a circular dependency.'
            })

        if prerequisite and program and prerequisite.program_id and prerequisite.program_id != program.pk:
            raise serializers.ValidationError({
                'prerequisite': 'Prerequisite must belong to the same program as the course.'
            })

        return attrs


# Used by the registrar/admin list — includes student PII that the reviewer needs
class EnrollmentRequestSerializer(serializers.ModelSerializer):
    academic_term = AcademicTermSerializer(read_only=True)
    subjects = SubjectSerializer(many=True, read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    student_email = serializers.CharField(source='student.institutional_email', read_only=True)
    year_level_display = serializers.CharField(source='get_year_level_display', read_only=True)
    program_code = serializers.CharField(source='program.code', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    block_name = serializers.CharField(source='block.name', read_only=True)
    total_units = serializers.SerializerMethodField()

    student_type_display = serializers.CharField(source='get_student_type_display', read_only=True)

    class Meta:
        model = EnrollmentRequest
        fields = [
            'id', 'student_name', 'student_id', 'student_email',
            'academic_term', 'year_level', 'year_level_display',
            'program_code', 'program_name', 'block_name',
            'student_type', 'student_type_display',
            'subjects', 'status', 'remarks',
            'submitted_at', 'processed_at', 'total_units',
        ]

    def get_total_units(self, obj):
        return float(sum(s.units for s in obj.subjects.all()))


# Used by the student's own history view — omits PII fields (A02)
class StudentOwnEnrollmentSerializer(serializers.ModelSerializer):
    academic_term = AcademicTermSerializer(read_only=True)
    subjects = SubjectSerializer(many=True, read_only=True)
    year_level_display = serializers.CharField(source='get_year_level_display', read_only=True)
    program_code = serializers.CharField(source='program.code', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    block_name = serializers.CharField(source='block.name', read_only=True)
    student_type_display = serializers.CharField(source='get_student_type_display', read_only=True)
    total_units = serializers.SerializerMethodField()

    class Meta:
        model = EnrollmentRequest
        fields = [
            'id', 'academic_term', 'year_level', 'year_level_display',
            'program_code', 'program_name', 'block_name',
            'student_type', 'student_type_display',
            'subjects', 'status', 'remarks', 'submitted_at', 'processed_at', 'total_units',
        ]

    def get_total_units(self, obj):
        return float(sum(s.units for s in obj.subjects.all()))


class CurriculumDocumentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = CurriculumDocument
        fields = ['id', 'file_name', 'file_size', 'uploaded_at', 'url']

    def get_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url


class EnrollmentScheduleSerializer(serializers.ModelSerializer):
    student_type_display = serializers.CharField(source='get_student_type_display', read_only=True)

    class Meta:
        model  = EnrollmentSchedule
        fields = ['id', 'term', 'student_type', 'student_type_display', 'start_date', 'end_date', 'display_order']

    def validate(self, attrs):
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end   = attrs.get('end_date',   getattr(self.instance, 'end_date',   None))
        if start and end and end < start:
            raise serializers.ValidationError({'end_date': 'End date must be on or after start date.'})
        return attrs


class EnrollmentSubmitSerializer(serializers.Serializer):
    academic_term_id = serializers.IntegerField()
    program_id = serializers.IntegerField()
    year_level = serializers.IntegerField()
    subject_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=10,
    )
    student_type = serializers.ChoiceField(
        choices=['freshman', 'regular', 'shiftee', 'transferee'],
        required=False,
        default='regular',
    )

    def validate_academic_term_id(self, value):
        try:
            return AcademicTerm.objects.get(pk=value, is_active=True, enrollment_open=True)
        except AcademicTerm.DoesNotExist:
            raise serializers.ValidationError(
                'Enrollment is not open for the selected term.'
            )

    def validate_program_id(self, value):
        try:
            return Program.objects.get(pk=value, is_active=True)
        except Program.DoesNotExist:
            raise serializers.ValidationError('Selected program is invalid or inactive.')

    def validate_year_level(self, value):
        if value not in {1, 2, 3, 4}:
            raise serializers.ValidationError('Year level must be 1, 2, 3, or 4.')
        return value

    def validate_subject_ids(self, value):
        subjects = list(Subject.objects.filter(pk__in=value, is_active=True))
        if len(subjects) != len(value):
            raise serializers.ValidationError(
                'One or more selected subjects are invalid or inactive.'
            )
        return subjects

    def validate(self, data):
        term = data['academic_term_id']
        program = data['program_id']
        subjects = data['subject_ids']

        wrong_program = [s.code for s in subjects if s.program_id != program.id]
        if wrong_program:
            raise serializers.ValidationError({
                'subject_ids': (
                    'Selected subjects must belong to the selected program. '
                    f'Invalid: {", ".join(wrong_program)}.'
                )
            })

        wrong_semester = [s.code for s in subjects if s.semester != term.semester]
        if wrong_semester:
            raise serializers.ValidationError({
                'subject_ids': (
                    'Selected subjects must match the selected academic term. '
                    f'Invalid: {", ".join(wrong_semester)}.'
                )
            })

        return data


class RegistrarReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['approved', 'rejected'])
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate(self, data):
        if data.get('status') == 'rejected' and not data.get('remarks', '').strip():
            raise serializers.ValidationError(
                {'remarks': 'A reason is required when rejecting an enrollment request.'}
            )
        return data


class PendingEnrollmentCreateSerializer(serializers.Serializer):
    student_type   = serializers.ChoiceField(choices=['freshman', 'transferee'])
    first_name     = serializers.CharField(max_length=100)
    last_name      = serializers.CharField(max_length=100)
    middle_name    = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    suffix         = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    email          = serializers.EmailField()
    contact_number = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    date_of_birth  = serializers.DateField(required=False, allow_null=True, default=None)
    sex            = serializers.CharField(max_length=10, required=False, allow_blank=True, default='')
    program_name   = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    year_level     = serializers.IntegerField(min_value=1, max_value=4, default=1)
    term_id        = serializers.IntegerField(required=False, allow_null=True, default=None)

    def validate_email(self, value):
        if PendingEnrollment.objects.filter(email=value, status__in=['pending', 'approved']).exists():
            raise serializers.ValidationError(
                'An active pre-enrollment application already exists for this email address.'
            )
        return value

    def validate_term_id(self, value):
        if value is None:
            return None
        try:
            return AcademicTerm.objects.get(pk=value, is_active=True)
        except AcademicTerm.DoesNotExist:
            return None

    def validate_program_name(self, value):
        return value.strip()


class PendingEnrollmentListSerializer(serializers.ModelSerializer):
    student_type_display = serializers.CharField(source='get_student_type_display', read_only=True)
    status_display       = serializers.CharField(source='get_status_display', read_only=True)
    program_name         = serializers.CharField(source='program.name', read_only=True)
    program_code         = serializers.CharField(source='program.code', read_only=True)
    term_display         = serializers.SerializerMethodField()
    full_name            = serializers.CharField(read_only=True)

    class Meta:
        model = PendingEnrollment
        fields = [
            'id', 'reference_number', 'student_type', 'student_type_display',
            'first_name', 'last_name', 'middle_name', 'suffix', 'full_name',
            'email', 'contact_number', 'date_of_birth', 'sex',
            'program_name', 'program_code', 'year_level',
            'status', 'status_display', 'remarks',
            'term_display', 'created_at', 'reviewed_at',
        ]

    def get_term_display(self, obj):
        if obj.academic_term:
            return f"{obj.academic_term.get_semester_display()} {obj.academic_term.year}"
        return None


class PreEnrollmentDocumentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = PreEnrollmentDocument
        fields = ['id', 'requirement_label', 'file_name', 'file_size', 'uploaded_at', 'url']

    def get_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url


class PendingEnrollmentReviewSerializer(serializers.Serializer):
    status  = serializers.ChoiceField(choices=['approved', 'rejected'])
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate(self, data):
        if data.get('status') == 'rejected' and not data.get('remarks', '').strip():
            raise serializers.ValidationError(
                {'remarks': 'A reason is required when rejecting a pre-enrollment application.'}
            )
        return data
