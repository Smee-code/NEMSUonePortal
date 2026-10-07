import logging

from django.conf import settings
from nemsuoneportal.emails import send_branded_email
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import AuditLog, EmailVerificationToken, PasswordResetToken, User
from .permissions import get_client_ip
from .serializers import (
    AcademicProfileSerializer,
    CustomTokenObtainPairSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)
from .throttles import (
    LoginRateThrottle,
    PasswordResetConfirmRateThrottle,
    PasswordResetRateThrottle,
    RegistrationRateThrottle,
    VerifyEmailRateThrottle,
)

logger = logging.getLogger('security')


# ── Helpers ───────────────────────────────────────────────────────────────────

def _audit(user, role, action, resource, ip, result, extra=None):
    """Write one row to the append-only audit log (OWASP A09)."""
    try:
        AuditLog.objects.create(
            user=user,
            role=role or '',
            action=action,
            resource=resource,
            ip_address=ip,
            result=result,
            extra=extra or {},
        )
    except Exception:
        logger.error('Audit log write failed', exc_info=True)


def _invalidate_all_user_tokens(user):
    """
    Blacklist every outstanding refresh token for a user (F-01).
    Called after password change or reset so sessions on all devices are terminated.
    """
    try:
        tokens = OutstandingToken.objects.filter(user=user)
        for token in tokens:
            BlacklistedToken.objects.get_or_create(token=token)
    except Exception:
        logger.error('Failed to blacklist all user tokens for %s', user.id, exc_info=True)


def _send_email(subject, body, recipient):
    try:
        send_branded_email(subject, body, [recipient], fail_silently=False)
    except Exception:
        logger.error('Failed to send email to %s', recipient, exc_info=True)


# ── Registration ──────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    throttle_classes = [RegistrationRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # The applicant was already vetted at admission, so the account is active
        # immediately — welcome them and point them to login.
        _send_email(
            subject='NEMSUonePortal — your account is ready',
            body=(
                f"Hello {user.full_name},\n\n"
                f"Your NEMSUonePortal student account has been created. You can now log in "
                f"with your Student ID ({user.student_id}) or your institutional email and "
                f"the password you just set.\n\n"
                f"{settings.FRONTEND_URL}/login\n\n"
                "Welcome to NEMSU Cantilan!\n\n"
                "If you did not create this account, please contact the Registrar's Office."
            ),
            recipient=user.institutional_email,
        )

        _audit(user, user.role, 'user_registered', request.path,
               get_client_ip(request), 'success')

        return Response(
            {'message': 'Account created. You can now log in with your Student ID or '
                        'institutional email.'},
            status=status.HTTP_201_CREATED,
        )


# ── Public department list (used by sign-up form) ─────────────────────────────

class PublicDepartmentListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from enrollment.models import Department
        depts = Department.objects.filter(is_active=True).values('id', 'code', 'name').order_by('name')
        return Response(list(depts))


# ── Login / Token ─────────────────────────────────────────────────────────────

# One place to set the HttpOnly refresh-token cookie, so the login and refresh
# views can never drift apart on its attributes. The `path` matters: a mismatched
# path would create a duplicate cookie instead of overwriting the old one.
def set_refresh_cookie(response, token):
    response.set_cookie(
        key='refresh_token',
        value=token,
        httponly=True,
        secure=not settings.DEBUG,   # HTTPS-only in production
        samesite='Strict',           # CSRF protection
        max_age=7 * 24 * 60 * 60,   # 7 days — matches REFRESH_TOKEN_LIFETIME
        path='/api/auth/token/refresh/',
    )
    return response


class LoginView(TokenObtainPairView):
    """
    POST /api/auth/login/

    Returns access token in the response body (stored in React memory only).
    Sets refresh token as HttpOnly, Secure, SameSite=Strict cookie — never in body.
    Enforces account lockout with exponential backoff (OWASP A07).
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        ip = get_client_ip(request)
        email = request.data.get('institutional_email', '').lower().strip()

        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            try:
                user = User.objects.get(institutional_email=email)
                user.record_failed_login()
                _audit(user, user.role, 'login_failed', request.path, ip, 'failure')
            except User.DoesNotExist:
                _audit(None, '', 'login_failed_unknown_user', request.path, ip, 'failure')
            raise

        user = serializer.user
        user.reset_failed_login()

        data = serializer.validated_data.copy()
        refresh_token = data.pop('refresh')

        _audit(user, user.role, 'login_success', request.path, ip, 'success')

        response = Response(data)
        set_refresh_cookie(response, refresh_token)
        return response


class CookieTokenRefreshView(APIView):
    """
    POST /api/auth/token/refresh/

    Reads the refresh token from the HttpOnly cookie (never from the request body).
    Returns a new short-lived access token in the response body.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response(
                {'error': 'Refresh token not found. Please log in again.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            return Response(
                {'error': 'Session expired. Please log in again.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = serializer.validated_data
        response = Response({'access': data['access']})
        # With ROTATE_REFRESH_TOKENS on, the serializer returns a new refresh
        # token and blacklists the old one. Persist the new token to the cookie
        # (same path overwrites the old one) so the next refresh uses a valid,
        # non-blacklisted token. Without this the second refresh fails and the
        # user is logged out. The token stays cookie-only (never in the body).
        new_refresh = data.get('refresh')
        if new_refresh:
            set_refresh_cookie(response, new_refresh)
        return response


class LogoutView(APIView):
    """
    POST /api/auth/logout/

    Blacklists the refresh token and clears the HttpOnly cookie.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except Exception:
                # F-09: log instead of silently swallowing — helps detect DB/token issues
                logger.warning('Failed to blacklist refresh token during logout', exc_info=True)

        _audit(
            request.user, request.user.role,
            'logout', request.path,
            get_client_ip(request), 'success',
        )

        response = Response({'message': 'Logged out successfully.'})
        response.delete_cookie('refresh_token', path='/api/auth/token/refresh/')
        return response


# ── Email verification ────────────────────────────────────────────────────────

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [VerifyEmailRateThrottle]  # F-02

    def post(self, request):
        token_value = request.data.get('token')
        if not token_value:
            return Response(
                {'error': 'Verification token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token_obj = EmailVerificationToken.objects.select_related('user').get(
                token=token_value
            )
        except EmailVerificationToken.DoesNotExist:
            return Response(
                {'error': 'Invalid verification token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not token_obj.is_valid():
            return Response(
                {'error': 'This verification link has expired. Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = token_obj.user
        user.is_verified = True
        user.save(update_fields=['is_verified'])
        token_obj.delete()

        _audit(user, user.role, 'email_verified', request.path,
               get_client_ip(request), 'success')

        return Response({'message': 'Email verified successfully. You may now log in.'})


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegistrationRateThrottle]

    def post(self, request):
        email = request.data.get('institutional_email', '').lower().strip()

        # Always return success — don't reveal whether an account exists
        try:
            user = User.objects.get(institutional_email=email, is_verified=False)
            EmailVerificationToken.objects.filter(user=user).delete()
            token_obj = EmailVerificationToken.objects.create(user=user)
            verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token_obj.token}"
            _send_email(
                subject='Verify your NEMSUonePortal email address',
                body=(
                    f"Hello {user.full_name},\n\n"
                    f"Click the link below to verify your email:\n{verify_url}\n\n"
                    "This link expires in 24 hours."
                ),
                recipient=user.institutional_email,
            )
            # F-07: audit resend events
            _audit(user, user.role, 'verification_email_resent', request.path,
                   get_client_ip(request), 'success')
        except User.DoesNotExist:
            pass  # Never reveal whether the email is registered

        return Response(
            {'message': 'If that email is registered and unverified, a new link has been sent.'}
        )


# ── Password reset ────────────────────────────────────────────────────────────

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['institutional_email'].lower().strip()

        # Always return 200 — never reveal whether the email exists (OWASP A07)
        try:
            user = User.objects.get(institutional_email=email, is_active=True)
            PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
            token_obj = PasswordResetToken.objects.create(user=user)
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token_obj.token}"
            _send_email(
                subject='Reset your NEMSUonePortal password',
                body=(
                    f"Hello {user.full_name},\n\n"
                    f"Click the link below to reset your password:\n{reset_url}\n\n"
                    "This link expires in 2 hours.\n\n"
                    "If you did not request this, you can safely ignore this email."
                ),
                recipient=user.institutional_email,
            )
            _audit(user, user.role, 'password_reset_requested', request.path,
                   get_client_ip(request), 'success')
        except User.DoesNotExist:
            pass  # Never reveal whether the email is registered

        return Response(
            {'message': 'If that email is registered, a password reset link has been sent.'}
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetConfirmRateThrottle]  # F-02

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ip = get_client_ip(request)

        try:
            token_obj = PasswordResetToken.objects.select_related('user').get(
                token=serializer.validated_data['token']
            )
        except PasswordResetToken.DoesNotExist:
            # F-07: audit failed attempts
            _audit(None, '', 'password_reset_confirm_failed', request.path, ip, 'failure',
                   {'reason': 'invalid_token'})
            return Response(
                {'error': 'Invalid reset token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not token_obj.is_valid():
            _audit(token_obj.user, token_obj.user.role, 'password_reset_confirm_failed',
                   request.path, ip, 'failure', {'reason': 'expired_or_used'})
            return Response(
                {'error': 'This reset link has expired or has already been used.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = token_obj.user
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])  # F-11: minimal write scope

        token_obj.used = True
        token_obj.save(update_fields=['used'])

        # F-01: blacklist ALL outstanding refresh tokens for this user
        _invalidate_all_user_tokens(user)

        _audit(user, user.role, 'password_reset_completed', request.path, ip, 'success')

        return Response({'message': 'Password reset successfully. You can now log in.'})


class PasswordResetSelfView(APIView):
    """POST /api/auth/password-reset/self/ — a signed-in user requests a reset
    link to their OWN registered email. The identity comes from the session, so
    no email is accepted in the body. Backs the in-app 'Change password' action."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        user = request.user
        email = (getattr(user, 'institutional_email', '') or '').strip()
        if not email:
            return Response(
                {'error': 'No email is on file for your account. Please contact the registrar.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
        token_obj = PasswordResetToken.objects.create(user=user)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token_obj.token}"
        _send_email(
            subject='Reset your NEMSUonePortal password',
            body=(
                f"Hello {user.full_name},\n\n"
                f"You requested to change your NEMSUonePortal password. Click the link "
                f"below to set a new one:\n{reset_url}\n\n"
                "This link expires in 2 hours.\n\n"
                "If you did not request this, you can safely ignore this email."
            ),
            recipient=email,
        )
        _audit(user, user.role, 'password_reset_self_requested', request.path,
               get_client_ip(request), 'success')
        return Response({'message': 'A password reset link has been sent to your email.', 'email': email})


# ── Password change (authenticated) ──────────────────────────────────────────

class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])  # F-11: minimal write scope

        # F-01: blacklist ALL outstanding refresh tokens — active sessions on other
        # devices are invalidated immediately after a password change
        _invalidate_all_user_tokens(request.user)

        _audit(request.user, request.user.role, 'password_changed', request.path,
               get_client_ip(request), 'success')

        response = Response({'message': 'Password changed successfully. Please log in again.'})
        response.delete_cookie('refresh_token', path='/api/auth/token/refresh/')
        return response


# ── Account activation (freshmen / transferees) ───────────────────────────────

def _generate_student_id():
    """Auto-generate a student ID for newly activated pre-enrollment accounts."""
    from django.utils import timezone as _tz
    year = _tz.now().year
    count = User.objects.filter(student_id__startswith=f'{year}-').count() + 1
    return f'{year}-{count:05d}'


class ActivateByRefView(APIView):
    """GET /api/auth/activate-by-ref/?ref=NEMSU-CAN-YYYY-NNNNN
    Look up a PendingEnrollment by reference number and return its activation token.
    Regenerates an expired token automatically so the student can still proceed.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        import uuid as _uuid
        from datetime import timedelta as _td
        from django.utils import timezone as _tz
        from enrollment.models import PendingEnrollment

        ref = request.query_params.get('ref', '').strip().upper()
        if not ref:
            return Response({'error': 'Reference number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pending = PendingEnrollment.objects.select_related('program').get(reference_number=ref)
        except PendingEnrollment.DoesNotExist:
            return Response(
                {'error': 'No pre-enrollment application found with this reference number.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if pending.status == 'activated':
            return Response(
                {'error': 'An account has already been created using this reference number. Please log in instead.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if pending.status == 'pending':
            return Response(
                {'error': 'Your pre-enrollment application is still under review. Please wait for the registrar to approve it.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if pending.status == 'rejected':
            return Response(
                {'error': 'Your pre-enrollment application was not approved. Please contact the registrar\'s office for assistance.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # status == 'approved' — ensure token is valid; regenerate if missing or expired
        now = _tz.now()
        if not pending.activation_token or (pending.activation_token_expires and now > pending.activation_token_expires):
            pending.activation_token = _uuid.uuid4()
            pending.activation_token_expires = now + _td(days=7)
            pending.save(update_fields=['activation_token', 'activation_token_expires'])

        return Response({
            'activation_token': str(pending.activation_token),
            'full_name':        pending.full_name,
            'email':            pending.email,
            'student_type':     pending.get_student_type_display(),
            'program':          pending.program.name if pending.program else '',
        })


class ActivateTokenInfoView(APIView):
    """GET /api/auth/activate/<token>/ — validate activation token, return applicant info."""
    permission_classes = [AllowAny]

    def get(self, request, token):
        from django.utils import timezone as _tz
        from enrollment.models import PendingEnrollment
        try:
            pending = PendingEnrollment.objects.get(activation_token=token)
        except PendingEnrollment.DoesNotExist:
            return Response({'error': 'Invalid activation link.'}, status=status.HTTP_404_NOT_FOUND)

        if pending.status == 'activated':
            return Response({'error': 'This activation link has already been used.'}, status=status.HTTP_400_BAD_REQUEST)
        if pending.status != 'approved':
            return Response({'error': 'This link is no longer valid.'}, status=status.HTTP_400_BAD_REQUEST)
        if pending.activation_token_expires and _tz.now() > pending.activation_token_expires:
            return Response({'error': 'This activation link has expired. Please contact the registrar.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'full_name':    pending.full_name,
            'email':        pending.email,
            'student_type': pending.get_student_type_display(),
            'program':      pending.program.name if pending.program else '',
        })


class ActivateRequestOTPView(APIView):
    """POST /api/auth/activate/<token>/request-otp/ — send a 6-digit OTP to the applicant's email."""
    permission_classes = [AllowAny]

    def post(self, request, token):
        import random
        import string
        from django.utils import timezone as _tz
        from enrollment.models import PendingEnrollment
        try:
            pending = PendingEnrollment.objects.get(activation_token=token)
        except PendingEnrollment.DoesNotExist:
            return Response({'error': 'Invalid activation link.'}, status=status.HTTP_404_NOT_FOUND)

        if pending.status != 'approved':
            return Response({'error': 'This link is no longer valid.'}, status=status.HTTP_400_BAD_REQUEST)
        if pending.activation_token_expires and _tz.now() > pending.activation_token_expires:
            return Response({'error': 'This activation link has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        email = request.data.get('email', '').strip().lower()
        if email != pending.email.lower():
            return Response({'error': 'The email address does not match your application.'}, status=status.HTTP_400_BAD_REQUEST)

        otp = ''.join(random.choices(string.digits, k=6))
        pending.otp = otp
        from datetime import timedelta as _td
        pending.otp_expires = _tz.now() + _td(minutes=10)
        pending.save(update_fields=['otp', 'otp_expires'])

        _send_email(
            subject='Your NEMSUonePortal Account Activation Code',
            body=(
                f"Hello {pending.full_name},\n\n"
                f"Your one-time verification code is:\n\n"
                f"  {otp}\n\n"
                f"This code expires in 10 minutes. Do not share it with anyone.\n\n"
                f"— NEMSU Cantilan Registrar's Office"
            ),
            recipient=pending.email,
        )

        return Response({'message': 'Verification code sent to your email.'})


class ActivateCompleteView(APIView):
    """POST /api/auth/activate/<token>/complete/ — verify OTP, set password, create student account."""
    permission_classes = [AllowAny]

    def post(self, request, token):
        from django.utils import timezone as _tz
        from django.db import transaction as _tx
        from rest_framework_simplejwt.tokens import RefreshToken as _RT
        from enrollment.models import PendingEnrollment
        try:
            pending = PendingEnrollment.objects.select_related('program', 'academic_term').get(activation_token=token)
        except PendingEnrollment.DoesNotExist:
            return Response({'error': 'Invalid activation link.'}, status=status.HTTP_404_NOT_FOUND)

        if pending.status != 'approved':
            return Response({'error': 'This link is no longer valid.'}, status=status.HTTP_400_BAD_REQUEST)
        if pending.activation_token_expires and _tz.now() > pending.activation_token_expires:
            return Response({'error': 'This activation link has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        otp      = request.data.get('otp', '').strip()
        password = request.data.get('password', '')

        if not otp or not pending.otp:
            return Response({'error': 'Verification code is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not pending.otp_expires or _tz.now() > pending.otp_expires:
            return Response({'error': 'Verification code has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
        if otp != pending.otp:
            return Response({'error': 'Invalid verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        if not password or len(password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check no account already exists for this email
        if User.objects.filter(institutional_email=pending.email).exists():
            return Response(
                {'error': 'An account already exists for this email address. Please log in instead.'},
                status=status.HTTP_409_CONFLICT,
            )

        student_id = _generate_student_id()
        while User.objects.filter(student_id=student_id).exists():
            student_id = _generate_student_id()

        with _tx.atomic():
            user = User.objects.create_user(
                institutional_email = pending.email,
                student_id          = student_id,
                full_name           = pending.full_name,
                password            = password,
                role                = 'student',
                is_verified         = True,
                contact_number      = pending.contact_number,
                program             = pending.program,
                year_level          = pending.year_level,
            )
            pending.status = 'activated'
            pending.save(update_fields=['status'])

            # Create the student's first-term enrollment.
            #  • New students are fully admitted → auto-enroll all offered
            #    courses for their program's 1st year / current semester.
            #  • Transferees / returnees → a PENDING request with no courses, so
            #    the registrar can validate their history and set the courses.
            from enrollment.models import AcademicTerm as _AT, EnrollmentRequest as _ER, Subject as _Subj
            term = pending.academic_term or _AT.objects.filter(is_active=True).order_by('-id').first()
            if term and pending.program:
                is_new = pending.student_type == 'new'
                auto_enrollment = _ER.objects.create(
                    student=user,
                    academic_term=term,
                    program=pending.program,
                    year_level=pending.year_level,
                    student_type=pending.student_type,
                    status='approved' if is_new else 'pending',
                    processed_at=_tz.now() if is_new else None,
                )
                if is_new:
                    subjects = list(_Subj.objects.filter(
                        program=pending.program,
                        year_level=pending.year_level,
                        semester=term.semester,
                        is_active=True,
                    ))
                    if subjects:
                        auto_enrollment.subjects.set(subjects)

        from .serializers import CustomTokenObtainPairSerializer as _CTS
        refresh = _CTS.get_token(user)
        access_token = str(refresh.access_token)

        _audit(user, user.role, 'account_activated', request.path,
               get_client_ip(request), 'success',
               {'pre_enrollment_id': str(pending.id)})

        response = Response({
            'access':     access_token,
            'role':       user.role,
            'full_name':  user.full_name,
            'email':      user.institutional_email,
            'student_id': user.student_id,
        })
        response.set_cookie(
            key='refresh_token',
            value=str(refresh),
            httponly=True,
            secure=not settings.DEBUG,
            samesite='Strict',
            max_age=7 * 24 * 60 * 60,
            path='/api/auth/token/refresh/',
        )
        return response


# ── User profile ──────────────────────────────────────────────────────────────

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class AcademicProfileView(APIView):
    """PATCH /auth/academic-profile/ — update department (faculty) or department/program/year_level (student)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = AcademicProfileSerializer(
            instance=request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _audit(user, user.role, 'academic_profile_updated', request.path,
               get_client_ip(request), 'success')
        return Response(UserProfileSerializer(user).data)
