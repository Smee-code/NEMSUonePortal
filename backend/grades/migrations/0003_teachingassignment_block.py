import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('grades', '0002_graderecord_midterm_final_numeric'),
        ('enrollment', '0014_blockexpansionrequest'),
    ]

    operations = [
        migrations.AddField(
            model_name='teachingassignment',
            name='block',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='teaching_assignments',
                to='enrollment.block',
            ),
        ),
    ]
