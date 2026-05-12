import sys

path = 'frontend/src/pages/registrar/RegistrarFaculty.jsx'

# Read raw bytes
with open(path, 'rb') as f:
    data = f.read()

# These are the doubly-encoded byte sequences (Windows-1252 bytes re-encoded as UTF-8)
# and their correct UTF-8 originals.
fixes = [
    # â€¦  (â=\xc3\xa2, €=\xe2\x82\xac, ¦=\xc2\xa6)  →  … (U+2026)
    (b'\xc3\xa2\xe2\x82\xac\xc2\xa6',  '...'.encode()),
    # â€"  (â=\xc3\xa2, €=\xe2\x82\xac, "=\xe2\x80\x9d)  →  — (U+2014 em dash)
    (b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9d', ' - '.encode()),
    # â€œ  (â=\xc3\xa2, €=\xe2\x82\xac, "=\xe2\x80\x9c)  →  – (U+2013 en dash)
    (b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9c', ' - '.encode()),
    # âœ•  (â=\xc3\xa2, œ=\xc5\x93, •=\xe2\x80\xa2)  →  x (replacing ✕)
    (b'\xc3\xa2\xc5\x93\xe2\x80\xa2',    b'x'),
    # â–²  (â=\xc3\xa2, –=\xe2\x80\x93, ²=\xc2\xb2)  →  ^ (replacing ▲)
    (b'\xc3\xa2\xe2\x80\x93\xc2\xb2',    b'^'),
    # â–¼  (â=\xc3\xa2, –=\xe2\x80\x93, ¼=\xc2\xbc)  →  v (replacing ▼)
    (b'\xc3\xa2\xe2\x80\x93\xc2\xbc',    b'v'),
]

for bad, good in fixes:
    count = data.count(bad)
    if count:
        sys.stdout.write('Replacing {} occurrences\n'.format(count))
        data = data.replace(bad, good)

with open(path, 'wb') as f:
    f.write(data)

sys.stdout.write('Done\n')
