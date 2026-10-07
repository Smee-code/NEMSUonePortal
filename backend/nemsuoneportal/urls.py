from pathlib import Path

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import include, path, re_path


# Text asset types are served with an explicit charset=utf-8 so browsers on any
# OS decode them as UTF-8 instead of guessing a locale codepage (mojibake guard).
_UTF8_CONTENT_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
}


def _spa_file_response(path):
    """FileResponse that pins charset=utf-8 on text assets."""
    response = FileResponse(open(path, 'rb'))
    content_type = _UTF8_CONTENT_TYPES.get(path.suffix.lower())
    if content_type:
        response['Content-Type'] = content_type
    return response


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
            return _spa_file_response(target)
    index = dist / 'index.html'
    if index.is_file():
        return _spa_file_response(index)
    raise Http404('Frontend build not found — run `npm run build` in frontend/.')


urlpatterns = [
    # Django's built-in admin lives under /django-admin/ so the React app can own
    # /admin/* (the registrar/admin panel uses client-side routes like /admin/dashboard).
    path('django-admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/enrollment/', include('enrollment.urls')),      # Sprint 3
    path('api/grades/', include('grades.urls')),              # Sprint 4
    path('api/schedules/', include('schedules.urls')),        # Sprint 5
    path('api/announcements/', include('announcements.urls')),# Sprint 6
    path('api/notifications/', include('announcements.notification_urls')),
    path('api/documents/', include('documents.urls')),        # Sprint 7
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# SPA fallback — keep LAST. Serves the React app for any non-API, non-admin,
# non-static/media path. In local dev the Vite server serves the frontend, so
# this only takes effect in a deployed build.
urlpatterns += [
    re_path(r'^(?!api/|django-admin/|static/|media/)(?P<resource>.*)$', serve_spa),
]
