from django.db import migrations, models


def promote_newest_term(apps, schema_editor):
    """Make the term with the latest start date the single current term.

    Mirrors AcademicTerm.sync_current(): the newest term becomes active and any
    enrollment window left open on an older term is closed. This brings existing
    databases in line with the new 'newest start date wins' rule in one shot.
    """
    AcademicTerm = apps.get_model('enrollment', 'AcademicTerm')
    latest = AcademicTerm.objects.order_by('-start_date', '-id').first()
    if latest is None:
        return
    AcademicTerm.objects.exclude(pk=latest.pk).filter(
        models.Q(is_active=True) | models.Q(enrollment_open=True)
    ).update(is_active=False, enrollment_open=False)
    if not latest.is_active:
        AcademicTerm.objects.filter(pk=latest.pk).update(is_active=True)


def noop_reverse(apps, schema_editor):
    # No meaningful reverse: the previous active/enrollment flags are not recorded.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('enrollment', '0023_alter_pendingenrollment_student_type'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='academicterm',
            options={'ordering': ['-start_date', '-year', 'semester']},
        ),
        migrations.RunPython(promote_newest_term, noop_reverse),
    ]
