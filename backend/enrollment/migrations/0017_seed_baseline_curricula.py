from django.db import migrations

BASE_YEAR = 2019  # effectivity of the pre-existing ("legacy") curriculum


def seed_baseline(apps, schema_editor):
    Program = apps.get_model('enrollment', 'Program')
    Subject = apps.get_model('enrollment', 'Subject')
    Curriculum = apps.get_model('enrollment', 'Curriculum')
    User = apps.get_model('authentication', 'User')

    for program in Program.objects.all():
        curriculum, _ = Curriculum.objects.get_or_create(
            program=program,
            year_effective=BASE_YEAR,
            defaults={'code': f'{program.code}-{BASE_YEAR}', 'is_active': True},
        )
        subjects = list(Subject.objects.filter(program=program))
        if subjects:
            curriculum.subjects.add(*subjects)
        User.objects.filter(
            role='student', program=program, curriculum__isnull=True
        ).update(curriculum=curriculum)


def unseed(apps, schema_editor):
    Curriculum = apps.get_model('enrollment', 'Curriculum')
    Curriculum.objects.filter(year_effective=BASE_YEAR).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('enrollment', '0016_curriculum'),
        ('authentication', '0007_user_curriculum'),
    ]
    operations = [
        migrations.RunPython(seed_baseline, unseed),
    ]
