from django.urls import path

from . import views

urlpatterns = [
    # Public — no authentication required
    path('public/landing/', views.PublicLandingView.as_view(), name='public-landing'),
    path('public/pre-enroll/', views.PublicPreEnrollView.as_view(), name='public-pre-enroll'),

    # Shared — any authenticated user
    path('terms/', views.AcademicTermListView.as_view(), name='enrollment-terms'),
    path('current-term/', views.CurrentTermView.as_view(), name='enrollment-current-term'),
    path('departments/', views.DepartmentListView.as_view(), name='enrollment-departments'),
    path('programs/', views.ProgramListView.as_view(), name='enrollment-programs'),
    path('subjects/', views.SubjectListView.as_view(), name='enrollment-subjects'),

    # Student
    path('submit/', views.EnrollmentSubmitView.as_view(), name='enrollment-submit'),
    path('my/', views.StudentEnrollmentHistoryView.as_view(), name='enrollment-my'),

    # Registrar / Admin — enrollment schedules
    path('schedules/', views.EnrollmentScheduleListCreateView.as_view(), name='enrollment-schedules'),
    path('schedules/<int:pk>/', views.EnrollmentScheduleDetailView.as_view(), name='enrollment-schedule-detail'),

    # Registrar / Admin
    path('requests/', views.RegistrarEnrollmentListView.as_view(), name='enrollment-requests'),
    path('requests/<uuid:pk>/review/', views.RegistrarReviewView.as_view(), name='enrollment-review'),
    path('terms/<int:pk>/enrollment/', views.EnrollmentTermStatusView.as_view(), name='enrollment-term-status'),
    path('pending/', views.RegistrarPendingEnrollmentListView.as_view(), name='pending-enrollments'),
    path('pending/<uuid:pk>/review/', views.RegistrarPendingEnrollmentReviewView.as_view(), name='pending-enrollment-review'),
    path('pending/<uuid:pk>/documents/', views.RegistrarPreEnrollDocumentsView.as_view(), name='pending-enrollment-documents'),
    path('pending/<uuid:pk>/followup-email/', views.RegistrarPreEnrollFollowupView.as_view(), name='pending-enrollment-followup'),
    path('public/pre-enroll/<uuid:pk>/upload/', views.PublicPreEnrollUploadView.as_view(), name='pre-enroll-upload'),

    # Admin — term & subject management
    path('admin/terms/', views.AdminTermListCreateView.as_view(), name='admin-terms'),
    path('admin/terms/<int:pk>/', views.AdminTermDetailView.as_view(), name='admin-term-detail'),
    path('admin/subjects/', views.AdminSubjectListCreateView.as_view(), name='admin-subjects'),
    path('admin/subjects/<int:pk>/', views.AdminSubjectDetailView.as_view(), name='admin-subject-detail'),

    # Admin — department & program management
    path('admin/departments/', views.AdminDepartmentListCreateView.as_view(), name='admin-departments'),
    path('admin/departments/<int:pk>/', views.AdminDepartmentDetailView.as_view(), name='admin-department-detail'),
    path('admin/programs/', views.AdminProgramListCreateView.as_view(), name='admin-programs'),
    path('admin/programs/<int:pk>/', views.AdminProgramDetailView.as_view(), name='admin-program-detail'),
    path('admin/programs/<int:pk>/curriculum/', views.AdminProgramCurriculumUploadView.as_view(), name='admin-program-curriculum'),
    path('admin/programs/<int:pk>/documents/', views.AdminCurriculumDocumentView.as_view(), name='admin-program-documents'),
    path('admin/programs/<int:pk>/documents/<int:doc_pk>/', views.AdminCurriculumDocumentDeleteView.as_view(), name='admin-program-document-delete'),
]
