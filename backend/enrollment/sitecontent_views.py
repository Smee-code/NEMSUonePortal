"""Landing-page content: public read + admin edit + image upload."""
import logging
import os
import uuid

from django.core.files.storage import default_storage
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models import AuditLog
from authentication.permissions import IsAdmin, get_client_ip

from .models import SiteContent
from .site_defaults import SITE_CONTENT_DEFAULTS

logger = logging.getLogger('security')

ALLOWED_IMAGE_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def _merged_content():
    """All section content: stored rows merged over the built-in defaults."""
    merged = {k: dict(v) for k, v in SITE_CONTENT_DEFAULTS.items()}
    for row in SiteContent.objects.all():
        merged[row.key] = row.data or merged.get(row.key, {})
    return merged


class PublicSiteContentView(APIView):
    """GET /api/enrollment/public/site-content/ — content for the landing page."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(_merged_content())


class AdminSiteContentListView(APIView):
    """GET /api/enrollment/admin/site-content/ — all sections for the editor."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response(_merged_content())


class AdminSiteContentDetailView(APIView):
    """PATCH /api/enrollment/admin/site-content/<key>/ — replace one section's data."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, key):
        if key not in SITE_CONTENT_DEFAULTS:
            return Response({'error': 'Unknown section.'}, status=status.HTTP_404_NOT_FOUND)
        data = request.data.get('data', request.data)
        if not isinstance(data, dict):
            return Response({'error': 'Content must be an object.'}, status=status.HTTP_400_BAD_REQUEST)
        row, _ = SiteContent.objects.update_or_create(
            key=key, defaults={'data': data, 'updated_by': request.user},
        )
        try:
            AuditLog.objects.create(
                user=request.user, role=request.user.role, action='site_content_updated',
                resource=f'site:{key}', ip_address=get_client_ip(request), result='success',
            )
        except Exception:
            logger.error('audit failed', exc_info=True)
        return Response({'key': key, 'data': row.data})


class AdminSiteImageUploadView(APIView):
    """POST /api/enrollment/admin/site-content/upload-image/ — returns {url}."""
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        f = request.FILES.get('file')
        if not f:
            return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
        ext = os.path.splitext(f.name)[1].lower()
        if ext not in ALLOWED_IMAGE_EXT:
            return Response({'error': 'Only JPG, PNG, WEBP or GIF images are allowed.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if f.size > MAX_IMAGE_BYTES:
            return Response({'error': 'Image is too large (max 5 MB).'}, status=status.HTTP_400_BAD_REQUEST)
        name = f'site/{uuid.uuid4().hex}{ext}'
        saved = default_storage.save(name, f)
        url = default_storage.url(saved)
        return Response({'url': request.build_absolute_uri(url)}, status=status.HTTP_201_CREATED)
