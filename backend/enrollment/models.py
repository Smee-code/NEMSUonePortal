import uuid

from django.conf import settings
from django.db import models


class AcademicTerm(models.Model):
    SEMESTER_CHOICES = [
        ('first', 'First Semester'),
        ('second', 'Second Semester'),
        ('summer', 'Summer'),
    ]

    year = models.CharField(max_length=9)           # e.g. "2024-2025"
    semester = models.CharField(max_length=10, choices=SEMESTER_CHOICES)
    # Exactly one term is the system's active term. New terms are inactive by
    # default and must be explicitly activated (which deactivates the rest).
    is_active = models.BooleanField(default=False)
    enrollment_open = models.BooleanField(default=False)
    start_date = models.DateField()
    end_date = models.DateField()

    class Meta:
        ordering = ['-year', 'semester']
        unique_together = [('year', 'semester')]

    def __str__(self):
        return f"{self.get_semester_display()} {self.year}"

    def save(self, *args, **kwargs):
        # Enforce the single-active-term invariant no matter how the term is
        # saved (admin endpoint, shell, seed script): activating one term
        # deactivates every other one.
        super().save(*args, **kwargs)
        if self.is_active:
            AcademicTerm.objects.exclude(pk=self.pk).filter(is_active=True).update(is_active=False)


class Department(models.Model):
    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.code} — {self.name}"


class Program(models.Model):
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=20, unique=True)
    department = models.ForeignKey(
        Department, on_delete=models.PROTECT, related_name='programs'
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['department__name', 'name']

    def __str__(self):
        return f"{self.code} — {self.name}"


class Subject(models.Model):
    YEAR_LEVEL_CHOICES = [
        (1, '1st Year'), (2, '2nd Year'), (3, '3rd Year'), (4, '4th Year'),
    ]
    SEMESTER_CHOICES = [
        ('first', '1st Semester'),
        ('second', '2nd Semester'),
        ('summer', 'Summer'),
    ]
    SUBJECT_TYPE_CHOICES = [
        ('major', 'Major Subject'),
        ('minor', 'Minor Subject'),
    ]

    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    units = models.DecimalField(max_digits=4, decimal_places=2)
    subject_type = models.CharField(
        max_length=10,
        choices=SUBJECT_TYPE_CHOICES,
        default='minor',
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    program = models.ForeignKey(
        Program, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='subjects',
    )
    year_level = models.PositiveSmallIntegerField(
        choices=YEAR_LEVEL_CHOICES, null=True, blank=True
    )
    semester = models.CharField(
        max_length=10, choices=SEMESTER_CHOICES, null=True, blank=True
    )
    prerequisite = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dependent_subjects',
    )

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} — {self.name}"


class SiteContent(models.Model):
    """Editable content for one landing-page section, stored as a JSON blob.
    One row per section key (e.g. 'about', 'stats', 'in_focus'). The public
    landing page reads these; the admin edits them."""
    key = models.CharField(max_length=50, unique=True)
    data = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='edited_site_content',
    )

    class Meta:
        ordering = ['key']

    def __str__(self):
        return self.key


class Curriculum(models.Model):
    """
    A versioned curriculum for a program (e.g. BSIT-2019, effective 2019). A program
    can have several curricula; a Subject can belong to several curricula (shared,
    identical course record). Placement (year level + semester) lives on the Subject,
    so the same shared course carries its semester with it across curricula.
    """
    program = models.ForeignKey(
        Program, on_delete=models.CASCADE, related_name='curricula'
    )
    code = models.CharField(max_length=40, unique=True)          # e.g. "BSIT-2019"
    year_effective = models.PositiveSmallIntegerField()          # year of effectivity
    subjects = models.ManyToManyField(
        Subject, related_name='curricula', blank=True
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='created_curricula',
    )

    class Meta:
        ordering = ['program__code', '-year_effective']
        unique_together = [('program', 'year_effective')]

    def __str__(self):
        return f"{self.program.code} Curriculum (effective {self.year_effective})"


class Block(models.Model):
    """A section/block within a program for a given term and year level."""
    YEAR_LEVEL_CHOICES = Subject.YEAR_LEVEL_CHOICES
    BLOCK_CAPACITY = 30

    program = models.ForeignKey(
        Program, on_delete=models.CASCADE, related_name='blocks'
    )
    academic_term = models.ForeignKey(
        AcademicTerm, on_delete=models.CASCADE, related_name='blocks'
    )
    year_level = models.PositiveSmallIntegerField(choices=YEAR_LEVEL_CHOICES)
    name = models.CharField(max_length=20)  # "Block A", "Block B", …
    capacity = models.PositiveSmallIntegerField(default=BLOCK_CAPACITY)

    class Meta:
        ordering = ['program', 'year_level', 'name']
        unique_together = [('program', 'academic_term', 'year_level', 'name')]

    def __str__(self):
        yr = dict(self.YEAR_LEVEL_CHOICES).get(self.year_level, str(self.year_level))
        return f"{self.program.code} {self.name} — {self.academic_term} ({yr})"

    @property
    def enrolled_count(self):
        return self.enrollment_requests.filter(status='approved').count()

    @property
    def available_slots(self):
        return max(0, self.capacity - self.enrolled_count)


class EnrollmentRequest(models.Model):
    YEAR_LEVEL_CHOICES = Subject.YEAR_LEVEL_CHOICES

    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    STUDENT_TYPE_CHOICES = [
        ('new',        'New Student'),
        ('transferee', 'Transferee'),
        ('returnee',   'Returnee'),
        ('continuing', 'Continuing'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='enrollment_requests',
        limit_choices_to={'role': 'student'},
    )
    academic_term = models.ForeignKey(
        AcademicTerm,
        on_delete=models.PROTECT,
        related_name='enrollment_requests',
    )
    program = models.ForeignKey(
        Program,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enrollment_requests',
    )
    block = models.ForeignKey(
        Block,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enrollment_requests',
    )
    subjects = models.ManyToManyField(
        Subject,
        through='EnrollmentSubject',
        related_name='enrollment_requests',
    )
    year_level = models.PositiveSmallIntegerField(
        choices=YEAR_LEVEL_CHOICES,
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    student_type = models.CharField(
        max_length=20, choices=STUDENT_TYPE_CHOICES, default='continuing', blank=True
    )
    remarks = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_enrollments',
    )

    class Meta:
        ordering = ['-submitted_at']
        unique_together = [('student', 'academic_term')]

    def __str__(self):
        return f"{self.student} — {self.academic_term} ({self.status})"


class BlockExpansionRequest(models.Model):
    """Registrar requests admin to increase a block's capacity."""
    STATUS_CHOICES = [
        ('pending',  'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    block = models.ForeignKey(
        Block, on_delete=models.CASCADE, related_name='expansion_requests'
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='block_expansion_requests',
    )
    current_capacity = models.PositiveSmallIntegerField()
    requested_capacity = models.PositiveSmallIntegerField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_block_expansion_requests',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Expansion {self.block} → {self.requested_capacity} [{self.status}]"


class CurriculumDocument(models.Model):
    ALLOWED_EXTENSIONS = {
        '.csv', '.pdf', '.xlsx', '.xls', '.docx', '.doc',
        '.pptx', '.ppt', '.odt', '.ods', '.txt',
    }
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

    program = models.ForeignKey(
        Program, on_delete=models.CASCADE, related_name='curriculum_documents'
    )
    file = models.FileField(upload_to='curriculum/')
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_curriculum_docs',
    )

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.program.code} — {self.file_name}"


class EnrollmentSchedule(models.Model):
    """Per-student-type enrollment window for a given academic term.
    Displayed on the public landing page and managed by registrar/admin."""

    STUDENT_TYPE_CHOICES = [
        ('freshman',   'Freshmen'),
        ('transferee', 'Transferees'),
        ('shiftee',    'Shiftees'),
        ('regular',    'Regular Students'),
    ]

    term = models.ForeignKey(
        AcademicTerm, on_delete=models.CASCADE, related_name='enrollment_schedules'
    )
    student_type = models.CharField(max_length=20, choices=STUDENT_TYPE_CHOICES)
    start_date   = models.DateField()
    end_date     = models.DateField()
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering       = ['display_order', 'start_date']
        unique_together = [['term', 'student_type']]

    def __str__(self):
        return f"{self.get_student_type_display()} — {self.term}"


class EnrollmentSubject(models.Model):
    enrollment = models.ForeignKey(
        EnrollmentRequest,
        on_delete=models.CASCADE,
        related_name='enrollment_subjects',
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.PROTECT,
        related_name='enrollment_subjects',
    )

    class Meta:
        unique_together = [('enrollment', 'subject')]

    def __str__(self):
        return f"{self.enrollment} — {self.subject}"


class PendingEnrollment(models.Model):
    """Pre-enrollment submitted by freshmen/transferees before they have an account.
    On approval the system emails an activation link so they can create their account."""

    STUDENT_TYPE_CHOICES = [
        ('new',        'New Student'),
        ('transferee', 'Transferee'),
        ('returnee',   'Returnee'),
    ]
    STATUS_CHOICES = [
        ('pending',   'Pending'),
        ('approved',  'Approved'),
        ('rejected',  'Rejected'),
        ('activated', 'Activated'),
    ]

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_number = models.CharField(max_length=30, unique=True, blank=True)

    student_type  = models.CharField(max_length=20, choices=STUDENT_TYPE_CHOICES)
    first_name    = models.CharField(max_length=100)
    last_name     = models.CharField(max_length=100)
    middle_name   = models.CharField(max_length=100, blank=True)
    suffix        = models.CharField(max_length=20, blank=True)
    email         = models.EmailField()
    contact_number = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    sex           = models.CharField(max_length=10, blank=True)

    program       = models.ForeignKey(
        Program, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='pending_enrollments',
    )
    year_level    = models.PositiveSmallIntegerField(default=1)
    academic_term = models.ForeignKey(
        AcademicTerm, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='pending_enrollments',
    )

    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    remarks     = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reviewed_pre_enrollments',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    activation_token         = models.UUIDField(null=True, blank=True, db_index=True)
    activation_token_expires = models.DateTimeField(null=True, blank=True)
    otp                      = models.CharField(max_length=6, blank=True)
    otp_expires              = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.last_name}, {self.first_name} — {self.get_student_type_display()} ({self.status})"

    @property
    def full_name(self):
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name[0] + '.')
        parts.append(self.last_name)
        if self.suffix and self.suffix.lower() != 'none':
            parts.append(self.suffix)
        return ' '.join(parts)

    def save(self, *args, **kwargs):
        if not self.reference_number:
            from django.utils import timezone as _tz
            year = _tz.now().year
            n = PendingEnrollment.objects.filter(
                reference_number__startswith=f'NEMSU-CAN-{year}-'
            ).count() + 1
            self.reference_number = f'NEMSU-CAN-{year}-{n:05d}'
        super().save(*args, **kwargs)


class PreEnrollmentDocument(models.Model):
    """A PDF document uploaded by an applicant during the pre-enrollment wizard."""
    pending = models.ForeignKey(
        PendingEnrollment, on_delete=models.CASCADE, related_name='documents'
    )
    requirement_label = models.CharField(max_length=200)
    file = models.FileField(upload_to='pre_enrollment_docs/%Y/%m/')
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['requirement_label']

    def __str__(self):
        return f"{self.requirement_label} — {self.pending.reference_number}"
