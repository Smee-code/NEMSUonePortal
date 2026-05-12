from datetime import date
from zoneinfo import ZoneInfo

from django.utils import timezone

from .models import AcademicTerm


LOCAL_TZ = ZoneInfo('Asia/Manila')


def current_regular_term_parts(today=None):
    current_date = today or timezone.now().astimezone(LOCAL_TZ).date()
    year = current_date.year
    month = current_date.month

    if 8 <= month <= 12:
        return f'{year}-{year + 1}', 'first'
    if 1 <= month <= 6:
        return f'{year - 1}-{year}', 'second'
    return None, None


def current_academic_year(today=None):
    current_date = today or timezone.now().astimezone(LOCAL_TZ).date()
    year = current_date.year
    month = current_date.month

    if month >= 8:
        return f'{year}-{year + 1}'
    return f'{year - 1}-{year}'


def regular_term_date_range(academic_year, semester):
    start_year, end_year = [int(part) for part in academic_year.split('-', 1)]

    if semester == 'first':
        return date(start_year, 8, 1), date(start_year, 12, 31)
    if semester == 'second':
        return date(end_year, 1, 1), date(end_year, 6, 30)
    return date(end_year, 7, 1), date(end_year, 7, 31)


def get_current_regular_term(today=None):
    year, semester = current_regular_term_parts(today)
    if not year or not semester:
        return None
    return AcademicTerm.objects.filter(year=year, semester=semester).first()
