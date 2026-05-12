import re

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import AuditLog, User


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
    )
    role = serializers.ChoiceField(
        choices=['student', 'faculty'],
        default='student',
        required=False,
    )
    department = serializers.IntegerField(required=False, allow_null=True, default=None)

    class Meta:
        model = User
        fields = [
            'student_id',
            'institutional_email',
            'full_name',
            'contact_number',
            'password',
            'role',
            'department',
        ]
        extra_kwargs = {'password': {'write_only': True}}

    def validate_institutional_email(self, value):
        return value.lower().strip()

    def validate_student_id(self, value):
        return value.strip().upper()

    def validate_full_name(self, value):
        value = value.strip()
        if not re.match(r"^[\w\s'\-\.]{2,255}$", value, re.UNICODE):
            raise serializers.ValidationError(
                'Full name may only contain letters, spaces, hyphens, apostrophes, and periods.'
            )
        return value

    def validate_contact_number(self, value):
        if value and not re.match(r'^\+?[\d\s\-\(\)]{7,20}$', value):
            raise serializers.ValidationError('Enter a valid contact number.')
        return value

    def validate(self, attrs):
        from enrollment.models import Department
        role = attrs.get('role', 'student')
        dept_id = attrs.get('department')
        if role == 'faculty':
            if not dept_id:
                raise serializers.ValidationError({'department': 'Department is required for faculty registration.'})
            try:
                attrs['department_obj'] = Department.objects.get(pk=dept_id, is_active=True)
            except Department.DoesNotExist:
                raise serializers.ValidationError({'department': 'Selected department is invalid or inactive.'})
        else:
            attrs['department_obj'] = None
        return attrs

    def create(self, validated_data):
        dept_obj = validated_data.pop('department_obj', None)
        validated_data.pop('department', None)
        role = validated_data.pop('role', 'student')
        return User.objects.create_user(
            student_id=validated_data['student_id'],
            institutional_email=validated_data['institutional_email'],
            full_name=validated_data['full_name'],
            contact_number=validated_data.get('contact_number', ''),
            password=validated_data['password'],
            role=role,
            department=dept_obj,
            is_verified=False,
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

        # Check lockout before attempting password validation (OWASP A07)
        try:
            user = User.objects.get(institutional_email=email)
            if user.is_locked():
                raise serializers.ValidationError(
                    'Account is temporarily locked due to multiple failed login '
                    'attempts. Please try again later or contact support.'
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

    class Meta:
        model = User
        fields = [
            'id', 'student_id', 'institutional_email', 'full_name', 'contact_number',
            'role', 'is_active', 'is_verified', 'is_staff', 'date_joined',
            'failed_login_attempts', 'locked_until', 'is_locked',
        ]
        read_only_fields = fields

    def get_is_locked(self, obj):
        return obj.is_locked()


class AdminUserUpdateSerializer(serializers.Serializer):
    is_active = serializers.BooleanField(required=False)
    role = serializers.ChoiceField(
        choices=['student', 'faculty', 'registrar', 'admin'], required=False
    )
    unlock = serializers.BooleanField(required=False, default=False)


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
