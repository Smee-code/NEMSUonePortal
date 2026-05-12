"""
seed_grade_history
==================
Populates complete historical grade records for all enrolled students.

For each student's current year level, this command back-fills all prior
academic terms (1st year → current year) with:
  - AcademicTerm rows for each past semester
  - EnrollmentRequest + EnrollmentSubject rows
  - TeachingAssignment rows (round-robin across all faculty)
  - GradeRecord rows (submitted, with realistic random grades)

Also fills in grades for the existing current-term enrollments that have
no grade records yet.

Usage:
    python manage.py seed_grade_history
    python manage.py seed_grade_history --clear   # wipe historical data first
"""

import random
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from itertools import cycle

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from authentication.models import User
from enrollment.models import AcademicTerm, EnrollmentRequest, EnrollmentSubject, Subject
from grades.models import GradeRecord, TeachingAssignment


# ---------------------------------------------------------------------------
# Grade distribution (Philippine system: 1.00 best, 5.00 failing)
# Weights lean toward passing for a realistic demo dataset
# ---------------------------------------------------------------------------
GRADE_POOL = [
    Decimal('1.00'), Decimal('1.25'), Decimal('1.50'), Decimal('1.75'),
    Decimal('2.00'), Decimal('2.25'), Decimal('2.50'), Decimal('2.75'),
    Decimal('3.00'), Decimal('3.25'), Decimal('5.00'),
]
GRADE_WEIGHTS = [8, 12, 14, 14, 13, 10, 8, 6, 5, 4, 4]   # sums to 98
INC_CHANCE = 0.02   # 2 % of grade slots get INC


def _random_grade():
    """Return a Decimal grade or the string 'INC'."""
    if random.random() < INC_CHANCE:
        return 'INC'
    return random.choices(GRADE_POOL, weights=GRADE_WEIGHTS, k=1)[0]


def _midterm_final_pair(avg):
    """
    Given a target average, produce a plausible (midterm, final) pair.
    Returns (None, None) for non-numeric grades (INC).
    """
    if not isinstance(avg, Decimal):
        return None, None
    step = Decimal('0.25')
    options = [avg - step, avg, avg + step]
    options = [
        max(Decimal('1.00'), min(Decimal('5.00'), g.quantize(step)))
        for g in options
    ]
    midterm = random.choice(options)
    final = ((avg * 2) - midterm).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    final = max(Decimal('1.00'), min(Decimal('5.00'), final))
    return midterm, final


# ---------------------------------------------------------------------------
# Term calendar
# Each entry: (academic_year, semester, start_date, end_date)
# ---------------------------------------------------------------------------
PAST_TERMS = [
    ('2022-2023', 'first',  date(2022, 8, 1),  date(2022, 12, 31)),
    ('2022-2023', 'second', date(2023, 1, 1),  date(2023, 6, 30)),
    ('2023-2024', 'first',  date(2023, 8, 1),  date(2023, 12, 31)),
    ('2023-2024', 'second', date(2024, 1, 1),  date(2024, 6, 30)),
    ('2024-2025', 'first',  date(2024, 8, 1),  date(2024, 12, 31)),
    ('2024-2025', 'second', date(2025, 1, 1),  date(2025, 6, 30)),
    ('2025-2026', 'first',  date(2025, 8, 1),  date(2025, 12, 31)),
]

# For a student at current year_level Y, these are their completed past terms.
# Each entry: (academic_year, semester, subject_year_level, subject_semester)
HISTORY_MAP = {
    4: [
        ('2022-2023', 'first',  1, 'first'),
        ('2022-2023', 'second', 1, 'second'),
        ('2023-2024', 'first',  2, 'first'),
        ('2023-2024', 'second', 2, 'second'),
        ('2024-2025', 'first',  3, 'first'),
        ('2024-2025', 'second', 3, 'second'),
        ('2025-2026', 'first',  4, 'first'),
    ],
    3: [
        ('2023-2024', 'first',  1, 'first'),
        ('2023-2024', 'second', 1, 'second'),
        ('2024-2025', 'first',  2, 'first'),
        ('2024-2025', 'second', 2, 'second'),
        ('2025-2026', 'first',  3, 'first'),
    ],
    2: [
        ('2024-2025', 'first',  1, 'first'),
        ('2024-2025', 'second', 1, 'second'),
        ('2025-2026', 'first',  2, 'first'),
    ],
    1: [
        ('2025-2026', 'first',  1, 'first'),
    ],
}


class Command(BaseCommand):
    help = 'Seed complete grade history for all students (1st year → current year level).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all historical (non-active) grade records and enrollments before seeding.',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self._clear_historical()

        faculty_cycle = cycle(list(User.objects.filter(role='faculty').values_list('id', flat=True)))

        # Cache: (academic_year, semester) → AcademicTerm instance
        term_cache = {}

        # Cache: (term_id, subject_id) → TeachingAssignment instance
        ta_cache = {}

        students = (
            User.objects
            .filter(role='student', year_level__isnull=False, program__isnull=False)
            .select_related('program')
        )

        total = students.count()
        self.stdout.write(f'Seeding grade history for {total} students...')

        created_terms = created_enrollments = created_grades = 0

        for student in students:
            year_level = student.year_level
            if year_level not in HISTORY_MAP:
                continue

            for (acad_year, semester, subj_yl, subj_sem) in HISTORY_MAP[year_level]:
                # 1. Get or create the AcademicTerm
                term_key = (acad_year, semester)
                if term_key not in term_cache:
                    term_meta = next(
                        (t for t in PAST_TERMS if t[0] == acad_year and t[1] == semester), None
                    )
                    if not term_meta:
                        continue
                    term, created = AcademicTerm.objects.get_or_create(
                        year=acad_year,
                        semester=semester,
                        defaults={
                            'start_date': term_meta[2],
                            'end_date':   term_meta[3],
                            'is_active':  False,
                            'enrollment_open': False,
                        },
                    )
                    if created:
                        created_terms += 1
                    term_cache[term_key] = term
                term = term_cache[term_key]

                # 2. Get subjects for this student's program at the correct year level & semester
                subjects = list(
                    Subject.objects.filter(
                        program=student.program,
                        year_level=subj_yl,
                        semester=subj_sem,
                        is_active=True,
                    )
                )
                if not subjects:
                    continue

                # 3. Get or create EnrollmentRequest
                enrollment, enr_created = EnrollmentRequest.objects.get_or_create(
                    student=student,
                    academic_term=term,
                    defaults={'status': 'approved'},
                )
                if not enr_created and enrollment.status != 'approved':
                    enrollment.status = 'approved'
                    enrollment.save(update_fields=['status'])
                if enr_created:
                    created_enrollments += 1

                for subject in subjects:
                    # Enroll subject
                    EnrollmentSubject.objects.get_or_create(
                        enrollment=enrollment,
                        subject=subject,
                    )

                    # 4. Get or create TeachingAssignment
                    ta_key = (term.id, subject.id)
                    if ta_key not in ta_cache:
                        faculty_id = next(faculty_cycle)
                        ta, _ = TeachingAssignment.objects.get_or_create(
                            subject=subject,
                            academic_term=term,
                            defaults={
                                'faculty_id': faculty_id,
                                'assigned_by_id': faculty_id,
                            },
                        )
                        ta_cache[ta_key] = ta
                    ta = ta_cache[ta_key]

                    # 5. Create GradeRecord if not already present
                    if GradeRecord.objects.filter(
                        student=student, subject=subject, academic_term=term
                    ).exists():
                        continue

                    grade_val = _random_grade()
                    if grade_val == 'INC':
                        GradeRecord.objects.create(
                            student=student,
                            subject=subject,
                            academic_term=term,
                            teaching_assignment=ta,
                            midterm_grade=None,
                            final_grade=None,
                            grade='INC',
                            remarks='Incomplete',
                            encoded_by_id=ta.faculty_id,
                            is_submitted=True,
                            submitted_at=timezone.now(),
                        )
                    else:
                        midterm, final = _midterm_final_pair(grade_val)
                        GradeRecord.objects.create(
                            student=student,
                            subject=subject,
                            academic_term=term,
                            teaching_assignment=ta,
                            midterm_grade=midterm,
                            final_grade=final,
                            grade=str(grade_val),
                            remarks='',
                            encoded_by_id=ta.faculty_id,
                            is_submitted=True,
                            submitted_at=timezone.now(),
                        )
                    created_grades += 1

        # Also seed grades for current-term enrollments that are missing grade records
        current_grades = self._seed_current_term_grades(ta_cache, faculty_cycle)

        self.stdout.write(self.style.SUCCESS(
            f'\nDone.\n'
            f'  Terms created : {created_terms}\n'
            f'  Enrollments   : {created_enrollments}\n'
            f'  Grade records : {created_grades + current_grades}'
        ))

    def _seed_current_term_grades(self, ta_cache, faculty_cycle):
        """Fill in submitted grades for current-term approved enrollments."""
        current_terms = AcademicTerm.objects.filter(is_active=True)
        created = 0

        for term in current_terms:
            for enrollment in EnrollmentRequest.objects.filter(
                academic_term=term, status='approved'
            ).select_related('student__program'):
                for es in EnrollmentSubject.objects.filter(enrollment=enrollment).select_related('subject'):
                    subject = es.subject
                    student = enrollment.student

                    if GradeRecord.objects.filter(
                        student=student, subject=subject, academic_term=term
                    ).exists():
                        continue

                    ta_key = (term.id, subject.id)
                    if ta_key not in ta_cache:
                        faculty_id = next(faculty_cycle)
                        ta, _ = TeachingAssignment.objects.get_or_create(
                            subject=subject,
                            academic_term=term,
                            defaults={
                                'faculty_id': faculty_id,
                                'assigned_by_id': faculty_id,
                            },
                        )
                        ta_cache[ta_key] = ta
                    ta = ta_cache[ta_key]

                    grade_val = _random_grade()
                    if grade_val == 'INC':
                        GradeRecord.objects.create(
                            student=student, subject=subject, academic_term=term,
                            teaching_assignment=ta,
                            midterm_grade=None, final_grade=None,
                            grade='INC', remarks='Incomplete',
                            encoded_by_id=ta.faculty_id,
                            is_submitted=True, submitted_at=timezone.now(),
                        )
                    else:
                        midterm, final = _midterm_final_pair(grade_val)
                        GradeRecord.objects.create(
                            student=student, subject=subject, academic_term=term,
                            teaching_assignment=ta,
                            midterm_grade=midterm, final_grade=final,
                            grade=str(grade_val), remarks='',
                            encoded_by_id=ta.faculty_id,
                            is_submitted=True, submitted_at=timezone.now(),
                        )
                    created += 1
        return created

    def _clear_historical(self):
        inactive_terms = AcademicTerm.objects.filter(is_active=False)
        gr = GradeRecord.objects.filter(academic_term__in=inactive_terms).count()
        GradeRecord.objects.filter(academic_term__in=inactive_terms).delete()
        enr = EnrollmentRequest.objects.filter(academic_term__in=inactive_terms).count()
        EnrollmentRequest.objects.filter(academic_term__in=inactive_terms).delete()
        ta = TeachingAssignment.objects.filter(academic_term__in=inactive_terms).count()
        TeachingAssignment.objects.filter(academic_term__in=inactive_terms).delete()
        inactive_terms.delete()
        self.stdout.write(
            f'Cleared: {gr} grades, {enr} enrollments, {ta} assignments, '
            f'{inactive_terms.count()} terms'
        )
