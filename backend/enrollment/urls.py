from django.urls import path

from . import views
from . import curriculum_views as cv
from . import sitecontent_views as sc

urlpatterns = [
    # Landing-page content (CMS-lite)
    path('public/site-content/', sc.PublicSiteContentView.as_view(), name='public-site-content'),
    path('admin/site-content/', sc.AdminSiteContentListView.as_view(), name='admin-site-content'),
    path('admin/site-content/upload-image/', sc.AdminSiteImageUploadView.as_view(), name='admin-site-content-upload'),
    path('admin/site-content/<str:key>/', sc.AdminSiteContentDetailView.as_view(), name='admin-site-content-detail'),

    # Curriculum management (Registrar / Admin)
    path('curriculum/programs/', cv.CurriculumProgramListView.as_view(), name='curriculum-programs'),
    path('curricula/', cv.CurriculumListCreateView.as_view(), name='curriculum-list-create'),
    path('curricula/<int:pk>/', cv.CurriculumDetailView.as_view(), name='curriculum-detail'),
    path('curricula/<int:pk>/subjects/', cv.CurriculumSubjectView.as_view(), name='curriculum-add-subject'),
    path('curricula/<int:pk>/subjects/<int:subject_id>/', cv.CurriculumSubjectView.as_view(), name='curriculum-remove-subject'),
    path('my-curriculum/', cv.StudentCurriculumView.as_view(), name='student-curriculum'),

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
    path('offered/', views.StudentOfferedCoursesView.as_view(), name='enrollment-offered'),
    path('enroll/continuing/', views.ContinuingEnrollmentSubmitView.as_view(), name='enrollment-continuing'),
    path('my/', views.StudentEnrollmentHistoryView.as_view(), name='enrollment-my'),

    # Registrar / Admin — enrollment schedules
    path('schedules/', views.EnrollmentScheduleListCreateView.as_view(), name='enrollment-schedules'),
    path('schedules/<int:pk>/', views.EnrollmentScheduleDetailView.as_view(), name='enrollment-schedule-detail'),

    # Registrar / Admin
    path('requests/', views.RegistrarEnrollmentListView.as_view(), name='enrollment-requests'),
    path('requests/<uuid:pk>/review/', views.RegistrarReviewView.as_view(), name='enrollment-review'),
    path('requests/<uuid:pk>/block/', views.EnrollmentBlockAssignView.as_view(), name='enrollment-assign-block'),
    path('terms/<int:pk>/enrollment/', views.EnrollmentTermStatusView.as_view(), name='enrollment-term-status'),
    path('pending/', views.RegistrarPendingEnrollmentListView.as_view(), name='pending-enrollments'),
    path('pending/<uuid:pk>/review/', views.RegistrarPendingEnrollmentReviewView.as_view(), name='pending-enrollment-review'),
    path('pending/<uuid:pk>/documents/', views.RegistrarPreEnrollDocumentsView.as_view(), name='pending-enrollment-documents'),
    path('pending/<uuid:pk>/followup-email/', views.RegistrarPreEnrollFollowupView.as_view(), name='pending-enrollment-followup'),
    path('public/pre-enroll/<uuid:pk>/upload/', views.PublicPreEnrollUploadView.as_view(), name='pre-enroll-upload'),

    # Registrar + Admin — block management
    path('blocks/', views.BlockListView.as_view(), name='block-list'),
    path('blocks/<int:pk>/', views.BlockDetailView.as_view(), name='block-detail'),
    path('block-expansion-requests/', views.BlockExpansionRequestListCreateView.as_view(), name='block-expansion-requests'),
    path('block-expansion-requests/<int:pk>/', views.BlockExpansionRequestDetailView.as_view(), name='block-expansion-request-detail'),

    # Admin — reports
    path('admin/reports/enrollment-summary/', views.AdminEnrollmentSummaryReportView.as_view(), name='admin-enrollment-report'),

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
