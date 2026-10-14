"""
Make every teaching assignment's section label match its block name.

By convention the section label on a class doubles as its block name
("Block A") — see TeachingAssignmentAssignView. Older assignments stored
short, inconsistent sections ("A", "1A", "1B") instead, so the faculty UI
shows "[A]" for one class and "[BLOCK A]" for another in the same list.

This command sets section = block.name for every assignment that has a block,
so the labels read consistently ("[BLOCK A]"). Assignments without a block are
left untouched (there is no block name to use). A change that would collide with
another of the same faculty's classes (same subject, term and target section) is
skipped and reported rather than forced.

Default is a DRY RUN. Pass --apply to perform the changes.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from grades.models import TeachingAssignment


class Command(BaseCommand):
    help = "Set each teaching assignment's section to its block name for consistent labels."

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply', action='store_true',
            help='Perform the changes. Without it, only prints the plan (dry run).',
        )

    def handle(self, *args, **opts):
        apply_changes = opts['apply']

        # Reserve the (faculty, subject, term, section) space so we never create a
        # duplicate — accounting for both existing rows and the renames we queue.
        taken = {
            (ta.faculty_id, ta.subject_id, ta.academic_term_id, ta.section)
            for ta in TeachingAssignment.objects.all()
        }

        changes, skipped = [], []
        qs = (
            TeachingAssignment.objects
            .filter(block__isnull=False)
            .select_related('block', 'subject', 'faculty', 'academic_term')
            .order_by('subject__code', 'section')
        )
        for ta in qs:
            target = ta.block.name
            if ta.section == target:
                continue
            key = (ta.faculty_id, ta.subject_id, ta.academic_term_id, target)
            if key in taken:
                skipped.append((ta, target))
                continue
            changes.append((ta, target))
            taken.discard((ta.faculty_id, ta.subject_id, ta.academic_term_id, ta.section))
            taken.add(key)

        if not changes and not skipped:
            self.stdout.write('All section labels already match their block name. Nothing to do.')
            return

        for ta, target in changes:
            self.stdout.write(f'  {ta.subject.code}: "{ta.section}" -> "{target}"  ({ta.faculty.full_name})')
        for ta, target in skipped:
            self.stdout.write(self.style.WARNING(
                f'  SKIP {ta.subject.code}: "{ta.section}" -> "{target}" '
                f'({ta.faculty.full_name} already has a class with that section)'
            ))

        if not apply_changes:
            self.stdout.write(self.style.WARNING('\nDry run — no changes made. Re-run with --apply to perform them.'))
            return

        with transaction.atomic():
            for ta, target in changes:
                ta.section = target
                ta.save(update_fields=['section'])

        self.stdout.write(self.style.SUCCESS(f'\nDone. Updated {len(changes)} section label(s).'))
