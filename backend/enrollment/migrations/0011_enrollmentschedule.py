from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('enrollment', '0010_enrollmentrequest_student_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='EnrollmentSchedule',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('student_type', models.CharField(
                    choices=[
                        ('freshman',   'Freshmen'),
                        ('transferee', 'Transferees'),
                        ('shiftee',    'Shiftees'),
                        ('regular',    'Regular Students'),
                    ],
                    max_length=20,
                )),
                ('start_date',    models.DateField()),
                ('end_date',      models.DateField()),
                ('display_order', models.PositiveSmallIntegerField(default=0)),
                ('term', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='enrollment_schedules',
                    to='enrollment.academicterm',
                )),
            ],
            options={
                'ordering': ['display_order', 'start_date'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='enrollmentschedule',
            unique_together={('term', 'student_type')},
        ),
    ]
