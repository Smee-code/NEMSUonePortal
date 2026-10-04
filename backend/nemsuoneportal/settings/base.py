from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

# Base directory = backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ── Security ──────────────────────────────────────────────────────────────────
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# ── Applications ──────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    # Project apps
    'authentication',
    'enrollment',
    'grades',
    'schedules',
    'announcements',
    'documents',
]

# ── Middleware ─────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',          # Must be first
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'nemsuoneportal.middleware.SecurityHeadersMiddleware',  # Custom OWASP headers
]

ROOT_URLCONF = 'nemsuoneportal.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'nemsuoneportal.wsgi.application'
ASGI_APPLICATION = 'nemsuoneportal.asgi.application'

# ── Database ──────────────────────────────────────────────────────────────────
# SQLite — file-based, no server process required.
# Path is overridable via DB_NAME so deployments can point at a persistent volume.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': config('DB_NAME', default=str(BASE_DIR / 'db.sqlite3')),
        'OPTIONS': {
            # WAL improves concurrent read performance; busy timeout avoids
            # immediate "database is locked" errors under concurrent writes.
            'init_command': (
                'PRAGMA journal_mode=WAL;'
                'PRAGMA synchronous=NORMAL;'
                'PRAGMA foreign_keys=ON;'
                'PRAGMA busy_timeout=5000;'
            ),
            'transaction_mode': 'IMMEDIATE',
        },
    }
}

# ── Custom user model ─────────────────────────────────────────────────────────
AUTH_USER_MODEL = 'authentication.User'

# ── Password hashing — argon2id (OWASP A04) ──────────────────────────────────
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]

# ── Password validation ────────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 12},
    },
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Internationalization ───────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ── Static / Media ────────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Built React app (Vite output) — served by the SPA fallback in urls.py in
# production. BASE_DIR is the backend/ dir; dist lives at <repo>/frontend/dist.
FRONTEND_DIST = BASE_DIR.parent / 'frontend' / 'dist'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Django REST Framework ─────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'EXCEPTION_HANDLER': 'nemsuoneportal.exceptions.custom_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'login': '10/minute',              # OWASP A06 — brute force protection
        'registration': '5/hour',
        'password_reset': '5/hour',
        'verify_email': '20/hour',           # F-02
        'password_reset_confirm': '10/hour', # F-02
        'enrollment_submit': '5/day',        # Sprint 3 — one submission per term enforced at DB level too
        'registrar_review': '50/hour',       # Sprint 3 — defense against bulk-review on compromised account
        'enrollment_manage': '60/hour',      # Registrar/admin opens or closes enrollment
        'grade_encode': '500/hour',          # Sprint 4 — faculty encoding grades in bulk
        'grade_submit': '20/hour',           # Sprint 4 — final submission is a deliberate action
        'registrar_grade_read': '60/hour',   # Sprint 4 — paginated PII bulk read
        'faculty_grade_read': '120/hour',    # Sprint 4 — faculty reads student roster
        'student_schedule_read': '60/hour',  # Sprint 5 — student views own schedule
        'faculty_schedule_read': '600/hour',  # Sprint 5 — faculty views teaching load + class roster (shared read, hit repeatedly)
        'faculty_schedule_write': '100/hour', # Sprint 5 — faculty adds/removes schedule slots
        'registrar_schedule_manage': '100/hour',  # Sprint 5 — CRUD on class schedules
        'announcement_list': '120/hour',           # Sprint 6 — viewing announcements
        'announcement_create': '20/hour',          # Sprint 6 — posting announcements
        'announcement_manage': '50/hour',          # Sprint 6 — editing/deleting announcements
        'document_submit': '10/day',               # Sprint 7 — student submits document request
        'document_list': '300/hour',               # Sprint 7 — viewing document requests (list + counts)
        'registrar_document_manage': '100/hour',   # Sprint 7 — registrar updates status
        'admin_user_list': '60/hour',              # Sprint 8 — admin lists users (PII bulk read)
        'admin_user_manage': '50/hour',            # Sprint 8 — admin updates user accounts
        'admin_audit_log': '60/hour',              # Sprint 8 — admin reads audit log
        'admin_stats': '300/hour',                 # Sprint 8 — admin/registrar dashboard stats
    },
    # F-06: set to number of trusted reverse proxies in front of Django
    # so DRF throttling uses the real client IP, not a spoofed X-Forwarded-For value
    'NUM_PROXIES': 1,
}

# ── JWT — djangorestframework-simplejwt ───────────────────────────────────────
# Access token: 30 min | Refresh token: 7 days via HttpOnly cookie (OWASP A07)
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': config('JWT_SECRET_KEY'),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'TOKEN_OBTAIN_SERIALIZER': 'authentication.serializers.CustomTokenObtainPairSerializer',
}

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173',
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True  # Required for HttpOnly refresh token cookies

# ── Security headers (base values; production.py tightens these) ──────────────
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# ── Email ─────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend',
)
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@nemsu.edu.ph')

# ── Frontend URL (used in email verification / password reset links) ──────────
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '%(asctime)s %(levelname)s [%(name)s] %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'security': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'errors': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
        },
    },
}
