from django.urls import path

from .admin_views import (
    AdminAuditLogView,
    AdminFacultyAutoCreateView,
    AdminStatsView,
    AdminUserDetailView,
    AdminUserListView,
    BulkStudentImportView,
    StudentAutoCreateView,
    RegistrarFacultyCreateView,
    RegistrarFacultyImportView,
    RegistrarFacultyImportTemplateView,
    RegistrarFacultyUpdateView,
    RegistrarStudentUpdateView,
    RegistrarStudentInfoView,
    RegistrarStudentListView,
    RegistrationRequestListView,
    RegistrationReviewView,
)
from .views import (
    AcademicProfileView,
    StudentSelfInfoView,
    ActivateByRefView,
    ActivateCompleteView,
    ActivateRequestOTPView,
    ActivateTokenInfoView,
    FacultySetupInfoView,
    FacultySetupCompleteView,
    MaintenanceModeView,
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
    path('maintenance/', MaintenanceModeView.as_view(), name='auth-maintenance'),

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
    path('my/details/', StudentSelfInfoView.as_view(), name='auth-my-details'),

    # Registrar — student list + faculty creation
    path('registrar/students/', RegistrarStudentListView.as_view(), name='registrar-student-list'),
    path('registrar/students/<uuid:pk>/', RegistrarStudentUpdateView.as_view(), name='registrar-student-update'),
    path('registrar/students/<uuid:pk>/info/', RegistrarStudentInfoView.as_view(), name='registrar-student-info'),
    path('registrar/faculty/', RegistrarFacultyCreateView.as_view(), name='registrar-faculty-create'),
    path('registrar/faculty/import/', RegistrarFacultyImportView.as_view(), name='registrar-faculty-import'),
    path('registrar/faculty/import-template/', RegistrarFacultyImportTemplateView.as_view(), name='registrar-faculty-import-template'),
    path('registrar/faculty/<uuid:pk>/', RegistrarFacultyUpdateView.as_view(), name='registrar-faculty-update'),
    path('registrar/registrations/', RegistrationRequestListView.as_view(), name='registrar-registration-list'),
    path('registrar/registrations/<uuid:pk>/review/', RegistrationReviewView.as_view(), name='registrar-registration-review'),

    # Admin — user management, audit log, stats
    path('admin/users/',           AdminUserListView.as_view(),   name='admin-user-list'),
    path('admin/faculty/',         AdminFacultyAutoCreateView.as_view(), name='admin-faculty-create'),
    path('students/create/',       StudentAutoCreateView.as_view(),      name='student-create'),
    path('students/bulk-import/',  BulkStudentImportView.as_view(),      name='students-bulk-import'),
    path('admin/users/<uuid:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/audit-log/',       AdminAuditLogView.as_view(),   name='admin-audit-log'),
    path('admin/stats/',           AdminStatsView.as_view(),      name='admin-stats'),

    # Account activation (freshmen / transferees pre-enrollment)
    path('activate-by-ref/',                    ActivateByRefView.as_view(),      name='activate-by-ref'),
    path('activate/<uuid:token>/',              ActivateTokenInfoView.as_view(),  name='activate-token-info'),
    path('activate/<uuid:token>/request-otp/', ActivateRequestOTPView.as_view(), name='activate-request-otp'),
    path('activate/<uuid:token>/complete/',    ActivateCompleteView.as_view(),   name='activate-complete'),

    # Faculty account setup (invited by the registrar; faculty sets their password)
    path('faculty-setup/<uuid:token>/',          FacultySetupInfoView.as_view(),     name='faculty-setup-info'),
    path('faculty-setup/<uuid:token>/complete/', FacultySetupCompleteView.as_view(), name='faculty-setup-complete'),
]
