import uuid

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
    encoded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='encoded_grades',
    )
    encoded_at = models.DateTimeField(auto_now=True)
    is_submitted = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('student', 'subject', 'academic_term')]
        ordering = ['-academic_term__year', 'subject__code']

    def __str__(self):
        return f"{self.student} — {self.subject.code} ({self.academic_term}): {self.grade}"
