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

const DECLARE_DAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
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
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [termsReady, setTermsReady] = useState(false);

  const [showDeclare, setShowDeclare] = useState(false);
  const [declareForm, setDeclareForm] = useState({ term_semester: '', department_id: '', program_id: '', year_level: '', subject_id: '', block_id: '', days: [], start_time: '', end_time: '' });
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

  // Inline edit of one existing meeting (day/time). Room stays as assigned.
  const [editSlot, setEditSlot] = useState(null);  // { id, day_of_week, start_time, end_time } | null
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

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
      const dateCurrent = currentParts
        ? termsRes.data.find(t => t.year === currentParts.year && t.semester === currentParts.semester)
        : null;
      const active = termsRes.data.find(t => t.is_active);
      // Default to the registrar-set current term (the one shown in the header)
      // so the Teaching Load matches the rest of the app; fall back to the
      // date-based term only when no term is marked active.
      const defaultTerm = active || dateCurrent;
      if (defaultTerm) setSelectedTerm(String(defaultTerm.id));
      setTermsReady(true);
    }).catch(() => { setPageError('Failed to load terms and curriculum filters.'); setTermsReady(true); setLoading(false); });
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

  // Wait until terms have loaded and the current term is chosen before the first
  // load. This avoids a wasteful "all terms" fetch of every past assignment on
  // mount (and the race where that slow response overwrote the scoped one).
  useEffect(() => {
    if (!termsReady) return;
    fetchLoad(selectedTerm);
  }, [selectedTerm, termsReady]);

  // ── Declare assignment ───────────────────────────────────────────────────────

  const openDeclareModal = () => {
    const selectedTermObj = terms.find(t => String(t.id) === selectedTerm);
    const currentParts = getCurrentRegularTermParts();
    const defaultSemester = selectedTermObj?.semester || currentParts?.semester || '';
    setDeclareForm({ term_semester: defaultSemester, department_id: '', program_id: '', year_level: '', subject_id: '', block_id: '', days: [], start_time: '', end_time: '' });
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
    if (!declareForm.block_id) {
      setDeclareError('Please select a block for this assignment.');
      return;
    }
    // Schedule is optional, but if any part is filled they must all be.
    const hasSched = declareForm.days.length > 0 || declareForm.start_time || declareForm.end_time;
    if (hasSched) {
      if (declareForm.days.length === 0) { setDeclareError('Pick at least one meeting day, or clear the time to skip the schedule.'); return; }
      if (!declareForm.start_time || !declareForm.end_time) { setDeclareError('Enter both a start and end time for the schedule.'); return; }
      if (declareForm.start_time >= declareForm.end_time) { setDeclareError('End time must be after the start time.'); return; }
    }
    setDeclaring(true);
    setDeclareError('');
    try {
      const payload = {
        subject_id: Number(declareForm.subject_id),
        term_semester: declareForm.term_semester,
        block_id: Number(declareForm.block_id),
      };
      if (hasSched) {
        payload.days = declareForm.days;
        payload.start_time = declareForm.start_time;
        payload.end_time = declareForm.end_time;
      }
      const res = await api.post('/grades/faculty/assignments/', payload);
      setShowDeclare(false);
      const targetTerm = res.data?.term_id ? String(res.data.term_id) : selectedTerm;
      if (targetTerm) setSelectedTerm(targetTerm);
      fetchLoad(targetTerm);
    } catch (err) {
      const d = err.response?.data;
      let msg;
      if (d?.non_field_errors) {
        // Schedule clashes come back here (you already teach a class at that time).
        const nfe = Array.isArray(d.non_field_errors) ? d.non_field_errors.join(' ') : d.non_field_errors;
        msg = `Schedule conflict — ${nfe}`;
      } else if (d?.error) {
        msg = d.error;
      } else if (d?.detail) {
        msg = d.detail;
      } else if (d && typeof d === 'object') {
        msg = Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
      } else {
        msg = 'Failed to declare assignment.';
      }
      setDeclareError(msg);
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

  const openEditSlot = (slot) => {
    setEditError('');
    setEditSlot({
      id: slot.id,
      day_of_week: slot.day_of_week,
      start_time: (slot.start_time || '').slice(0, 5) || '07:00',
      end_time: (slot.end_time || '').slice(0, 5) || '08:30',
    });
  };

  const handleEditSave = async () => {
    if (!editSlot) return;
    if (editSlot.start_time >= editSlot.end_time) {
      setEditError('End time must be after the start time.');
      return;
    }
    setSavingEdit(true);
    setEditError('');
    try {
      const res = await api.patch(`/schedules/faculty/slots/${editSlot.id}/`, {
        day_of_week: editSlot.day_of_week,
        start_time: editSlot.start_time,
        end_time: editSlot.end_time,
      });
      const updated = res.data;
      setLoad(prev => prev.map(ta => ({
        ...ta,
        slots: (ta.slots || []).map(s => (s.id === editSlot.id ? { ...s, ...updated } : s)),
      })));
      setEditSlot(null);
    } catch (err) {
      const d = err.response?.data;
      setEditError(d?.non_field_errors?.[0] || d?.end_time?.[0] || d?.error || 'Failed to update this meeting.');
    } finally {
      setSavingEdit(false);
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
          <div className="eyebrow">Faculty · {selectedTermLabel}</div>
          <h2>Teaching <em>Load</em></h2>
          <div className="sub">The subjects you teach this term and their weekly meeting times. Declare a subject, then add its schedule slots so your students can see them.</div>
        </div>
        <div className="actions">
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

      {/* ── Load summary ── */}
      {!loading && load.length > 0 && (
        <div className="tl-summary">
          <div className="tl-sum"><b>{load.length}</b><span>Subjects</span></div>
          <div className="tl-sum"><b>{totalStudents}</b><span>Students</span></div>
          <div className="tl-sum"><b>{totalUnits}</b><span>Total units</span></div>
          <div className="tl-sum"><b>{totalSlots}</b><span>Schedule slots</span></div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem', marginBottom: '1.75rem' }}>
          {load.map(ta => {
            const taId = ta.teaching_assignment_id;
            const sortedSlots = [...(ta.slots || [])].sort((a, b) =>
              DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week) ||
              a.start_time.localeCompare(b.start_time)
            );
            return (
              <div key={taId} className={`tl-card${sortedSlots.length === 0 ? ' tl-card--noslot' : ''}`}>
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
                      editSlot && editSlot.id === slot.id ? (
                        <div key={slot.id} className="tl-meeting tl-meeting--editing">
                          <div className="tl-meeting-edit-row">
                            <div>
                              <label className="tl-label-sm">Day</label>
                              <select className="tl-input-sm" value={editSlot.day_of_week}
                                onChange={e => setEditSlot(p => ({ ...p, day_of_week: e.target.value }))}>
                                {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="tl-label-sm">Start</label>
                              <input type="time" className="tl-input-sm" value={editSlot.start_time}
                                onChange={e => setEditSlot(p => ({ ...p, start_time: e.target.value }))} />
                            </div>
                            <div>
                              <label className="tl-label-sm">End</label>
                              <input type="time" className="tl-input-sm" value={editSlot.end_time}
                                onChange={e => setEditSlot(p => ({ ...p, end_time: e.target.value }))} />
                            </div>
                          </div>
                          {editError && <div className="tl-meeting-edit-err">{editError}</div>}
                          <div className="tl-meeting-edit-actions">
                            <button className="btn-pri" style={{ padding: '.35rem .8rem', fontSize: 12 }}
                              onClick={handleEditSave} disabled={savingEdit}>
                              {savingEdit ? 'Saving…' : 'Save'}
                            </button>
                            <button className="btn-sec" style={{ padding: '.35rem .8rem', fontSize: 12 }}
                              onClick={() => { setEditSlot(null); setEditError(''); }} disabled={savingEdit}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div key={slot.id} className="tl-meeting">
                          <div className="tl-meeting-top">
                            <span className="tl-meeting-day">{slot.day_display || DAY_LABELS[slot.day_of_week]}</span>
                            <span className="tl-meeting-time">{formatTime(slot.start_time)}–{formatTime(slot.end_time)}</span>
                            <span className="tl-meeting-btns">
                              <button
                                className="tl-meeting-ic"
                                onClick={() => openEditSlot(slot)}
                                title="Edit this meeting's day and time"
                              >
                                <i className="ti ti-pencil" />
                              </button>
                              <button
                                className="tl-meeting-x"
                                disabled={deletingSlot === slot.id}
                                onClick={() => handleDeleteSlot(slot.id)}
                                title="Remove this meeting"
                              >
                                {deletingSlot === slot.id ? '…' : <i className="ti ti-x" />}
                              </button>
                            </span>
                          </div>
                          <div className={`tl-meeting-room${slot.room ? '' : ' pending'}`}>
                            <i className={`ti ${slot.room ? 'ti-door' : 'ti-map-pin'}`} />
                            <span>{slot.room
                              ? `${slot.room}${slot.building ? ` · ${slot.building}` : ''}`
                              : 'Room to be assigned by the registrar'}</span>
                          </div>
                        </div>
                      )
                    ))}
                    {sortedSlots.length === 0 && <span className="tl-noslots"><i className="ti ti-alert-triangle" /> No schedule slots yet — students can’t see this class.</span>}
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
              <label className="tl-modal-label">Block</label>
              <select
                className="tl-modal-select"
                value={declareForm.block_id}
                onChange={e => setDeclareForm(f => ({ ...f, block_id: e.target.value }))}
                disabled={!declareForm.program_id || !declareForm.year_level || blocksLoading}
              >
                <option value="">{blocksLoading ? 'Loading blocks…' : 'Select a block'}</option>
                {declareBlocks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} - {b.enrolled_count}/{b.capacity} students{b.is_full ? ' (Full)' : ''}
                  </option>
                ))}
              </select>
              <div className="tl-help-text">
                {declareForm.program_id && declareForm.year_level && !blocksLoading && declareBlocks.length === 0
                  ? 'No blocks found. Blocks are created automatically when enrollments are approved.'
                  : 'The block is the student cohort you teach. Same subject taught to two blocks = two courses.'}
              </div>
            </div>

            <div className="tl-modal-field">
              <label className="tl-modal-label">
                Schedule <span style={{ fontWeight: 400, color: 'var(--faint)', fontSize: 12 }}>(optional — the registrar assigns the room)</span>
              </label>
              <div className="tl-day-row">
                {DECLARE_DAYS.map(d => {
                  const on = declareForm.days.includes(d.value);
                  return (
                    <button type="button" key={d.value}
                      className={`tl-day-btn${on ? ' on' : ''}`}
                      onClick={() => setDeclareForm(f => ({
                        ...f,
                        days: on ? f.days.filter(x => x !== d.value) : [...f.days, d.value],
                      }))}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <div className="tl-time-row">
                <div>
                  <span className="tl-time-lbl">Start</span>
                  <input type="time" className="tl-modal-select" value={declareForm.start_time}
                    onChange={e => setDeclareForm(f => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div>
                  <span className="tl-time-lbl">End</span>
                  <input type="time" className="tl-modal-select" value={declareForm.end_time}
                    onChange={e => setDeclareForm(f => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
              <div className="tl-help-text">
                Set the day(s) and time you teach this class. Leave blank to add the schedule later.
                The room is assigned by the registrar.
              </div>
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

  /* Load summary strip */
  .tl-summary { display: grid; grid-template-columns: repeat(4, 1fr); background: #fff; border: 1px solid var(--line); margin-bottom: 1.5rem; }
  .tl-sum { padding: 1.1rem 1.35rem; border-right: 1px solid var(--line); }
  .tl-sum:last-child { border-right: none; }
  .tl-sum b { display: block; font-family: 'Inter', sans-serif; font-weight: 500; font-size: 28px; color: var(--ink); line-height: 1; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .tl-sum span { display: block; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); font-weight: 600; margin-top: 7px; }
  @media (max-width: 620px) {
    .tl-summary { grid-template-columns: repeat(2, 1fr); }
    .tl-sum:nth-child(2) { border-right: none; }
    .tl-sum:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
  }
  .tl-alert-err {
    background: #fee2e2; color: #991b1b; padding: .75rem 1rem;
    font-size: 13px; margin-bottom: 1rem; border-left: 3px solid #dc2626;
  }

  /* Course card */
  .tl-card {
    background: #fff;
    border: 1px solid var(--line);
    padding: 1.15rem 1.3rem;
    transition: border-color .15s, box-shadow .15s;
  }
  .tl-card:hover { border-color: var(--line); box-shadow: 0 1px 3px rgba(16,24,40,.05); }
  .tl-card--noslot { border-left: 3px solid var(--amber); }
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

  /* Weekly meetings — the focal element: day/time with the room status */
  .tl-slots-section { border-top: 1px solid var(--line-soft); padding-top: .9rem; margin-top: .9rem; }
  .tl-slots-row { display: flex; flex-wrap: wrap; gap: .6rem; align-items: stretch; }
  .tl-meeting {
    display: flex; flex-direction: column; gap: 6px;
    background: var(--warm); border: 1px solid var(--line);
    padding: 9px 13px; min-width: 176px;
  }
  .tl-meeting-top { display: flex; align-items: baseline; gap: 10px; }
  .tl-meeting-day { font-size: 12px; font-weight: 700; color: var(--ink-2); letter-spacing: .01em; }
  .tl-meeting-time { font-size: 13.5px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; margin-right: auto; }
  .tl-meeting-x {
    background: none; border: none; color: var(--faint); font-size: 13px;
    cursor: pointer; line-height: 1; padding: 0; display: inline-flex; align-self: center;
    transition: color .15s;
  }
  .tl-meeting-x:hover:not(:disabled) { color: var(--red); }
  .tl-meeting-x:disabled { opacity: .5; cursor: default; }
  .tl-meeting-btns { display: inline-flex; align-items: center; gap: 8px; align-self: center; }
  .tl-meeting-ic {
    background: none; border: none; color: var(--faint); font-size: 13px;
    cursor: pointer; line-height: 1; padding: 0; display: inline-flex; transition: color .15s;
  }
  .tl-meeting-ic:hover { color: var(--ink); }
  .tl-meeting--editing { min-width: 240px; gap: 8px; }
  .tl-meeting-edit-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .tl-meeting-edit-row > div { display: flex; flex-direction: column; gap: 3px; }
  .tl-meeting-edit-err { font-size: 11.5px; color: var(--red); }
  .tl-meeting-edit-actions { display: flex; gap: .5rem; }
  .tl-meeting-room { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--ink-2); }
  .tl-meeting-room i { font-size: 15px; color: var(--muted); }
  .tl-meeting-room.pending { color: var(--amber); }
  .tl-meeting-room.pending i { color: var(--amber); }
  .tl-noslots { display: inline-flex; align-items: center; align-self: center; gap: 6px; font-size: 12.5px; color: var(--amber); font-weight: 500; }
  .tl-noslots i { font-size: 14px; }
  .tl-btn-add-slot {
    display: inline-flex; align-items: center; align-self: center; gap: 4px;
    background: none; border: 1px dashed var(--line); color: var(--muted);
    padding: 7px 12px; font-size: 12px; cursor: pointer;
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
    padding: 1rem; overflow-y: auto;
  }
  .tl-modal {
    background: #fff; width: 100%; max-width: 480px; box-sizing: border-box;
    padding: 1.75rem 2rem; box-shadow: 0 20px 60px rgba(0,0,0,.2);
    max-height: 90vh; overflow-y: auto;
  }
  @media (max-width: 640px) { .tl-modal { padding: 1.4rem 1.25rem; } }
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
    width: 100%; box-sizing: border-box; padding: .5rem .75rem; border: 1px solid var(--line);
    background: #fff; color: var(--ink); font-size: 14px; outline: none;
  }
  .tl-modal-select:focus { border-color: var(--ink); }
  .tl-modal-select:disabled { background: var(--warm); color: var(--faint); cursor: not-allowed; }
  .tl-day-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .tl-day-btn { padding: 6px 12px; font-size: 12px; font-weight: 600; border: 1px solid var(--line);
    background: #fff; color: var(--muted); cursor: pointer; border-radius: 4px; }
  .tl-day-btn:hover { border-color: var(--ink); }
  .tl-day-btn.on { background: var(--ink); color: #fff; border-color: var(--ink); }
  .tl-time-row { display: flex; gap: .75rem; margin-top: .6rem; }
  .tl-time-row > div { flex: 1; }
  .tl-time-lbl { display: block; font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
    color: var(--muted); font-weight: 600; margin-bottom: 4px; }
`;
