// Required admission documents per applicant type. Single source of truth so the
// landing-page application form, the registrar checklist, and the public
// "upload missing documents" page stay in sync.
export const REQUIRED_DOCS = {
  new: [
    'SHS Form 138 / Report Card', 'PSA Birth Certificate', 'Good Moral Certificate',
    'SHS Diploma / Certificate of Completion', '2x2 ID photos (4 copies)',
    'Medical Certificate', 'Entrance Exam Result / Admission Slip',
  ],
  transferee: [
    'Transcript of Records (TOR)', 'Honorable Dismissal', 'Good Moral Certificate',
    'PSA Birth Certificate', '2x2 ID photos (4 copies)', 'Medical Certificate',
    'Application / Admission Form',
  ],
  returnee: [
    'Previous Certificate of Registration (COR)', 'Readmission / Re-enrollment Form',
    'Clearance from last enrollment', 'Updated Medical Certificate',
  ],
};

export const STUDENT_TYPE_LABEL = {
  new: 'New Student',
  transferee: 'Transferee',
  returnee: 'Returnee / Old Student',
};
