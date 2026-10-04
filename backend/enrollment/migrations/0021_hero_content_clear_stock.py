from django.db import migrations


def forwards(apps, schema_editor):
    SiteContent = apps.get_model('enrollment', 'SiteContent')
    # Ensure a hero content row exists (background image, empty by default).
    SiteContent.objects.get_or_create(key='hero', defaults={'data': {'imageUrl': ''}})
    # Drop the old stock (Unsplash) spotlight image so the section stays
    # photo-free until a real campus photo is uploaded.
    try:
        row = SiteContent.objects.get(key='in_focus')
        img = (row.data or {}).get('imageUrl', '')
        if isinstance(img, str) and 'unsplash.com' in img:
            row.data = {**row.data, 'imageUrl': ''}
            row.save(update_fields=['data'])
    except SiteContent.DoesNotExist:
        pass


def backwards(apps, schema_editor):
    SiteContent = apps.get_model('enrollment', 'SiteContent')
    SiteContent.objects.filter(key='hero').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('enrollment', '0020_alter_academicterm_is_active'),
    ]
    operations = [migrations.RunPython(forwards, backwards)]
