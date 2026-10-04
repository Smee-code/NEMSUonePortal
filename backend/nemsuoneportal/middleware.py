from django.conf import settings


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
