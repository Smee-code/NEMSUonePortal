import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const STEPS = ['Term & Type', 'Program', 'Year Level', 'Courses', 'Review'];

const STUDENT_TYPES = [
  { value: 'freshman',   label: 'Freshman',   desc: 'First time enrolling in the institution' },
  { value: 'regular',    label: 'Regular',    desc: 'Continuing student from previous semester' },
  { value: 'shiftee',    label: 'Shiftee',    desc: 'Transferring from another program within the same school' },
  { value: 'transferee', label: 'Transferee', desc: 'Transferring from another institution' },
];

const YEAR_LEVELS = [
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' },
];

const STATUS_META = {
  pending:  { label: 'Pending Review', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  approved: { label: 'Approved',       bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  rejected: { label: 'Rejected',       bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

export default function StudentEnrollment() {
  const { user, logout } = useAuth();

  const [terms, setTerms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [step, setStep] = useState(1);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [studentType, setStudentType] = useState('regular');
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [yearLevel, setYearLevel] = useState(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [showBackCourses, setShowBackCourses] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/enrollment/terms/'),
      api.get('/enrollment/departments/'),
      api.get('/enrollment/programs/'),
      api.get('/enrollment/my/'),
    ])
      .then(([tRes, dRes, pRes, hRes]) => {
        setTerms(tRes.data);
        setDepartments(dRes.data);
        setPrograms(pRes.data);
        setHistory(hRes.data);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  useEffect(() => {
    if (!selectedTerm || !selectedProgram || !yearLevel) return;
    setLoadingSubjects(true);
    setSelectedSubjectIds([]);
    setShowBackCourses(false);
    api.get(`/enrollment/subjects/?program=${selectedProgram.id}&year_level=${yearLevel}&semester=${selectedTerm.semester}`)
      .then(res => setSubjects(res.data))
      .catch(() => setSubjects([]))
      .finally(() => setLoadingSubjects(false));
  }, [selectedTerm, selectedProgram, yearLevel]);

  const programsForDept = selectedDept
    ? programs.filter(p => p.department === selectedDept.id)
    : [];

  const regularSubjects = subjects.filter(s => s.year_level === yearLevel);
  const backSubjects = subjects.filter(s => s.year_level !== yearLevel);
  const selectedSubjectObjs = subjects.filter(s => selectedSubjectIds.includes(s.id));
  const totalUnits = selectedSubjectObjs.reduce((sum, s) => sum + parseFloat(s.units || 0), 0);

  const activeTerm = terms.find(t => t.enrollment_open);
  const alreadyEnrolledTermIds = new Set(history.map(h => h.academic_term.id));
  const enrollmentOpen = terms.some(t => t.enrollment_open && !alreadyEnrolledTermIds.has(t.id));
  const currentEnrollment = history.find(h => h.academic_term.id === activeTerm?.id);

  function toggleSubject(id) {
    setSelectedSubjectIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function goNext() { setStep(s => s + 1); }
  function goBack() { setStep(s => s - 1); }

  function resetWizard() {
    setStep(1);
    setSelectedTerm(null);
    setStudentType('regular');
    setSelectedDept(null);
    setSelectedProgram(null);
    setYearLevel(null);
    setSelectedSubjectIds([]);
    setShowBackCourses(false);
    setSubmitError('');
    setSubmitSuccess(false);
  }

  async function handleSubmit() {
    setSubmitError('');
    setSubmitting(true);
    try {
      await api.post('/enrollment/submit/', {
        academic_term_id: selectedTerm.id,
        program_id: selectedProgram.id,
        year_level: yearLevel,
        subject_ids: selectedSubjectIds,
        student_type: studentType,
      });
      setSubmitSuccess(true);
      const hRes = await api.get('/enrollment/my/');
      setHistory(hRes.data);
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.non_field_errors?.[0] ||
        data?.subject_ids?.[0] ||
        data?.program_id?.[0] ||
        data?.year_level?.[0] ||
        data?.academic_term_id?.[0] ||
        data?.error ||
        data?.detail ||
        'Submission failed. Please try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingData) {
    return (
      <div className="dashboard">
        <Sidebar />
        <main className="dashboard-content">
          <Header user={user} logout={logout} />
          <p style={{ color: '#6b7280' }}>Loading enrollment data...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <main className="dashboard-content">
        <Header user={user} logout={logout} />

        {currentEnrollment && (
          <EnrollmentStatusCard enrollment={currentEnrollment} />
        )}

        {enrollmentOpen ? (
          submitSuccess ? (
            <div style={S.successBox}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>&#10003;</div>
              <h3 style={{ margin: '0 0 0.5rem', color: '#065f46' }}>Enrollment Request Submitted!</h3>
              <p style={{ margin: '0 0 1.25rem', color: '#374151', fontSize: '0.95rem' }}>
                The registrar will review your request shortly. You will be notified of the outcome.
              </p>
              <button style={S.btnPrimary} onClick={resetWizard}>Submit Another</button>
            </div>
          ) : (
            <section style={S.wizardBox}>
              <h2 style={S.sectionTitle}>Online Enrollment Form</h2>

              <div style={S.stepBar}>
                {STEPS.map((label, i) => {
                  const n = i + 1;
                  const done = n < step;
                  const active = n === step;
                  return (
                    <div key={n} style={S.stepItem}>
                      <div style={S.stepCircle(active, done)}>{done ? '✓' : n}</div>
                      <span style={S.stepLabel(active, done)}>{label}</span>
                      {i < STEPS.length - 1 && <div style={S.stepLine(done)} />}
                    </div>
                  );
                })}
              </div>

              <div style={S.stepContent}>
                {step === 1 && (
                  <Step1
                    terms={terms}
                    alreadyEnrolledTermIds={alreadyEnrolledTermIds}
                    selectedTerm={selectedTerm}
                    onSelectTerm={setSelectedTerm}
                    studentType={studentType}
                    onSelectType={setStudentType}
                    onNext={goNext}
                  />
                )}
                {step === 2 && (
                  <Step2
                    departments={departments}
                    programsForDept={programsForDept}
                    selectedDept={selectedDept}
                    onSelectDept={(d) => { setSelectedDept(d); setSelectedProgram(null); }}
                    selectedProgram={selectedProgram}
                    onSelectProgram={setSelectedProgram}
                    onNext={goNext}
                    onBack={goBack}
                  />
                )}
                {step === 3 && (
                  <Step3
                    yearLevel={yearLevel}
                    onSelectYear={setYearLevel}
                    onNext={goNext}
                    onBack={goBack}
                  />
                )}
                {step === 4 && (
                  <Step4
                    loading={loadingSubjects}
                    regularSubjects={regularSubjects}
                    backSubjects={backSubjects}
                    selectedSubjectIds={selectedSubjectIds}
                    onToggle={toggleSubject}
                    showBackCourses={showBackCourses}
                    onToggleBack={(checked) => {
                      setShowBackCourses(checked);
                      if (!checked) {
                        const backIds = new Set(backSubjects.map(s => s.id));
                        setSelectedSubjectIds(prev => prev.filter(id => !backIds.has(id)));
                      }
                    }}
                    yearLabel={YEAR_LEVELS.find(y => y.value === yearLevel)?.label}
                    totalUnits={totalUnits}
                    selectedCount={selectedSubjectIds.length}
                    onNext={goNext}
                    onBack={goBack}
                  />
                )}
                {step === 5 && (
                  <Step5
                    term={selectedTerm}
                    studentType={studentType}
                    dept={selectedDept}
                    program={selectedProgram}
                    yearLevel={yearLevel}
                    subjects={selectedSubjectObjs}
                    totalUnits={totalUnits}
                    submitting={submitting}
                    error={submitError}
                    onSubmit={handleSubmit}
                    onBack={goBack}
                  />
                )}
              </div>
            </section>
          )
        ) : !currentEnrollment && (
          <div style={S.closedBox}>
            <p style={{ margin: 0, fontWeight: 600, color: '#374151' }}>Enrollment is currently closed.</p>
            <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
              Please check back later or contact the registrar&apos;s office.
            </p>
          </div>
        )}

        <section style={{ marginTop: '2rem' }}>
          <h2 style={S.sectionTitle}>My Enrollment History</h2>
          {history.length === 0 ? (
            <p style={S.emptyHelp}>No enrollment requests yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {history.map(req => (
                <HistoryCard key={req.id} req={req} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* ── Sidebar / Header ───────────────────────────────────────── */

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal
      </div>
      <Link className="sidebar-link" to="/student/dashboard">Dashboard</Link>
      <Link className="sidebar-link active" to="/student/enrollment">Enrollment</Link>
      <Link className="sidebar-link" to="/student/courses">My Courses</Link>
      <Link className="sidebar-link" to="/student/grades">My Grades</Link>
      <Link className="sidebar-link" to="/student/schedule">Schedule</Link>
      <Link className="sidebar-link" to="/student/documents">Document Requests</Link>
      <Link className="sidebar-link" to="/student/announcements">Announcements</Link>
      <Link className="sidebar-link" to="/student/profile">My Profile</Link>
    </aside>
  );
}

function Header({ user, logout }) {
  return (
    <div className="dashboard-header">
      <div>
        <h1>Online Enrollment</h1>
        <span className="badge">{user?.role}</span>
      </div>
      <button className="btn-logout" onClick={logout}>Sign Out</button>
    </div>
  );
}

/* ── Status card for existing term enrollment ───────────────── */

function EnrollmentStatusCard({ enrollment }) {
  const meta = STATUS_META[enrollment.status] ?? { label: enrollment.status, bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
  return (
    <div style={{ ...S.statusCard, borderColor: meta.border }}>
      <div style={S.statusCardHeader}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1f2937' }}>
            {enrollment.academic_term.semester_display} {enrollment.academic_term.year}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 2 }}>
            {enrollment.program_code} &middot; {enrollment.year_level_display}
            {enrollment.block_name && <> &middot; {enrollment.block_name}</>}
            {enrollment.student_type_display && <> &middot; {enrollment.student_type_display}</>}
          </div>
        </div>
        <span style={{ background: meta.bg, color: meta.color, padding: '4px 14px', borderRadius: 20, fontWeight: 700, fontSize: '0.82rem' }}>
          {meta.label}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.75rem' }}>
        {enrollment.subjects.map(s => (
          <span key={s.id} style={S.chip}>{s.code}</span>
        ))}
      </div>
      {enrollment.remarks && (
        <p style={{ margin: '0.6rem 0 0', fontSize: '0.85rem', color: '#374151', fontStyle: 'italic' }}>
          Remarks: {enrollment.remarks}
        </p>
      )}
    </div>
  );
}

/* ── Wizard steps ───────────────────────────────────────────── */

function Step1({ terms, alreadyEnrolledTermIds, selectedTerm, onSelectTerm, studentType, onSelectType, onNext }) {
  const openTerms = terms.filter(t => t.enrollment_open && !alreadyEnrolledTermIds.has(t.id));
  return (
    <div>
      <h3 style={S.stepTitle}>Step 1: Academic Term &amp; Student Type</h3>

      <div style={S.fieldGroup}>
        <label style={S.label}>Academic Term</label>
        {openTerms.length === 0 ? (
          <p style={S.emptyHelp}>No open enrollment terms available.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {openTerms.map(t => (
              <label key={t.id} style={S.radioCard(selectedTerm?.id === t.id)}>
                <input
                  type="radio"
                  name="term"
                  checked={selectedTerm?.id === t.id}
                  onChange={() => onSelectTerm(t)}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t.semester_display} {t.year}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{t.start_date} to {t.end_date}</div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div style={S.fieldGroup}>
        <label style={S.label}>Student Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
          {STUDENT_TYPES.map(t => (
            <label key={t.value} style={S.radioCard(studentType === t.value)}>
              <input
                type="radio"
                name="studentType"
                checked={studentType === t.value}
                onChange={() => onSelectType(t.value)}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.label}</div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{t.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div style={S.navRow}>
        <span />
        <button style={S.btnPrimary} disabled={!selectedTerm} onClick={onNext}>
          Next: Select Program &rarr;
        </button>
      </div>
    </div>
  );
}

function Step2({ departments, programsForDept, selectedDept, onSelectDept, selectedProgram, onSelectProgram, onNext, onBack }) {
  return (
    <div>
      <h3 style={S.stepTitle}>Step 2: Department &amp; Program</h3>

      <div style={S.fieldGroup}>
        <label style={S.label}>Department</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {departments.filter(d => d.is_active).map(d => (
            <label key={d.id} style={S.radioCard(selectedDept?.id === d.id)}>
              <input
                type="radio"
                name="department"
                checked={selectedDept?.id === d.id}
                onChange={() => onSelectDept(d)}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.code}</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{d.name}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {selectedDept && (
        <div style={S.fieldGroup}>
          <label style={S.label}>Program</label>
          {programsForDept.filter(p => p.is_active).length === 0 ? (
            <p style={S.emptyHelp}>No active programs for this department.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.5rem' }}>
              {programsForDept.filter(p => p.is_active).map(p => (
                <label key={p.id} style={S.radioCard(selectedProgram?.id === p.id)}>
                  <input
                    type="radio"
                    name="program"
                    checked={selectedProgram?.id === p.id}
                    onChange={() => onSelectProgram(p)}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.code}</div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{p.name}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={S.navRow}>
        <button style={S.btnSecondary} onClick={onBack}>&larr; Back</button>
        <button style={S.btnPrimary} disabled={!selectedProgram} onClick={onNext}>
          Next: Year Level &rarr;
        </button>
      </div>
    </div>
  );
}

function Step3({ yearLevel, onSelectYear, onNext, onBack }) {
  return (
    <div>
      <h3 style={S.stepTitle}>Step 3: Year Level</h3>
      <div style={S.fieldGroup}>
        <label style={S.label}>Select Your Current Year Level</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
          {YEAR_LEVELS.map(y => (
            <label key={y.value} style={{ ...S.radioCard(yearLevel === y.value), justifyContent: 'center', textAlign: 'center' }}>
              <input
                type="radio"
                name="yearLevel"
                checked={yearLevel === y.value}
                onChange={() => onSelectYear(y.value)}
              />
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{y.label}</div>
            </label>
          ))}
        </div>
      </div>

      <div style={S.navRow}>
        <button style={S.btnSecondary} onClick={onBack}>&larr; Back</button>
        <button style={S.btnPrimary} disabled={yearLevel === null} onClick={onNext}>
          Next: Select Courses &rarr;
        </button>
      </div>
    </div>
  );
}

function Step4({ loading, regularSubjects, backSubjects, selectedSubjectIds, onToggle, showBackCourses, onToggleBack, yearLabel, totalUnits, selectedCount, onNext, onBack }) {
  return (
    <div>
      <h3 style={S.stepTitle}>Step 4: Select Courses</h3>

      {loading ? (
        <p style={S.emptyHelp}>Loading courses...</p>
      ) : (
        <>
          <div style={S.fieldGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ ...S.label, marginBottom: 0 }}>{yearLabel} Courses</label>
              {selectedCount > 0 && (
                <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                  {selectedCount} selected &middot; {fmtUnits(totalUnits)} units total
                </span>
              )}
            </div>
            {regularSubjects.length === 0 ? (
              <p style={S.emptyHelp}>No active courses available for your selection.</p>
            ) : (
              <div style={S.subjectList}>
                {regularSubjects.map(s => (
                  <SubjectRow key={s.id} subject={s} checked={selectedSubjectIds.includes(s.id)} onToggle={onToggle} />
                ))}
              </div>
            )}
          </div>

          {backSubjects.length > 0 && (
            <div style={{ ...S.fieldGroup, borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <label style={S.backToggle}>
                <input type="checkbox" checked={showBackCourses} onChange={e => onToggleBack(e.target.checked)} />
                <span>Include back courses from other year levels</span>
              </label>
              {showBackCourses && (
                <div style={{ ...S.subjectList, marginTop: '0.75rem' }}>
                  {backSubjects.map(s => (
                    <SubjectRow key={s.id} subject={s} checked={selectedSubjectIds.includes(s.id)} onToggle={onToggle} showYear />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div style={S.navRow}>
        <button style={S.btnSecondary} onClick={onBack}>&larr; Back</button>
        <button style={S.btnPrimary} disabled={selectedSubjectIds.length === 0} onClick={onNext}>
          Next: Review &rarr;
        </button>
      </div>
    </div>
  );
}

function Step5({ term, studentType, dept, program, yearLevel, subjects, totalUnits, submitting, error, onSubmit, onBack }) {
  const yearLabel = YEAR_LEVELS.find(y => y.value === yearLevel)?.label;
  const typeLabel = STUDENT_TYPES.find(t => t.value === studentType)?.label;
  return (
    <div>
      <h3 style={S.stepTitle}>Step 5: Review &amp; Submit</h3>

      <div style={S.reviewCard}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem 1.5rem', marginBottom: '1.25rem' }}>
          <RevRow label="Term" value={`${term?.semester_display} ${term?.year}`} />
          <RevRow label="Student Type" value={typeLabel} />
          <RevRow label="Department" value={`${dept?.code} — ${dept?.name}`} />
          <RevRow label="Program" value={`${program?.code} — ${program?.name}`} />
          <RevRow label="Year Level" value={yearLabel} />
          <RevRow label="Total Units" value={`${fmtUnits(totalUnits)} units`} />
        </div>

        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151', marginBottom: '0.5rem' }}>
          Selected Courses ({subjects.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {subjects.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#1f2937', padding: '0.3rem 0', borderBottom: '1px solid #f3f4f6' }}>
              <span><strong>{s.code}</strong> &mdash; {s.name}</span>
              <span style={{ color: '#6b7280', flexShrink: 0, marginLeft: '1rem' }}>{fmtUnits(s.units)} units</span>
            </div>
          ))}
        </div>
      </div>

      {error && <div style={S.errorBox}>{error}</div>}

      <div style={S.navRow}>
        <button style={S.btnSecondary} disabled={submitting} onClick={onBack}>&larr; Back</button>
        <button style={S.btnSubmit(submitting)} disabled={submitting} onClick={onSubmit}>
          {submitting ? 'Submitting...' : 'Submit Enrollment Request'}
        </button>
      </div>
    </div>
  );
}

/* ── Shared sub-components ──────────────────────────────────── */

function SubjectRow({ subject, checked, onToggle, showYear }) {
  return (
    <label style={S.subjectRow(checked)}>
      <input type="checkbox" checked={checked} onChange={() => onToggle(subject.id)} />
      <span style={{ flex: 1 }}>
        {showYear && subject.year_level_display && (
          <span style={{ color: '#9ca3af', fontSize: '0.78rem', marginRight: 4 }}>
            {subject.year_level_display} /
          </span>
        )}
        <strong>{subject.code}</strong> &mdash; {subject.name}
        <span style={{ color: '#6b7280', marginLeft: 6, fontSize: '0.82rem' }}>
          ({fmtUnits(subject.units)} {parseFloat(subject.units) === 1 ? 'unit' : 'units'})
        </span>
      </span>
    </label>
  );
}

function RevRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.92rem', color: '#1f2937', fontWeight: 500, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function HistoryCard({ req }) {
  const meta = STATUS_META[req.status] ?? { label: req.status, bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
  return (
    <div style={S.histCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
        <div>
          <strong style={{ fontSize: '0.95rem', color: '#1f2937' }}>
            {req.academic_term.semester_display} {req.academic_term.year}
          </strong>
          <span style={{ fontSize: '0.82rem', color: '#6b7280', marginLeft: 8 }}>
            {req.year_level_display} &middot; {fmtUnits(req.total_units)} units
            {req.program_code && <> &middot; {req.program_code}</>}
            {req.student_type_display && <> &middot; {req.student_type_display}</>}
          </span>
        </div>
        <span style={{ background: meta.bg, color: meta.color, padding: '2px 10px', borderRadius: 4, fontWeight: 600, fontSize: '0.8rem' }}>
          {meta.label}
        </span>
      </div>
      {req.block_name && (
        <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '2px 9px', fontWeight: 700, fontSize: '0.8rem', display: 'inline-block', marginBottom: '0.4rem' }}>
          {req.block_name}
        </span>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {req.subjects.map(s => (
          <span key={s.id} style={S.chip}>{s.code}</span>
        ))}
      </div>
      {req.remarks && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#374151', fontStyle: 'italic' }}>
          Remarks: {req.remarks}
        </p>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

function fmtUnits(val) {
  const n = parseFloat(val);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

/* ── Styles ──────────────────────────────────────────────────── */

const S = {
  sectionTitle: { fontSize: '1.05rem', color: '#1e3a5f', marginBottom: '1rem', fontWeight: 700 },
  wizardBox: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.5rem', marginBottom: '2rem' },
  stepBar: { display: 'flex', alignItems: 'center', marginBottom: '2rem', overflowX: 'auto', gap: 0 },
  stepItem: { display: 'flex', alignItems: 'center', flexShrink: 0 },
  stepCircle: (active, done) => ({
    width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: '0.85rem',
    background: done ? '#10b981' : active ? '#1e3a5f' : '#e5e7eb',
    color: done || active ? '#fff' : '#6b7280',
    flexShrink: 0,
  }),
  stepLabel: (active, done) => ({
    fontSize: '0.78rem', marginLeft: 6, fontWeight: active ? 700 : 500,
    color: done ? '#10b981' : active ? '#1e3a5f' : '#9ca3af', whiteSpace: 'nowrap',
  }),
  stepLine: (done) => ({
    height: 2, width: 32, background: done ? '#10b981' : '#e5e7eb', margin: '0 6px', flexShrink: 0,
  }),
  stepContent: { minHeight: 200 },
  stepTitle: { fontSize: '0.98rem', fontWeight: 700, color: '#1e3a5f', marginBottom: '1.25rem', marginTop: 0 },
  fieldGroup: { marginBottom: '1.25rem' },
  label: { display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' },
  radioCard: (selected) => ({
    display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.6rem 0.85rem',
    border: `1.5px solid ${selected ? '#1e3a5f' : '#e5e7eb'}`,
    borderRadius: 7, cursor: 'pointer', background: selected ? '#f0f4ff' : '#fff',
  }),
  subjectList: {
    display: 'flex', flexDirection: 'column', gap: '0.25rem',
    maxHeight: 320, overflowY: 'auto', padding: '0.5rem',
    border: '1px solid #e5e7eb', borderRadius: 6,
  },
  subjectRow: (checked) => ({
    display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.4rem 0.5rem',
    borderRadius: 5, cursor: 'pointer', fontSize: '0.9rem', color: '#374151',
    background: checked ? '#eff6ff' : 'transparent',
  }),
  backToggle: { display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#374151' },
  reviewCard: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', marginBottom: '1.25rem' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' },
  btnPrimary: { background: '#1e3a5f', color: '#fff', padding: '0.55rem 1.4rem', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },
  btnSecondary: { background: '#f3f4f6', color: '#374151', padding: '0.55rem 1.2rem', borderRadius: 6, border: '1px solid #d1d5db', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },
  btnSubmit: (dis) => ({
    background: '#16a34a', color: '#fff', padding: '0.6rem 1.6rem', borderRadius: 6,
    border: 'none', fontWeight: 700, fontSize: '0.95rem',
    cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.7 : 1,
  }),
  errorBox: { background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.9rem', marginBottom: '1rem' },
  successBox: { background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '2rem', textAlign: 'center', marginBottom: '2rem' },
  closedBox: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', marginBottom: '2rem' },
  emptyHelp: { margin: 0, color: '#6b7280', fontSize: '0.9rem' },
  statusCard: { background: '#fff', border: '2px solid', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem' },
  statusCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' },
  chip: { background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 500 },
  histCard: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem 1.25rem' },
};
