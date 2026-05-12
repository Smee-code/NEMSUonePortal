import logging

from django.conf import settings
from django.core.mail import send_mass_mail
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request

from authentication.models import AuditLog, User
from authentication.permissions import IsFacultyOrAbove, get_client_ip

from .models import Announcement
from .serializers import AnnouncementSerializer
from .throttles import (
    AnnouncementCreateThrottle,
    AnnouncementListThrottle,
    AnnouncementManageThrottle,
)

logger = logging.getLogger('security')

SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS')


def _audit(user, role, action, resource, ip, result='success', extra=None):
    try:
        AuditLog.objects.create(
            user=user, role=role or '', action=action, resource=resource,
            ip_address=ip, result=result, extra=extra or {},
        )
    except Exception:
        logger.error('Audit log write failed', exc_info=True)


def _send_announcement_email(announcement):
    """Email all relevant users on new announcement. Failures are silent."""
    try:
        target = announcement.target_audience
        if target == Announcement.TARGET_PUBLIC:
            return

        qs = User.objects.filter(is_active=True, is_verified=True).exclude(
            pk=announcement.posted_by_id
        )
        if target == Announcement.TARGET_STUDENT:
            qs = qs.filter(role='student')
        elif target == Announcement.TARGET_FACULTY:
            qs = qs.filter(role='faculty')

        emails = list(qs.values_list('institutional_email', flat=True)[:500])
        if not emails:
            return

        subject = f'[NEMSUonePortal] {announcement.title}'
        body = (
            f'{announcement.body}\n\n'
            f'— Posted by {announcement.posted_by.full_name}\n'
            f'Log in at {settings.FRONTEND_URL} to view all announcements.'
        )
        datatuple = tuple(
            (subject, body, settings.DEFAULT_FROM_EMAIL, [email])
            for email in emails
        )
        send_mass_mail(datatuple, fail_silently=True)
    except Exception:
        logger.error('Failed to send announcement email notification', exc_info=True)


def _audience_filter(qs, role):
    """Scope announcement queryset to what this role is allowed to see (A01)."""
    if role == 'student':
        return qs.filter(target_audience__in=['all', 'student'])
    if role == 'faculty':
        return qs.filter(target_audience__in=['all', 'faculty'])
    return qs  # registrar and admin see everything, including public/landing-page announcements


class AnnouncementPagination(LimitOffsetPagination):
    default_limit = 20
    max_limit = 100


# ── Views ──────────────────────────────────────────────────────────────────────

class AnnouncementListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/announcements/ — all authenticated users (audience-filtered)
    POST /api/announcements/ — faculty / registrar / admin only
    """
    serializer_class = AnnouncementSerializer
    pagination_class = AnnouncementPagination

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsFacultyOrAbove()]

    def get_throttles(self):
        if self.request.method == 'POST':
            return [AnnouncementCreateThrottle()]
        return [AnnouncementListThrottle()]

    def get_queryset(self):
        qs = Announcement.objects.filter(is_active=True).select_related('posted_by')
        qs = _audience_filter(qs, self.request.user.role)

        # G-06 style: truncate search to prevent slow LIKE on long input
        q = (self.request.query_params.get('q') or '')[:100].strip()
        if q:
            qs = qs.filter(title__icontains=q) | qs.filter(body__icontains=q)

        if self.request.query_params.get('pinned') == 'true':
            qs = qs.filter(is_pinned=True)

        return qs.order_by('-is_pinned', '-created_at')

    def perform_create(self, serializer):
        instance = serializer.save(posted_by=self.request.user)
        _audit(
            self.request.user, self.request.user.role,
            'announcement_created', f'announcement:{instance.id}',
            get_client_ip(self.request), 'success',
            {'title': instance.title, 'target': instance.target_audience},
        )
        _send_announcement_email(instance)


class AnnouncementDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/announcements/<uuid>/ — authenticated (audience-filtered)
    PATCH  /api/announcements/<uuid>/ — author or admin only
    DELETE /api/announcements/<uuid>/ — author or admin (soft delete)
    """
    serializer_class = AnnouncementSerializer
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsFacultyOrAbove()]

    def get_throttles(self):
        if self.request.method in SAFE_METHODS:
            return [AnnouncementListThrottle()]
        return [AnnouncementManageThrottle()]

    def get_queryset(self):
        qs = Announcement.objects.filter(is_active=True).select_related('posted_by')
        # A01 + IDOR: non-target users get 404, not 403, so they can't enumerate
        return _audience_filter(qs, self.request.user.role)

    def _assert_author_or_admin(self, instance):
        user = self.request.user
        if user.role != 'admin' and instance.posted_by != user:
            raise PermissionDenied('You can only modify your own announcements.')

    def perform_update(self, serializer):
        self._assert_author_or_admin(serializer.instance)
        instance = serializer.save()
        _audit(
            self.request.user, self.request.user.role,
            'announcement_updated', f'announcement:{instance.id}',
            get_client_ip(self.request), 'success',
            {'title': instance.title},
        )

    def perform_destroy(self, instance):
        self._assert_author_or_admin(instance)
        # Soft delete — preserve the record and audit trail
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        _audit(
            self.request.user, self.request.user.role,
            'announcement_deleted', f'announcement:{instance.id}',
            get_client_ip(self.request), 'success',
            {'title': instance.title},
        )
