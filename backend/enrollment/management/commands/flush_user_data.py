"""
Management command: flush_user_data
Deletes all transactional records (enrollments, grades, schedules, documents,
announcements, audit logs, tokens) while preserving:
  - All user accounts (students, faculty, registrar, admin)
  - Reference / configuration data (departments, programs, terms, subjects, blocks)
"""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = 'Clear all user-generated data while keeping accounts and reference data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting anything.',
        )

    def handle(self, *args, **options):
        dry = options['dry_run']

        # Import here to avoid circular imports at module load time
        from announcements.models import Announcement
        from authentication.models import AuditLog, EmailVerificationToken, PasswordResetToken
        from documents.models import DocumentRequest
        from enrollment.models import (
            BlockExpansionRequest, CurriculumDocument,
            EnrollmentRequest, EnrollmentSchedule, EnrollmentSubject,
            PendingEnrollment, PreEnrollmentDocument,
        )
        from grades.models import GradeRecord, TeachingAssignment
        from schedules.models import ClassSchedule

        # (model, label) — order matters for FK constraints, but Django
        # handles ON DELETE CASCADE so the order here is just for readability.
        targets = [
            (EnrollmentSubject,       'Enrollment subjects'),
            (EnrollmentSchedule,      'Enrollment schedules'),
            (PreEnrollmentDocument,   'Pre-enrollment documents'),
            (PendingEnrollment,       'Pending enrollments'),
            (BlockExpansionRequest,   'Block expansion requests'),
            (EnrollmentRequest,       'Enrollment requests'),
            (CurriculumDocument,      'Curriculum documents'),
            (GradeRecord,             'Grade records'),
            (TeachingAssignment,      'Teaching assignments'),
            (ClassSchedule,           'Class schedules'),
            (DocumentRequest,         'Document requests'),
            (Announcement,            'Announcements'),
            (AuditLog,                'Audit logs'),
            (EmailVerificationToken,  'Email verification tokens'),
            (PasswordResetToken,      'Password reset tokens'),
        ]

        self.stdout.write('')
        if dry:
            self.stdout.write(self.style.WARNING('DRY RUN — nothing will be deleted.\n'))

        total = 0
        counts = []
        for model, label in targets:
            count = model.objects.count()
            counts.append((label, count))
            total += count

        # Print summary table
        self.stdout.write(self.style.HTTP_INFO('Records to be deleted:'))
        self.stdout.write(f'  {"Table":<35} {"Count":>6}')
        self.stdout.write(f'  {"-"*35} {"------":>6}')
        for label, count in counts:
            self.stdout.write(f'  {label:<35} {count:>6}')
        self.stdout.write(f'  {"-"*35} {"------":>6}')
        self.stdout.write(f'  {"TOTAL":<35} {total:>6}')
        self.stdout.write('')

        if dry:
            self.stdout.write(self.style.SUCCESS('Dry run complete. No data was changed.'))
            return

        confirm = input('Type YES to confirm deletion: ')
        if confirm.strip() != 'YES':
            self.stdout.write(self.style.WARNING('Aborted — nothing was deleted.'))
            return

        with transaction.atomic():
            for model, label in targets:
                deleted, _ = model.objects.all().delete()
                self.stdout.write(f'  Deleted {deleted:>5}  {label}')

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            'Done. All transactional data cleared. User accounts and reference data are intact.'
        ))
