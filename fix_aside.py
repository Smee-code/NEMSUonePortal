import re

files = [
    'frontend/src/pages/registrar/RegistrarStudentGradeHistory.jsx',
    'frontend/src/pages/registrar/RegistrarDocuments.jsx',
    'frontend/src/pages/registrar/RegistrarDashboard.jsx',
    'frontend/src/pages/registrar/RegistrarEnrollmentRequests.jsx',
    'frontend/src/pages/registrar/RegistrarSchedule.jsx',
    'frontend/src/pages/registrar/RegistrarFaculty.jsx',
    'frontend/src/pages/registrar/RegistrarGrades.jsx',
]

for path in files:
    text = open(path, encoding='utf-8').read()
    fixed = re.sub(r'(</Link>)\s*(</aside>)', r'\1\n      \2', text)
    open(path, 'w', encoding='utf-8').write(fixed)
    print('Fixed:', path)
