from django.core.management.base import BaseCommand
from django.db import transaction

from enrollment.models import EnrollmentRequest
from enrollment.views import _assign_block


class Command(BaseCommand):
    help = 'Assign blocks to all approved enrollments that have no block (max 30 per block).'

    def handle(self, *args, **options):
        unblocked = (
            EnrollmentRequest.objects
            .filter(status='approved', block__isnull=True)
            .select_related('student__program', 'program', 'academic_term')
            .order_by('academic_term__year', 'program__code', 'year_level', 'submitted_at')
        )

        total = unblocked.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS('All approved enrollments already have a block assigned.'))
            return

        self.stdout.write(f'Found {total} approved enrollment(s) without a block. Assigning...\n')

        done = 0
        skipped = 0
        errors = 0

        for enrollment in unblocked:
            # Back-fill program and year_level from the student's profile if missing
            needs_save = False
            if not enrollment.program_id and enrollment.student.program_id:
                enrollment.program_id = enrollment.student.program_id
                needs_save = True
            if not enrollment.year_level and enrollment.student.year_level:
                enrollment.year_level = enrollment.student.year_level
                needs_save = True

            if not enrollment.program_id or not enrollment.year_level:
                skipped += 1
                self.stdout.write(
                    f'  SKIP {enrollment.id} - no program/year_level on student or enrollment'
                )
                continue

            try:
                with transaction.atomic():
                    if needs_save:
                        enrollment.save(update_fields=['program', 'year_level'])
                    _assign_block(enrollment)
                done += 1
                self.stdout.write(
                    f'  [{done}] {enrollment.student.student_id} - '
                    f'{enrollment.program.code} Yr{enrollment.year_level} '
                    f'({enrollment.academic_term}) -> {enrollment.block.name}'
                )
            except Exception as exc:
                errors += 1
                self.stdout.write(self.style.ERROR(f'  ERROR for enrollment {enrollment.id}: {exc}'))

        self.stdout.write('')
        summary = f'Done: {done} assigned'
        if skipped:
            summary += f', {skipped} skipped (no program data)'
        if errors:
            summary += f', {errors} errors'
        style = self.style.SUCCESS if errors == 0 else self.style.WARNING
        self.stdout.write(style(summary))
