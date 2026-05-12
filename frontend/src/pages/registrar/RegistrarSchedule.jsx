import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const DAY_OPTIONS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
];

const DAY_LABELS = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat',
};

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  teaching_assignment: '',
  room: '',
  building: '',
  day_of_week: 'monday',
  start_time: '',
  end_time: '',
};

function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function RegistrarSchedule() {
  const { user, logout } = useAuth();

  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [page, setPage] = useState(1);

  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);

  const [inlineBuilding, setInlineBuilding] = useState(null); // { id, value }
  const [savingBuilding, setSavingBuilding] = useState(false);

  // Load terms on mount
  useEffect(() => {
    api.get('/enrollment/terms/').then(res => {
      setTerms(res.data);
      const active = res.data.find(t => t.is_active);
      if (active) setSelectedTerm(String(active.id));
    }).catch(() => setError('Failed to load terms.'));
  }, []);

  // Load teaching assignments and schedules when term changes
  useEffect(() => {
    if (!selectedTerm) { setAssignments([]); setSchedules([]); return; }
    setError('');
    Promise.all([
      api.get(`/grades/admin/assignments/?term=${selectedTerm}`),
      api.get(`/schedules/?term_id=${selectedTerm}`),
    ]).then(([aRes, sRes]) => {
      setAssignments(aRes.data);
      setSchedules(sRes.data);
      setPage(1);
    }).catch(() => setError('Failed to load data for this term.'))
      .finally(() => setLoadingSchedules(false));
    setLoadingSchedules(true);
  }, [selectedTerm]);

  function reloadSchedules() {
    if (!selectedTerm) return;
    api.get(`/schedules/?term_id=${selectedTerm}`).then(res => {
      setSchedules(res.data);
      setPage(1);
    });
  }

  async function saveInlineBuilding() {
    if (!inlineBuilding) return;
    setSavingBuilding(true);
    try {
      await api.patch(`/schedules/${inlineBuilding.id}/`, { building: inlineBuilding.value.trim() });
      setSchedules(prev =>
        prev.map(s => s.id === inlineBuilding.id ? { ...s, building: inlineBuilding.value.trim() } : s)
      );
      setInlineBuilding(null);
    } catch {
      setError('Failed to update building.');
    } finally {
      setSavingBuilding(false);
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setError('');
    setSuccessMsg('');
    setShowForm(true);
  }

  function openEdit(sched) {
    setForm({
      teaching_assignment: String(sched.teaching_assignment_id),
      room: sched.room,
      building: sched.building ?? '',
      day_of_week: sched.day_of_week,
      start_time: sched.start_time,
      end_time: sched.end_time,
    });
    setEditId(sched.id);
    setError('');
    setSuccessMsg('');
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this schedule slot?')) return;
    setError('');
    setSuccessMsg('');
    try {
      await api.delete(`/schedules/${id}/`);
      setSuccessMsg('Schedule deleted.');
      reloadSchedules();
    } catch {
      setError('Failed to delete schedule.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!form.teaching_assignment) { setError('Please select a subject/assignment.'); return; }
    if (!form.start_time || !form.end_time) { setError('Start time and end time are required.'); return; }

    setSaving(true);
    const payload = {
      teaching_assignment: Number(form.teaching_assignment),
      room: form.room.trim(),
      building: form.building.trim(),
      day_of_week: form.day_of_week,
      start_time: form.start_time,
      end_time: form.end_time,
    };
    try {
      if (editId) {
        await api.patch(`/schedules/${editId}/`, payload);
        setSuccessMsg('Schedule updated.');
      } else {
        await api.post('/schedules/', payload);
        setSuccessMsg('Schedule created.');
      }
      setShowForm(false);
      setEditId(null);
      reloadSchedules();
    } catch (err) {
      const data = err.response?.data;
      if (data?.non_field_errors) {
        setError(Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : data.non_field_errors);
      } else if (data && typeof data === 'object') {
        setError(Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '));
      } else {
        setError('Failed to save schedule.');
      }
    } finally {
      setSaving(false);
    }
  }

  const termLabel = (() => {
    const t = terms.find(t => String(t.id) === selectedTerm);
    return t ? `${t.semester_display} ${t.year}` : '';
  })();

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link" to="/registrar/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/registrar/enrollment">Enrollment Requests</Link>
        <Link className="sidebar-link" to="/registrar/grades">List of Students</Link>
        <Link className="sidebar-link" to="/registrar/faculty">Faculty</Link>
        <Link className="sidebar-link active" to="/registrar/schedule">Class Schedules</Link>
        <Link className="sidebar-link" to="/registrar/documents">Document Requests</Link>
        <Link className="sidebar-link" to="/registrar/academic-data">Academic Data</Link>
        <Link className="sidebar-link" to="/registrar/announcements">Announcements</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Class Schedule Management</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {/* Term selector + Add button */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={styles.label}>Academic Term</label>
            <select
              value={selectedTerm}
              onChange={e => { setSelectedTerm(e.target.value); setShowForm(false); setError(''); setSuccessMsg(''); }}
              style={styles.select}
            >
              <option value=""> -  Select term  - </option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.semester_display} {t.year}</option>
              ))}
            </select>
          </div>
          {selectedTerm && (
            <button onClick={openCreate} style={styles.btnAdd}>+ Add Schedule Slot</button>
          )}
        </div>

        {error && <div style={styles.alertError}>{error}</div>}
        {successMsg && <div style={styles.alertSuccess}>{successMsg}</div>}

        {/* Create / Edit form */}
        {showForm && (
          <div style={styles.formCard}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#1e3a5f' }}>
              {editId ? 'Edit Schedule Slot' : 'Add Schedule Slot'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={styles.label}>Subject / Assignment</label>
                  <select
                    value={form.teaching_assignment}
                    onChange={e => setForm(p => ({ ...p, teaching_assignment: e.target.value }))}
                    style={{ ...styles.select, maxWidth: '100%' }}
                    required
                    disabled={!!editId}
                  >
                    <option value=""> -  Select subject  - </option>
                    {assignments.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.subject_code}  -  {a.subject_name} ({a.faculty_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={styles.label}>Day</label>
                  <select
                    value={form.day_of_week}
                    onChange={e => setForm(p => ({ ...p, day_of_week: e.target.value }))}
                    style={styles.select}
                    required
                  >
                    {DAY_OPTIONS.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={styles.label}>Room</label>
                  <input
                    type="text"
                    value={form.room}
                    onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
                    placeholder="e.g. Room 101"
                    required
                    style={styles.input}
                  />
                </div>

                <div className="form-group">
                  <label style={styles.label}>Department Building</label>
                  <input
                    type="text"
                    value={form.building}
                    onChange={e => setForm(p => ({ ...p, building: e.target.value }))}
                    placeholder="e.g. IT Building"
                    style={styles.input}
                  />
                </div>

                <div className="form-group">
                  <label style={styles.label}>Start Time</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                    required
                    style={styles.input}
                  />
                </div>

                <div className="form-group">
                  <label style={styles.label}>End Time</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
                    required
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="submit" disabled={saving} style={styles.btnSave(saving)}>
                  {saving ? 'Saving...' : editId ? 'Update' : 'Save'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); setError(''); }} style={styles.btnCancel}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Schedule table */}
        {selectedTerm && (
          loadingSchedules ? (
            <p style={{ color: '#6b7280' }}>Loading schedules...</p>
          ) : schedules.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ fontWeight: 600 }}>No schedule slots posted for {termLabel}.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Click "Add Schedule Slot" to assign class times and rooms to teaching assignments.
              </p>
            </div>
          ) : (
            <>
              {(() => {
                const totalPages = Math.ceil(schedules.length / PAGE_SIZE);
                const start = (page - 1) * PAGE_SIZE;
                const paged = schedules.slice(start, start + PAGE_SIZE);

                return (
                  <>
                    <p style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem' }}>
                      Showing {start + 1} - {Math.min(start + PAGE_SIZE, schedules.length)} of{' '}
                      {schedules.length} slot(s) &middot; {termLabel}
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            {['Subject', 'Faculty', 'Day', 'Time', 'Room / Building', 'Actions'].map(h => (
                              <th key={h} style={styles.th}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paged.map(s => (
                            <tr key={s.id}>
                              <td style={styles.td}>
                                <strong style={{ color: '#1e3a5f' }}>{s.subject_code}</strong>
                                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{s.subject_name}</div>
                              </td>
                              <td style={styles.td}>{s.faculty_name}</td>
                              <td style={styles.td}>{DAY_LABELS[s.day_of_week] || s.day_display}</td>
                              <td style={styles.td}>
                                <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.85rem' }}>
                                  {formatTime(s.start_time)}  -  {formatTime(s.end_time)}
                                </span>
                              </td>
                              <td style={styles.td}>
                                <div>{s.room}</div>
                                {inlineBuilding?.id === s.id ? (
                                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', marginTop: '0.3rem' }}>
                                    <input
                                      autoFocus
                                      value={inlineBuilding.value}
                                      onChange={e => setInlineBuilding(p => ({ ...p, value: e.target.value }))}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') saveInlineBuilding();
                                        if (e.key === 'Escape') setInlineBuilding(null);
                                      }}
                                      placeholder="e.g. IT Building"
                                      style={styles.inlineBuildingInput}
                                    />
                                    <button
                                      onClick={saveInlineBuilding}
                                      disabled={savingBuilding}
                                      style={styles.inlineSaveBtn}
                                      title="Save"
                                    >âœ“</button>
                                    <button
                                      onClick={() => setInlineBuilding(null)}
                                      style={styles.inlineCancelBtn}
                                      title="Cancel"
                                    >x</button>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => setInlineBuilding({ id: s.id, value: s.building ?? '' })}
                                    title="Click to set department building"
                                    style={styles.inlineBuildingDisplay(!!s.building)}
                                  >
                                    {s.building || '+ Add building'}
                                  </div>
                                )}
                              </td>
                              <td style={styles.td}>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <button onClick={() => openEdit(s)} style={styles.btnEdit}>Edit</button>
                                  <button onClick={() => handleDelete(s.id)} style={styles.btnDelete}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalPages > 1 && (
                      <div style={styles.pagination}>
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          style={styles.pageBtn(false, page === 1)}
                        >
                          â† Prev
                        </button>

                        {buildPageNumbers(page, totalPages).map((item, i) =>
                          item === '...' ? (
                            <span key={`ellipsis-${i}`} style={styles.ellipsis}>...</span>
                          ) : (
                            <button
                              key={item}
                              onClick={() => setPage(item)}
                              style={styles.pageBtn(item === page, false)}
                            >
                              {item}
                            </button>
                          )
                        )}

                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          style={styles.pageBtn(false, page === totalPages)}
                        >
                          Next â†’
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )
        )}
      </main>
    </div>
  );
}

const styles = {
  label: { display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#374151', marginBottom: '0.3rem' },
  select: { width: '100%', maxWidth: 380, padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.9rem' },
  input: { width: '100%', padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' },
  alertError: { background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' },
  alertSuccess: { background: '#d1fae5', color: '#065f46', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' },
  emptyState: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.5rem', textAlign: 'center', color: '#6b7280' },
  formCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' },
  th: { textAlign: 'left', padding: '0.5rem 0.75rem', background: '#f9fafb', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: '0.82rem' },
  td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6', color: '#1f2937', verticalAlign: 'middle' },
  btnAdd: { background: '#1e3a5f', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: 6, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  btnSave: (disabled) => ({ background: '#059669', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: 6, fontWeight: 600, fontSize: '0.9rem', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1 }),
  btnCancel: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },
  btnEdit: { background: '#1e3a5f', color: '#fff', border: 'none', padding: '0.25rem 0.65rem', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' },
  btnDelete: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.25rem 0.65rem', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' },
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '0.35rem', marginTop: '1.25rem', flexWrap: 'wrap',
  },
  pageBtn: (active, disabled) => ({
    minWidth: 36, padding: '0.35rem 0.65rem', borderRadius: 6,
    border: active ? 'none' : '1px solid #d1d5db',
    background: active ? '#1e3a5f' : disabled ? '#f3f4f6' : '#fff',
    color: active ? '#fff' : disabled ? '#9ca3af' : '#374151',
    fontWeight: active ? 700 : 500, fontSize: '0.85rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
  }),
  ellipsis: { fontSize: '0.9rem', color: '#9ca3af', padding: '0 0.2rem', lineHeight: '2' },
  inlineBuildingDisplay: (hasValue) => ({
    fontSize: '0.78rem',
    color: hasValue ? '#6b7280' : '#9ca3af',
    cursor: 'pointer',
    marginTop: '0.2rem',
    textDecoration: 'underline dotted',
    display: 'inline-block',
  }),
  inlineBuildingInput: {
    fontSize: '0.8rem', padding: '0.2rem 0.4rem',
    border: '1px solid #6b7280', borderRadius: 4,
    width: 140, outline: 'none',
  },
  inlineSaveBtn: {
    background: '#059669', color: '#fff', border: 'none',
    borderRadius: 4, padding: '0.2rem 0.45rem', cursor: 'pointer',
    fontSize: '0.85rem', fontWeight: 700,
  },
  inlineCancelBtn: {
    background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
    borderRadius: 4, padding: '0.2rem 0.45rem', cursor: 'pointer',
    fontSize: '0.85rem',
  },
};

