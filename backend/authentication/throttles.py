from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """10 login attempts per minute per IP — OWASP A06."""
    scope = 'login'


class RegistrationRateThrottle(AnonRateThrottle):
    """5 registration attempts per hour per IP."""
    scope = 'registration'


class PasswordResetRateThrottle(AnonRateThrottle):
    """5 password reset requests per hour per IP."""
    scope = 'password_reset'


class VerifyEmailRateThrottle(AnonRateThrottle):
    """20 email verification attempts per hour per IP — F-02."""
    scope = 'verify_email'


class PasswordResetConfirmRateThrottle(AnonRateThrottle):
    """10 password reset confirm attempts per hour per IP — F-02."""
    scope = 'password_reset_confirm'


class AdminUserListThrottle(UserRateThrottle):
    scope = 'admin_user_list'


class AdminUserManageThrottle(UserRateThrottle):
    scope = 'admin_user_manage'


class AdminAuditLogThrottle(UserRateThrottle):
    scope = 'admin_audit_log'


class AdminStatsThrottle(UserRateThrottle):
    scope = 'admin_stats'
