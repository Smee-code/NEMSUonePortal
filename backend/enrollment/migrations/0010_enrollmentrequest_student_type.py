from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollment', '0009_add_block_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='enrollmentrequest',
            name='student_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('freshman',   'Freshman'),
                    ('regular',    'Regular'),
                    ('shiftee',    'Shiftee'),
                    ('transferee', 'Transferee'),
                ],
                default='regular',
                max_length=20,
            ),
        ),
    ]
