from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/enrollment/', include('enrollment.urls')),      # Sprint 3
    path('api/grades/', include('grades.urls')),              # Sprint 4
    path('api/schedules/', include('schedules.urls')),        # Sprint 5
    path('api/announcements/', include('announcements.urls')),# Sprint 6
    path('api/documents/', include('documents.urls')),        # Sprint 7
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
