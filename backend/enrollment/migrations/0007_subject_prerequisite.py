from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('enrollment', '0006_enrollmentrequest_year_level'),
    ]

    operations = [
        migrations.AddField(
            model_name='subject',
            name='prerequisite',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='dependent_subjects',
                to='enrollment.subject',
            ),
        ),
    ]
