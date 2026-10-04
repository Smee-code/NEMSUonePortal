from rest_framework import serializers

from .models import AcademicTerm, Block, BlockExpansionRequest, Curriculum, CurriculumDocument, Department, EnrollmentRequest, EnrollmentSchedule, EnrollmentSubject, PendingEnrollment, PreEnrollmentDocument, Program, Subject


class AcademicTermSerializer(serializers.ModelSerializer):
    semester_display = serializers.CharField(source='get_semester_display', read_only=True)

    class Meta:
        model = AcademicTerm
        fields = [
            'id', 'year', 'semester', 'semester_display',
            'is_active', 'enrollment_open', 'start_date', 'end_date',
        ]
        # is_active is derived from the latest start date (AcademicTerm.sync_current),
        # never set by the client.
        read_only_fields = ['is_active']

    def validate(self, data):
        from django.utils import timezone
        # Enrollment may only be opened on the current term (is_active), and
        # never on a term that has already ended.
        enrollment_open = data.get(
            'enrollment_open', getattr(self.instance, 'enrollment_open', False)
        )
        if enrollment_open:
            if not getattr(self.instance, 'is_active', False):
                raise serializers.ValidationError({
                    'enrollment_open': 'Enrollment can only be opened on the current term.'
                })
            end_date = data.get('end_date', getattr(self.instance, 'end_date', None))
            if end_date and end_date < timezone.localdate():
                raise serializers.ValidationError({
                    'enrollment_open': 'This term has already ended; enrollment cannot be opened.'
                })
        return data


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
    student_uuid = serializers.UUIDField(source='student.id', read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    student_email = serializers.CharField(source='student.institutional_email', read_only=True)
    year_level_display = serializers.CharField(source='get_year_level_display', read_only=True)
    program_id = serializers.IntegerField(source='program.id', read_only=True)
    program_code = serializers.CharField(source='program.code', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    block_id = serializers.SerializerMethodField()
    block_name = serializers.SerializerMethodField()
    total_units = serializers.SerializerMethodField()

    student_type_display = serializers.CharField(source='get_student_type_display', read_only=True)

    class Meta:
        model = EnrollmentRequest
        fields = [
            'id', 'student_uuid', 'student_name', 'student_id', 'student_email',
            'academic_term', 'year_level', 'year_level_display',
            'program_id', 'program_code', 'program_name',
            'block_id', 'block_name',
            'student_type', 'student_type_display',
            'subjects', 'status', 'remarks',
            'submitted_at', 'processed_at', 'total_units',
        ]

    def get_block_id(self, obj):
        return obj.block_id

    def get_block_name(self, obj):
        return obj.block.name if obj.block_id else None

    def get_total_units(self, obj):
        return float(sum(s.units for s in obj.subjects.all()))


# Used by the student's own history view — omits PII fields (A02)
class StudentOwnEnrollmentSerializer(serializers.ModelSerializer):
    academic_term = AcademicTermSerializer(read_only=True)
    subjects = SubjectSerializer(many=True, read_only=True)
    year_level_display = serializers.CharField(source='get_year_level_display', read_only=True)
    program_code = serializers.CharField(source='program.code', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    block_name = serializers.SerializerMethodField()
    student_type_display = serializers.CharField(source='get_student_type_display', read_only=True)
    total_units = serializers.SerializerMethodField()
    student_id = serializers.CharField(source='student.student_id', read_only=True)

    class Meta:
        model = EnrollmentRequest
        fields = [
            'id', 'academic_term', 'year_level', 'year_level_display',
            'program_code', 'program_name', 'block_name', 'student_id',
            'student_type', 'student_type_display',
            'subjects', 'status', 'remarks', 'submitted_at', 'processed_at', 'total_units',
        ]

    def get_block_name(self, obj):
        return obj.block.name if obj.block_id else None

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
        choices=['new', 'transferee', 'returnee', 'continuing'],
        required=False,
        default='continuing',
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
    student_type   = serializers.ChoiceField(choices=['new', 'transferee', 'returnee'])
    first_name     = serializers.CharField(max_length=100)
    last_name      = serializers.CharField(max_length=100)
    middle_name    = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    suffix         = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    email          = serializers.EmailField()
    contact_number = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    date_of_birth  = serializers.DateField(required=False, allow_null=True, default=None)
    sex            = serializers.CharField(max_length=10, required=False, allow_blank=True, default='')
    program_name   = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    program_id     = serializers.IntegerField(required=False, allow_null=True, default=None)
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


class PendingEnrollmentListSerializer(serializers.ModelSerializer):
    student_type_display = serializers.CharField(source='get_student_type_display', read_only=True)
    status_display       = serializers.CharField(source='get_status_display', read_only=True)
    program_name         = serializers.CharField(source='program.name', read_only=True)
    program_code         = serializers.CharField(source='program.code', read_only=True)
    department_name      = serializers.CharField(source='program.department.name', read_only=True, default=None)
    department_code      = serializers.CharField(source='program.department.code', read_only=True, default=None)
    term_display         = serializers.SerializerMethodField()
    full_name            = serializers.CharField(read_only=True)
    documents            = PreEnrollmentDocumentSerializer(many=True, read_only=True)
    reviewed_by_name     = serializers.CharField(source='reviewed_by.full_name', read_only=True, default=None)

    class Meta:
        model = PendingEnrollment
        fields = [
            'id', 'reference_number', 'student_type', 'student_type_display',
            'first_name', 'last_name', 'middle_name', 'suffix', 'full_name',
            'email', 'contact_number', 'date_of_birth', 'sex',
            'program_name', 'program_code', 'department_name', 'department_code', 'year_level',
            'status', 'status_display', 'remarks',
            'term_display', 'created_at', 'reviewed_at', 'reviewed_by_name', 'documents',
        ]

    def get_term_display(self, obj):
        if obj.academic_term:
            return f"{obj.academic_term.get_semester_display()} {obj.academic_term.year}"
        return None

class PendingEnrollmentReviewSerializer(serializers.Serializer):
    status  = serializers.ChoiceField(choices=['approved', 'rejected'])
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate(self, data):
        if data.get('status') == 'rejected' and not data.get('remarks', '').strip():
            raise serializers.ValidationError(
                {'remarks': 'A reason is required when rejecting a pre-enrollment application.'}
            )
        return data


class BlockSerializer(serializers.ModelSerializer):
    program_code       = serializers.CharField(source='program.code',  read_only=True)
    program_name       = serializers.CharField(source='program.name',  read_only=True)
    term_label         = serializers.SerializerMethodField()
    year_level_display = serializers.CharField(source='get_year_level_display', read_only=True)
    enrolled_count     = serializers.SerializerMethodField()
    available_slots    = serializers.SerializerMethodField()
    fill_pct           = serializers.SerializerMethodField()
    is_full            = serializers.SerializerMethodField()

    def get_term_label(self, obj):
        return f"{obj.academic_term.get_semester_display()} {obj.academic_term.year}"

    def get_enrolled_count(self, obj):
        return obj.enrollment_requests.filter(status='approved').count()

    def get_available_slots(self, obj):
        return max(0, obj.capacity - self.get_enrolled_count(obj))

    def get_fill_pct(self, obj):
        if obj.capacity == 0:
            return 0
        return round(self.get_enrolled_count(obj) / obj.capacity * 100)

    def get_is_full(self, obj):
        return self.get_available_slots(obj) == 0

    class Meta:
        model  = Block
        fields = [
            'id', 'name', 'program', 'program_code', 'program_name',
            'academic_term', 'term_label', 'year_level', 'year_level_display',
            'capacity', 'enrolled_count', 'available_slots', 'fill_pct', 'is_full',
        ]


class BlockExpansionRequestSerializer(serializers.ModelSerializer):
    block_name               = serializers.CharField(source='block.name',                       read_only=True)
    block_program_code       = serializers.CharField(source='block.program.code',               read_only=True)
    block_program_name       = serializers.CharField(source='block.program.name',               read_only=True)
    block_year_level_display = serializers.CharField(source='block.get_year_level_display',     read_only=True)
    term_label               = serializers.SerializerMethodField()
    requested_by_name        = serializers.CharField(source='requested_by.full_name',           read_only=True)
    reviewed_by_name         = serializers.CharField(source='reviewed_by.full_name',            read_only=True)
    block_enrolled_count     = serializers.SerializerMethodField()

    def get_term_label(self, obj):
        t = obj.block.academic_term
        return f"{t.get_semester_display()} {t.year}"

    def get_block_enrolled_count(self, obj):
        return obj.block.enrollment_requests.filter(status='approved').count()

    class Meta:
        model  = BlockExpansionRequest
        fields = [
            'id', 'block', 'block_name', 'block_program_code', 'block_program_name',
            'block_year_level_display', 'term_label', 'block_enrolled_count',
            'requested_by', 'requested_by_name',
            'current_capacity', 'requested_capacity', 'reason',
            'status', 'admin_note',
            'created_at', 'reviewed_at', 'reviewed_by', 'reviewed_by_name',
        ]
        read_only_fields = ['requested_by', 'current_capacity', 'status', 'reviewed_at', 'reviewed_by']


# ── Curriculum management (Registrar / Admin) ─────────────────────────────────

class CurriculumSubjectSerializer(serializers.ModelSerializer):
    """A course as it appears inside a curriculum (placement lives on the Subject)."""
    units = serializers.DecimalField(max_digits=4, decimal_places=2, coerce_to_string=False)
    year_level_display = serializers.CharField(source='get_year_level_display', read_only=True)
    semester_display = serializers.CharField(source='get_semester_display', read_only=True)
    subject_type_display = serializers.CharField(source='get_subject_type_display', read_only=True)
    prerequisite_code = serializers.CharField(source='prerequisite.code', read_only=True, default=None)

    class Meta:
        model = Subject
        fields = [
            'id', 'code', 'name', 'units', 'subject_type', 'subject_type_display',
            'year_level', 'year_level_display', 'semester', 'semester_display',
            'prerequisite', 'prerequisite_code', 'description',
        ]


class CurriculumListSerializer(serializers.ModelSerializer):
    program_code = serializers.CharField(source='program.code', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    department_code = serializers.CharField(source='program.department.code', read_only=True)
    subject_count = serializers.IntegerField(source='subjects.count', read_only=True)
    label = serializers.SerializerMethodField()

    class Meta:
        model = Curriculum
        fields = [
            'id', 'program', 'program_code', 'program_name', 'department_code',
            'code', 'year_effective', 'is_active', 'subject_count', 'label', 'created_at',
        ]

    def get_label(self, obj):
        return f'{obj.program.code} Curriculum (effective {obj.year_effective})'


class CurriculumDetailSerializer(CurriculumListSerializer):
    subjects = CurriculumSubjectSerializer(many=True, read_only=True)

    class Meta(CurriculumListSerializer.Meta):
        fields = CurriculumListSerializer.Meta.fields + ['subjects']


class CurriculumCreateSerializer(serializers.Serializer):
    program = serializers.PrimaryKeyRelatedField(queryset=Program.objects.filter(is_active=True))
    year_effective = serializers.IntegerField(min_value=1980, max_value=2100)
    code = serializers.CharField(max_length=40, required=False, allow_blank=True)
    duplicate_from = serializers.PrimaryKeyRelatedField(
        queryset=Curriculum.objects.all(), required=False, allow_null=True,
    )

    def validate(self, attrs):
        program = attrs['program']
        year = attrs['year_effective']
        if Curriculum.objects.filter(program=program, year_effective=year).exists():
            raise serializers.ValidationError(
                {'year_effective': f'{program.code} already has a curriculum effective {year}.'}
            )
        code = (attrs.get('code') or '').strip() or f'{program.code}-{year}'
        if Curriculum.objects.filter(code__iexact=code).exists():
            raise serializers.ValidationError({'code': f"Curriculum code '{code}' is already in use."})
        attrs['code'] = code
        dup = attrs.get('duplicate_from')
        if dup and dup.program_id != program.id:
            raise serializers.ValidationError(
                {'duplicate_from': 'You can only duplicate a curriculum of the same program.'}
            )
        return attrs


class CurriculumAddSubjectSerializer(serializers.Serializer):
    """
    Add a course to a curriculum. Either reference an existing shared course by code,
    or create a new one. A code that already exists is reused (shared record); reusing
    it with a different year/semester is rejected (that would be a different course).
    """
    code = serializers.CharField(max_length=20)
    name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    units = serializers.DecimalField(max_digits=4, decimal_places=2, required=False, allow_null=True)
    subject_type = serializers.ChoiceField(choices=['major', 'minor'], required=False, default='minor')
    year_level = serializers.IntegerField(min_value=1, max_value=4)
    semester = serializers.ChoiceField(choices=['first', 'second', 'summer'])
    prerequisite_code = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_code(self, value):
        return value.strip().upper()
