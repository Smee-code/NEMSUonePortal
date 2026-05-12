from .base import *  # noqa: F401, F403

DEBUG = False

# ── HTTPS enforcement (OWASP A02, A04) ───────────────────────────────────────
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ── Cookies (OWASP A07) ───────────────────────────────────────────────────────
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Strict'

# ── HSTS — 1 year (OWASP A02) ────────────────────────────────────────────────
# F-05: These settings are read by SecurityHeadersMiddleware (not Django's
# SecurityMiddleware) to emit the correct Strict-Transport-Security header
# including 'preload'. Do not duplicate HSTS generation elsewhere.
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# ── Additional hardening ──────────────────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# ── Database SSL — F-03: require encrypted connection in production ────────────
DATABASES['default']['OPTIONS']['sslmode'] = 'require'

# ── Use real SMTP in production ───────────────────────────────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
