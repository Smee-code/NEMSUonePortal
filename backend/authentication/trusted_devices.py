"""
Remembered devices for the emailed login code.

After a user enters their login code and asks to be remembered, the browser gets
an HttpOnly cookie holding a random token. On later logins from that browser a
correct password is enough; the code is asked again once the 30 days are up, on
any other device, and after any password change or reset.

The cookie proves only "this browser passed a code check for this user recently".
It is never accepted on its own: the password is always verified first.
"""
import hashlib
import secrets

from django.conf import settings
from django.utils import timezone

from .models import TrustedDevice
from .permissions import get_client_ip

COOKIE_NAME = 'trusted_device'
# Sent only to the login endpoints, the one place it is read.
COOKIE_PATH = '/api/auth/login/'


def _hash(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def is_trusted(user, request):
    """True when this request carries a live remembered-device token for `user`."""
    token = request.COOKIES.get(COOKIE_NAME)
    if not token:
        return False
    device = TrustedDevice.objects.filter(
        user=user, token_hash=_hash(token), expires_at__gt=timezone.now(),
    ).first()
    if device is None:
        return False
    device.last_used_at = timezone.now()
    device.save(update_fields=['last_used_at'])
    return True


def remember(user, request, response):
    """Record this browser as trusted for 30 days and set its cookie."""
    forget(request, response)  # replace this browser's previous record, if any
    token = secrets.token_urlsafe(32)
    TrustedDevice.objects.create(
        user=user,
        token_hash=_hash(token),
        expires_at=timezone.now() + TrustedDevice.LIFETIME,
        user_agent=(request.META.get('HTTP_USER_AGENT') or '')[:255],
        ip_address=get_client_ip(request),
    )
    # Housekeeping: drop expired records and cap how many one account can hold.
    TrustedDevice.objects.filter(user=user, expires_at__lte=timezone.now()).delete()
    stale = list(
        TrustedDevice.objects.filter(user=user)
        .order_by('-created_at')
        .values_list('pk', flat=True)[TrustedDevice.MAX_PER_USER:]
    )
    if stale:
        TrustedDevice.objects.filter(pk__in=stale).delete()

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Strict',
        max_age=int(TrustedDevice.LIFETIME.total_seconds()),
        path=COOKIE_PATH,
    )
    return response


def forget(request, response):
    """Stop trusting this browser: delete its record and clear its cookie."""
    token = request.COOKIES.get(COOKIE_NAME)
    if token:
        TrustedDevice.objects.filter(token_hash=_hash(token)).delete()
        response.delete_cookie(COOKIE_NAME, path=COOKIE_PATH, samesite='Strict')
    return response

# Forgetting every device when a password changes is done in User.save(), the one
# point all password changes pass through.
