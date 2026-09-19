import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useConfirm } from '../../components/ConfirmDialog';

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
  if (month >= 8 && month <= 12) return { year: `${year}-${year + 1}`, semester: 'first' };
  if (month >= 1 && month <= 6) return { year: `${year - 1}-${year}`, semester: 'second' };
  return null;
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function FacultyTeachingLoad() {
  const confirm = useConfirm();
  const [terms, setTerms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [declareSubjects, setDeclareSubjects] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [load, setLoad] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState('');

  const [showDeclare, setShowDeclare] = useState(false);
  const [declareForm, setDeclareForm] = useState({ term_semester: '', department_id: '', program_id: '', year_level: '', subject_id: '', block_id: '', section: '' });
  const [declareError, setDeclareError] = useState('');
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [declareBlocks, setDeclareBlocks] = useState([]);
  const [blocksLoading, setBlocksLoading] = useState(false);

  const [slotOpen, setSlotOpen] = useState({});
  const [slotForm, setSlotForm] = useState({});
  const [slotError, setSlotError] = useState({});
  const [savingSlot, setSavingSlot] = useState({});

  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [deletingSlot, setDeletingSlot] = useState(null);

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
      if (current || active) setSelectedTerm(String((current || active).id));
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

  useEffect(() => { fetchLoad(selectedTerm); }, [selectedTerm]);

  // ── Declare assignment ───────────────────────────────────────────────────────

  const openDeclareModal = () => {
    const selectedTermObj = terms.find(t => String(t.id) === selectedTerm);
    const currentParts = getCurrentRegularTermParts();
    const defaultSemester = selectedTermObj?.semester || currentParts?.semester || '';
    setDeclareForm({ term_semester: defaultSemester, department_id: '', program_id: '', year_level: '', subject_id: '', block_id: '', section: '' });
    setDeclareSubjects([]);
    setDeclareBlocks([]);
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
      const payload = { subject_id: Number(declareForm.subject_id), term_semester: declareForm.term_semester };
      if (declareForm.block_id) payload.block_id = Number(declareForm.block_id);
      if (declareForm.section.trim()) payload.section = declareForm.section.trim();
      const res = await api.post('/grades/faculty/assignments/', payload);
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
    setDeclareForm(f => ({ ...f, term_semester: semester, subject_id: '', block_id: '' }));
    setDeclareSubjects([]);
    setDeclareBlocks([]);
    setDeclareError('');
    if (!semester || !declareForm.program_id || !declareForm.year_level) return;
    await Promise.all([
      fetchDeclareSubjects(semester, declareForm.program_id, declareForm.year_level),
      fetchDeclareBlocks(semester, declareForm.program_id, declareForm.year_level),
    ]);
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
      const params = new URLSearchParams({ semester, program: programId, year_level: yearLevel });
      const res = await api.get(`/enrollment/subjects/?${params.toString()}`);
      setDeclareSubjects(res.data);
    } catch {
      setDeclareError('Failed to load subjects for this term, program, and year level.');
    } finally {
      setSubjectsLoading(false);
    }
  };

  const fetchDeclareBlocks = async (semester, programId, yearLevel) => {
    if (!programId || !yearLevel) { setDeclareBlocks([]); return; }
    const termObj = terms.find(t => t.semester === semester) ?? null;
    if (!termObj) { setDeclareBlocks([]); return; }
    setBlocksLoading(true);
    try {
      const params = new URLSearchParams({ term: termObj.id, program: programId, year_level: yearLevel });
      const res = await api.get(`/enrollment/blocks/?${params.toString()}`);
      setDeclareBlocks(Array.isArray(res.data) ? res.data : (res.data.results ?? []));
    } catch {
      setDeclareBlocks([]);
    } finally {
      setBlocksLoading(false);
    }
  };

  const handleDeclareProgramChange = async (programId) => {
    setDeclareForm(f => ({ ...f, program_id: programId, subject_id: '', block_id: '' }));
    setDeclareSubjects([]);
    setDeclareBlocks([]);
    setDeclareError('');
    if (!declareForm.term_semester || !programId || !declareForm.year_level) return;
    await Promise.all([
      fetchDeclareSubjects(declareForm.term_semester, programId, declareForm.year_level),
      fetchDeclareBlocks(declareForm.term_semester, programId, declareForm.year_level),
    ]);
  };

  const handleDeclareYearLevelChange = async (yearLevel) => {
    setDeclareForm(f => ({ ...f, year_level: yearLevel, subject_id: '', block_id: '' }));
    setDeclareSubjects([]);
    setDeclareBlocks([]);
    setDeclareError('');
    if (!declareForm.term_semester || !declareForm.program_id || !yearLevel) return;
    await Promise.all([
      fetchDeclareSubjects(declareForm.term_semester, declareForm.program_id, yearLevel),
      fetchDeclareBlocks(declareForm.term_semester, declareForm.program_id, yearLevel),
    ]);
  };

  // ── Delete assignment ────────────────────────────────────────────────────────

  const handleDeleteAssignment = async (taId) => {
    if (!await confirm({ title: 'Remove teaching assignment?', message: 'All schedule slots for this assignment will also be removed.', confirmText: 'Remove' })) return;
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
    if (nowOpen && !slotForm[taId]) setSlotForm(prev => ({ ...prev, [taId]: createSlotRows(1) }));
    setSlotError(prev => ({ ...prev, [taId]: '' }));
  };

  const updateSlotField = (taId, index, field, value) => {
    setSlotForm(prev => ({
      ...prev,
      [taId]: (prev[taId] || createSlotRows(1)).map((slot, i) => i === index ? { ...slot, [field]: value } : slot),
    }));
  };

  const updateMeetingCount = (taId, count) => {
    setSlotForm(prev => {
      const current = prev[taId] || createSlotRows(1);
      const next = current.slice(0, count);
      while (next.length < count) next.push({ ...EMPTY_SLOT, room: current[0]?.room || '' });
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
    if (!await confirm({ title: 'Remove schedule slot?', message: 'This time slot will be removed from the schedule.', confirmText: 'Remove' })) return;
    setDeletingSlot(slotId);
    try {
      await api.delete(`/schedules/faculty/slots/${slotId}/`);
      setLoad(prev => prev.map(ta => ({ ...ta, slots: ta.slots.filter(s => s.id !== slotId) })));
    } catch {
      setPageError('Failed to remove schedule slot.');
    } finally {
      setDeletingSlot(null);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const selectedTermLabel = (() => {
    const t = terms.find(t => String(t.id) === selectedTerm);
    return t ? `${t.semester_display} ${t.year}` : 'All Terms';
  })();
  const declarePrograms = declareForm.department_id
    ? programs.filter(p => String(p.department) === String(declareForm.department_id))
    : [];

  const totalStudents = load.reduce((s, ta) => s + (ta.student_count || 0), 0);
  const totalSlots    = load.reduce((s, ta) => s + (ta.slots?.length || 0), 0);
  const totalUnits    = load.reduce((s, ta) => s + (ta.subject_units || 0), 0);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{CSS}</style>

      {/* ── Page head ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow">Faculty · Teaching Load</div>
          <h2>Teaching <em>Load</em></h2>
        </div>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button className="btn-pri" onClick={openDeclareModal}>
            <i className="ti ti-plus" /> Declare Subject
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="toolbar" style={{ marginBottom: '1.5rem' }}>
        <select
          className="tl-select"
          value={selectedTerm}
          onChange={e => setSelectedTerm(e.target.value)}
        >
          <option value="">All Terms</option>
          {terms.map(t => (
            <option key={t.id} value={t.id}>{t.semester_display} {t.year}</option>
          ))}
        </select>
        <span className="tl-count">
          {load.length} assignment{load.length !== 1 ? 's' : ''}
          {selectedTerm ? ` · ${selectedTermLabel}` : ''}
        </span>
      </div>

      {/* ── Stats ── */}
      {!loading && load.length > 0 && (
        <div className="tl-stats">
          {[
            { label: 'Subjects',       val: load.length,   icon: 'ti-book-2',    accent: 'gold'  },
            { label: 'Students',       val: totalStudents, icon: 'ti-users',     accent: 'blue'  },
            { label: 'Total units',    val: totalUnits,    icon: 'ti-chart-bar', accent: 'green' },
            { label: 'Schedule slots', val: totalSlots,    icon: 'ti-calendar',  accent: 'amber' },
          ].map(s => (
            <div key={s.label} className="tl-stat">
              <div className={`tl-stat-ic ${s.accent}`}><i className={`ti ${s.icon}`} /></div>
              <div className="tl-stat-body">
                <div className="tl-stat-val">{s.val}</div>
                <div className="tl-stat-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pageError && (
        <div className="tl-alert-err">{pageError}</div>
      )}

      {/* ── Assignment list ── */}
      {loading ? (
        <div className="tl-loading">Loading teaching load…</div>
      ) : load.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-calendar-off" style={{ fontSize: 32, color: 'var(--faint)', marginBottom: '.75rem' }} />
          <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '.4rem' }}>
            No teaching assignments{selectedTerm ? ` for ${selectedTermLabel}` : ''}.
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Click <strong>+ Declare Subject</strong> to add your subjects for this term.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: '1.75rem' }}>
          {load.map(ta => {
            const taId = ta.teaching_assignment_id;
            const sortedSlots = [...(ta.slots || [])].sort((a, b) =>
              DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week) ||
              a.start_time.localeCompare(b.start_time)
            );
            return (
              <div key={taId} className="tl-card">
                {/* Card header */}
                <div className="tl-card-head">
                  <div className="tl-head-info">
                    <div className="tl-head-title">
                      <span className="tl-code">{ta.subject_code}</span>
                      {ta.section && <span className="tl-sec">{ta.section}</span>}
                      <span className="tl-name">{ta.subject_name}</span>
                    </div>
                    <div className="tl-meta">
                      <span>{ta.subject_units} unit{Number(ta.subject_units) !== 1 ? 's' : ''}</span>
                      <span className="tl-dot">·</span>
                      <span>{ta.student_count} student{ta.student_count !== 1 ? 's' : ''}</span>
                      {ta.term && <><span className="tl-dot">·</span><span className="tl-term">{ta.term}</span></>}
                    </div>
                  </div>
                  <button
                    className="tl-btn-remove"
                    disabled={deletingAssignment === taId}
                    onClick={() => handleDeleteAssignment(taId)}
                    title="Remove assignment"
                  >
                    {deletingAssignment === taId ? '…' : <><i className="ti ti-trash" /> Remove</>}
                  </button>
                </div>

                {/* Schedule slots */}
                <div className="tl-slots-section">
                  <div className="tl-slots-row">
                    {sortedSlots.map(slot => (
                      <div key={slot.id} className="tl-slot-chip">
                        <span className="tl-slot-day">{DAY_LABELS[slot.day_of_week]}</span>
                        <span className="tl-slot-time">{formatTime(slot.start_time)}–{formatTime(slot.end_time)}</span>
                        {slot.room && <span className="tl-slot-room">{slot.room}</span>}
                        <button
                          className="tl-slot-x"
                          disabled={deletingSlot === slot.id}
                          onClick={() => handleDeleteSlot(slot.id)}
                          title="Remove slot"
                        >
                          {deletingSlot === slot.id ? '…' : <i className="ti ti-x" />}
                        </button>
                      </div>
                    ))}
                    {sortedSlots.length === 0 && <span className="tl-noslots">No schedule slots yet.</span>}
                    {!slotOpen[taId] && (
                      <button className="tl-btn-add-slot" onClick={() => toggleSlotForm(taId)}>
                        <i className="ti ti-plus" /> Add slot
                      </button>
                    )}
                  </div>

                  {/* Add slot form */}
                  {slotOpen[taId] && (
                    <div className="tl-slot-form">
                      <div className="tl-slot-form-top">
                        <div>
                          <label className="tl-label-sm">Meetings per week</label>
                          <select
                            className="tl-input-sm"
                            value={(slotForm[taId] || createSlotRows(1)).length}
                            onChange={e => updateMeetingCount(taId, Number(e.target.value))}
                          >
                            <option value={1}>1 meeting</option>
                            <option value={2}>2 meetings</option>
                            <option value={3}>3 meetings</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-end' }}>
                          <button
                            className="btn-pri"
                            style={{ padding: '.4rem .9rem', fontSize: 13 }}
                            onClick={() => handleAddSlot(taId)}
                            disabled={savingSlot[taId]}
                          >
                            {savingSlot[taId] ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            className="btn-sec"
                            style={{ padding: '.4rem .9rem', fontSize: 13 }}
                            onClick={() => toggleSlotForm(taId)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      {(slotForm[taId] || createSlotRows(1)).map((slot, index) => (
                        <div key={index} className="tl-slot-row">
                          <div className="tl-meeting-label">Meeting {index + 1}</div>
                          <div>
                            <label className="tl-label-sm">Day</label>
                            <select
                              className="tl-input-sm"
                              value={slot.day_of_week || 'monday'}
                              onChange={e => updateSlotField(taId, index, 'day_of_week', e.target.value)}
                            >
                              {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="tl-label-sm">Start time</label>
                            <input
                              type="time"
                              className="tl-input-sm"
                              value={slot.start_time || '07:00'}
                              onChange={e => updateSlotField(taId, index, 'start_time', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="tl-label-sm">End time</label>
                            <input
                              type="time"
                              className="tl-input-sm"
                              value={slot.end_time || '08:30'}
                              onChange={e => updateSlotField(taId, index, 'end_time', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="tl-label-sm">Room</label>
                            <input
                              type="text"
                              className="tl-input-sm"
                              placeholder="e.g. Room 201"
                              value={slot.room || ''}
                              onChange={e => updateSlotField(taId, index, 'room', e.target.value)}
                              style={{ minWidth: 120 }}
                            />
                          </div>
                        </div>
                      ))}
                      {slotError[taId] && (
                        <div className="tl-form-err">{slotError[taId]}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Declare Subject Modal ── */}
      {showDeclare && (
        <div className="tl-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDeclare(false); }}>
          <div className="tl-modal">
            <div className="tl-modal-head">
              <div>
                <div style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Teaching Load
                </div>
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>Declare Teaching Assignment</h3>
              </div>
              <button className="tl-modal-close" onClick={() => setShowDeclare(false)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 1.25rem' }}>
              Select a term first. Subjects will follow the selected term, program, and year level.
            </p>

            {[
              {
                label: 'Term',
                el: (
                  <select
                    className="tl-modal-select"
                    value={declareForm.term_semester}
                    onChange={e => handleDeclareTermChange(e.target.value)}
                  >
                    <option value="">Select Term</option>
                    {TERM_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                ),
              },
              {
                label: 'Department',
                el: (
                  <select
                    className="tl-modal-select"
                    value={declareForm.department_id}
                    onChange={e => handleDeclareDepartmentChange(e.target.value)}
                    disabled={!declareForm.term_semester}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
                  </select>
                ),
              },
              {
                label: 'Program',
                el: (
                  <select
                    className="tl-modal-select"
                    value={declareForm.program_id}
                    onChange={e => handleDeclareProgramChange(e.target.value)}
                    disabled={!declareForm.term_semester || !declareForm.department_id}
                  >
                    <option value="">Select Program</option>
                    {declarePrograms.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                  </select>
                ),
              },
              {
                label: 'Year Level',
                el: (
                  <select
                    className="tl-modal-select"
                    value={declareForm.year_level}
                    onChange={e => handleDeclareYearLevelChange(e.target.value)}
                    disabled={!declareForm.term_semester || !declareForm.program_id}
                  >
                    <option value="">Select Year Level</option>
                    {YEAR_LEVEL_OPTIONS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                  </select>
                ),
              },
            ].map(({ label, el }) => (
              <div key={label} className="tl-modal-field">
                <label className="tl-modal-label">{label}</label>
                {el}
              </div>
            ))}

            <div className="tl-modal-field">
              <label className="tl-modal-label">Subject</label>
              <select
                className="tl-modal-select"
                value={declareForm.subject_id}
                onChange={e => setDeclareForm(f => ({ ...f, subject_id: e.target.value }))}
                disabled={!declareForm.term_semester || !declareForm.program_id || !declareForm.year_level || subjectsLoading}
              >
                <option value="">{subjectsLoading ? 'Loading subjects…' : 'Select Subject'}</option>
                {declareSubjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.year_level_display ? `${s.year_level_display} / ` : ''}{s.semester_display ? `${s.semester_display} - ` : ''}{s.code} - {s.name} ({s.units} units)
                  </option>
                ))}
              </select>
              {declareForm.term_semester && declareForm.program_id && declareForm.year_level && !subjectsLoading && declareSubjects.length === 0 && (
                <div className="tl-help-text">No active subjects for this term, program, and year level.</div>
              )}
            </div>

            <div className="tl-modal-field">
              <label className="tl-modal-label">
                Block <span style={{ fontWeight: 400, color: 'var(--faint)', fontSize: 12 }}>(optional)</span>
              </label>
              <select
                className="tl-modal-select"
                value={declareForm.block_id}
                onChange={e => setDeclareForm(f => ({ ...f, block_id: e.target.value }))}
                disabled={!declareForm.program_id || !declareForm.year_level || blocksLoading}
              >
                <option value="">{blocksLoading ? 'Loading blocks…' : 'No block assigned'}</option>
                {declareBlocks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} - {b.enrolled_count}/{b.capacity} students{b.is_full ? ' (Full)' : ''}
                  </option>
                ))}
              </select>
              {declareForm.program_id && declareForm.year_level && !blocksLoading && declareBlocks.length === 0 && (
                <div className="tl-help-text">No blocks found. Blocks are created automatically when enrollments are approved.</div>
              )}
            </div>

            <div className="tl-modal-field">
              <label className="tl-modal-label">
                Section <span style={{ fontWeight: 400, color: 'var(--faint)', fontSize: 12 }}>(as in your class list, e.g. 1A)</span>
              </label>
              <input
                className="tl-modal-select"
                type="text"
                value={declareForm.section}
                onChange={e => setDeclareForm(f => ({ ...f, section: e.target.value }))}
                placeholder="e.g. 1A"
                maxLength={30}
              />
              <div className="tl-help-text">Same subject taught to two sections = two courses. Leave blank if you handle only one section.</div>
            </div>

            {declareError && <div className="tl-form-err" style={{ marginBottom: '.75rem' }}>{declareError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem', marginTop: '1.25rem' }}>
              <button className="btn-sec" onClick={() => setShowDeclare(false)} disabled={declaring}>
                Cancel
              </button>
              <button className="btn-pri" onClick={handleDeclare} disabled={declaring}>
                {declaring ? 'Saving…' : 'Declare Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const CSS = `
  .tl-select {
    padding: .45rem .75rem;
    border: 1px solid var(--line);
    background: #fff;
    color: var(--ink);
    font-size: 13px;
    cursor: pointer;
    outline: none;
  }
  .tl-select:focus { border-color: var(--ink); }
  .tl-count { font-size: 12px; color: var(--muted); align-self: center; }
  .tl-loading { color: var(--muted); font-size: 13px; padding: 2rem 0; }

  /* Stat cards */
  .tl-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .75rem; margin-bottom: 1.5rem; }
  .tl-stat { background: #fff; border: 1px solid var(--line); padding: .9rem 1rem; display: flex; align-items: center; gap: 12px; }
  .tl-stat-ic { width: 40px; height: 40px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .tl-stat-ic.gold  { background: var(--gold-tint);  color: var(--gold);  }
  .tl-stat-ic.blue  { background: #e8eef8;           color: #1e3a5f;      }
  .tl-stat-ic.green { background: var(--green-tint); color: var(--green); }
  .tl-stat-ic.amber { background: #f7eed8;           color: var(--amber); }
  .tl-stat-body { min-width: 0; }
  .tl-stat-val { font-size: 26px; font-weight: 600; color: var(--ink); line-height: 1; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .tl-stat-lbl { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); font-weight: 600; margin-top: 5px; }
  .tl-alert-err {
    background: #fee2e2; color: #991b1b; padding: .75rem 1rem;
    font-size: 13px; margin-bottom: 1rem; border-left: 3px solid #dc2626;
  }

  /* Assignment card (compact) */
  .tl-card {
    background: #fff;
    border: 1px solid var(--line);
    padding: .9rem 1.1rem;
  }
  .tl-card + .tl-card { border-top: none; }
  .tl-card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }
  .tl-head-info { min-width: 0; flex: 1; }
  .tl-head-title { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .tl-code { font-size: 11px; letter-spacing: .07em; color: var(--gold); text-transform: uppercase; font-weight: 700; flex-shrink: 0; }
  .tl-sec { font-size: 10px; font-weight: 700; background: var(--gold-tint); color: var(--gold); padding: 1px 6px; }
  .tl-name { font-size: 15px; font-weight: 600; color: var(--ink); letter-spacing: -.005em; }
  .tl-meta { font-size: 12px; color: var(--muted); margin-top: 3px; display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
  .tl-dot { color: var(--faint); }
  .tl-term { color: var(--ink-2); font-weight: 500; }
  .tl-btn-remove {
    display: inline-flex; align-items: center; gap: 5px;
    background: none; border: 1px solid var(--line); color: var(--muted);
    padding: .3rem .7rem; font-size: 12px; font-weight: 600;
    cursor: pointer; white-space: nowrap; flex-shrink: 0;
    transition: background .15s, border-color .15s, color .15s;
  }
  .tl-btn-remove:hover:not(:disabled) { background: #fee2e2; border-color: #fca5a5; color: var(--red); }
  .tl-btn-remove:disabled { opacity: .6; cursor: default; }

  /* Slots (compact inline pills) */
  .tl-slots-section { border-top: 1px solid var(--line-soft); padding-top: .7rem; margin-top: .75rem; }
  .tl-slots-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
  .tl-slot-chip {
    display: inline-flex; align-items: center; gap: 8px;
    background: #f0fdf4; border: 1px solid #bbf7d0;
    padding: 4px 6px 4px 10px; font-size: 12px; line-height: 1.2;
  }
  .tl-slot-day { font-weight: 700; color: var(--ink-2); text-transform: uppercase; letter-spacing: .04em; font-size: 11px; }
  .tl-slot-time { font-weight: 600; color: var(--green); font-variant-numeric: tabular-nums; }
  .tl-slot-room { color: var(--muted); }
  .tl-slot-x {
    background: none; border: none; color: var(--faint); font-size: 14px;
    cursor: pointer; line-height: 1; padding: 0 0 0 2px; display: inline-flex;
  }
  .tl-slot-x:hover:not(:disabled) { color: var(--red); }
  .tl-slot-x:disabled { opacity: .5; cursor: default; }
  .tl-noslots { font-size: 12px; color: var(--faint); font-style: italic; }
  .tl-btn-add-slot {
    display: inline-flex; align-items: center; gap: 4px;
    background: none; border: 1px dashed var(--line); color: var(--muted);
    padding: 4px 10px; font-size: 12px; cursor: pointer;
    transition: border-color .15s, color .15s;
  }
  .tl-btn-add-slot:hover { border-color: var(--ink); color: var(--ink); }

  /* Slot form */
  .tl-slot-form {
    background: var(--warm); border: 1px solid var(--line);
    padding: .875rem 1rem; margin-top: .75rem;
  }
  .tl-slot-form-top {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: .75rem; flex-wrap: wrap; margin-bottom: .75rem;
  }
  .tl-slot-row {
    display: flex; flex-wrap: wrap; gap: .75rem; align-items: flex-end;
    padding-top: .75rem; margin-top: .75rem; border-top: 1px solid var(--line-soft);
  }
  .tl-meeting-label {
    min-width: 72px; color: var(--ink-2); font-weight: 700;
    font-size: 12px; padding-bottom: .55rem;
  }
  .tl-label-sm {
    display: block; font-size: 11px; font-weight: 600;
    color: var(--muted); margin-bottom: .3rem; text-transform: uppercase; letter-spacing: .05em;
  }
  .tl-input-sm {
    padding: .4rem .6rem; border: 1px solid var(--line); background: #fff;
    color: var(--ink); font-size: 13px; outline: none;
  }
  .tl-input-sm:focus { border-color: var(--ink); }
  .tl-form-err { color: var(--red); font-size: 12px; margin-top: .5rem; }
  .tl-help-text { color: var(--muted); font-size: 12px; margin-top: .35rem; }

  /* Modal */
  .tl-overlay {
    position: fixed; inset: 0; background: rgba(10,22,40,.45);
    display: flex; align-items: center; justify-content: center; z-index: 200;
  }
  .tl-modal {
    background: #fff; width: 100%; max-width: 480px;
    padding: 1.75rem 2rem; box-shadow: 0 20px 60px rgba(0,0,0,.2);
    max-height: 90vh; overflow-y: auto;
  }
  .tl-modal-head {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: .5rem;
  }
  .tl-modal-close {
    background: none; border: none; color: var(--muted); font-size: 18px;
    cursor: pointer; padding: 4px; line-height: 1;
  }
  .tl-modal-close:hover { color: var(--ink); }
  .tl-modal-field { margin-bottom: .875rem; }
  .tl-modal-label {
    display: block; font-size: 12px; font-weight: 600;
    color: var(--muted); margin-bottom: .35rem; text-transform: uppercase; letter-spacing: .05em;
  }
  .tl-modal-select {
    width: 100%; padding: .5rem .75rem; border: 1px solid var(--line);
    background: #fff; color: var(--ink); font-size: 14px; outline: none;
  }
  .tl-modal-select:focus { border-color: var(--ink); }
  .tl-modal-select:disabled { background: var(--warm); color: var(--faint); cursor: not-allowed; }
`;
