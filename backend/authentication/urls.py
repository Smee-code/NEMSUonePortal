from django.urls import path

from .admin_views import (
    AdminAuditLogView,
    AdminStatsView,
    AdminUserDetailView,
    AdminUserListView,
    RegistrarFacultyCreateView,
    RegistrarFacultyUpdateView,
    RegistrarStudentListView,
    RegistrationRequestListView,
    RegistrationReviewView,
)
from .views import (
    AcademicProfileView,
    ActivateByRefView,
    ActivateCompleteView,
    ActivateRequestOTPView,
    ActivateTokenInfoView,
    CookieTokenRefreshView,
    LoginView,
    LogoutView,
    PasswordChangeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PasswordResetSelfView,
    PublicDepartmentListView,
    RegisterView,
    ResendVerificationView,
    UserProfileView,
    VerifyEmailView,
)

urlpatterns = [
    # Public lookups (no auth required)
    path('departments/', PublicDepartmentListView.as_view(), name='auth-public-departments'),

    # Registration & email verification
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('verify-email/', VerifyEmailView.as_view(), name='auth-verify-email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='auth-resend-verification'),

    # Login / logout / token refresh
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('token/refresh/', CookieTokenRefreshView.as_view(), name='auth-token-refresh'),

    # Password management
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='auth-password-reset-request'),
    path('password-reset/self/', PasswordResetSelfView.as_view(), name='auth-password-reset-self'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='auth-password-reset-confirm'),
    path('password-change/', PasswordChangeView.as_view(), name='auth-password-change'),

    # Profile
    path('profile/', UserProfileView.as_view(), name='auth-profile'),
    path('academic-profile/', AcademicProfileView.as_view(), name='auth-academic-profile'),

    # Registrar — student list + faculty creation
    path('registrar/students/', RegistrarStudentListView.as_view(), name='registrar-student-list'),
    path('registrar/faculty/', RegistrarFacultyCreateView.as_view(), name='registrar-faculty-create'),
    path('registrar/faculty/<uuid:pk>/', RegistrarFacultyUpdateView.as_view(), name='registrar-faculty-update'),
    path('registrar/registrations/', RegistrationRequestListView.as_view(), name='registrar-registration-list'),
    path('registrar/registrations/<uuid:pk>/review/', RegistrationReviewView.as_view(), name='registrar-registration-review'),

    # Admin — user management, audit log, stats
    path('admin/users/',           AdminUserListView.as_view(),   name='admin-user-list'),
    path('admin/users/<uuid:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/audit-log/',       AdminAuditLogView.as_view(),   name='admin-audit-log'),
    path('admin/stats/',           AdminStatsView.as_view(),      name='admin-stats'),

    # Account activation (freshmen / transferees pre-enrollment)
    path('activate-by-ref/',                    ActivateByRefView.as_view(),      name='activate-by-ref'),
    path('activate/<uuid:token>/',              ActivateTokenInfoView.as_view(),  name='activate-token-info'),
    path('activate/<uuid:token>/request-otp/', ActivateRequestOTPView.as_view(), name='activate-request-otp'),
    path('activate/<uuid:token>/complete/',    ActivateCompleteView.as_view(),   name='activate-complete'),
]
