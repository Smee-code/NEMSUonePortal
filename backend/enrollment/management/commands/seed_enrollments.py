"""
Management command: seed_enrollments
Creates Block A for each (program × year_level) in the active term,
then creates an approved EnrollmentRequest for every student,
attaching all subjects for their program / year_level / semester.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone


class Command(BaseCommand):
    help = 'Enroll all existing students in Block A for the active term.'

    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model
        from enrollment.models import (
            AcademicTerm, Block, EnrollmentRequest,
            EnrollmentSubject, Subject,
        )
        User = get_user_model()

        # ── Active term ──────────────────────────────────────────────────────
        try:
            term = AcademicTerm.objects.get(is_active=True)
        except AcademicTerm.DoesNotExist:
            self.stdout.write(self.style.ERROR('No active academic term found.'))
            return
        except AcademicTerm.MultipleObjectsReturned:
            term = AcademicTerm.objects.filter(is_active=True).first()

        self.stdout.write(f'Active term: {term} (semester={term.semester})\n')

        # ── Collect students grouped by (program, year_level) ────────────────
        students = (
            User.objects
            .filter(role='student', is_active=True, program__isnull=False, year_level__isnull=False)
            .select_related('program', 'department')
            .order_by('program', 'year_level', 'full_name')
        )

        groups = {}  # (program_id, year_level) → [user, ...]
        for s in students:
            key = (s.program_id, s.year_level)
            groups.setdefault(key, {'program': s.program, 'year_level': s.year_level, 'students': []})
            groups[key]['students'].append(s)

        total_blocks = 0
        total_enrolled = 0
        total_skipped = 0

        with transaction.atomic():
            for key, group in sorted(groups.items(), key=lambda x: (x[1]['program'].code, x[1]['year_level'])):
                program   = group['program']
                year_level = group['year_level']
                group_students = group['students']

                # ── Create Block A if not exists ─────────────────────────────
                block, created = Block.objects.get_or_create(
                    program=program,
                    academic_term=term,
                    year_level=year_level,
                    name='Block A',
                    defaults={'capacity': max(30, len(group_students))},
                )
                if created:
                    total_blocks += 1

                # Expand capacity if students exceed it
                if len(group_students) > block.capacity:
                    block.capacity = len(group_students)
                    block.save(update_fields=['capacity'])

                # ── Subjects for this program / year_level / semester ────────
                subjects = list(
                    Subject.objects.filter(
                        program=program,
                        year_level=year_level,
                        semester=term.semester,
                        is_active=True,
                    )
                )

                # ── Enroll each student ──────────────────────────────────────
                for student in group_students:
                    # Skip if already enrolled this term
                    if EnrollmentRequest.objects.filter(student=student, academic_term=term).exists():
                        total_skipped += 1
                        continue

                    student_type = 'freshman' if year_level == 1 else 'regular'

                    enrollment = EnrollmentRequest.objects.create(
                        student=student,
                        academic_term=term,
                        program=program,
                        block=block,
                        year_level=year_level,
                        status=EnrollmentRequest.STATUS_APPROVED,
                        student_type=student_type,
                        processed_at=timezone.now(),
                    )

                    # Add subjects
                    if subjects:
                        EnrollmentSubject.objects.bulk_create([
                            EnrollmentSubject(enrollment=enrollment, subject=s)
                            for s in subjects
                        ])

                    total_enrolled += 1

                yr_label = {1: '1st', 2: '2nd', 3: '3rd', 4: '4th'}.get(year_level, str(year_level))
                self.stdout.write(
                    f'  [{program.code:<15}] yr{year_level} ({yr_label} Year) — '
                    f'Block A | {len(group_students)} students | {len(subjects)} subjects'
                )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done — {total_blocks} blocks created, '
            f'{total_enrolled} students enrolled, '
            f'{total_skipped} skipped (already enrolled).'
        ))
