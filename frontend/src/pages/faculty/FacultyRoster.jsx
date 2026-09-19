import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';

function initials(name) {
  const p = (name || '').replace(',', '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function FacultyRoster() {
  const [currentTerm, setCurrentTerm] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [pageError, setPageError] = useState('');

  const [flash, setFlash] = useState('');
  const [importing, setImporting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ student_id: '', name: '' });
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState('');
  const fileRef = useRef(null);

  const loadAssignments = (termId) =>
    api.get(`/schedules/faculty/?term_id=${termId}`)
      .then(r => {
        setAssignments(r.data);
        return r.data;
      })
      .catch(() => { setPageError('Failed to load teaching assignments.'); return []; });

  useEffect(() => {
    Promise.allSettled([
      api.get('/enrollment/current-term/'),
    ]).then(([termRes]) => {
      const term = termRes.status === 'fulfilled' ? termRes.value.data : null;
      setCurrentTerm(term);
      if (term) {
        loadAssignments(term.id).then(data => {
          if (data.length > 0) setSelectedId(data[0].teaching_assignment_id);
        });
      }
    }).finally(() => setLoadingInit(false));
  }, []);

  const loadRoster = (id) => {
    if (!id) { setStudents([]); return; }
    setLoadingStudents(true);
    setPageError('');
    return api.get(`/grades/faculty/students/?assignment=${id}`)
      .then(r => setStudents(r.data))
      .catch(() => setPageError('Failed to load student roster.'))
      .finally(() => setLoadingStudents(false));
  };

  useEffect(() => { loadRoster(selectedId); }, [selectedId]);

  async function refreshCounts() {
    if (currentTerm) await loadAssignments(currentTerm.id);
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (file) e.target.value = '';   // allow re-selecting the same file
    if (!file || !selectedId) return;
    setImporting(true); setFlash(''); setPageError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(`/grades/faculty/courses/${selectedId}/import/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const d = res.data;
      setFlash(`${d.message} (${d.new_placeholders} new, ${d.matched_accounts} matched, ${d.already} already in${d.elsewhere ? `, ${d.elsewhere} in another section` : ''})`);
      await Promise.all([loadRoster(selectedId), refreshCounts()]);
    } catch (err) {
      setPageError(err.response?.data?.error || 'Import failed. Upload a valid .xlsx or .csv class list.');
    } finally {
      setImporting(false);
    }
  }

  async function handleAddStudent(e) {
    e.preventDefault();
    if (!addForm.student_id.trim()) { setAddErr('Student ID is required.'); return; }
    setAddBusy(true); setAddErr('');
    try {
      const res = await api.post(`/grades/faculty/courses/${selectedId}/add-student/`, {
        student_id: addForm.student_id.trim(),
        name: addForm.name.trim(),
      });
      setFlash(res.data.message);
      setShowAdd(false); setAddForm({ student_id: '', name: '' });
      await Promise.all([loadRoster(selectedId), refreshCounts()]);
    } catch (err) {
      setAddErr(err.response?.data?.error || 'Failed to add student.');
    } finally {
      setAddBusy(false);
    }
  }

  const selected = assignments.find(a => a.teaching_assignment_id === selectedId);

  const schedLabel = selected
    ? [...(selected.slots || [])]
        .sort((a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week))
        .map(s => `${s.day_of_week.charAt(0).toUpperCase()}${s.day_of_week.slice(1, 3)} ${formatTime(s.start_time)}–${formatTime(s.end_time)}`)
        .join(', ')
    : '';

  const filtered = students.filter(st => {
    const q = search.toLowerCase();
    return !q
      || (st.student_id_no || '').toLowerCase().includes(q)
      || (st.student_name || '').toLowerCase().includes(q);
  });

  const termLabel = currentTerm
    ? `${currentTerm.semester_display} ${currentTerm.year}`
    : 'No active term';

  return (
    <>
      <style>{CSS}</style>

      {/* ── Page head ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow">Faculty · {termLabel}</div>
          <h2>Class <em>Roster</em></h2>
        </div>
      </div>

      {loadingInit ? (
        <div className="ro-loading">Loading…</div>
      ) : assignments.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-users-off" style={{ fontSize: 32, color: 'var(--faint)', marginBottom: '.75rem' }} />
          <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '.4rem' }}>No teaching assignments this term.</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Declare a subject in Teaching Load to see rosters here.</div>
        </div>
      ) : (
        <div className="ro-layout">
          {/* ── Subject sidebar ── */}
          <div className="ro-sidebar">
            <div className="ro-sidebar-head">Subjects</div>
            {assignments.map(a => (
              <button
                key={a.teaching_assignment_id}
                className={`ro-subject-btn${selectedId === a.teaching_assignment_id ? ' active' : ''}`}
                onClick={() => { setSelectedId(a.teaching_assignment_id); setSearch(''); }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                  <span className="ro-subject-code">{a.subject_code}</span>
                  <span className="ro-subject-count">{a.student_count}</span>
                </div>
                <div className="ro-subject-name">{a.subject_name}</div>
              </button>
            ))}
          </div>

          {/* ── Main panel ── */}
          <div className="ro-main">
            {selected && (
              <div className="ro-subject-header">
                <div>
                  <div style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                    {selected.subject_code}
                  </div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 500, fontSize: 19, color: 'var(--ink)', marginBottom: 3 }}>
                    {selected.subject_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {selected.student_count} student{selected.student_count !== 1 ? 's' : ''}
                    {schedLabel ? ` · ${schedLabel}` : ''}
                  </div>
                </div>
                <div className="ro-stat-chips">
                  <div className="ro-stat-chip">
                    <div className="ro-chip-val">{selected.student_count}</div>
                    <div className="ro-chip-lbl">Enrolled</div>
                  </div>
                  <div className="ro-stat-chip">
                    <div className="ro-chip-val">{selected.subject_units || '-'}</div>
                    <div className="ro-chip-lbl">Units</div>
                  </div>
                  <div className="ro-stat-chip">
                    <div className="ro-chip-val">{(selected.slots || []).length}</div>
                    <div className="ro-chip-lbl">Slots</div>
                  </div>
                </div>
              </div>
            )}

            {pageError && <div className="ro-alert-err">{pageError}</div>}
            {flash && (
              <div className="ro-alert-ok" style={{ background: 'var(--green-tint,#e6f1ec)', color: 'var(--green,#0a7c52)', padding: '10px 14px', fontSize: 13, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>{flash}</span>
                <button onClick={() => setFlash('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><i className="ti ti-x" /></button>
              </div>
            )}

            {/* ── Toolbar ── */}
            <div className="toolbar" style={{ marginBottom: '1rem', gap: '.6rem', flexWrap: 'wrap' }}>
              <div className="toolbar-search">
                <i className="ti ti-search" />
                <input
                  placeholder="Search by name or ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <span className="ro-result-count" style={{ marginRight: 'auto' }}>
                {filtered.length} of {students.length} student{students.length !== 1 ? 's' : ''}
              </span>
              <input ref={fileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={handleImportFile} />
              <button className="btn-sec" disabled={importing || !selectedId} onClick={() => fileRef.current?.click()}>
                <i className="ti ti-file-upload" /> {importing ? 'Importing…' : 'Import class list'}
              </button>
              <button className="btn-pri" disabled={!selectedId} onClick={() => { setShowAdd(true); setAddErr(''); setAddForm({ student_id: '', name: '' }); }}>
                <i className="ti ti-user-plus" /> Add student
              </button>
            </div>

            {/* ── Table ── */}
            {loadingStudents ? (
              <div className="ro-loading">Loading roster…</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 160 }}>
                <i className="ti ti-users" style={{ fontSize: 28, color: 'var(--faint)', marginBottom: '.5rem' }} />
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                  {search ? 'No students match your search.' : 'No students enrolled in this section.'}
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Student ID</th>
                      <th>Account</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((st, i) => (
                      <tr key={st.student_uuid || i}>
                        <td style={{ color: 'var(--faint)', fontSize: 12, fontFamily: 'monospace' }}>
                          {String(i + 1).padStart(2, '0')}
                        </td>
                        <td>
                          <div className="row-user">
                            <div className="avatar">
                              {initials(st.student_name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{st.student_name || '-'}</div>
                              {st.show_curriculum && st.curriculum_code && (
                                <span className="tag" style={{ fontSize: 10, background: 'var(--gold-tint,#f5edd9)', color: 'var(--gold,#b89043)', marginTop: 2, display: 'inline-block' }}>
                                  {st.curriculum_code}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--ink-2)', letterSpacing: '.03em' }}>
                            {st.student_id_no || '-'}
                          </span>
                        </td>
                        <td>
                          {st.is_placeholder ? (
                            <span className="tag pending" title="This student has not registered a portal account yet. It will link automatically when they register.">Not registered</span>
                          ) : (
                            <span className="tag approved">Registered</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="ro-modal-overlay" onMouseDown={() => !addBusy && setShowAdd(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,22,40,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '6vh 16px', overflowY: 'auto' }}>
          <div onMouseDown={e => e.stopPropagation()}
            style={{ background: '#fff', width: '100%', maxWidth: 420, border: '1px solid var(--line,#e2e8f0)', padding: '1.5rem', boxShadow: '0 24px 60px -20px rgba(10,22,40,.4)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink,#0a1628)', margin: '0 0 .35rem' }}>Add a student</h3>
            <p style={{ fontSize: 13, color: 'var(--muted,#64748b)', margin: '0 0 1rem', lineHeight: 1.5 }}>
              Add one student to {selected?.subject_code}{selected?.section ? ` [${selected.section}]` : ''} by ID. If they haven't registered a portal account yet, a placeholder is created and links automatically when they do.
            </p>
            <form onSubmit={handleAddStudent}>
              <label style={lblStyle}>Student ID (IDNO)</label>
              <input style={inpStyle} value={addForm.student_id} onChange={e => setAddForm(f => ({ ...f, student_id: e.target.value }))} placeholder="e.g. 2025-00606" autoFocus />
              <label style={{ ...lblStyle, marginTop: 12 }}>Name <span style={{ color: 'var(--faint,#94a3b8)', fontWeight: 400 }}>(Last, First M.I.)</span></label>
              <input style={inpStyle} value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Abel, Princess Heart C." />
              {addErr && <div style={{ background: '#fef2f2', color: '#dc2626', fontSize: 12, padding: '8px 12px', marginTop: 12 }}>{addErr}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn-sec" onClick={() => setShowAdd(false)} disabled={addBusy}>Cancel</button>
                <button type="submit" className="btn-pri" disabled={addBusy}>{addBusy ? 'Adding…' : 'Add student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const lblStyle = { display: 'block', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint,#94a3b8)', fontWeight: 600, marginBottom: 5 };
const inpStyle = { width: '100%', border: '1px solid var(--line,#e2e8f0)', padding: '9px 11px', fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: "'Inter',sans-serif" };

const CSS = `
  .ro-loading { color: var(--muted); font-size: 13px; padding: 2rem 0; }
  .ro-alert-err {
    background: #fee2e2; color: #991b1b; padding: .75rem 1rem;
    font-size: 13px; margin-bottom: 1rem; border-left: 3px solid var(--red);
  }
  .ro-result-count { font-size: 12px; color: var(--muted); align-self: center; margin-left: auto; }

  .ro-layout { display: grid; grid-template-columns: 220px 1fr; gap: 1.5rem; align-items: start; }
  .ro-layout > * { min-width: 0; }
  .ro-main { overflow-x: auto; }
  @media (max-width: 700px) { .ro-layout { grid-template-columns: 1fr; } }

  /* Subject sidebar */
  .ro-sidebar {
    border: 1px solid var(--line);
    background: #fff;
    overflow: hidden;
  }
  .ro-sidebar-head {
    padding: .75rem 1rem; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .1em; color: var(--muted);
    border-bottom: 1px solid var(--line-soft);
    background: var(--warm);
  }
  .ro-subject-btn {
    width: 100%; text-align: left; padding: .75rem 1rem;
    background: none; border: none; border-bottom: 1px solid var(--line-soft);
    cursor: pointer; transition: background .12s;
  }
  .ro-subject-btn:hover { background: var(--warm); }
  .ro-subject-btn.active { background: var(--cool); border-left: 3px solid var(--ink); }
  .ro-subject-btn:last-child { border-bottom: none; }
  .ro-subject-code {
    font-size: 11px; font-weight: 700; color: var(--gold);
    text-transform: uppercase; letter-spacing: .08em;
  }
  .ro-subject-count {
    font-size: 11px; background: var(--line-soft); color: var(--muted);
    padding: 1px 6px; font-weight: 600; border-radius: 20px;
  }
  .ro-subject-name { font-size: 12px; color: var(--ink); margin-top: 2px; font-weight: 500; }

  /* Subject header */
  .ro-subject-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 1rem; padding: 1.25rem 1.5rem;
    background: #fff; border: 1px solid var(--line);
    margin-bottom: 1rem; flex-wrap: wrap;
  }
  .ro-stat-chips { display: flex; gap: .5rem; flex-shrink: 0; }
  .ro-stat-chip {
    text-align: center; background: var(--warm); border: 1px solid var(--line);
    padding: .5rem .875rem; min-width: 56px;
  }
  .ro-chip-val { font-family: 'Inter',sans-serif; font-size: 20px; font-weight: 500; color: var(--ink); line-height: 1; }
  .ro-chip-lbl { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; margin-top: 3px; }
`;
