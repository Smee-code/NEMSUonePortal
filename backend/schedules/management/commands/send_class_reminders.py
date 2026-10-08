"""Email + in-app reminders shortly before a class starts.

Finds the meetings of the current (active) term that begin within the next
``--lead`` minutes today and, for each, notifies the instructor and the
enrolled students — once per class per day (a ClassReminderLog row guards
against duplicates, so the job is safe to run every minute).

Run it once::

    python manage.py send_class_reminders

or keep it running (minute-level precision, e.g. a PythonAnywhere always-on
task)::

    python manage.py send_class_reminders --loop
"""

import logging
import time as _time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import IntegrityError, transaction

logger = logging.getLogger(__name__)

WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

# Schedule start/end times are entered as Philippine local time, while the
# project runs on UTC (settings.TIME_ZONE). Compare "now" in campus time so a
# 13:00 class reminds at 13:00 PH, not 8 hours off.
SCHOOL_TZ = ZoneInfo('Asia/Manila')


def _fmt_time(t):
    if not t:
        return ''
    hr = t.hour % 12 or 12
    ampm = 'AM' if t.hour < 12 else 'PM'
    return f'{hr}:{t.minute:02d} {ampm}'


def _student_recipients(ta):
    """Every student in this class: the encoded roster plus the approved block
    cohort for the subject. Returns a dict of {user_id: User} to dedupe."""
    from grades.models import GradeRecord
    from enrollment.models import EnrollmentSubject

    users = {}
    roster = (
        GradeRecord.objects
        .filter(teaching_assignment=ta, is_dropped=False)
        .select_related('student')
    )
    for rec in roster:
        if rec.student_id:
            users[rec.student_id] = rec.student

    if ta.block_id:
        cohort = (
            EnrollmentSubject.objects
            .filter(
                subject=ta.subject,
                enrollment__block_id=ta.block_id,
                enrollment__academic_term=ta.academic_term,
                enrollment__status='approved',
            )
            .select_related('enrollment__student')
        )
        for es in cohort:
            stu = es.enrollment.student
            if stu and stu.id not in users:
                users[stu.id] = stu
    return users


class Command(BaseCommand):
    help = 'Send pre-class reminders (email + in-app) to faculty and students.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--lead', type=int, default=15,
            help='Minutes before start time to send the reminder (default 15).',
        )
        parser.add_argument(
            '--loop', action='store_true',
            help='Keep running, checking once a minute (for an always-on task).',
        )

    def handle(self, *args, **opts):
        lead = max(1, opts['lead'])
        if opts['loop']:
            self.stdout.write(f'Class-reminder loop started (lead={lead}m). Ctrl-C to stop.')
            while True:
                try:
                    self._run_once(lead)
                except Exception:
                    logger.exception('Class-reminder pass failed')
                _time.sleep(60)
        else:
            sent = self._run_once(lead)
            self.stdout.write(self.style.SUCCESS(f'Reminders sent for {sent} class(es).'))

    def _run_once(self, lead):
        from schedules.models import ClassSchedule, ClassReminderLog
        from announcements.models import Notification

        now = datetime.now(SCHOOL_TZ)
        today = now.date()
        day_name = WEEKDAYS[now.weekday()]
        if day_name == 'sunday':
            return 0  # no Sunday classes in the schedule

        window_end = (now + timedelta(minutes=lead)).time()
        now_t = now.time()
        if window_end <= now_t:
            return 0  # lead window wraps past midnight — nothing to do

        slots = (
            ClassSchedule.objects
            .filter(
                day_of_week=day_name,
                start_time__gt=now_t,
                start_time__lte=window_end,
                teaching_assignment__academic_term__is_active=True,
            )
            .exclude(reminder_logs__occurrence_date=today)
            .select_related(
                'teaching_assignment__subject',
                'teaching_assignment__faculty',
                'teaching_assignment__block',
                'teaching_assignment__academic_term',
            )
        )

        sent_classes = 0
        for slot in slots:
            try:
                with transaction.atomic():
                    # Claim this occurrence first; the unique constraint makes the
                    # claim atomic so two overlapping runs never double-send.
                    log = ClassReminderLog.objects.create(
                        class_schedule=slot, occurrence_date=today,
                    )
                    count = self._notify_slot(slot, now, Notification)
                    log.recipients = count
                    log.save(update_fields=['recipients'])
                sent_classes += 1
            except IntegrityError:
                continue  # another run already claimed this occurrence
            except Exception:
                logger.exception('Failed to send reminder for schedule %s', slot.id)
        return sent_classes

    def _notify_slot(self, slot, now, Notification):
        ta = slot.teaching_assignment
        subject = ta.subject
        code = subject.code
        name = subject.name
        when = f'{_fmt_time(slot.start_time)} – {_fmt_time(slot.end_time)}'
        where = slot.room or 'room TBA'
        if slot.building:
            where = f'{slot.building} · {where}'
        start_dt = now.replace(
            hour=slot.start_time.hour, minute=slot.start_time.minute,
            second=0, microsecond=0,
        )
        mins = max(1, int((start_dt - now).total_seconds() // 60))
        lead_phrase = f'in about {mins} minute{"s" if mins != 1 else ""}'

        emails = []
        students = _student_recipients(ta)
        student_objs = [u for u in students.values()]

        # Students
        for stu in student_objs:
            if stu.institutional_email:
                emails.append((
                    f'Class reminder — {code} starts {lead_phrase}',
                    (
                        f'Hi {stu.full_name},\n\n'
                        f'This is a reminder that your class starts {lead_phrase}.\n\n'
                        f'Course: {code} - {name}\n'
                        f'Time: {when}\n'
                        f'Room: {where}\n'
                        f'Instructor: {ta.faculty.full_name if ta.faculty_id else "TBA"}\n\n'
                        f'Open "My Schedule" in NEMSUonePortal for your full timetable.\n\n'
                        f'— NEMSU Cantilan Campus'
                    ),
                    settings.DEFAULT_FROM_EMAIL,
                    [stu.institutional_email],
                ))

        # Faculty
        faculty = ta.faculty if ta.faculty_id else None
        block_label = ta.block.name if ta.block_id else (ta.section or '')
        if faculty and faculty.institutional_email:
            emails.append((
                f'Class reminder — {code} starts {lead_phrase}',
                (
                    f'Hi {faculty.full_name},\n\n'
                    f'This is a reminder that your class starts {lead_phrase}.\n\n'
                    f'Course: {code} - {name}\n'
                    + (f'Block: {block_label}\n' if block_label else '')
                    + f'Time: {when}\n'
                    f'Room: {where}\n\n'
                    f'Open "My Schedule" in NEMSUonePortal for your full timetable.\n\n'
                    f'— NEMSU Cantilan Campus'
                ),
                settings.DEFAULT_FROM_EMAIL,
                [faculty.institutional_email],
            ))

        if emails:
            try:
                from nemsuoneportal.emails import send_branded_mass_email
                send_branded_mass_email(emails, fail_silently=True)
            except Exception:
                logger.warning('Failed to send class-reminder emails', exc_info=True)

        # In-app bell (covers people without an email too)
        try:
            if student_objs:
                Notification.push(
                    student_objs,
                    title=f'Class reminder — {code} starts {lead_phrase}',
                    body=f'{code} - {name} ({when}) in {where}. Get ready!',
                    category='schedule',
                    link='/student/schedule',
                )
            if faculty:
                Notification.push(
                    [faculty],
                    title=f'Class reminder — {code} starts {lead_phrase}',
                    body=(
                        f'{code} - {name}'
                        + (f' · {block_label}' if block_label else '')
                        + f' ({when}) in {where}.'
                    ),
                    category='schedule',
                    link='/faculty/timetable',
                )
        except Exception:
            logger.warning('Failed to create class-reminder notifications', exc_info=True)

        return len(student_objs) + (1 if faculty else 0)
