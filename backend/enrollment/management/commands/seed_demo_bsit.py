"""
Demo seed: faculty Hanna Abanico teaching 4 BSIT 1st-year classes in the current
term (scheduled in the DCS Building, no conflicts), and student JayM Lasaca
enrolled into Block A so he auto-appears on all four rosters.

Idempotent — safe to run more than once. Run with:  python manage.py seed_demo_bsit
"""
import re

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

FAC_EMAIL = 'hannababenapone@gmail.com'
FAC_NAME = 'Hanna Abanico'
FAC_PW = 'Nemsu@12345'

STU_EMAIL = 'duerojaym57@gmail.com'
STU_NAME = 'JayM Lasaca'
STU_PW = 'Student@12345'

# Subjects to ensure for BSIT 1st year / current semester (real ones are reused;
# any missing are created). First 4 are used.
SUBJECTS = [
    ('IT 122', 'Intermediate Programming', '4.25', 'major'),
    ('GE-RPH', 'Readings in Philippine History', '3.00', 'minor'),
    ('GE-STS', 'Science, Technology and Society', '3.00', 'minor'),
    ('GE-AA', 'Art Appreciation', '3.00', 'minor'),
]

# (day, start, end) meetings per subject, and the DCS room each uses.
# Designed so neither the block's students nor the faculty ever overlap.
SCHEDULE = [
    ([('monday', '08:00', '09:30'), ('wednesday', '08:00', '09:30')], 'Computer Laboratory 1'),
    ([('monday', '09:30', '11:00'), ('wednesday', '09:30', '11:00')], 'DCS Room 101'),
    ([('tuesday', '08:00', '09:30'), ('thursday', '08:00', '09:30')], 'DCS Room 102'),
    ([('tuesday', '09:30', '11:00'), ('thursday', '09:30', '11:00')], 'DCS Room 101'),
]
BUILDING = 'DCS Building'


class Command(BaseCommand):
    help = 'Seed demo faculty (4 BSIT 1st-year classes) + an enrolled student.'

    def _next_student_id(self, User, year4):
        prefix = f'{year4}-'
        highest = 0
        for sid in User.objects.filter(student_id__startswith=prefix).values_list('student_id', flat=True):
            m = re.match(rf'^{re.escape(prefix)}(\d+)$', sid or '')
            if m:
                highest = max(highest, int(m.group(1)))
        return f'{prefix}{highest + 1:05d}'

    def handle(self, *args, **opts):
        from authentication.models import User
        from authentication.serializers import generate_faculty_id
        from enrollment.models import (
            Program, AcademicTerm, Subject, Block, EnrollmentRequest, EnrollmentSubject,
        )
        from grades.models import TeachingAssignment
        from grades.views import auto_roster_block_students
        from schedules.models import ClassSchedule

        bsit = (Program.objects.filter(code__iexact='BSIT').first()
                or Program.objects.filter(name__icontains='Information Technology').first())
        if not bsit:
            self.stderr.write(self.style.ERROR('BSIT program not found.'))
            return
        term = (AcademicTerm.objects.filter(is_active=True).first()
                or AcademicTerm.objects.order_by('-start_date').first())
        if not term:
            self.stderr.write(self.style.ERROR('No academic term found.'))
            return
        sem = term.semester
        year4 = (term.year or '').split('-')[0] or str(timezone.now().year)

        with transaction.atomic():
            # ── Faculty ──────────────────────────────────────────────────────
            fac = User.objects.filter(institutional_email__iexact=FAC_EMAIL).first()
            if not fac:
                fac = User.objects.create_user(
                    institutional_email=FAC_EMAIL, student_id=generate_faculty_id(),
                    full_name=FAC_NAME, password=FAC_PW, role='faculty',
                )
            fac.full_name = FAC_NAME
            fac.role = 'faculty'
            fac.is_gec_faculty = False
            fac.program = bsit
            fac.department = bsit.department
            fac.is_active = True
            fac.is_verified = True
            fac.is_placeholder = False
            fac.needs_academic_setup = False
            fac.failed_login_attempts = 0
            fac.locked_until = None
            fac.set_password(FAC_PW)
            fac.save()

            # ── Student ──────────────────────────────────────────────────────
            stu = User.objects.filter(institutional_email__iexact=STU_EMAIL).first()
            if not stu:
                stu = User.objects.create_user(
                    institutional_email=STU_EMAIL, student_id=self._next_student_id(User, year4),
                    full_name=STU_NAME, password=STU_PW, role='student',
                )
            stu.full_name = STU_NAME
            stu.role = 'student'
            stu.program = bsit
            stu.year_level = 1
            stu.is_active = True
            stu.is_verified = True
            stu.is_placeholder = False
            stu.needs_academic_setup = False
            stu.failed_login_attempts = 0
            stu.locked_until = None
            stu.set_password(STU_PW)
            stu.save()

            # ── Subjects (reuse real ones, create any missing) ───────────────
            subjects = []
            for code, name, units, stype in SUBJECTS:
                s = Subject.objects.filter(program=bsit, code__iexact=code, year_level=1).first()
                if not s:
                    s = Subject.objects.create(
                        program=bsit, code=code, name=name, units=units,
                        subject_type=stype, year_level=1, semester=sem, is_active=True,
                    )
                subjects.append(s)
            subjects = subjects[:4]

            # ── Block A ──────────────────────────────────────────────────────
            block, _ = Block.objects.get_or_create(
                program=bsit, academic_term=term, year_level=1, name='Block A',
            )

            # ── Enroll the student into Block A (approved) ───────────────────
            er, _ = EnrollmentRequest.objects.get_or_create(
                student=stu, academic_term=term,
                defaults={'program': bsit, 'year_level': 1, 'student_type': 'continuing'},
            )
            er.program = bsit
            er.year_level = 1
            er.student_type = 'continuing'
            er.block = block
            er.status = EnrollmentRequest.STATUS_APPROVED
            er.processed_at = timezone.now()
            er.save()
            for s in subjects:
                EnrollmentSubject.objects.get_or_create(enrollment=er, subject=s)

            # ── Teaching assignments + schedule + roster ─────────────────────
            for i, s in enumerate(subjects):
                ta, _ = TeachingAssignment.objects.get_or_create(
                    faculty=fac, subject=s, academic_term=term, section='Block A',
                )
                ta.block = block
                ta.section = 'Block A'
                ta.save()
                meetings, room = SCHEDULE[i]
                for day, start, end in meetings:
                    ClassSchedule.objects.get_or_create(
                        teaching_assignment=ta, day_of_week=day, start_time=start, end_time=end,
                        defaults={'room': room, 'building': BUILDING},
                    )
                auto_roster_block_students(ta)  # creates the student's GradeRecord

        self.stdout.write(self.style.SUCCESS(
            f'Seeded: faculty {FAC_NAME} ({fac.student_id}) with {len(subjects)} BSIT 1st-year '
            f'classes in {term}, Block A; student {STU_NAME} ({stu.student_id}) enrolled and rostered.'
        ))
        self.stdout.write(f'  Faculty login: {FAC_EMAIL} / {FAC_PW}')
        self.stdout.write(f'  Student login: {STU_EMAIL} / {STU_PW}')
        for i, s in enumerate(subjects):
            meetings, room = SCHEDULE[i]
            days = ', '.join(f'{d[:3].title()} {a}-{b}' for d, a, b in meetings)
            self.stdout.write(f'  • {s.code} {s.name} — {days} @ {room}')
