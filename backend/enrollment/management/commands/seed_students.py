"""
Management command: seed_students
Creates 10 student accounts per program, distributed across year levels 1–4,
with realistic Filipino names. All accounts use password: Student@123
"""
import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

User = get_user_model()

FIRST_NAMES = [
    'Juan', 'Jose', 'Carlos', 'Miguel', 'Antonio', 'Ricardo', 'Eduardo',
    'Roberto', 'Fernando', 'Andres', 'Marco', 'Luis', 'Ramon', 'Victor',
    'Daniel', 'Rodrigo', 'Ernesto', 'Manuel', 'Francisco', 'Alejandro',
    'Maria', 'Ana', 'Rosa', 'Cristina', 'Elena', 'Luz', 'Caridad',
    'Esperanza', 'Gloria', 'Josephine', 'Maricel', 'Rowena', 'Lourdes',
    'Melanie', 'Jennifer', 'Christine', 'Jasmine', 'Angela', 'Patricia',
    'Rosario', 'Maribel', 'Cecilia', 'Teresita', 'Corazon', 'Florencia',
    'Bernardo', 'Rolando', 'Victorino', 'Alfredo', 'Renato',
]

LAST_NAMES = [
    'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza',
    'Torres', 'Flores', 'Alvarez', 'Castillo', 'Morales', 'Villanueva',
    'Domingo', 'Hernandez', 'Aquino', 'Ramos', 'Fernandez', 'Rivera',
    'Padilla', 'Gutierrez', 'Navarro', 'Velasco', 'Salazar', 'Aguilar',
    'Soriano', 'Fuentes', 'Medina', 'Pascual', 'Delos Santos', 'Dela Cruz',
    'Dela Torre', 'Macaraeg', 'Buenaventura', 'Tolentino', 'Andrade',
    'Evangelista', 'Ibarra', 'Legaspi', 'Magbanua', 'Natividad',
    'Orozco', 'Peralta', 'Quiambao', 'Sison', 'Umali', 'Vergara',
    'Wenceslao', 'Yap', 'Zabala',
]

DEFAULT_PASSWORD = 'Student@123'
STUDENTS_PER_PROGRAM = 10
START_YEAR = 2024


class Command(BaseCommand):
    help = f'Seed {STUDENTS_PER_PROGRAM} students per program.'

    def handle(self, *args, **options):
        from enrollment.models import Program

        programs = list(Program.objects.select_related('department').all())
        if not programs:
            self.stdout.write(self.style.ERROR('No programs found. Add programs first.'))
            return

        self.stdout.write(
            f'Creating {STUDENTS_PER_PROGRAM} students × {len(programs)} programs '
            f'= {STUDENTS_PER_PROGRAM * len(programs)} accounts…\n'
        )

        # Find the highest existing auto-generated student ID to avoid collisions
        existing_ids = set(User.objects.values_list('student_id', flat=True))
        seq = self._next_seq(existing_ids)

        created = 0
        skipped = 0
        year_levels = [1, 2, 3, 4]

        rng = random.Random(42)  # fixed seed for reproducibility

        with transaction.atomic():
            for program in programs:
                for i in range(STUDENTS_PER_PROGRAM):
                    first = rng.choice(FIRST_NAMES)
                    last  = rng.choice(LAST_NAMES)
                    full_name = f'{first} {last}'

                    student_id = f'{START_YEAR}-{seq:04d}'
                    # Sanitise name for email: lowercase, no spaces/special chars
                    email_local = (
                        first.lower().replace(' ', '') +
                        '.' +
                        last.lower().replace(' ', '').replace("'", '') +
                        str(seq)
                    )
                    email = f'{email_local}@nemsu.edu.ph'
                    year_level = year_levels[i % 4]  # spread 1-2-3-4-1-2-3-4…

                    # Skip if email or student_id already taken
                    if student_id in existing_ids or User.objects.filter(institutional_email=email).exists():
                        skipped += 1
                        seq += 1
                        continue

                    User.objects.create_user(
                        institutional_email=email,
                        student_id=student_id,
                        full_name=full_name,
                        password=DEFAULT_PASSWORD,
                        role='student',
                        is_verified=True,
                        is_active=True,
                        department=program.department,
                        program=program,
                        year_level=year_level,
                    )
                    existing_ids.add(student_id)
                    created += 1
                    seq += 1

                self.stdout.write(
                    f'  [{program.code:<15}] {program.name[:55]}'
                )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done — {created} students created, {skipped} skipped (duplicates).'
        ))
        self.stdout.write(f'  Default password: {DEFAULT_PASSWORD}')

    @staticmethod
    def _next_seq(existing_ids):
        """Return next available 4-digit sequence number."""
        nums = set()
        for sid in existing_ids:
            parts = sid.split('-')
            if len(parts) == 2 and parts[1].isdigit():
                nums.add(int(parts[1]))
        n = 1
        while n in nums:
            n += 1
        return n
