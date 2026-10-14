import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function RegistrarStudentGradeHistory() {
  const { user } = useAuth();
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('history');   // 'history' | 'curriculum'
  const [curriculum, setCurriculum] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/grades/registrar/student/${studentId}/`)
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load grade history.'))
      .finally(() => setLoading(false));
  }, [studentId]);

  const loadCurriculum = () => {
    api.get(`/grades/registrar/student/${studentId}/curriculum/`)
      .then(res => setCurriculum(res.data))
      .catch(() => setError('Failed to load the curriculum.'));
  };

  useEffect(() => {
    if (view === 'curriculum' && curriculum === null) loadCurriculum();
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  function gradeColor(grade) {
    const n = parseFloat(grade);
    if (isNaN(n)) return grade === 'INC' ? '#92400e' : '#6b7280';
    return n <= 3.00 ? '#065f46' : '#991b1b';
  }

  function getStatus(grade) {
    if (!grade) return null;
    if (grade === 'INC') return { label: 'INC', color: '#92400e', bg: '#fef3c7' };
    if (grade === 'DRP') return { label: 'Dropped', color: '#374151', bg: '#f3f4f6' };
    const n = parseFloat(grade);
    if (isNaN(n)) return null;
    return n <= 3.00
      ? { label: 'Passed', color: '#065f46', bg: '#d1fae5' }
      : { label: 'Failed', color: '#991b1b', bg: '#fee2e2' };
  }

  function gpaColor(gpa) {
    if (!gpa) return '#6b7280';
    const n = parseFloat(gpa);
    if (isNaN(n)) return '#6b7280';
    if (n <= 1.75) return '#065f46';
    if (n <= 2.50) return '#1d4ed8';
    if (n <= 3.00) return '#92400e';
    return '#991b1b';
  }

  const student = data?.student;
  const summary = data?.summary;
  const terms   = data?.terms ?? [];

  // Group terms by year_level, sorted ascending (1st Year first)
  const yearGroups = Object.values(
    terms.reduce((acc, term) => {
      const yl = term.year_level ?? 0;
      if (!acc[yl]) acc[yl] = { yl, display: term.year_level_display, terms: [] };
      acc[yl].terms.push(term);
      return acc;
    }, {})
  ).sort((a, b) => a.yl - b.yl);

  const YL_COLORS = {
    1: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    2: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    3: { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
    4: { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
  };

  return (
    <>
        {error && <div style={styles.alertError}>{error}</div>}

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading grade history...</p>
        ) : !data ? null : (
          <>
            {/* Back button */}
            <button type="button" style={styles.backBtn} onClick={() => navigate(-1)}
              onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#d1d5db'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 16 }} /> Back
            </button>

            {/* Student info card */}
            <div style={styles.studentCard}>
              <div style={styles.studentName}>{student.full_name}</div>
              <div style={styles.studentMeta}>
                <span style={styles.metaItem}>ID: <strong>{student.student_id}</strong></span>
                <span style={styles.metaItem}>{student.email}</span>
                {student.program_name && (
                  <span style={styles.metaItem}>{student.program_code} &mdash; {student.program_name}</span>
                )}
                {student.year_level_display && (
                  <span style={{ ...styles.metaItem, ...styles.yearBadge }}>
                    {student.year_level_display}
                  </span>
                )}
                {student.department_name && (
                  <span style={styles.metaItem}>{student.department_name}</span>
                )}
              </div>
            </div>

            {/* Summary bar */}
            <div style={styles.summaryBar}>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Cumulative GPA</div>
                <div style={{ ...styles.summaryValue, color: gpaColor(summary.cumulative_gpa) }}>
                  {summary.cumulative_gpa ?? '-'}
                </div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Total Units Earned</div>
                <div style={styles.summaryValue}>{summary.total_units_earned}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Terms on Record</div>
                <div style={styles.summaryValue}>{summary.total_terms}</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabBar}>
              <button type="button" style={view === 'history' ? styles.tabActive : styles.tab} onClick={() => setView('history')}>
                <i className="ti ti-history" /> Grade history
              </button>
              <button type="button" style={view === 'curriculum' ? styles.tabActive : styles.tab} onClick={() => setView('curriculum')}>
                <i className="ti ti-list-check" /> Curriculum &amp; crediting
              </button>
            </div>

            {view === 'curriculum' ? (
              <CurriculumSection
                studentId={studentId}
                curriculum={curriculum}
                reload={loadCurriculum}
                gradeColor={gradeColor}
                getStatus={getStatus}
              />
            ) : terms.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '1rem' }}>
                No submitted grade records found for this student. Use <strong>Curriculum &amp; crediting</strong> to enter credited (transfer) grades.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                {yearGroups.map(group => {
                  const palette = YL_COLORS[group.yl] ?? { bg: '#f9fafb', color: '#374151', border: '#e5e7eb' };
                  return (
                    <div key={group.yl} style={{ ...styles.yearGroup, borderColor: palette.border }}>
                      {/* Year level header */}
                      <div style={{ ...styles.yearGroupHeader, background: palette.bg, borderColor: palette.border }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ ...styles.yearGroupBadge, background: palette.color, color: '#fff' }}>
                            {group.display ?? 'Unknown Year'}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: palette.color, fontWeight: 600 }}>
                            {group.terms.length} semester{group.terms.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Terms inside this year level */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem' }}>
                        {group.terms.map((term, idx) => (
                          <TermBlock
                            key={term.term_id}
                            term={term}
                            semNumber={idx + 1}
                            gradeColor={gradeColor}
                            gpaColor={gpaColor}
                            getStatus={getStatus}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
    </>
  );
}

function TermBlock({ term, semNumber, gradeColor, gpaColor, getStatus }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={styles.termBlock}>
      <div style={styles.termHeader} onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={styles.semNumber}>Sem {semNumber}</span>
          <span style={styles.termTitle}>{term.term_display}</span>
          {term.is_current && <span style={styles.currentBadge}>Current</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {term.term_gpa && (
            <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
              GPA:&nbsp;
              <strong style={{ color: gpaColor(term.term_gpa) }}>{term.term_gpa}</strong>
            </span>
          )}
          <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
            {term.units_earned} units
          </span>
          <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{open ? '^' : 'v'}</span>
        </div>
      </div>

      {open && (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Subject Code', 'Subject Name', 'Units', 'Midterm', 'Final', 'Grade', 'Instructor', 'Remarks', 'Date Submitted'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {term.grades.map(g => (
                <tr key={g.id}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{g.subject_code}</td>
                  <td style={{ ...styles.td, color: '#374151' }}>{g.subject_name}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{g.subject_units}</td>
                  <td style={{ ...styles.td, textAlign: 'center', color: '#6b7280' }}>
                    {g.midterm_grade ?? '-'}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center', color: '#6b7280' }}>
                    {g.final_grade ?? '-'}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700, color: gradeColor(g.grade) }}>
                    {g.grade || '-'}
                  </td>
                  <td style={{ ...styles.td, color: '#1e3a5f', fontSize: '0.85rem', fontWeight: 500 }}>
                    {g.encoded_by_name
                      ? <span style={styles.instructorChip}>{g.encoded_by_name}</span>
                      : <span style={{ color: '#9ca3af' }}>-</span>}
                  </td>
                  <td style={styles.td}>
                    {(() => {
                      const status = getStatus(g.grade);
                      return status ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{
                            background: status.bg, color: status.color,
                            fontWeight: 700, fontSize: '0.78rem',
                            padding: '0.15rem 0.55rem', borderRadius: 20,
                            display: 'inline-block', whiteSpace: 'nowrap',
                          }}>
                            {status.label}
                          </span>
                          {g.remarks && (
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{g.remarks}</span>
                          )}
                        </div>
                      ) : <span style={{ color: '#9ca3af' }}>-</span>;
                    })()}
                  </td>
                  <td style={{ ...styles.td, color: '#6b7280', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {g.submitted_at ? new Date(g.submitted_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CurriculumSection({ studentId, curriculum, reload, gradeColor, getStatus }) {
  if (curriculum === null) return <p style={{ color: '#6b7280', marginTop: '1rem' }}>Loading curriculum…</p>;

  if (!curriculum.has_curriculum && (curriculum.curriculum || []).length === 0) {
    return (
      <div style={{ ...styles.alertError, background: '#fef3c7', color: '#92400e', marginTop: '1rem' }}>
        This student has no program or curriculum set, so there are no courses to display.
        Set the student’s program and year level first (from the student record).
      </div>
    );
  }

  const groups = curriculum.curriculum || [];
  const allSubjects = groups.flatMap(g => g.subjects);
  const gradedCount = allSubjects.filter(s => s.grade).length;

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>
        Courses from <strong>{curriculum.student?.curriculum_code || curriculum.student?.program_code || 'the program'}</strong>.
        Enter a grade on any ungraded subject to credit it (for transferees). Subjects already graded in a class are shown read-only.
        <span style={{ marginLeft: 8, fontWeight: 600, color: '#374151' }}>{gradedCount} of {allSubjects.length} with a grade</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {groups.map((g, gi) => (
          <div key={gi} style={styles.yearGroup}>
            <div style={{ ...styles.yearGroupHeader, background: '#f9fafb' }}>
              <span style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.9rem' }}>
                {g.year_level_display} · {g.semester_display}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{g.subjects.length} subject{g.subjects.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Subject Code', 'Subject Name', 'Units', 'Midterm', 'Final', 'Grade', 'Remarks', ''].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.subjects.map(s => (
                    <CurriculumRow
                      key={s.subject_id}
                      s={s}
                      studentId={studentId}
                      reload={reload}
                      gradeColor={gradeColor}
                      getStatus={getStatus}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CurriculumRow({ s, studentId, reload, gradeColor, getStatus }) {
  const [form, setForm] = useState({
    grade: s.grade || '', midterm: s.midterm_grade || '', final: s.final_grade || '', remarks: s.remarks || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.grade.trim()) { setErr('Grade is required.'); return; }
    setSaving(true); setErr('');
    try {
      await api.post(`/grades/registrar/student/${studentId}/curriculum/`, {
        subject_id: s.subject_id,
        grade: form.grade.trim(),
        midterm_grade: form.midterm.trim() || null,
        final_grade: form.final.trim() || null,
        remarks: form.remarks.trim(),
      });
      reload();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save.');
    } finally { setSaving(false); }
  }

  async function remove() {
    setSaving(true); setErr('');
    try {
      await api.delete(`/grades/registrar/student/${studentId}/curriculum/?subject=${s.subject_id}`);
      reload();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to remove.');
    } finally { setSaving(false); }
  }

  // Faculty class grade — read-only here.
  if (!s.editable) {
    const status = getStatus(s.grade);
    return (
      <tr>
        <td style={{ ...styles.td, fontWeight: 600 }}>{s.code}</td>
        <td style={{ ...styles.td, color: '#374151' }}>{s.name}</td>
        <td style={{ ...styles.td, textAlign: 'center' }}>{s.units}</td>
        <td style={{ ...styles.td, textAlign: 'center', color: '#6b7280' }}>{s.midterm_grade || '-'}</td>
        <td style={{ ...styles.td, textAlign: 'center', color: '#6b7280' }}>{s.final_grade || '-'}</td>
        <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700, color: gradeColor(s.grade) }}>{s.grade || '-'}</td>
        <td style={styles.td} colSpan={2}>
          {status && <span style={{ background: status.bg, color: status.color, fontWeight: 700, fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: 20 }}>{status.label}</span>}
          <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#9ca3af' }}>{s.term_display ? `Class grade · ${s.term_display}` : 'Class grade'}</span>
        </td>
      </tr>
    );
  }

  // Editable (ungraded, or already credited) — inline entry.
  return (
    <tr style={s.is_credited ? { background: '#f0fdf4' } : undefined}>
      <td style={{ ...styles.td, fontWeight: 600 }}>{s.code}</td>
      <td style={{ ...styles.td, color: '#374151' }}>{s.name}</td>
      <td style={{ ...styles.td, textAlign: 'center' }}>{s.units}</td>
      <td style={styles.td}><input style={styles.gradeInput} value={form.midterm} onChange={e => set('midterm', e.target.value)} placeholder="—" inputMode="decimal" /></td>
      <td style={styles.td}><input style={styles.gradeInput} value={form.final} onChange={e => set('final', e.target.value)} placeholder="—" inputMode="decimal" /></td>
      <td style={styles.td}><input style={{ ...styles.gradeInput, fontWeight: 700 }} value={form.grade} onChange={e => set('grade', e.target.value)} placeholder="1.00" inputMode="decimal" /></td>
      <td style={styles.td}>
        <input style={styles.remarksInput} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Credited" />
        {err && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: 2 }}>{err}</div>}
      </td>
      <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
        <button type="button" style={styles.saveBtn} disabled={saving} onClick={save}>
          {saving ? '…' : s.is_credited ? 'Update' : 'Credit'}
        </button>
        {s.is_credited && (
          <button type="button" style={styles.removeBtn} disabled={saving} onClick={remove} title="Remove credited grade">
            <i className="ti ti-trash" />
          </button>
        )}
      </td>
    </tr>
  );
}

const styles = {
  tabBar: { display: 'flex', gap: '0.5rem', margin: '1rem 0 0.25rem' },
  tab: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e5e7eb', color: '#6b7280', padding: '0.45rem 0.9rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
  tabActive: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0a3a6e', border: '1px solid #0a3a6e', color: '#fff', padding: '0.45rem 0.9rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
  gradeInput: { width: 58, padding: '5px 6px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem', textAlign: 'center', boxSizing: 'border-box' },
  remarksInput: { width: '100%', minWidth: 120, padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.82rem', boxSizing: 'border-box' },
  saveBtn: { background: '#0a3a6e', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' },
  removeBtn: { background: '#fff', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 8px', fontSize: '0.8rem', cursor: 'pointer', marginLeft: 6 },
  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#fff', border: '1px solid #e5e7eb',
    padding: '0.4rem 0.85rem', borderRadius: 6, cursor: 'pointer',
    fontSize: '0.88rem', color: '#374151', fontWeight: 600,
    marginBottom: '1rem', transition: 'background .12s, border-color .12s',
  },
  alertError: {
    background: '#fee2e2', color: '#991b1b', padding: '0.75rem',
    borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem',
  },
  studentCard: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
    padding: '1.25rem 1.5rem', marginBottom: '1rem',
  },
  studentName: { fontSize: '1.2rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.4rem' },
  studentMeta: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', alignItems: 'center' },
  metaItem: { fontSize: '0.88rem', color: '#6b7280' },
  yearBadge: {
    background: '#eff6ff', color: '#1d4ed8', fontWeight: 600,
    padding: '0.15rem 0.6rem', borderRadius: 20, fontSize: '0.8rem',
  },
  summaryBar: { display: 'flex', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' },
  summaryCard: {
    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '0.75rem 1.25rem', minWidth: 140, textAlign: 'center',
  },
  summaryLabel: { fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, marginBottom: '0.25rem' },
  summaryValue: { fontSize: '1.35rem', fontWeight: 700, color: '#1f2937' },

  // Year group container
  yearGroup: {
    border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden',
  },
  yearGroupHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.75rem 1rem', borderBottom: '1px solid transparent',
  },
  yearGroupBadge: {
    fontSize: '0.82rem', fontWeight: 700,
    padding: '0.2rem 0.75rem', borderRadius: 20,
  },

  // Term block inside a year group
  termBlock: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden',
  },
  termHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.75rem 1rem', background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb', cursor: 'pointer', userSelect: 'none',
  },
  semNumber: {
    fontSize: '0.72rem', fontWeight: 700, color: '#6b7280',
    background: '#e5e7eb', padding: '0.15rem 0.5rem', borderRadius: 20,
  },
  termTitle: { fontSize: '0.92rem', fontWeight: 700, color: '#1e3a5f' },
  currentBadge: {
    fontSize: '0.72rem', fontWeight: 700, background: '#dcfce7',
    color: '#166534', padding: '0.1rem 0.5rem', borderRadius: 20,
  },
  instructorChip: {
    background: '#f0f9ff', color: '#0369a1', fontWeight: 600,
    padding: '0.15rem 0.55rem', borderRadius: 20, fontSize: '0.8rem',
    whiteSpace: 'nowrap',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' },
  th: {
    textAlign: 'left', padding: '0.5rem 0.75rem', background: '#f9fafb',
    borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: '0.78rem',
  },
  td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6', color: '#1f2937' },
};
