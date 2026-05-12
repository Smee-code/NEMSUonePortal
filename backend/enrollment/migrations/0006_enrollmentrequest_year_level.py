from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollment', '0005_alter_subject_units'),
    ]

    operations = [
        migrations.AddField(
            model_name='enrollmentrequest',
            name='year_level',
            field=models.PositiveSmallIntegerField(
                blank=True,
                choices=[(1, '1st Year'), (2, '2nd Year'), (3, '3rd Year'), (4, '4th Year')],
                null=True,
            ),
        ),
    ]
