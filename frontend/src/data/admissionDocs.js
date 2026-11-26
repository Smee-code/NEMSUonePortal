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

// Civil-status verification: anyone who declares themselves Married must upload
// this. Must match MARRIAGE_CERTIFICATE_LABEL in backend/enrollment/models.py,
// which is the label the server checks before an applicant can be approved.
export const MARRIAGE_CERT = 'Marriage Certificate';

// Returnees use a short form that does not ask for civil status.
export const needsMarriageCert = (studentType, civilStatus) =>
  studentType !== 'returnee' && civilStatus === 'Married';

// The full required list for one applicant: the standard documents for their
// type, plus the marriage certificate when they declared Married.
export function requiredDocsFor(studentType, civilStatus) {
  const base = REQUIRED_DOCS[studentType] || [];
  return needsMarriageCert(studentType, civilStatus) ? [...base, MARRIAGE_CERT] : base;
}

export const STUDENT_TYPE_LABEL = {
  new: 'New Student',
  transferee: 'Transferee',
  returnee: 'Returnee / Old Student',
};
