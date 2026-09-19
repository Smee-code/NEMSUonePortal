from django.db import migrations


def seed(apps, schema_editor):
    SiteContent = apps.get_model('enrollment', 'SiteContent')
    from enrollment.site_defaults import SITE_CONTENT_DEFAULTS
    for key, data in SITE_CONTENT_DEFAULTS.items():
        SiteContent.objects.get_or_create(key=key, defaults={'data': data})


def unseed(apps, schema_editor):
    SiteContent = apps.get_model('enrollment', 'SiteContent')
    SiteContent.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('enrollment', '0018_sitecontent'),
    ]
    operations = [migrations.RunPython(seed, unseed)]
