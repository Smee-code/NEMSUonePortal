"""Repair already-stored mojibake text.

Mojibake is UTF-8 text that was decoded as Windows-1252 (cp1252) at some point,
turning characters like the en dash "–" into "â€“". This command detects the
tell-tale byte patterns and round-trips them back to correct UTF-8.

It only touches values that actually look corrupted, and is safe to re-run.

    python manage.py fix_text_encoding            # fix in place
    python manage.py fix_text_encoding --dry-run  # preview only
"""
from django.core.management.base import BaseCommand

from announcements.models import Announcement
from enrollment.models import SiteContent

# If none of these markers appear, the text isn't cp1252-mangled UTF-8.
_MARKERS = ('Ã', 'â€', 'Â')


def fix_mojibake(text):
    """Return text with cp1252-mangled UTF-8 repaired; unchanged if it's clean."""
    if not isinstance(text, str) or not text:
        return text
    out = text
    # A couple of passes handle double-encoding.
    for _ in range(3):
        if not any(m in out for m in _MARKERS):
            break
        try:
            candidate = out.encode('cp1252').decode('utf-8')
        except (UnicodeEncodeError, UnicodeDecodeError):
            break  # not representable / not valid UTF-8 — leave it alone
        if candidate == out:
            break
        out = candidate
    return out


def fix_json(value):
    """Recursively repair strings inside a JSON-like structure."""
    if isinstance(value, str):
        return fix_mojibake(value)
    if isinstance(value, list):
        return [fix_json(v) for v in value]
    if isinstance(value, dict):
        return {k: fix_json(v) for k, v in value.items()}
    return value


class Command(BaseCommand):
    help = "Repair mojibake (e.g. '2026â€“2027' -> '2026–2027') in announcements and landing-page content."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Show what would change without writing to the database.',
        )

    def handle(self, *args, **options):
        dry = options['dry_run']

        ann_fixed = 0
        for a in Announcement.objects.all():
            new_title, new_body = fix_mojibake(a.title), fix_mojibake(a.body)
            if new_title != a.title or new_body != a.body:
                ann_fixed += 1
                self.stdout.write(f'  Announcement {a.id}: "{a.title}" -> "{new_title}"')
                if not dry:
                    a.title, a.body = new_title, new_body
                    a.save(update_fields=['title', 'body'])

        sc_fixed = 0
        for s in SiteContent.objects.all():
            new_data = fix_json(s.data)
            if new_data != s.data:
                sc_fixed += 1
                self.stdout.write(f'  SiteContent "{s.key}" repaired')
                if not dry:
                    s.data = new_data
                    s.save(update_fields=['data'])

        verb = 'Would fix' if dry else 'Fixed'
        self.stdout.write(self.style.SUCCESS(
            f'{verb} {ann_fixed} announcement(s) and {sc_fixed} site-content section(s).'
        ))
