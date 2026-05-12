from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('enrollment', '0012_pendingenrollment'),
    ]

    operations = [
        migrations.CreateModel(
            name='PreEnrollmentDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('requirement_label', models.CharField(max_length=200)),
                ('file', models.FileField(upload_to='pre_enrollment_docs/%Y/%m/')),
                ('file_name', models.CharField(max_length=255)),
                ('file_size', models.PositiveIntegerField(default=0)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('pending', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='enrollment.pendingenrollment')),
            ],
            options={
                'ordering': ['requirement_label'],
            },
        ),
    ]
