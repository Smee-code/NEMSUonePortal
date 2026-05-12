import uuid

from django.conf import settings
from django.db import models


class Announcement(models.Model):
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

    class Meta:
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return self.title
