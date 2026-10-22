"""
Class-list import helpers for the instructor-driven course roster.

Parses an .xlsx/.csv class list (only the IDNO and Name columns matter), and
resolves each row to a student account — reusing a real account when the IDNO
matches, otherwise creating a lightweight placeholder student that links to the
real account later when that student registers (matched by student_id).
"""
import csv
import io
import re

from django.core.exceptions import ValidationError as _ValidationError
from django.core.validators import validate_email as _validate_email

from authentication.models import User

PLACEHOLDER_EMAIL_DOMAIN = '@placeholder.nemsu'


def _norm_id(value):
    return (str(value).strip() if value is not None else '').upper()


def is_placeholder_email(addr):
    """A synthetic, non-deliverable address assigned to an imported student who
    has no real email on record yet."""
    return (not addr) or str(addr).strip().lower().endswith(PLACEHOLDER_EMAIL_DOMAIN)


def _clean_email(value):
    """Normalize + validate an email from a spreadsheet cell. Returns '' if blank,
    raises ValueError if present but malformed."""
    v = (str(value).strip().lower() if value is not None else '')
    if not v:
        return ''
    try:
        _validate_email(v)
    except _ValidationError:
        raise ValueError(f'"{value}" is not a valid email address')
    return v


def parse_classlist(uploaded_file):
    """
    Return a list of (idno, name, email) tuples from an uploaded .xlsx or .csv
    class list, or None if the IDNO/Name header columns could not be located.
    The Email column is OPTIONAL — email is '' when the column is absent or blank.
    Only IDNO, Name, and Email are read; grade/remarks columns are ignored.
    """
    filename = (getattr(uploaded_file, 'name', '') or '').lower()

    if filename.endswith('.csv') or filename.endswith('.txt'):
        raw = uploaded_file.read()
        if isinstance(raw, bytes):
            raw = raw.decode('utf-8-sig', errors='replace')
        table = [row for row in csv.reader(io.StringIO(raw))]
    else:
        import openpyxl
        wb = openpyxl.load_workbook(uploaded_file, read_only=True, data_only=True)
        ws = wb.active
        table = [list(row) for row in ws.iter_rows(values_only=True)]

    # Locate the header row containing both "IDNO" and "Name" (Email optional).
    id_col = name_col = email_col = header_idx = None
    for i, row in enumerate(table):
        cells = [(str(c).strip().lower() if c is not None else '') for c in row]
        if 'idno' in cells and 'name' in cells:
            header_idx = i
            id_col = cells.index('idno')
            name_col = cells.index('name')
            email_col = cells.index('email') if 'email' in cells else None
            break
    if header_idx is None:
        return None

    rows = []
    for row in table[header_idx + 1:]:
        if not row:
            continue
        idno = _norm_id(row[id_col]) if id_col < len(row) else ''
        name = (str(row[name_col]).strip() if name_col < len(row) and row[name_col] is not None else '')
        email = ''
        if email_col is not None and email_col < len(row) and row[email_col] is not None:
            email = str(row[email_col]).strip()
        if idno:
            rows.append((idno, name, email))
    return rows


def resolve_student(student_id, name, email=''):
    """
    Resolve a class-list row to a student User.
    Returns (user, created) where created is True if a new placeholder was made.

    When a real `email` is supplied it becomes the account's login email (so a
    later self-registration can be bound to it and verified). It also backfills
    onto an existing placeholder that still has only the synthetic address. A real
    email already tied to a different account raises ValueError (reported per row).
    """
    sid = _norm_id(student_id)
    real_email = _clean_email(email)  # may raise ValueError on a malformed value

    existing = User.objects.filter(student_id__iexact=sid).first()
    if existing:
        updates = []
        if existing.is_placeholder and name and not existing.full_name:
            existing.full_name = name
            updates.append('full_name')
        # Give a placeholder its first real email, but never overwrite a real one.
        if real_email and existing.is_placeholder and is_placeholder_email(existing.institutional_email):
            if User.objects.filter(institutional_email__iexact=real_email).exclude(pk=existing.pk).exists():
                raise ValueError(f'email {real_email} is already linked to another account')
            existing.institutional_email = real_email
            updates.append('institutional_email')
        if updates:
            existing.save(update_fields=updates)
        return existing, False

    if real_email and User.objects.filter(institutional_email__iexact=real_email).exists():
        raise ValueError(f'email {real_email} is already linked to another account')

    institutional_email = real_email or (
        f"placeholder.{re.sub(r'[^a-z0-9]', '', sid.lower()) or 'unknown'}{PLACEHOLDER_EMAIL_DOMAIN}"
    )
    user = User(
        student_id=sid,
        institutional_email=institutional_email,
        full_name=name or sid,
        role='student',
        is_active=False,
        is_verified=False,
        is_placeholder=True,
    )
    user.set_unusable_password()
    user.save()
    return user, True
