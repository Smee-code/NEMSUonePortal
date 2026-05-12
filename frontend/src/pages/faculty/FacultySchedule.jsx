import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
};
const DAY_OPTIONS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
];
const YEAR_LEVEL_OPTIONS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
];
const TERM_OPTIONS = [
  { value: 'first', label: 'First Term' },
  { value: 'second', label: 'Second Term' },
];

const EMPTY_SLOT = { day_of_week: 'monday', start_time: '07:00', end_time: '08:30', room: '' };

function createSlotRows(count = 1, base = EMPTY_SLOT) {
  return Array.from({ length: count }, () => ({ ...base }));
}

function getCurrentRegularTermParts(today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  if (month >= 8 && month <= 12) {
    return { year: `${year}-${year + 1}`, semester: 'first' };
  }
  if (month >= 1 && month <= 6) {
    return { year: `${year - 1}-${year}`, semester: 'second' };
  }
  return null;
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function FacultyTeachingLoad() {
  const { user, logout } = useAuth();

  const [terms, setTerms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [declareSubjects, setDeclareSubjects] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [load, setLoad] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState('');

  // Declare assignment modal
  const [showDeclare, setShowDeclare] = useState(false);
  const [declareForm, setDeclareForm] = useState({ term_semester: '', department_id: '', program_id: '', year_level: '', subject_id: '' });
  const [declareError, setDeclareError] = useState('');
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [declaring, setDeclaring] = useState(false);

  // Per-assignment slot form state
  const [slotOpen, setSlotOpen] = useState({});
  const [slotForm, setSlotForm] = useState({});
  const [slotError, setSlotError] = useState({});
  const [savingSlot, setSavingSlot] = useState({});

  // Deletion loading state
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [deletingSlot, setDeletingSlot] = useState(null);

  // Load terms + curriculum filters on mount
  useEffect(() => {
    Promise.all([
      api.get('/enrollment/terms/'),
      api.get('/enrollment/departments/'),
      api.get('/enrollment/programs/'),
    ]).then(([termsRes, departmentsRes, programsRes]) => {
      setTerms(termsRes.data);
      setDepartments(departmentsRes.data);
      setPrograms(programsRes.data);
      const currentParts = getCurrentRegularTermParts();
      const current = currentParts
        ? termsRes.data.find(t => t.year === currentParts.year && t.semester === currentParts.semester)
        : null;
      const active = termsRes.data.find(t => t.is_active);
      if (current || active) {
        setSelectedTerm(String((current || active).id));
      }
    }).catch(() => setPageError('Failed to load terms and curriculum filters.'));
  }, []);

  const fetchLoad = (termId) => {
    setLoading(true);
    setPageError('');
    const url = termId ? `/schedules/faculty/?term_id=${termId}` : '/schedules/faculty/';
    api.get(url)
      .then(res => setLoad(res.data))
      .catch(() => setPageError('Failed to load teaching assignments.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLoad(selectedTerm);
  }, [selectedTerm]);

  // ── Declare assignment ───────────────────────────────────────────────────────

  const openDeclareModal = () => {
    const selectedTermObj = terms.find(t => String(t.id) === selectedTerm);
    const currentParts = getCurrentRegularTermParts();
    const defaultSemester = selectedTermObj?.semester || currentParts?.semester || '';
    setDeclareForm({ term_semester: defaultSemester, department_id: '', program_id: '', year_level: '', subject_id: '' });
    setDeclareSubjects([]);
    setDeclareError('');
    setShowDeclare(true);
  };

  const handleDeclare = async () => {
    if (!declareForm.term_semester || !declareForm.department_id || !declareForm.program_id || !declareForm.year_level || !declareForm.subject_id) {
      setDeclareError('Please select a term, department, program, year level, and subject.');
      return;
    }
    setDeclaring(true);
    setDeclareError('');
    try {
      const res = await api.post('/grades/faculty/assignments/', {
        subject_id: Number(declareForm.subject_id),
        term_semester: declareForm.term_semester,
      });
      setShowDeclare(false);
      const targetTerm = res.data?.term_id ? String(res.data.term_id) : selectedTerm;
      if (targetTerm) setSelectedTerm(targetTerm);
      fetchLoad(targetTerm);
    } catch (err) {
      setDeclareError(err.response?.data?.error || 'Failed to declare assignment.');
    } finally {
      setDeclaring(false);
    }
  };

  const handleDeclareTermChange = async (semester) => {
    setDeclareForm(f => ({ ...f, term_semester: semester, subject_id: '' }));
    setDeclareSubjects([]);
    setDeclareError('');
    if (!semester || !declareForm.program_id || !declareForm.year_level) return;
    await fetchDeclareSubjects(semester, declareForm.program_id, declareForm.year_level);
  };

  const handleDeclareDepartmentChange = (departmentId) => {
    setDeclareForm(f => ({ ...f, department_id: departmentId, program_id: '', year_level: '', subject_id: '' }));
    setDeclareSubjects([]);
    setDeclareError('');
  };

  const fetchDeclareSubjects = async (semester, programId, yearLevel) => {
    if (!semester || !programId || !yearLevel) return;
    setSubjectsLoading(true);
    try {
      const params = new URLSearchParams({
        semester,
        program: programId,
        year_level: yearLevel,
      });
      const res = await api.get(`/enrollment/subjects/?${params.toString()}`);
      setDeclareSubjects(res.data);
    } catch {
      setDeclareError('Failed to load subjects for this term, program, and year level.');
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handleDeclareProgramChange = async (programId) => {
    setDeclareForm(f => ({ ...f, program_id: programId, subject_id: '' }));
    setDeclareSubjects([]);
    setDeclareError('');
    if (!declareForm.term_semester || !programId || !declareForm.year_level) return;
    await fetchDeclareSubjects(declareForm.term_semester, programId, declareForm.year_level);
  };

  const handleDeclareYearLevelChange = async (yearLevel) => {
    setDeclareForm(f => ({ ...f, year_level: yearLevel, subject_id: '' }));
    setDeclareSubjects([]);
    setDeclareError('');
    if (!declareForm.term_semester || !declareForm.program_id || !yearLevel) return;
    await fetchDeclareSubjects(declareForm.term_semester, declareForm.program_id, yearLevel);
  };

  // ── Delete assignment ────────────────────────────────────────────────────────

  const handleDeleteAssignment = async (taId) => {
    if (!window.confirm('Remove this teaching assignment? All schedule slots will also be removed.')) return;
    setDeletingAssignment(taId);
    setPageError('');
    try {
      await api.delete(`/grades/faculty/assignments/${taId}/`);
      fetchLoad(selectedTerm);
    } catch (err) {
      setPageError(err.response?.data?.error || 'Failed to remove assignment.');
    } finally {
      setDeletingAssignment(null);
    }
  };

  // ── Slot form helpers ────────────────────────────────────────────────────────

  const toggleSlotForm = (taId) => {
    const nowOpen = !slotOpen[taId];
    setSlotOpen(prev => ({ ...prev, [taId]: nowOpen }));
    if (nowOpen && !slotForm[taId]) {
      setSlotForm(prev => ({ ...prev, [taId]: createSlotRows(1) }));
    }
    setSlotError(prev => ({ ...prev, [taId]: '' }));
  };

  const updateSlotField = (taId, index, field, value) => {
    setSlotForm(prev => ({
      ...prev,
      [taId]: (prev[taId] || createSlotRows(1)).map((slot, i) => (
        i === index ? { ...slot, [field]: value } : slot
      )),
    }));
  };

  const updateMeetingCount = (taId, count) => {
    setSlotForm(prev => {
      const current = prev[taId] || createSlotRows(1);
      const next = current.slice(0, count);
      while (next.length < count) {
        next.push({ ...EMPTY_SLOT, room: current[0]?.room || '' });
      }
      return { ...prev, [taId]: next };
    });
    setSlotError(prev => ({ ...prev, [taId]: '' }));
  };

  const handleAddSlot = async (taId) => {
    const forms = slotForm[taId] || createSlotRows(1);
    const missingRoom = forms.findIndex(form => !form?.room?.trim());
    if (missingRoom >= 0) {
      setSlotError(prev => ({ ...prev, [taId]: `Room is required for meeting ${missingRoom + 1}.` }));
      return;
    }
    setSavingSlot(prev => ({ ...prev, [taId]: true }));
    setSlotError(prev => ({ ...prev, [taId]: '' }));
    try {
      await api.post('/schedules/faculty/slots/', {
        teaching_assignment_id: taId,
        slots: forms.map(form => ({
          room: form.room.trim(),
          day_of_week: form.day_of_week,
          start_time: form.start_time,
          end_time: form.end_time,
        })),
      });
      setSlotOpen(prev => ({ ...prev, [taId]: false }));
      setSlotForm(prev => ({ ...prev, [taId]: createSlotRows(1) }));
      fetchLoad(selectedTerm);
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.non_field_errors?.[0] || d?.end_time?.[0] || d?.error || 'Failed to add slot.';
      setSlotError(prev => ({ ...prev, [taId]: msg }));
    } finally {
      setSavingSlot(prev => ({ ...prev, [taId]: false }));
    }
  };

  const handleDeleteSlot = async (slotId) => {
    setDeletingSlot(slotId);
    try {
      await api.delete(`/schedules/faculty/slots/${slotId}/`);
      setLoad(prev => prev.map(ta => ({
        ...ta,
        slots: ta.slots.filter(s => s.id !== slotId),
      })));
    } catch {
      setPageError('Failed to remove schedule slot.');
    } finally {
      setDeletingSlot(null);
    }
  };

  // ── Derived labels ────────────────────────────────────────────────────────────

  const selectedTermLabel = (() => {
    const t = terms.find(t => String(t.id) === selectedTerm);
    return t ? `${t.semester_display} ${t.year}` : 'All Terms';
  })();
  const declarePrograms = declareForm.department_id
    ? programs.filter(p => String(p.department) === String(declareForm.department_id))
    : [];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link" to="/faculty/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/faculty/grades">Grade Encoding</Link>
        <Link className="sidebar-link active" to="/faculty/schedule">Teaching Load</Link>
        <Link className="sidebar-link" to="/faculty/announcements">Announcements</Link>
        <Link className="sidebar-link" to="/faculty/profile">My Profile</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Teaching Load &amp; Schedule</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {/* Controls row */}
        <div style={styles.controlsRow}>
          <div>
            <label style={styles.label}>Academic Term</label>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              style={styles.select}
            >
              <option value="">— All Terms —</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.semester_display} {t.year}</option>
              ))}
            </select>
          </div>
          <button style={styles.btnPrimary} onClick={openDeclareModal}>
            + Declare Subject
          </button>
        </div>

        {pageError && <div style={styles.alertError}>{pageError}</div>}

        {/* Assignment list */}
        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading teaching load…</p>
        ) : load.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ fontWeight: 600 }}>
              No teaching assignments{selectedTerm ? ` for ${selectedTermLabel}` : ''}.
            </p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Click <strong>+ Declare Subject</strong> to add your subjects for this term.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {load.map(ta => {
              const taId = ta.teaching_assignment_id;
              return (
                <div key={taId} style={styles.card}>
                  {/* Card header */}
                  <div style={styles.cardHeader}>
                    <div>
                      <span style={styles.subjectCode}>{ta.subject_code}</span>
                      <span style={styles.subjectName}>{ta.subject_name}</span>
                    </div>
                    <div style={styles.cardMeta}>
                      <span style={styles.pill}>{ta.subject_units} units</span>
                      <span style={styles.pill}>
                        {ta.student_count} student{ta.student_count !== 1 ? 's' : ''}
                      </span>
                      <span style={{ ...styles.pill, background: '#dbeafe', color: '#1e40af' }}>
                        {ta.term}
                      </span>
                      <button
                        style={styles.btnDanger}
                        disabled={deletingAssignment === taId}
                        onClick={() => handleDeleteAssignment(taId)}
                      >
                        {deletingAssignment === taId ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </div>

                  {/* Schedule slots */}
                  <div style={{ marginTop: '0.85rem' }}>
                    {ta.slots.length > 0 && (
                      <div style={styles.slotsRow}>
                        {[...ta.slots]
                          .sort((a, b) =>
                            DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week) ||
                            a.start_time.localeCompare(b.start_time)
                          )
                          .map(slot => (
                            <div key={slot.id} style={styles.slotChip}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.82rem' }}>
                                  {DAY_LABELS[slot.day_of_week]}
                                </span>
                                <button
                                  style={styles.btnSlotX}
                                  disabled={deletingSlot === slot.id}
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  title="Remove slot"
                                >
                                  {deletingSlot === slot.id ? '…' : '×'}
                                </button>
                              </div>
                              <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.81rem' }}>
                                {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                              </span>
                              <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{slot.room}</span>
                            </div>
                          ))}
                      </div>
                    )}

                    {ta.slots.length === 0 && !slotOpen[taId] && (
                      <p style={{ fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                        No schedule set yet.
                      </p>
                    )}

                    {/* Add slot toggle / form */}
                    {!slotOpen[taId] ? (
                      <button style={styles.btnAddSlot} onClick={() => toggleSlotForm(taId)}>
                        + Add Schedule Slot
                      </button>
                    ) : (
                      <div style={styles.slotFormBox}>
                        <div style={styles.slotFormTopRow}>
                          <div>
                            <label style={styles.labelSm}>Meetings per Week</label>
                            <select
                              value={(slotForm[taId] || createSlotRows(1)).length}
                              onChange={e => updateMeetingCount(taId, Number(e.target.value))}
                              style={styles.inputSm}
                            >
                              <option value={1}>1 meeting</option>
                              <option value={2}>2 meetings</option>
                              <option value={3}>3 meetings</option>
                            </select>
                          </div>
                          <div style={styles.slotActions}>
                            <button
                              style={styles.btnPrimary}
                              onClick={() => handleAddSlot(taId)}
                              disabled={savingSlot[taId]}
                            >
                              {savingSlot[taId] ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              style={styles.btnSecondary}
                              onClick={() => toggleSlotForm(taId)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                        {(slotForm[taId] || createSlotRows(1)).map((slot, index) => (
                          <div key={index} style={styles.slotFormRow}>
                            <div style={styles.meetingLabel}>Meeting {index + 1}</div>
                            <div>
                              <label style={styles.labelSm}>Day</label>
                              <select
                                value={slot.day_of_week || 'monday'}
                                onChange={e => updateSlotField(taId, index, 'day_of_week', e.target.value)}
                                style={styles.inputSm}
                              >
                                {DAY_OPTIONS.map(d => (
                                  <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={styles.labelSm}>Start Time</label>
                              <input
                                type="time"
                                value={slot.start_time || '07:00'}
                                onChange={e => updateSlotField(taId, index, 'start_time', e.target.value)}
                                style={styles.inputSm}
                              />
                            </div>
                            <div>
                              <label style={styles.labelSm}>End Time</label>
                              <input
                                type="time"
                                value={slot.end_time || '08:30'}
                                onChange={e => updateSlotField(taId, index, 'end_time', e.target.value)}
                                style={styles.inputSm}
                              />
                            </div>
                            <div>
                              <label style={styles.labelSm}>Room</label>
                              <input
                                type="text"
                                placeholder="e.g. Room 201"
                                value={slot.room || ''}
                                onChange={e => updateSlotField(taId, index, 'room', e.target.value)}
                                style={{ ...styles.inputSm, minWidth: 130 }}
                              />
                            </div>
                          </div>
                        ))}
                        {slotError[taId] && (
                          <p style={styles.formError}>{slotError[taId]}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Declare Subject Modal */}
        {showDeclare && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>Declare Teaching Assignment</h2>
              <p style={styles.modalSubtitle}>
                Select a term first. Subjects will follow the selected term, program, and year level.
              </p>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Term</label>
                <select
                  value={declareForm.term_semester}
                  onChange={e => handleDeclareTermChange(e.target.value)}
                  style={styles.select}
                >
                  <option value="">— Select Term —</option>
                  {TERM_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Department</label>
                <select
                  value={declareForm.department_id}
                  onChange={e => handleDeclareDepartmentChange(e.target.value)}
                  style={styles.select}
                  disabled={!declareForm.term_semester}
                >
                  <option value="">— Select Department —</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Program</label>
                <select
                  value={declareForm.program_id}
                  onChange={e => handleDeclareProgramChange(e.target.value)}
                  style={styles.select}
                  disabled={!declareForm.term_semester || !declareForm.department_id}
                >
                  <option value="">— Select Program —</option>
                  {declarePrograms.map(p => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Year Level</label>
                <select
                  value={declareForm.year_level}
                  onChange={e => handleDeclareYearLevelChange(e.target.value)}
                  style={styles.select}
                  disabled={!declareForm.term_semester || !declareForm.program_id}
                >
                  <option value="">— Select Year Level —</option>
                  {YEAR_LEVEL_OPTIONS.map(y => (
                    <option key={y.value} value={y.value}>{y.label}</option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Subject</label>
                <select
                  value={declareForm.subject_id}
                  onChange={e => setDeclareForm(f => ({ ...f, subject_id: e.target.value }))}
                  style={styles.select}
                  disabled={!declareForm.term_semester || !declareForm.program_id || !declareForm.year_level || subjectsLoading}
                >
                  <option value="">{subjectsLoading ? 'Loading subjects...' : '— Select Subject —'}</option>
                  {declareSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.year_level_display ? `${s.year_level_display} / ` : ''}{s.semester_display ? `${s.semester_display} - ` : ''}{s.code} — {s.name} ({s.units} units)
                    </option>
                  ))}
                </select>
                {declareForm.term_semester && declareForm.program_id && declareForm.year_level && !subjectsLoading && declareSubjects.length === 0 && (
                  <p style={styles.helpText}>No active subjects are assigned to this term, program, and year level.</p>
                )}
              </div>

              {declareError && <p style={styles.formError}>{declareError}</p>}

              <div style={styles.modalActions}>
                <button
                  style={styles.btnSecondary}
                  onClick={() => setShowDeclare(false)}
                  disabled={declaring}
                >
                  Cancel
                </button>
                <button
                  style={styles.btnPrimary}
                  onClick={handleDeclare}
                  disabled={declaring}
                >
                  {declaring ? 'Saving…' : 'Declare'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  label: {
    display: 'block', fontWeight: 600, fontSize: '0.9rem',
    color: '#374151', marginBottom: '0.4rem',
  },
  labelSm: {
    display: 'block', fontWeight: 600, fontSize: '0.82rem',
    color: '#374151', marginBottom: '0.3rem',
  },
  select: {
    width: '100%', maxWidth: 420, padding: '0.5rem 0.75rem',
    borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.95rem',
  },
  inputSm: {
    padding: '0.45rem 0.6rem', borderRadius: 6,
    border: '1px solid #d1d5db', fontSize: '0.88rem',
  },
  controlsRow: {
    display: 'flex', gap: '1rem', alignItems: 'flex-end',
    marginBottom: '1.5rem', flexWrap: 'wrap',
  },
  alertError: {
    background: '#fee2e2', color: '#991b1b', padding: '0.75rem',
    borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem',
  },
  emptyState: {
    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '2rem', textAlign: 'center', color: '#6b7280',
  },
  card: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
    padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem',
  },
  cardMeta: {
    display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center',
  },
  subjectCode: { fontWeight: 700, color: '#1e3a5f', fontSize: '1rem', marginRight: '0.6rem' },
  subjectName: { color: '#374151', fontSize: '0.9rem' },
  pill: {
    background: '#f3f4f6', color: '#374151', borderRadius: 20,
    padding: '0.2rem 0.65rem', fontSize: '0.78rem', fontWeight: 600,
  },
  slotsRow: { display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '0.75rem' },
  slotChip: {
    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
    padding: '0.45rem 0.75rem', display: 'flex', flexDirection: 'column',
    gap: '0.1rem', minWidth: 155,
  },
  slotFormBox: {
    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: '0.85rem 1rem', marginTop: '0.5rem',
  },
  slotFormTopRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-end', gap: '0.85rem', flexWrap: 'wrap',
    marginBottom: '0.75rem',
  },
  slotFormRow: {
    display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'flex-end',
    paddingTop: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid #e2e8f0',
  },
  slotActions: {
    display: 'flex', gap: '0.5rem', alignItems: 'flex-end',
  },
  meetingLabel: {
    minWidth: 78, color: '#1e3a5f', fontWeight: 700,
    fontSize: '0.84rem', paddingBottom: '0.55rem',
  },
  formError: { color: '#b91c1c', fontSize: '0.85rem', marginTop: '0.5rem' },
  helpText: { color: '#6b7280', fontSize: '0.82rem', marginTop: '0.4rem' },
  btnPrimary: {
    background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6,
    padding: '0.5rem 1.1rem', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  btnSecondary: {
    background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
    borderRadius: 6, padding: '0.5rem 1rem', fontSize: '0.9rem',
    cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
  },
  btnDanger: {
    background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5',
    borderRadius: 6, padding: '0.25rem 0.75rem', fontSize: '0.8rem',
    cursor: 'pointer', fontWeight: 600,
  },
  btnAddSlot: {
    background: 'none', border: '1px dashed #9ca3af', color: '#6b7280',
    borderRadius: 6, padding: '0.35rem 0.9rem', fontSize: '0.85rem',
    cursor: 'pointer', marginTop: '0.25rem',
  },
  btnSlotX: {
    background: 'none', border: 'none', color: '#ef4444', fontSize: '1rem',
    cursor: 'pointer', lineHeight: 1, padding: '0 0 0 0.4rem',
    fontWeight: 700,
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: 12, padding: '1.75rem 2rem',
    width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  modalTitle: { margin: '0 0 0.4rem', fontSize: '1.15rem', color: '#1e3a5f', fontWeight: 700 },
  modalSubtitle: { margin: '0 0 1.25rem', fontSize: '0.88rem', color: '#6b7280' },
  fieldGroup: { marginBottom: '1rem' },
  modalActions: {
    display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem',
  },
};
