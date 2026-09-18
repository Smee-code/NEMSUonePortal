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

from authentication.models import User


def _norm_id(value):
    return (str(value).strip() if value is not None else '').upper()


def parse_classlist(uploaded_file):
    """
    Return a list of (idno, name) tuples from an uploaded .xlsx or .csv class list,
    or None if the IDNO/Name header columns could not be located.
    Only IDNO and Name are read; grade/remarks columns are ignored.
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

    # Locate the header row containing both "IDNO" and "Name".
    id_col = name_col = header_idx = None
    for i, row in enumerate(table):
        cells = [(str(c).strip().lower() if c is not None else '') for c in row]
        if 'idno' in cells and 'name' in cells:
            header_idx = i
            id_col = cells.index('idno')
            name_col = cells.index('name')
            break
    if header_idx is None:
        return None

    rows = []
    for row in table[header_idx + 1:]:
        if not row:
            continue
        idno = _norm_id(row[id_col]) if id_col < len(row) else ''
        name = (str(row[name_col]).strip() if name_col < len(row) and row[name_col] is not None else '')
        if idno:
            rows.append((idno, name))
    return rows


def resolve_student(student_id, name):
    """
    Resolve a class-list row to a student User.
    Returns (user, created) where created is True if a new placeholder was made.
    """
    sid = _norm_id(student_id)
    existing = User.objects.filter(student_id__iexact=sid).first()
    if existing:
        # Backfill a placeholder's name if the list provides one and it was blank.
        if existing.is_placeholder and name and not existing.full_name:
            existing.full_name = name
            existing.save(update_fields=['full_name'])
        return existing, False

    placeholder_email = f"placeholder.{re.sub(r'[^a-z0-9]', '', sid.lower()) or 'unknown'}@placeholder.nemsu"
    user = User(
        student_id=sid,
        institutional_email=placeholder_email,
        full_name=name or sid,
        role='student',
        is_active=False,
        is_verified=False,
        is_placeholder=True,
    )
    user.set_unusable_password()
    user.save()
    return user, True
