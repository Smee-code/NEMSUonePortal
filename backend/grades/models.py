import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import models


class TeachingAssignment(models.Model):
    """Links a faculty member to a subject for a specific academic term."""
    faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='teaching_assignments',
        limit_choices_to={'role': 'faculty'},
    )
    subject = models.ForeignKey(
        'enrollment.Subject',
        on_delete=models.PROTECT,
        related_name='teaching_assignments',
    )
    academic_term = models.ForeignKey(
        'enrollment.AcademicTerm',
        on_delete=models.PROTECT,
        related_name='teaching_assignments',
    )
    block = models.ForeignKey(
        'enrollment.Block',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='teaching_assignments',
    )
    # Free-text section label the instructor sets (e.g. "1A", "CS1A"). Together with
    # subject + academic_term this identifies one course/class the instructor handles;
    # the same subject taught to two sections in a term is two courses.
    section = models.CharField(max_length=30, blank=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_teaching_assignments',
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('faculty', 'subject', 'academic_term', 'section')]
        ordering = ['-academic_term__year', 'subject__code', 'section']

    def __str__(self):
        label = f"{self.subject.code}"
        if self.section:
            label += f" [{self.section}]"
        return f"{self.faculty.full_name} — {label} ({self.academic_term})"


class GradeRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='grade_records',
        limit_choices_to={'role': 'student'},
    )
    subject = models.ForeignKey(
        'enrollment.Subject',
        on_delete=models.PROTECT,
        related_name='grade_records',
    )
    academic_term = models.ForeignKey(
        'enrollment.AcademicTerm',
        on_delete=models.PROTECT,
        related_name='grade_records',
    )
    teaching_assignment = models.ForeignKey(
        TeachingAssignment,
        on_delete=models.SET_NULL,
        null=True,
        related_name='grade_records',
    )
    midterm_grade = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    final_grade = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    grade = models.CharField(max_length=5, blank=True)
    remarks = models.TextField(blank=True)

    # ── Staged grade status ──────────────────────────────────────────────────
    # Grades are entered and submitted in two stages: all midterms first, then
    # all finals. INC marks a stage as "incomplete" (stays editable after submit);
    # DRP marks the student as dropped (whole row disabled, counts as settled).
    is_dropped = models.BooleanField(default=False)
    midterm_is_inc = models.BooleanField(default=False)
    final_is_inc = models.BooleanField(default=False)
    midterm_submitted = models.BooleanField(default=False)
    midterm_submitted_at = models.DateTimeField(null=True, blank=True)
    final_submitted = models.BooleanField(default=False)
    final_submitted_at = models.DateTimeField(null=True, blank=True)

    encoded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='encoded_grades',
    )
    encoded_at = models.DateTimeField(auto_now=True)
    # is_submitted / submitted_at mirror the FINAL stage (kept for registrar and
    # student consumers that only surface fully-finalised grades).
    is_submitted = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('student', 'subject', 'academic_term')]
        ordering = ['-academic_term__year', 'subject__code']

    def __str__(self):
        return f"{self.student} — {self.subject.code} ({self.academic_term}): {self.grade}"

    def recompute_grade(self):
        """Derive the combined `grade` string from the current stage values."""
        if self.is_dropped:
            self.grade = 'DRP'
        elif self.midterm_is_inc or self.final_is_inc:
            self.grade = 'INC'
        elif self.midterm_grade is not None and self.final_grade is not None:
            self.grade = str(
                ((self.midterm_grade + self.final_grade) / Decimal('2')).quantize(
                    Decimal('0.01'), rounding=ROUND_HALF_UP
                )
            )
        else:
            self.grade = ''

    @property
    def result_visible(self):
        """Whether the combined result is settled enough to show the student."""
        if self.is_dropped:
            return self.midterm_submitted
        return self.final_submitted


class MidtermReopenRequest(models.Model):
    """Faculty asks an admin to reopen a subject's already-submitted midterm grades
    so a locked numeric midterm can be corrected. Approval unlocks the whole class."""
    STATUS_CHOICES = [
        ('pending',  'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    teaching_assignment = models.ForeignKey(
        TeachingAssignment,
        on_delete=models.CASCADE,
        related_name='midterm_reopen_requests',
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='midterm_reopen_requests',
    )
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_midterm_reopen_requests',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Midterm reopen {self.teaching_assignment} [{self.status}]"
