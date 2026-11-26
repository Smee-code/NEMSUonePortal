"""
Preferred pickup dates for document requests.

A student may say which day they would like to collect a document. The date has
to be one the Registrar's Office can honor: a weekday (the office is open Monday
to Friday), no sooner than the document's processing time allows, and not
absurdly far away. The same rules produce the earliest date shown in the form,
so what the form offers and what the server accepts cannot drift apart.
"""
import re
from datetime import datetime, timedelta, timezone

# Philippine time has no daylight saving, so a fixed offset is exact and avoids
# depending on a timezone database being installed on the host.
PH_TZ = timezone(timedelta(hours=8))

MAX_DAYS_AHEAD = 60


def today_ph():
    return datetime.now(PH_TZ).date()


def processing_days_min(processing_days):
    """The shortest processing time, in working days, from the catalog's free
    text ("1–2", "7-10", "3 days"). Unknown or empty means one working day."""
    m = re.search(r'\d+', processing_days or '')
    return max(int(m.group()), 1) if m else 1


def add_working_days(start, days):
    d = start
    while days > 0:
        d += timedelta(days=1)
        if d.weekday() < 5:      # Monday=0 … Friday=4
            days -= 1
    return d


def earliest_pickup_date(processing_days, today=None):
    return add_working_days(today or today_ph(), processing_days_min(processing_days))


def latest_pickup_date(today=None):
    return (today or today_ph()) + timedelta(days=MAX_DAYS_AHEAD)


def pickup_date_error(date, processing_days, today=None):
    """Why `date` cannot be a pickup date for this document, or None if it can."""
    today = today or today_ph()
    earliest = earliest_pickup_date(processing_days, today)
    if date.weekday() >= 5:
        return 'The Registrar’s Office is open Monday to Friday. Please choose a weekday.'
    if date < earliest:
        return (f'This document needs processing time. The earliest pickup date is '
                f'{earliest:%B} {earliest.day}, {earliest.year}.')
    if date > latest_pickup_date(today):
        return f'Please choose a date within the next {MAX_DAYS_AHEAD} days.'
    return None
