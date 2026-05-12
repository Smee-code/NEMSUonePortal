import os, sys

files = [
    'frontend/src/pages/registrar/RegistrarEnrollmentRequests.jsx',
    'frontend/src/pages/registrar/RegistrarDocuments.jsx',
    'frontend/src/pages/registrar/RegistrarDashboard.jsx',
    'frontend/src/pages/registrar/RegistrarSchedule.jsx',
]

patterns = [
    (b'\xc3\xa2\xe2\x82\xac\xc2\xa6',    b'...'),
    (b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9d', b' - '),
    (b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9c', b' - '),
    (b'\xc3\xa2\xc5\x93\xe2\x80\xa2',     b'x'),
    (b'\xc3\xa2\xe2\x80\x93\xc2\xb2',     b'^'),
    (b'\xc3\xa2\xe2\x80\x93\xc2\xbc',     b'v'),
    (b'\xc3\x82\xc2\xb7',                  b'&middot;'),
    (b'\xc3\x82\xc2\xa0',                  b' '),
]

for path in files:
    data = open(path, 'rb').read()
    found = [(bad, good, data.count(bad)) for bad, good in patterns if data.count(bad) > 0]
    sys.stdout.write('{}:\n'.format(path))
    if found:
        for bad, good, count in found:
            sys.stdout.write('  {} occurrences of {} -> {}\n'.format(count, bad.hex(), good))
    else:
        sys.stdout.write('  none of the known patterns found\n')
