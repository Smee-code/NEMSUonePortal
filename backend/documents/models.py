import uuid

from django.conf import settings
from django.db import models


class DocumentRequest(models.Model):
    DOCTYPE_COE   = 'certificate_of_enrollment'
    DOCTYPE_TOR   = 'transcript_of_records'
    DOCTYPE_COG   = 'certificate_of_grades'
    DOCUMENT_TYPE_CHOICES = [
        (DOCTYPE_COE, 'Certificate of Enrollment'),
        (DOCTYPE_TOR, 'Transcript of Records'),
        (DOCTYPE_COG, 'Certificate of Grades'),
    ]

    STATUS_SUBMITTED   = 'submitted'
    STATUS_PROCESSING  = 'processing'
    STATUS_READY       = 'ready'
    STATUS_RELEASED    = 'released'
    STATUS_REJECTED    = 'rejected'
    STATUS_CHOICES = [
        (STATUS_SUBMITTED,  'Submitted'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_READY,      'Ready for Release'),
        (STATUS_RELEASED,   'Released'),
        (STATUS_REJECTED,   'Rejected'),
    ]

    # Valid registrar-initiated transitions
    VALID_TRANSITIONS = {
        STATUS_SUBMITTED:  [STATUS_PROCESSING, STATUS_REJECTED],
        STATUS_PROCESSING: [STATUS_READY,       STATUS_REJECTED],
        STATUS_READY:      [STATUS_RELEASED,    STATUS_REJECTED],
        STATUS_RELEASED:   [],
        STATUS_REJECTED:   [],
    }

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='document_requests',
        limit_choices_to={'role': 'student'},
    )
    document_type = models.CharField(max_length=40, choices=DOCUMENT_TYPE_CHOICES)
    purpose       = models.TextField(blank=True, max_length=500)
    copies        = models.PositiveSmallIntegerField(default=1)
    status        = models.CharField(max_length=15, choices=STATUS_CHOICES, default=STATUS_SUBMITTED)
    remarks       = models.TextField(blank=True)
    submitted_at  = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)
    processed_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='processed_document_requests',
    )
    processed_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f'{self.student} — {self.get_document_type_display()} ({self.status})'
