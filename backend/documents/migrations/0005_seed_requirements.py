from django.db import migrations

# Starter text for the pop-up students see before requesting a document. These
# are the general conditions of claiming a document at the Registrar's Office;
# the admin edits them per document in the Document catalog. Only filled in
# where a document has no requirements yet, so nothing an admin wrote is lost.
STARTER = (
    'Bring your school ID, or any valid government-issued ID, when you claim the document.\n'
    'Pay the fee at the Cashier’s Office and bring the official receipt.\n'
    'If someone else will claim it for you: a signed authorization letter, plus a photocopy of your ID and theirs.'
)


def seed(apps, schema_editor):
    DocumentType = apps.get_model('documents', 'DocumentType')
    DocumentType.objects.filter(requirements='').update(requirements=STARTER)


def unseed(apps, schema_editor):
    DocumentType = apps.get_model('documents', 'DocumentType')
    DocumentType.objects.filter(requirements=STARTER).update(requirements='')


class Migration(migrations.Migration):
    dependencies = [('documents', '0004_requirements_and_pickup_date')]
    operations = [migrations.RunPython(seed, unseed)]
