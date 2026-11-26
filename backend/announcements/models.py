import os
import uuid

from django.conf import settings
from django.db import models


def announcement_image_path(instance, filename):
    # A random name: the uploaded one is never trusted for the path.
    ext = os.path.splitext(filename)[1].lower()
    return f'announcements/{uuid.uuid4().hex}{ext}'


class Announcement(models.Model):
    # What kind of notice this is. Drives the icon and color of its card, so
    # readers can tell an event from a deadline at a glance.
    CATEGORY_GENERAL = 'general'
    CATEGORY_CHOICES = [
        (CATEGORY_GENERAL, 'General'),
        ('academic', 'Academic'),
        ('event', 'Event'),
        ('deadline', 'Deadline'),
        ('advisory', 'Advisory'),
    ]

    TARGET_ALL = 'all'
    TARGET_STUDENT = 'student'
    TARGET_FACULTY = 'faculty'
    TARGET_PUBLIC = 'public'
    TARGET_CHOICES = [
        (TARGET_ALL, 'All Users'),
        (TARGET_STUDENT, 'Students Only'),
        (TARGET_FACULTY, 'Faculty Only'),
        (TARGET_PUBLIC, 'Public / Landing Page'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    body = models.TextField()
    target_audience = models.CharField(
        max_length=10, choices=TARGET_CHOICES, default=TARGET_ALL,
    )
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='announcements',
    )
    is_pinned = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ── Graphic presentation (all optional except the category) ──────────────
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default=CATEGORY_GENERAL)
    # A poster or infographic shown at the top of the card (JPG, PNG or WEBP).
    image = models.FileField(upload_to=announcement_image_path, blank=True)
    # The "when and where" of an event or deadline, shown as a date badge and
    # fact chips instead of being buried in the text.
    event_date = models.DateField(null=True, blank=True)
    event_time = models.TimeField(null=True, blank=True)
    location = models.CharField(max_length=150, blank=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return self.title


class Notification(models.Model):
    """A personal, per-user notice (e.g. a posted grade) shown in the topbar bell
    alongside announcements. Unlike an announcement (broadcast to an audience), a
    notification targets a single recipient."""
    CATEGORY_LABELS = {
        'grade': 'Grade',
        'enrollment': 'Enrollment',
        'document': 'Document',
        'schedule': 'Schedule',
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    category = models.CharField(max_length=30, blank=True)   # e.g. 'grade'
    link = models.CharField(max_length=200, blank=True)      # in-app route, e.g. '/student/grades'
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['recipient', '-created_at'])]

    def __str__(self):
        return f'{self.title} -> {self.recipient_id}'

    @classmethod
    def push(cls, recipients, title, body='', category='', link=''):
        """Bulk-create one notification per recipient. Returns the number created."""
        objs = [
            cls(recipient=u, title=title, body=body, category=category, link=link)
            for u in recipients if u is not None
        ]
        if objs:
            cls.objects.bulk_create(objs)
        return len(objs)
