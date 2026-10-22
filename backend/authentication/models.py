import uuid
from datetime import timedelta

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, institutional_email, student_id, full_name, password=None, **extra_fields):
        if not institutional_email:
            raise ValueError('Institutional email is required.')
        if not student_id:
            raise ValueError('Student ID is required.')
        email = self.normalize_email(institutional_email)
        user = self.model(
            institutional_email=email,
            student_id=student_id,
            full_name=full_name,
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, institutional_email, student_id, full_name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_verified', True)
        return self.create_user(
            institutional_email, student_id, full_name, password, **extra_fields
        )


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('faculty', 'Faculty'),
        ('registrar', 'Registrar'),
        ('admin', 'Admin'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_id = models.CharField(max_length=20, unique=True)
    institutional_email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    contact_number = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    # A placeholder student is created when an instructor imports a class-list row
    # whose IDNO has no real account yet. It holds the student's ID + name so the
    # course roster and grades work immediately; it links to the real account when
    # that student later registers and the Registrar approves (matched by student_id).
    is_placeholder = models.BooleanField(default=False)

    # A returnee/old student whose account was just activated must set up their
    # academic profile (department, program, year level) on first login before
    # reaching the dashboard. Cleared once that profile is complete.
    needs_academic_setup = models.BooleanField(default=False)

    # Extended personal information (address, civil status, education background,
    # parents, etc.). Seeded from the admission application and editable by the
    # student; viewable by the registrar/admin. JSON to mirror the admission form.
    details = models.JSONField(default=dict, blank=True)

    # Registrar validation of student self-registration.
    # 'approved' by default so existing rows and admin-created staff are unaffected;
    # only public student registration sets this to 'pending'.
    REG_PENDING = 'pending'
    REG_APPROVED = 'approved'
    REG_REJECTED = 'rejected'
    REGISTRATION_STATUS_CHOICES = [
        (REG_PENDING, 'Pending'),
        (REG_APPROVED, 'Approved'),
        (REG_REJECTED, 'Rejected'),
    ]
    registration_status = models.CharField(
        max_length=20, choices=REGISTRATION_STATUS_CHOICES, default=REG_APPROVED
    )
    registration_remarks = models.TextField(blank=True)
    registration_reviewed_by = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='registrations_reviewed',
    )
    registration_reviewed_at = models.DateTimeField(null=True, blank=True)

    department = models.ForeignKey(
        'enrollment.Department',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='department_members',
    )
    program = models.ForeignKey(
        'enrollment.Program',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='program_students',
    )
    # Which curriculum version this student follows (auto-assigned by entry batch,
    # manually changeable). Null until assigned / for non-students.
    curriculum = models.ForeignKey(
        'enrollment.Curriculum',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='students',
    )
    year_level = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        choices=[(1, '1st Year'), (2, '2nd Year'), (3, '3rd Year'), (4, '4th Year')],
    )
    # Faculty classification: a GEC faculty teaches general-education courses across
    # programs; otherwise a faculty's `program` marks the program they are core to.
    is_gec_faculty = models.BooleanField(default=False)

    # Academic rank (faculty only) — COS through the NBC 461 academic ladder.
    FACULTY_RANKS = [
        'COS',
        'Instructor I', 'Instructor II', 'Instructor III',
        'Assistant Professor I', 'Assistant Professor II',
        'Assistant Professor III', 'Assistant Professor IV',
        'Associate Professor I', 'Associate Professor II', 'Associate Professor III',
        'Associate Professor IV', 'Associate Professor V',
        'Professor I', 'Professor II', 'Professor III',
        'Professor IV', 'Professor V', 'Professor VI',
    ]
    RANK_CHOICES = [(r, r) for r in FACULTY_RANKS]
    rank = models.CharField(max_length=40, blank=True, default='', choices=RANK_CHOICES)

    # Account lockout — OWASP A07
    failed_login_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    # How many times this account has been locked in the current run of failures
    # (drives the escalating lock duration), and when the last failure happened
    # (so a 24-hour clean streak resets the escalation).
    lockout_level = models.PositiveSmallIntegerField(default=0)
    last_failed_login = models.DateTimeField(null=True, blank=True)

    # Email two-factor: a one-time code issued after a correct password, required
    # before tokens are granted.
    login_otp = models.CharField(max_length=6, blank=True, default='')
    login_otp_expires = models.DateTimeField(null=True, blank=True)
    login_otp_attempts = models.PositiveSmallIntegerField(default=0)

    USERNAME_FIELD = 'institutional_email'
    REQUIRED_FIELDS = ['student_id', 'full_name']

    objects = UserManager()

    class Meta:
        db_table = 'auth_users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f'{self.full_name} ({self.institutional_email})'

    @property
    def faculty_classification(self):
        """A label like 'BS Information Technology Faculty' or 'GEC Faculty'."""
        if self.role != 'faculty':
            return None
        if self.is_gec_faculty:
            return 'GEC Faculty'
        if self.program_id:
            return f'{self.program.name} Faculty'
        return 'Unclassified'

    # Escalating lockout: every 5 failed attempts locks the account, and each
    # successive lock lasts longer (minutes). After the last entry the duration
    # stays capped at 24 hours.
    LOCKOUT_DURATIONS = [5, 15, 30, 60, 180, 1440]
    LOCKOUT_THRESHOLD = 5
    LOCKOUT_RESET_HOURS = 24  # a clean day of no failures resets the escalation

    def is_locked(self):
        return bool(self.locked_until and timezone.now() < self.locked_until)

    def record_failed_login(self):
        now = timezone.now()
        # A full day with no failed attempts wipes the slate — an honest user who
        # mistypes today isn't treated like they were locked out last week.
        if self.last_failed_login and (now - self.last_failed_login) > timedelta(hours=self.LOCKOUT_RESET_HOURS):
            self.failed_login_attempts = 0
            self.lockout_level = 0

        self.failed_login_attempts += 1
        self.last_failed_login = now

        if self.failed_login_attempts >= self.LOCKOUT_THRESHOLD:
            idx = min(self.lockout_level, len(self.LOCKOUT_DURATIONS) - 1)
            self.locked_until = now + timedelta(minutes=self.LOCKOUT_DURATIONS[idx])
            self.lockout_level += 1          # the next lock will be longer
            self.failed_login_attempts = 0   # a fresh set of 5 tries once it lifts

        self.save(update_fields=[
            'failed_login_attempts', 'locked_until', 'lockout_level', 'last_failed_login',
        ])

    def reset_failed_login(self):
        if (self.failed_login_attempts or self.locked_until
                or self.lockout_level or self.last_failed_login):
            self.failed_login_attempts = 0
            self.locked_until = None
            self.lockout_level = 0
            self.last_failed_login = None
            self.save(update_fields=[
                'failed_login_attempts', 'locked_until', 'lockout_level', 'last_failed_login',
            ])


class AuditLog(models.Model):
    """
    Append-only record of every significant system event (OWASP A09).
    Never modify or delete rows — only insert.
    """
    RESULT_SUCCESS = 'success'
    RESULT_FAILURE = 'failure'
    RESULT_CHOICES = [
        (RESULT_SUCCESS, 'Success'),
        (RESULT_FAILURE, 'Failure'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    role = models.CharField(max_length=20, blank=True)
    action = models.CharField(max_length=100)
    resource = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    result = models.CharField(max_length=20, choices=RESULT_CHOICES)
    extra = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']

    def __str__(self):
        return f'[{self.timestamp:%Y-%m-%d %H:%M}] {self.action} — {self.result}'


class EmailVerificationToken(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='email_token'
    )
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'email_verification_tokens'

    def save(self, *args, **kwargs):
        if not self.pk and not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    def is_valid(self):
        return timezone.now() < self.expires_at


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='password_reset_tokens'
    )
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        db_table = 'password_reset_tokens'

    def save(self, *args, **kwargs):
        if not self.pk and not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=2)
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.used and timezone.now() < self.expires_at
