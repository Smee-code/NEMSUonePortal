"""
RBAC enforcement layer — OWASP A01 (Broken Access Control).

All access control is server-side. Client-side guards (React RequireRole)
are UI convenience only and are never the sole enforcement gate.

Usage
-----
Function-based DRF views:
    @api_view(['GET'])
    @require_role('admin', 'registrar')
    def my_view(request): ...

Class-based DRF views:
    class MyView(APIView):
        permission_classes = [IsAuthenticated, IsAdmin]
"""
import logging
from functools import wraps

from rest_framework import status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

logger = logging.getLogger('security')


def get_client_ip(request):
    """
    Return the real client IP, accounting for a trusted reverse proxy.

    Trusts only the rightmost IP added by the proxy (F-06 — prevents X-Forwarded-For
    spoofing when NUM_PROXIES=1). Adjust the slice if behind multiple proxies.
    """
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        ips = [ip.strip() for ip in xff.split(',')]
        # The rightmost entry is set by the trusted proxy; earlier ones may be spoofed
        return ips[-1]
    return request.META.get('REMOTE_ADDR')


def _log_access_failure(request):
    """Write an unauthorized access attempt to the audit log."""
    from authentication.models import AuditLog
    try:
        user = (
            request.user
            if hasattr(request, 'user') and request.user.is_authenticated
            else None
        )
        AuditLog.objects.create(
            user=user,
            role=getattr(user, 'role', ''),
            action='unauthorized_access_attempt',
            resource=request.path,
            ip_address=get_client_ip(request),
            result='failure',
        )
    except Exception:
        logger.error('Failed to write access-failure audit log', exc_info=True)


def require_role(*roles):
    """
    Decorator for DRF function-based views.

    Checks the authenticated user's role server-side.
    Also writes an audit log entry on every denial.
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = getattr(request, 'user', None)
            if not user or not user.is_authenticated:
                return Response(
                    {'error': 'Authentication required.'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            if user.role not in roles:
                _log_access_failure(request)
                return Response(
                    {'error': 'You do not have permission to perform this action.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


class IsRole(BasePermission):
    """
    Base DRF permission class for role-based access.
    Subclass or use make_role_permission() to specify required roles.
    """
    required_roles: list[str] = []
    message = 'You do not have permission to perform this action.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role not in self.required_roles:
            _log_access_failure(request)
            return False
        return True


def make_role_permission(*roles):
    """Factory: returns a DRF permission class requiring one of the given roles."""
    return type('RolePermission', (IsRole,), {'required_roles': list(roles)})


# ── Convenience permission classes ────────────────────────────────────────────
IsStudent = make_role_permission('student')
IsFaculty = make_role_permission('faculty')
IsRegistrar = make_role_permission('registrar')
IsAdmin = make_role_permission('admin')
IsRegistrarOrAdmin = make_role_permission('registrar', 'admin')
IsFacultyOrAbove = make_role_permission('faculty', 'registrar', 'admin')
IsStudentOrRegistrarOrAdmin = make_role_permission('student', 'registrar', 'admin')
