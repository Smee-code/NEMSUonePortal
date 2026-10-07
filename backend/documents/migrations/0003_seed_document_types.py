from django.db import migrations


SEED = [
    ('certificate_of_enrollment', 'Certificate of Enrollment', 'Proves you are enrolled this term.', 50, '1–2', 1),
    ('transcript_of_records', 'Transcript of Records', 'Official record of all subjects taken with grades.', 200, '7–10', 2),
    ('certificate_of_grades', 'Certificate of Grades', 'Summary of grades for a specific term.', 50, '2–3', 3),
]


def seed(apps, schema_editor):
    DocumentType = apps.get_model('documents', 'DocumentType')
    for code, name, desc, fee, days, order in SEED:
        DocumentType.objects.get_or_create(
            code=code,
            defaults={
                'name': name, 'description': desc, 'fee': fee,
                'processing_days': days, 'sort_order': order, 'is_active': True,
            },
        )


def unseed(apps, schema_editor):
    DocumentType = apps.get_model('documents', 'DocumentType')
    DocumentType.objects.filter(code__in=[s[0] for s in SEED]).delete()


class Migration(migrations.Migration):
    dependencies = [('documents', '0002_documenttype')]
    operations = [migrations.RunPython(seed, unseed)]
