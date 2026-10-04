from pathlib import Path

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import include, path, re_path


def serve_spa(request, resource=''):
    """Serve the built React single-page app.

    Returns a real file from the Vite build when the path points at one
    (hashed JS/CSS under /assets/, images copied from public/, favicon, …),
    and falls back to index.html for every client-side route so React Router
    can handle it (including on a hard refresh of a deep link)."""
    dist = Path(settings.FRONTEND_DIST)
    if resource:
        target = (dist / resource).resolve()
        # Guard against path traversal: the resolved path must stay inside dist.
        if str(target).startswith(str(dist.resolve())) and target.is_file():
            return FileResponse(open(target, 'rb'))
    index = dist / 'index.html'
    if index.is_file():
        return FileResponse(open(index, 'rb'))
    raise Http404('Frontend build not found — run `npm run build` in frontend/.')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/enrollment/', include('enrollment.urls')),      # Sprint 3
    path('api/grades/', include('grades.urls')),              # Sprint 4
    path('api/schedules/', include('schedules.urls')),        # Sprint 5
    path('api/announcements/', include('announcements.urls')),# Sprint 6
    path('api/documents/', include('documents.urls')),        # Sprint 7
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# SPA fallback — keep LAST. Serves the React app for any non-API, non-admin,
# non-static/media path. In local dev the Vite server serves the frontend, so
# this only takes effect in a deployed build.
urlpatterns += [
    re_path(r'^(?!api/|admin/|static/|media/)(?P<resource>.*)$', serve_spa),
]
