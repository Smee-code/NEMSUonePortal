import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function FacultyGradeEncoding() {
  const { user, logout } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});   // { student_uuid: { midterm_grade, final_grade, remarks } }
  const [saving, setSaving] = useState({});   // { student_uuid: bool }
  const [submitting, setSubmitting] = useState(false);

  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showForceSubmit, setShowForceSubmit] = useState(false);

  useEffect(() => {
    api.get('/grades/teaching-load/')
      .then(res => setAssignments(res.data))
      .catch(() => setError('Failed to load teaching assignments.'))
      .finally(() => setLoadingAssignments(false));
  }, []);

  useEffect(() => {
    if (!selectedAssignment) { setStudents([]); setGrades({}); return; }
    setLoadingStudents(true);
    setError('');
    api.get(`/grades/faculty/students/?assignment=${selectedAssignment}`)
      .then(res => {
        setStudents(res.data);
        const initial = {};
        res.data.forEach(s => {
          initial[s.student_uuid] = {
            midterm_grade: s.midterm_grade || '',
            final_grade: s.final_grade || '',
            remarks: s.remarks || '',
          };
        });
        setGrades(initial);
      })
      .catch(() => setError('Failed to load students for this assignment.'))
      .finally(() => setLoadingStudents(false));
  }, [selectedAssignment]);

  function updateGrade(studentUuid, field, value) {
    setGrades(prev => ({
      ...prev,
      [studentUuid]: { ...prev[studentUuid], [field]: value },
    }));
  }

  function computeFinalGrade(row = {}) {
    const midterm = parseFloat(row.midterm_grade);
    const final = parseFloat(row.final_grade);
    if (Number.isNaN(midterm) || Number.isNaN(final)) return '';
    return ((midterm + final) / 2).toFixed(2);
  }

  async function saveGrade(student) {
    const { midterm_grade, final_grade, remarks } = grades[student.student_uuid] || {};
    if (!midterm_grade || !final_grade) {
      setError(`Please enter both midterm and final grades for ${student.student_name} before saving.`);
      return;
    }
    setError('');
    setSaving(prev => ({ ...prev, [student.student_uuid]: true }));
    try {
      await api.post('/grades/faculty/encode/', {
        student_id: student.student_uuid,
        teaching_assignment_id: Number(selectedAssignment),
        midterm_grade,
        final_grade,
        remarks: remarks || '',
      });
      const grade = computeFinalGrade({ midterm_grade, final_grade });
      setStudents(prev => prev.map(s =>
        s.student_uuid === student.student_uuid
          ? { ...s, midterm_grade, final_grade, grade, remarks, is_submitted: false }
          : s
      ));
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0]
        || err.response?.data?.midterm_grade?.[0]
        || err.response?.data?.final_grade?.[0]
        || err.response?.data?.detail
        || 'Failed to save grade.';
      setError(msg);
    } finally {
      setSaving(prev => ({ ...prev, [student.student_uuid]: false }));
    }
  }

  async function handleSubmitAll(force = false) {
    if (!force) {
      const unencodedCount = students.filter(
        s => !s.is_submitted && !computeFinalGrade(grades[s.student_uuid])
      ).length;
      if (unencodedCount > 0) {
        // G-03: block submission at UI layer — server will also reject without force=true
        setError(
          `${unencodedCount} student(s) have no grade encoded. ` +
          'Encode midterm and final grades for all students, or click "Submit Anyway" to submit only the encoded grades.'
        );
        setShowForceSubmit(true);
        return;
      }
    }
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    setShowForceSubmit(false);
    try {
      const res = await api.post('/grades/faculty/submit/', {
        teaching_assignment_id: Number(selectedAssignment),
        force,
      });
      setSuccessMsg(res.data.message);
      const refreshed = await api.get(`/grades/faculty/students/?assignment=${selectedAssignment}`);
      setStudents(refreshed.data);
      const nextGrades = {};
      refreshed.data.forEach(s => {
        nextGrades[s.student_uuid] = {
          midterm_grade: s.midterm_grade || '',
          final_grade: s.final_grade || '',
          remarks: s.remarks || '',
        };
      });
      setGrades(nextGrades);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error || data?.detail || 'Submission failed. Please try again.';
      setError(msg);
      if (data?.missing_count) setShowForceSubmit(true);
    } finally {
      setSubmitting(false);
    }
  }

  const allSubmitted = students.length > 0 && students.every(s => s.is_submitted);
  const assignment = assignments.find(a => String(a.id) === String(selectedAssignment));

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link" to="/faculty/dashboard">Dashboard</Link>
        <Link className="sidebar-link active" to="/faculty/grades">Grade Encoding</Link>
        <Link className="sidebar-link" to="/faculty/schedule">Teaching Load</Link>
        <Link className="sidebar-link" to="/faculty/announcements">Announcements</Link>
        <Link className="sidebar-link" to="/faculty/profile">My Profile</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Grade Encoding</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {/* ── Assignment selector ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={styles.label}>Select Class Assignment</label>
          {loadingAssignments ? (
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading assignments…</p>
          ) : assignments.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              No teaching assignments found. Contact the registrar.
            </p>
          ) : (
            <select
              value={selectedAssignment}
              onChange={e => { setSelectedAssignment(e.target.value); setSuccessMsg(''); setError(''); }}
              style={styles.select}
            >
              <option value="">— Select assignment —</option>
              {assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.term_display} — {a.subject_code}: {a.subject_name} ({a.subject_units} units)
                </option>
              ))}
            </select>
          )}
        </div>

        {error && <div style={styles.alertError}>{error}</div>}
        {successMsg && <div style={styles.alertSuccess}>{successMsg}</div>}

        {/* ── Student grade table ── */}
        {selectedAssignment && (
          <>
            {loadingStudents ? (
              <p style={{ color: '#6b7280' }}>Loading students…</p>
            ) : students.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                No approved-enrolled students found for this assignment.
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151' }}>
                    {students.length} student(s) enrolled
                    {assignment && ` · ${assignment.subject_code} — ${assignment.term_display}`}
                  </p>
                  {!allSubmitted && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={() => handleSubmitAll(false)}
                        disabled={submitting}
                        style={styles.btnSubmit(submitting)}
                      >
                        {submitting ? 'Submitting…' : 'Submit All Grades'}
                      </button>
                      {showForceSubmit && (
                        <button
                          onClick={() => handleSubmitAll(true)}
                          disabled={submitting}
                          style={{ ...styles.btnSubmit(submitting), background: '#92400e' }}
                        >
                          Submit Anyway
                        </button>
                      )}
                    </div>
                  )}
                  {allSubmitted && (
                    <span style={{ color: '#065f46', fontWeight: 600, fontSize: '0.9rem' }}>
                      ✓ All grades submitted
                    </span>
                  )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['Student ID', 'Name', 'Midterm', 'Final', 'Final Grade', 'Remarks', 'Status', 'Action'].map(h => (
                          <th key={h} style={styles.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => (
                        <tr key={s.student_uuid}
                          style={{ background: s.is_submitted ? '#f0fdf4' : '#fff' }}>
                          <td style={styles.td}>{s.student_id_no}</td>
                          <td style={styles.td}>{s.student_name}</td>
                          <td style={styles.td}>
                            {s.is_submitted ? (
                              <strong>{s.midterm_grade || '—'}</strong>
                            ) : (
                              <input
                                type="number"
                                min="1"
                                max="5"
                                step="0.01"
                                value={grades[s.student_uuid]?.midterm_grade || ''}
                                onChange={e => updateGrade(s.student_uuid, 'midterm_grade', e.target.value)}
                                placeholder="1.00"
                                style={styles.gradeInput}
                              />
                            )}
                          </td>
                          <td style={styles.td}>
                            {s.is_submitted ? (
                              <strong>{s.final_grade || '—'}</strong>
                            ) : (
                              <input
                                type="number"
                                min="1"
                                max="5"
                                step="0.01"
                                value={grades[s.student_uuid]?.final_grade || ''}
                                onChange={e => updateGrade(s.student_uuid, 'final_grade', e.target.value)}
                                placeholder="1.00"
                                style={styles.gradeInput}
                              />
                            )}
                          </td>
                          <td style={styles.td}>
                            {s.is_submitted ? (
                              <strong style={{ color: gradeColor(s.grade) }}>{s.grade || '—'}</strong>
                            ) : (
                              <strong style={{ color: gradeColor(computeFinalGrade(grades[s.student_uuid])) }}>
                                {computeFinalGrade(grades[s.student_uuid]) || '—'}
                              </strong>
                            )}
                          </td>
                          <td style={styles.td}>
                            {s.is_submitted ? (
                              <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                                {s.remarks || '—'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                value={grades[s.student_uuid]?.remarks || ''}
                                onChange={e => updateGrade(s.student_uuid, 'remarks', e.target.value)}
                                placeholder="Optional"
                                style={styles.remarksInput}
                              />
                            )}
                          </td>
                          <td style={styles.td}>
                            {s.is_submitted
                              ? <span style={{ color: '#065f46', fontWeight: 600, fontSize: '0.82rem' }}>Submitted</span>
                              : <span style={{ color: '#92400e', fontSize: '0.82rem' }}>Pending</span>
                            }
                          </td>
                          <td style={styles.td}>
                            {!s.is_submitted && (
                              <button
                                onClick={() => saveGrade(s)}
                                disabled={saving[s.student_uuid]}
                                style={styles.btnSave(saving[s.student_uuid])}
                              >
                                {saving[s.student_uuid] ? '…' : 'Save'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function gradeColor(grade) {
  const n = parseFloat(grade);
  if (isNaN(n)) return grade === 'INC' ? '#92400e' : '#991b1b';
  return n <= 3.00 ? '#065f46' : '#991b1b';
}

const styles = {
  label: {
    display: 'block', fontWeight: 600, fontSize: '0.9rem',
    color: '#374151', marginBottom: '0.4rem',
  },
  select: {
    width: '100%', maxWidth: 520, padding: '0.5rem 0.75rem',
    borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.95rem',
  },
  gradeInput: {
    padding: '0.3rem 0.5rem', borderRadius: 4,
    border: '1px solid #d1d5db', fontSize: '0.88rem', width: 90,
  },
  remarksInput: {
    padding: '0.3rem 0.5rem', borderRadius: 4, border: '1px solid #d1d5db',
    fontSize: '0.88rem', width: '100%', maxWidth: 180,
  },
  alertError: {
    background: '#fee2e2', color: '#991b1b', padding: '0.75rem',
    borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem',
  },
  alertSuccess: {
    background: '#d1fae5', color: '#065f46', padding: '0.75rem',
    borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' },
  th: {
    textAlign: 'left', padding: '0.5rem 0.75rem',
    background: '#f9fafb', borderBottom: '2px solid #e5e7eb',
    fontWeight: 600, color: '#374151', fontSize: '0.82rem',
  },
  td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6', color: '#1f2937' },
  btnSave: (disabled) => ({
    background: '#1e3a5f', color: '#fff', border: 'none',
    padding: '0.3rem 0.75rem', borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.82rem',
    opacity: disabled ? 0.6 : 1, fontWeight: 600,
  }),
  btnSubmit: (disabled) => ({
    background: '#059669', color: '#fff', border: 'none',
    padding: '0.5rem 1.25rem', borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600,
    fontSize: '0.9rem', opacity: disabled ? 0.7 : 1,
  }),
};
