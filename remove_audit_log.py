import os

files = [
    'frontend/src/pages/registrar/RegistrarStudentGradeHistory.jsx',
    'frontend/src/pages/registrar/RegistrarDocuments.jsx',
    'frontend/src/pages/registrar/RegistrarDashboard.jsx',
    'frontend/src/pages/registrar/RegistrarEnrollmentRequests.jsx',
    'frontend/src/pages/registrar/RegistrarSchedule.jsx',
    'frontend/src/pages/registrar/RegistrarFaculty.jsx',
    'frontend/src/pages/registrar/RegistrarGrades.jsx',
]

import re

for path in files:
    text = open(path, encoding='utf-8').read()
    cleaned = re.sub(r'\s*<Link[^>]*to="/registrar/audit-log"[^>]*>.*?</Link>\n?', '', text)
    open(path, 'w', encoding='utf-8').write(cleaned)
    print(f'Done: {path}')
