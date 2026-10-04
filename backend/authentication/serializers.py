import re

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import AuditLog, User


NAME_PART_RE = re.compile(r"^[^\d]{1,100}$", re.UNICODE)


class UserRegistrationSerializer(serializers.Serializer):
    """
    Public student self-registration. Returning/enrolled students who already have
    a university-issued student ID register here; the account is created in a
    'pending' state and must be validated by the Registrar before it can log in.
    Name is captured as separate parts and stored combined as 'Last, First Middle'.
    """
    last_name = serializers.CharField(max_length=100)
    first_name = serializers.CharField(max_length=100)
    middle_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    student_id = serializers.CharField(max_length=20)
    institutional_email = serializers.EmailField()
    contact_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password],
        style={'input_type': 'password'},
    )

    def _validate_name_part(self, value, label):
        value = value.strip()
        if value and not NAME_PART_RE.match(value):
            raise serializers.ValidationError(f'{label} may not contain digits.')
        return value

    def validate_last_name(self, value):
        return self._validate_name_part(value, 'Last name')

    def validate_first_name(self, value):
        return self._validate_name_part(value, 'First name')

    def validate_middle_name(self, value):
        return self._validate_name_part(value, 'Middle name')

    def validate_institutional_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(institutional_email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate_student_id(self, value):
        value = value.strip().upper()
        existing = User.objects.filter(student_id__iexact=value).first()
        # A placeholder student (created by an instructor's classlist import) may already
        # hold this ID — that is fine, registration will link to it later. Only block a
        # real, already-registered account.
        if existing and not getattr(existing, 'is_placeholder', False):
            raise serializers.ValidationError('An account with this student ID already exists.')
        return value

    def validate_contact_number(self, value):
        if value and not re.match(r'^\+?[\d\s\-\(\)]{7,20}$', value):
            raise serializers.ValidationError('Enter a valid contact number.')
        return value

    def _compose_full_name(self, first, middle, last):
        given = ' '.join(p for p in [first, middle] if p).strip()
        return f'{last}, {given}'.strip().rstrip(',')

    def create(self, validated_data):
        full_name = self._compose_full_name(
            validated_data['first_name'],
            validated_data.get('middle_name', ''),
            validated_data['last_name'],
        )
        student_id = validated_data['student_id']

        # If an instructor already imported this student ID as a placeholder (they were
        # on a class list before registering), claim that record in place so all their
        # course roster rows and grades carry over to the real account. student_id is
        # unique, so we must reuse the row rather than create a second one.
        placeholder = User.objects.filter(
            student_id__iexact=student_id, is_placeholder=True
        ).first()
        if placeholder:
            placeholder.institutional_email = validated_data['institutional_email']
            placeholder.full_name = full_name
            placeholder.contact_number = validated_data.get('contact_number', '')
            placeholder.set_password(validated_data['password'])
            placeholder.role = 'student'
            placeholder.is_placeholder = False
            placeholder.is_verified = False
            placeholder.is_active = False
            placeholder.registration_status = User.REG_PENDING
            placeholder.save()
            return placeholder

        return User.objects.create_user(
            student_id=student_id,
            institutional_email=validated_data['institutional_email'],
            full_name=full_name,
            contact_number=validated_data.get('contact_number', ''),
            password=validated_data['password'],
            role='student',
            is_verified=False,
            is_active=False,
            registration_status=User.REG_PENDING,
        )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT serializer to:
    - Embed role + full_name in the token payload
    - Return user profile info in the login response
    - Enforce account lockout check before authentication
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['full_name'] = user.full_name
        return token

    def validate(self, attrs):
        email = attrs.get(self.username_field, '').lower().strip()

        # Check lockout + registration state before attempting password validation
        # (OWASP A07). Pending/rejected accounts are is_active=False, so the parent
        # validator would otherwise raise a generic "no active account" error.
        try:
            user = User.objects.get(institutional_email=email)
            if user.is_locked():
                raise serializers.ValidationError(
                    'Account is temporarily locked due to multiple failed login '
                    'attempts. Please try again later or contact support.'
                )
            if user.registration_status == User.REG_PENDING:
                raise serializers.ValidationError(
                    'Your registration is still pending Registrar approval. '
                    "You'll receive an email once your account has been reviewed."
                )
            if user.registration_status == User.REG_REJECTED:
                raise serializers.ValidationError(
                    'Your registration was not approved. Please contact the '
                    "Registrar's Office for assistance."
                )
        except User.DoesNotExist:
            pass  # Let the parent raise the invalid-credentials error

        data = super().validate(attrs)

        # Block unverified accounts from receiving tokens (OWASP A07 — F-08)
        if not self.user.is_verified:
            raise serializers.ValidationError(
                'Please verify your email address before logging in. '
                'Check your inbox or request a new verification link.'
            )

        data['user'] = {
            'id': str(self.user.id),
            'full_name': self.user.full_name,
            'role': self.user.role,
            'institutional_email': self.user.institutional_email,
            'is_verified': self.user.is_verified,
        }
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    department_id = serializers.IntegerField(source='department.id', read_only=True, default=None)
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    program_id = serializers.IntegerField(source='program.id', read_only=True, default=None)
    program_name = serializers.CharField(source='program.name', read_only=True, default=None)
    year_level_display = serializers.CharField(source='get_year_level_display', read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            'id',
            'student_id',
            'institutional_email',
            'full_name',
            'contact_number',
            'role',
            'is_verified',
            'date_joined',
            'department_id',
            'department_name',
            'program_id',
            'program_name',
            'year_level',
            'year_level_display',
            'rank',
        ]
        read_only_fields = [
            'id',
            'student_id',
            'institutional_email',
            'role',
            'is_verified',
            'date_joined',
            'department_id',
            'department_name',
            'program_id',
            'program_name',
            'year_level',
            'year_level_display',
        ]


class AcademicProfileSerializer(serializers.Serializer):
    department = serializers.IntegerField(required=False, allow_null=True)
    program = serializers.IntegerField(required=False, allow_null=True)
    year_level = serializers.IntegerField(required=False, allow_null=True)

    def validate_year_level(self, value):
        if value is not None and value not in (1, 2, 3, 4):
            raise serializers.ValidationError('Year level must be 1, 2, 3, or 4.')
        return value

    def validate(self, attrs):
        from enrollment.models import Department, Program
        user = self.context['request'].user

        if user.role not in ('student', 'faculty'):
            raise serializers.ValidationError('Academic profile updates are only available for students and faculty.')

        if 'department' in attrs:
            dept_id = attrs['department']
            if dept_id is None:
                attrs['_department_obj'] = None
            else:
                try:
                    attrs['_department_obj'] = Department.objects.get(pk=dept_id, is_active=True)
                except Department.DoesNotExist:
                    raise serializers.ValidationError({'department': 'Invalid or inactive department.'})

        if user.role == 'faculty':
            for field in ('program', 'year_level'):
                if field in attrs:
                    raise serializers.ValidationError({field: 'Faculty may not set this field.'})
        else:
            if 'program' in attrs:
                prog_id = attrs['program']
                if prog_id is None:
                    attrs['_program_obj'] = None
                else:
                    try:
                        attrs['_program_obj'] = Program.objects.get(pk=prog_id, is_active=True)
                    except Program.DoesNotExist:
                        raise serializers.ValidationError({'program': 'Invalid or inactive program.'})

        return attrs

    def update(self, instance, validated_data):
        update_fields = []
        if '_department_obj' in validated_data:
            instance.department = validated_data['_department_obj']
            update_fields.append('department_id')
        if '_program_obj' in validated_data:
            instance.program = validated_data['_program_obj']
            update_fields.append('program_id')
        if 'year_level' in validated_data:
            instance.year_level = validated_data['year_level']
            update_fields.append('year_level')
        if update_fields:
            instance.save(update_fields=update_fields)
        return instance


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        required=True, style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
    )

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    institutional_email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField(required=True)
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
    )


# ── Admin serializers ─────────────────────────────────────────────────────────

class RegistrarStudentListSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    department_code = serializers.CharField(source='department.code', read_only=True, default=None)
    program_name    = serializers.CharField(source='program.name',    read_only=True, default=None)
    program_code    = serializers.CharField(source='program.code',    read_only=True, default=None)
    year_level_display = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'student_id', 'full_name', 'institutional_email',
            'department_name', 'department_code',
            'program_name', 'program_code',
            'year_level', 'year_level_display',
            'is_active',
        ]
        read_only_fields = fields

    def get_year_level_display(self, obj):
        return obj.get_year_level_display() if obj.year_level else None


class AdminUserListSerializer(serializers.ModelSerializer):
    is_locked = serializers.SerializerMethodField()
    department_code = serializers.CharField(source='department.code', read_only=True, default=None)
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    program_id = serializers.IntegerField(source='program.id', read_only=True, default=None)
    program_name = serializers.CharField(source='program.name', read_only=True, default=None)
    faculty_classification = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'student_id', 'institutional_email', 'full_name', 'contact_number',
            'role', 'is_active', 'is_verified', 'is_staff', 'date_joined',
            'failed_login_attempts', 'locked_until', 'is_locked',
            'department_code', 'department_name',
            'program_id', 'program_name', 'is_gec_faculty', 'faculty_classification', 'rank',
        ]
        read_only_fields = fields

    def get_is_locked(self, obj):
        return obj.is_locked()


# Roles an admin is allowed to assign/create through the management interface.
ADMIN_ASSIGNABLE_ROLES = ['student', 'faculty', 'registrar', 'admin']


class AdminUserUpdateSerializer(serializers.Serializer):
    is_active = serializers.BooleanField(required=False)
    role = serializers.ChoiceField(choices=ADMIN_ASSIGNABLE_ROLES, required=False)
    # Department assignment (by code). Empty string clears it.
    department = serializers.CharField(required=False, allow_blank=True)
    # Faculty classification: program (by id, 0/'' clears it) + GEC flag.
    program = serializers.IntegerField(required=False, allow_null=True)
    is_gec_faculty = serializers.BooleanField(required=False)
    unlock = serializers.BooleanField(required=False, default=False)

    def validate_department(self, value):
        from enrollment.models import Department
        if value in (None, ''):
            return None
        try:
            return Department.objects.get(code__iexact=value.strip())
        except Department.DoesNotExist:
            raise serializers.ValidationError(f"No department with code '{value}'.")

    def validate_program(self, value):
        from enrollment.models import Program
        if not value:
            return None
        try:
            return Program.objects.get(pk=value)
        except Program.DoesNotExist:
            raise serializers.ValidationError('Selected program does not exist.')


class AdminUserCreateSerializer(serializers.Serializer):
    """Admin creates a staff account (faculty / registrar / admin)."""
    institutional_email = serializers.EmailField()
    student_id = serializers.CharField(max_length=20)
    full_name = serializers.CharField(max_length=255)
    contact_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=ADMIN_ASSIGNABLE_ROLES)
    department = serializers.CharField(required=False, allow_blank=True)
    program = serializers.IntegerField(required=False, allow_null=True)
    is_gec_faculty = serializers.BooleanField(required=False, default=False)
    rank = serializers.CharField(required=False, allow_blank=True, default='')
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_institutional_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(institutional_email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_rank(self, value):
        value = (value or '').strip()
        if value and value not in User.FACULTY_RANKS:
            raise serializers.ValidationError('Invalid faculty rank.')
        return value

    def validate_student_id(self, value):
        value = value.strip()
        if User.objects.filter(student_id__iexact=value).exists():
            raise serializers.ValidationError('A user with this ID already exists.')
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        from enrollment.models import Department
        dept_code = (attrs.get('department') or '').strip()
        dept = None
        if dept_code:
            try:
                dept = Department.objects.get(code__iexact=dept_code)
            except Department.DoesNotExist:
                raise serializers.ValidationError({'department': f"No department with code '{dept_code}'."})
        attrs['department_obj'] = dept

        # Faculty may carry a core program + a GEC flag (ignored for other roles).
        prog = None
        prog_id = attrs.get('program')
        if attrs['role'] == 'faculty' and prog_id and not attrs.get('is_gec_faculty'):
            from enrollment.models import Program
            try:
                prog = Program.objects.get(pk=prog_id)
            except Program.DoesNotExist:
                raise serializers.ValidationError({'program': 'Selected program does not exist.'})
        attrs['program_obj'] = prog
        return attrs

    def create(self, validated_data):
        dept = validated_data.pop('department_obj', None)
        prog = validated_data.pop('program_obj', None)
        is_gec = validated_data.get('role') == 'faculty' and bool(validated_data.get('is_gec_faculty'))
        # Rank applies to faculty only.
        rank = (validated_data.get('rank') or '').strip() if validated_data.get('role') == 'faculty' else ''
        for k in ('department', 'program', 'is_gec_faculty', 'rank'):
            validated_data.pop(k, None)
        password = validated_data.pop('password')
        user = User.objects.create_user(
            institutional_email=validated_data['institutional_email'],
            student_id=validated_data['student_id'],
            full_name=validated_data['full_name'],
            password=password,
            role=validated_data['role'],
            contact_number=validated_data.get('contact_number', ''),
            department=dept,
            program=prog,
            is_gec_faculty=is_gec,
            rank=rank,
            is_verified=True,   # staff accounts created by admin are pre-verified
            is_active=True,
        )
        return user


class RegistrarFacultyUpdateSerializer(serializers.Serializer):
    """Registrar (or admin) edits an existing FACULTY account's info.
    Identity fields (email, faculty ID) are intentionally not editable here."""
    full_name      = serializers.CharField(max_length=255, required=False)
    contact_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    department     = serializers.CharField(required=False, allow_blank=True)
    program        = serializers.IntegerField(required=False, allow_null=True)
    is_gec_faculty = serializers.BooleanField(required=False)
    rank           = serializers.CharField(required=False, allow_blank=True)

    def validate_rank(self, value):
        value = (value or '').strip()
        if value and value not in User.FACULTY_RANKS:
            raise serializers.ValidationError('Invalid faculty rank.')
        return value

    def validate(self, attrs):
        from enrollment.models import Department, Program
        if 'department' in attrs:
            code = (attrs.get('department') or '').strip()
            if code:
                try:
                    attrs['department_obj'] = Department.objects.get(code__iexact=code)
                except Department.DoesNotExist:
                    raise serializers.ValidationError({'department': f"No department with code '{code}'."})
            else:
                attrs['department_obj'] = None
        if 'program' in attrs:
            prog_id = attrs.get('program')
            if prog_id:
                try:
                    attrs['program_obj'] = Program.objects.get(pk=prog_id)
                except Program.DoesNotExist:
                    raise serializers.ValidationError({'program': 'Selected program does not exist.'})
            else:
                attrs['program_obj'] = None
        return attrs

    def update(self, instance, validated_data):
        if 'full_name' in validated_data:
            instance.full_name = validated_data['full_name'].strip()
        if 'contact_number' in validated_data:
            instance.contact_number = (validated_data['contact_number'] or '').strip()
        if 'rank' in validated_data:
            instance.rank = (validated_data['rank'] or '').strip()
        if 'department_obj' in validated_data:
            instance.department = validated_data['department_obj']
        if 'is_gec_faculty' in validated_data:
            instance.is_gec_faculty = bool(validated_data['is_gec_faculty'])
        # A GEC faculty teaches across programs, so clear any core program.
        if instance.is_gec_faculty:
            instance.program = None
        elif 'program_obj' in validated_data:
            instance.program = validated_data['program_obj']
        instance.save()
        return instance


class RegistrationRequestSerializer(serializers.ModelSerializer):
    reviewed_by_name = serializers.CharField(
        source='registration_reviewed_by.full_name', read_only=True, default=None
    )

    class Meta:
        model = User
        fields = [
            'id', 'student_id', 'institutional_email', 'full_name', 'contact_number',
            'registration_status', 'registration_remarks',
            'registration_reviewed_at', 'reviewed_by_name', 'date_joined',
        ]
        read_only_fields = fields


class RegistrationReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate(self, attrs):
        if attrs['action'] == 'reject' and not (attrs.get('remarks') or '').strip():
            raise serializers.ValidationError(
                {'remarks': 'A reason is required when rejecting a registration.'}
            )
        return attrs


class AuditLogSerializer(serializers.ModelSerializer):
    user_name  = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_name', 'user_email', 'role',
            'action', 'resource', 'ip_address', 'timestamp', 'result', 'extra',
        ]

    def get_user_name(self, obj):
        return obj.user.full_name if obj.user else '(deleted)'

    def get_user_email(self, obj):
        return obj.user.institutional_email if obj.user else ''
