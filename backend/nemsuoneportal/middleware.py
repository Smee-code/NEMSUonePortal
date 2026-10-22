import time

from django.conf import settings
from django.http import JsonResponse

# ── Maintenance mode ──────────────────────────────────────────────────────────
# The flag lives in the SiteContent key/value store under key 'maintenance',
# as {"enabled": bool, "message": str}. A tiny in-process cache keeps the common
# (disabled) case from hitting the DB on every request.
_MAINT_CACHE = {'data': None, 'ts': 0.0}
_MAINT_TTL = 5.0  # seconds


def get_maintenance():
    """Return {'enabled': bool, 'message': str} for the current maintenance flag."""
    now = time.time()
    if _MAINT_CACHE['data'] is not None and (now - _MAINT_CACHE['ts']) < _MAINT_TTL:
        return _MAINT_CACHE['data']
    data = {'enabled': False, 'message': ''}
    try:
        from enrollment.models import SiteContent
        row = SiteContent.objects.filter(key='maintenance').first()
        if row and isinstance(row.data, dict):
            data = {
                'enabled': bool(row.data.get('enabled')),
                'message': str(row.data.get('message') or ''),
            }
    except Exception:
        pass  # never let the flag lookup break a request
    _MAINT_CACHE['data'] = data
    _MAINT_CACHE['ts'] = now
    return data


def invalidate_maintenance_cache():
    _MAINT_CACHE['data'] = None
    _MAINT_CACHE['ts'] = 0.0


class MaintenanceModeMiddleware:
    """When maintenance mode is on, API requests from anyone who isn't an admin
    get a 503. Login, token refresh, logout, and the maintenance status endpoint
    stay open so an admin can always sign in and turn it back off. The admin role
    is read from the JWT in the Authorization header (DRF auth runs per-view, so
    request.user isn't populated here)."""

    EXEMPT_PREFIXES = (
        '/api/auth/login',
        '/api/auth/token/refresh',
        '/api/auth/logout',
        '/api/auth/maintenance',
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self._should_block(request):
            flag = get_maintenance()
            return JsonResponse(
                {
                    'detail': flag['message'] or 'The system is temporarily under maintenance. Please try again later.',
                    'maintenance': True,
                },
                status=503,
            )
        return self.get_response(request)

    def _should_block(self, request):
        path = request.path
        if not path.startswith('/api/'):
            return False  # the SPA + static/media are served separately
        if any(path.startswith(p) for p in self.EXEMPT_PREFIXES):
            return False
        if not get_maintenance()['enabled']:
            return False
        return not self._is_admin(request)

    @staticmethod
    def _is_admin(request):
        auth = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth.startswith('Bearer '):
            return False
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            token = AccessToken(auth.split(' ', 1)[1])
            return token.get('role') == 'admin'
        except Exception:
            return False


class SecurityHeadersMiddleware:
    """
    Injects OWASP-required HTTP security headers on every response (A02).
    Complements Django's built-in SecurityMiddleware.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = (
            'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
        )
        # The React SPA is built on inline styles and per-page <style> blocks, so
        # style-src must allow 'unsafe-inline'. Google Fonts + the Tabler icon
        # webfont are loaded from their CDNs. script-src stays strict ('self').
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
            "img-src 'self' data: https:; "
            "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )

        # F-05: build HSTS value from settings so preload/includeSubDomains
        # are consistent with SECURE_HSTS_* — prevents duplicate/conflicting headers
        if not settings.DEBUG:
            hsts_seconds = getattr(settings, 'SECURE_HSTS_SECONDS', 31536000)
            hsts = f'max-age={hsts_seconds}'
            if getattr(settings, 'SECURE_HSTS_INCLUDE_SUBDOMAINS', True):
                hsts += '; includeSubDomains'
            if getattr(settings, 'SECURE_HSTS_PRELOAD', False):
                hsts += '; preload'
            response['Strict-Transport-Security'] = hsts

        return response
