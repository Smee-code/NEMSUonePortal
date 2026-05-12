from django.urls import path

from . import views

urlpatterns = [
    # Student
    path('my/', views.StudentGradeListView.as_view(), name='grade-my'),

    # Faculty
    path('teaching-load/', views.FacultyTeachingLoadView.as_view(), name='grade-teaching-load'),
    path('faculty/students/', views.FacultyStudentGradeListView.as_view(), name='grade-faculty-students'),
    path('faculty/encode/', views.GradeEncodeView.as_view(), name='grade-encode'),
    path('faculty/submit/', views.GradeSubmitView.as_view(), name='grade-submit'),
    path('faculty/assignments/', views.FacultyTeachingAssignmentCreateView.as_view(), name='faculty-assignments'),
    path('faculty/assignments/<int:pk>/', views.FacultyTeachingAssignmentDeleteView.as_view(), name='faculty-assignment-detail'),

    # Registrar / Admin
    path('all/', views.RegistrarGradeListView.as_view(), name='grade-all'),
    path('registrar/faculty/', views.RegistrarFacultyListView.as_view(), name='registrar-faculty-list'),
    path('registrar/faculty/<uuid:pk>/', views.RegistrarFacultyDetailView.as_view(), name='registrar-faculty-detail'),
    path('registrar/student/<uuid:pk>/', views.RegistrarStudentGradeHistoryView.as_view(), name='registrar-student-grade-history'),

    # Admin / Registrar — teaching assignment management
    path('admin/assignments/', views.AdminTeachingAssignmentListCreateView.as_view(), name='admin-assignments'),
    path('admin/assignments/<int:pk>/', views.AdminTeachingAssignmentDetailView.as_view(), name='admin-assignment-detail'),
]
