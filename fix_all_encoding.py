import sys

files = [
    'frontend/src/pages/registrar/RegistrarEnrollmentRequests.jsx',
    'frontend/src/pages/registrar/RegistrarDocuments.jsx',
    'frontend/src/pages/registrar/RegistrarDashboard.jsx',
    'frontend/src/pages/registrar/RegistrarSchedule.jsx',
]

fixes = [
    (b'\xc3\xa2\xe2\x82\xac\xc2\xa6',    b'...'),        # â€¦  → ...
    (b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9d', b' - '),       # â€"  →  -
    (b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9c', b' - '),       # â€œ  →  -
    (b'\xc3\xa2\xc5\x93\xe2\x80\xa2',     b'x'),         # âœ•  → x
    (b'\xc3\xa2\xe2\x80\x93\xc2\xb2',     b'^'),         # â–²  → ^
    (b'\xc3\xa2\xe2\x80\x93\xc2\xbc',     b'v'),         # â–¼  → v
    (b'\xc3\x82\xc2\xb7',                  b'&middot;'), # Â·   → &middot;
    (b'\xc3\x82\xc2\xa0',                  b' '),        # Â    → space
]

for path in files:
    data = open(path, 'rb').read()
    total = 0
    for bad, good in fixes:
        count = data.count(bad)
        if count:
            total += count
            data = data.replace(bad, good)
    with open(path, 'wb') as f:
        f.write(data)
    sys.stdout.write('{}: {} replacements\n'.format(path, total))

sys.stdout.write('Done.\n')
