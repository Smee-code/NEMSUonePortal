"""
Consolidate every Block onto the single canonical "Block X" naming format.

Legacy databases (e.g. the deployed one) can hold blocks created under an older
naming scheme — "A", "B", "1B" — alongside the current canonical "Block A",
"Block B" … produced by block_label(). Because a block is unique per
(program, term, year_level, NAME), those read as different blocks, so the real
enrollments sit in the legacy-named ones while the generated canonical set is
empty, and both show up in pickers.

This command groups blocks by (program, term, year_level, canonical-name),
merges each group onto one keeper (the block holding the students), repoints the
enrollment / teaching-assignment / expansion-request references, deletes the
empty duplicates, and renames the keeper to the canonical name.

Default is a DRY RUN. Pass --apply to perform the changes (wrapped in one
transaction). Safe to run repeatedly — once normalized it reports nothing to do.
"""
import re
from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from enrollment.models import Block, BlockExpansionRequest, EnrollmentRequest
from grades.models import TeachingAssignment

CANON_RE = re.compile(r'^Block [A-Z0-9]+$')


def canonical_name(name):
    """Map any block name to the canonical 'Block <LETTERS>' form.

    'Block A' / 'Block 1A' -> unchanged;  'A' -> 'Block A';  '1B' -> 'Block B'
    (the leading digit is the year level, already stored on the row).
    """
    name = (name or '').strip()
    if CANON_RE.match(name):
        return name
    m = re.search(r'([A-Za-z]+)\s*$', name)
    letters = (m.group(1) if m else name).upper().replace(' ', '')
    return f'Block {letters}' if letters else name


class Command(BaseCommand):
    help = "Consolidate blocks onto the canonical 'Block X' name, merging duplicates."

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply', action='store_true',
            help='Perform the changes. Without it, only prints the plan (dry run).',
        )

    def handle(self, *args, **opts):
        apply_changes = opts['apply']

        groups = defaultdict(list)
        for b in Block.objects.select_related('program', 'academic_term').all():
            key = (b.program_id, b.academic_term_id, b.year_level, canonical_name(b.name))
            groups[key].append(b)

        def approved(block):
            return EnrollmentRequest.objects.filter(block=block, status='approved').count()

        plan = []
        for (_prog, _term, _yl, canon), blocks in groups.items():
            needs_rename = any(b.name != canon for b in blocks)
            if len(blocks) == 1 and not needs_rename:
                continue
            counts = {b.id: approved(b) for b in blocks}
            # Keeper = most approved enrollments; tiebreak: already-canonical, then lowest id.
            keeper = sorted(
                blocks, key=lambda b: (-counts[b.id], 0 if b.name == canon else 1, b.id)
            )[0]
            others = [b for b in blocks if b.id != keeper.id]
            plan.append((canon, keeper, others, counts))

        if not plan:
            self.stdout.write('All blocks already use the canonical format. Nothing to do.')
            return

        for canon, keeper, others, counts in plan:
            head = f'[{keeper.program.code} | {keeper.academic_term} | yr{keeper.year_level}] -> {canon}'
            self.stdout.write('\n' + head)
            rename = ' [rename]' if keeper.name != canon else ''
            self.stdout.write(f'  keep:  "{keeper.name}" (id {keeper.id}, {counts[keeper.id]} enrolled){rename}')
            for o in others:
                self.stdout.write(
                    f'  merge: "{o.name}" (id {o.id}, {counts[o.id]} enrolled) -> keeper, then delete'
                )

        if not apply_changes:
            self.stdout.write(self.style.WARNING('\nDry run — no changes made. Re-run with --apply to perform them.'))
            return

        renamed = deleted = 0
        with transaction.atomic():
            for canon, keeper, others, _counts in plan:
                for o in others:
                    EnrollmentRequest.objects.filter(block=o).update(block=keeper)
                    TeachingAssignment.objects.filter(block=o).update(block=keeper)
                    BlockExpansionRequest.objects.filter(block=o).update(block=keeper)
                # Capacity must never fall below the merged enrolled total.
                new_enrolled = EnrollmentRequest.objects.filter(block=keeper, status='approved').count()
                new_cap = max([keeper.capacity] + [o.capacity for o in others] + [new_enrolled])
                for o in others:
                    o.delete()
                    deleted += 1
                changed = []
                if keeper.capacity != new_cap:
                    keeper.capacity = new_cap
                    changed.append('capacity')
                if keeper.name != canon:
                    keeper.name = canon
                    changed.append('name')
                    renamed += 1
                if changed:
                    keeper.save(update_fields=changed)

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. Renamed {renamed} block(s); merged and deleted {deleted} duplicate(s).'
        ))
