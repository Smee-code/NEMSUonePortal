from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollment', '0007_subject_prerequisite'),
    ]

    operations = [
        migrations.AddField(
            model_name='subject',
            name='subject_type',
            field=models.CharField(
                choices=[
                    ('major', 'Major Subject'),
                    ('minor', 'Minor Subject'),
                ],
                default='minor',
                max_length=10,
            ),
        ),
    ]
