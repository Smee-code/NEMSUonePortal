import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAdminShell } from '../../context/AdminShellContext';

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default function AdminFacultyLoad() {
  const { toast, openDrawer } = useAdminShell();

  const [terms,        setTerms]        = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [subjects,     setSubjects]     = useState([]);
  const [assignments,  setAssignments]  = useState([]);
  const [facultyList,  setFacultyList]  = useState([]);

  const [loading,     setLoading]     = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error,       setError]       = useState('');

  const [assigningCode,    setAssigningCode]    = useState(null);
  const [selectedFaculty,  setSelectedFaculty]  = useState({});
  const [saving,           setSaving]           = useState(false);
  const [deletingId,       setDeletingId]       = useState(null);
  const [search,           setSearch]           = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/enrollment/admin/terms/'),
      api.get('/grades/registrar/faculty/'),
    ])
      .then(([termsRes, facultyRes]) => {
        const termsList = Array.isArray(termsRes.data) ? termsRes.data : (termsRes.data.results ?? []);
        setTerms(termsList);
        setFacultyList(facultyRes.data ?? []);
        setSelectedTerm(termsList.find(t => t.is_active) ?? termsList[0] ?? null);
      })
      .catch(() => setError('Failed to load data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedTerm) return;
    setDataLoading(true);
    setAssigningCode(null);
    Promise.all([
      api.get('/enrollment/admin/subjects/'),
      api.get(`/grades/admin/assignments/?term=${selectedTerm.id}`),
    ])
      .then(([subjectsRes, assignmentsRes]) => {
        const allSubjects = (Array.isArray(subjectsRes.data) ? subjectsRes.data : (subjectsRes.data.results ?? []))
          .filter(s => s.is_active && s.semester === selectedTerm.semester);
        setSubjects(allSubjects);
        setAssignments(Array.isArray(assignmentsRes.data) ? assignmentsRes.data : (assignmentsRes.data.results ?? []));
      })
      .catch(() => setError('Failed to load subjects or assignments.'))
      .finally(() => setDataLoading(false));
  }, [selectedTerm]);

  const assignmentMap = {};
  for (const a of assignments) {
    if (!assignmentMap[a.subject_code]) assignmentMap[a.subject_code] = a;
  }

  const sq = search.trim().toLowerCase();
  const unassigned = subjects.filter(s => !assignmentMap[s.code] && (!sq || s.code.toLowerCase().includes(sq) || s.name.toLowerCase().includes(sq)));
  const assigned   = subjects.filter(s =>  assignmentMap[s.code]);

  // Group assigned subjects by faculty
  const facultyGroups = {};
  for (const s of assigned) {
    const asgn = assignmentMap[s.code];
    const fname = asgn.faculty_name;
    if (!sq || s.code.toLowerCase().includes(sq) || s.name.toLowerCase().includes(sq) || fname.toLowerCase().includes(sq)) {
      if (!facultyGroups[fname]) {
        const fac = facultyList.find(f => f.full_name === fname);
        facultyGroups[fname] = { name: fname, fac, subjects: [] };
      }
      facultyGroups[fname].subjects.push({ ...s, asgn });
    }
  }
  const facultyEntries = Object.values(facultyGroups);

  async function assignFaculty(subject) {
    const facultyId = selectedFaculty[subject.code];
    if (!facultyId) { setError('Select a faculty member first.'); return; }
    setSaving(true);
    try {
      await api.post('/grades/admin/assignments/', {
        faculty_id: facultyId, subject_id: subject.id, academic_term_id: selectedTerm.id,
      });
      const msg = `Assigned faculty to ${subject.code}.`;
      toast(msg, { type: 'success' });
      setAssigningCode(null);
      const res = await api.get(`/grades/admin/assignments/?term=${selectedTerm.id}`);
      setAssignments(Array.isArray(res.data) ? res.data : (res.data.results ?? []));
    } catch (err) {
      const data = err.response?.data;
      setError(
        (Array.isArray(data) ? data[0] : data?.non_field_errors?.[0] || data?.error || data?.detail)
        || 'Failed to assign faculty.'
      );
    } finally { setSaving(false); }
  }

  async function removeAssignment(assignment) {
    if (!window.confirm(`Remove ${assignment.faculty_name} from ${assignment.subject_code}?`)) return;
    setDeletingId(assignment.id);
    try {
      await api.delete(`/grades/admin/assignments/${assignment.id}/`);
      const msg = `Removed ${assignment.faculty_name} from ${assignment.subject_code}.`;
      toast(msg, { type: 'success' });
      const res = await api.get(`/grades/admin/assignments/?term=${selectedTerm.id}`);
      setAssignments(Array.isArray(res.data) ? res.data : (res.data.results ?? []));
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to remove assignment.');
    } finally { setDeletingId(null); }
  }

  async function reassign(assignment) {
    await removeAssignment(assignment);
    setAssigningCode(assignment.subject_code);
  }

  if (loading) return <p style={{ color: 'var(--adm-muted)', marginTop: '2rem', fontSize: 13 }}>Loading…</p>;

  const totalUnits = (g) => g.subjects.reduce((s, x) => s + parseFloat(x.units || 0), 0);

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">
            {selectedTerm ? `${selectedTerm.semester_display} · ${selectedTerm.year}` : 'No active term'}
          </div>
          <h2>Faculty <em>load</em></h2>
          <div className="sub">Assign faculty members to subjects for the active term and review their current teaching load.</div>
        </div>
        <div className="actions">
          <button className="btn-sec" onClick={() => toast('Faculty load exported', { sub: 'CSV download started', type: 'success' })}>
            <i className="ti ti-file-export" /> Export load
          </button>
          <button className="btn-pri" onClick={() => toast('Select a subject below and click Assign Faculty to get started.')}>
            <i className="ti ti-plus" /> Assign subject
          </button>
        </div>
      </div>

      {error && <div className="fl-flash fl-flash-err" onClick={() => setError('')}>{error}</div>}

      <div className="toolbar">
        <span className="label">Term</span>
        <select
          value={selectedTerm?.id ?? ''}
          onChange={e => setSelectedTerm(terms.find(x => x.id === parseInt(e.target.value)) ?? null)}
        >
          {terms.map(t => (
            <option key={t.id} value={t.id}>
              {t.semester_display} {t.year}{t.is_active ? ' (Active)' : ''}
            </option>
          ))}
        </select>
        <div className="toolbar-search" style={{ marginLeft: '.25rem' }}>
          <i className="ti ti-search" />
          <input
            placeholder="Search faculty or subject…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {selectedTerm && !dataLoading && (
          <span style={{ fontSize: 12, color: 'var(--adm-muted)', marginLeft: '.25rem' }}>
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} · {unassigned.length} unassigned
          </span>
        )}
      </div>

      {!selectedTerm ? (
        <div className="empty-state">
          <i className="ti ti-calendar" />
          <div className="t">No academic terms</div>
          <div className="d">Create an academic term first before assigning faculty loads.</div>
        </div>
      ) : dataLoading ? (
        <p style={{ color: 'var(--adm-muted)', fontSize: 13 }}>Loading subjects and assignments…</p>
      ) : (
        <>
          {/* ── Assigned — grouped by faculty ── */}
          {facultyEntries.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {facultyEntries.map(g => {
                const units = totalUnits(g);
                const fac   = g.fac;
                return (
                  <div key={g.name} className="info-section" style={{ marginBottom: 0 }}>
                    <div className="info-section-head" style={{ background: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div className="avatar">{initials(g.name)}</div>
                        <div>
                          <div className="fl-faculty-name">{g.name}</div>
                          <div className="fl-faculty-dept">
                            {fac?.department_code ? `${fac.department_code}` : 'Faculty'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div className="fl-count-num">{g.subjects.length}</div>
                          <div className="fl-count-lbl">Subjects</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="fl-count-num">{units % 1 === 0 ? units : units.toFixed(2)}</div>
                          <div className="fl-count-lbl">Units</div>
                        </div>
                      </div>
                    </div>
                    <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: 90 }}>Code</th>
                          <th>Subject</th>
                          <th style={{ width: 70 }}>Units</th>
                          <th style={{ width: 100 }}>Year level</th>
                          <th style={{ width: 120 }}>Status</th>
                          <th style={{ width: 100 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.subjects.map(s => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 500, color: 'var(--adm-ink-2)' }}>{s.code}</td>
                            <td>{s.name}</td>
                            <td className="num">{s.units}</td>
                            <td className="muted">{s.year_level_display ?? '-'}</td>
                            <td><span className="tag status-active">Assigned</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  className="fl-btn-sm fl-btn-reassign"
                                  disabled={deletingId === s.asgn.id}
                                  onClick={() => reassign(s.asgn)}
                                >
                                  Reassign
                                </button>
                                <button
                                  className="fl-btn-sm fl-btn-remove"
                                  disabled={deletingId === s.asgn.id}
                                  onClick={() => removeAssignment(s.asgn)}
                                >
                                  {deletingId === s.asgn.id ? '…' : 'Remove'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Unassigned subjects ── */}
          {unassigned.length > 0 && (
            <div className="info-section">
              <div className="info-section-head">
                <h4>Unassigned subjects <span className="fl-badge">{unassigned.length}</span></h4>
                <span style={{ fontSize: 12, color: 'var(--adm-muted)' }}>Click "Assign" to assign a faculty member</span>
              </div>
              <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Code</th>
                    <th>Subject</th>
                    <th style={{ width: 70 }}>Units</th>
                    <th style={{ width: 100 }}>Year level</th>
                    <th>Assign faculty</th>
                  </tr>
                </thead>
                <tbody>
                  {unassigned.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500, color: 'var(--adm-ink-2)' }}>{s.code}</td>
                      <td>{s.name}</td>
                      <td className="num">{s.units}</td>
                      <td className="muted">{s.year_level_display ?? '-'}</td>
                      <td>
                        {assigningCode === s.code ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <select
                              className="fl-faculty-select"
                              value={selectedFaculty[s.code] ?? ''}
                              onChange={e => setSelectedFaculty(prev => ({ ...prev, [s.code]: e.target.value }))}
                            >
                              <option value="">Select faculty</option>
                              {facultyList.map(f => (
                                <option key={f.id} value={f.id}>
                                  {f.full_name}{f.department_code ? ` (${f.department_code})` : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn-pri"
                              style={{ padding: '6px 12px', fontSize: 11 }}
                              disabled={saving || !selectedFaculty[s.code]}
                              onClick={() => assignFaculty(s)}
                            >
                              {saving ? '…' : 'Confirm'}
                            </button>
                            <button
                              className="btn-sec"
                              style={{ padding: '6px 10px', fontSize: 11 }}
                              onClick={() => setAssigningCode(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-pri"
                            style={{ padding: '6px 12px', fontSize: 11 }}
                            onClick={() => { setAssigningCode(s.code); setSelectedFaculty(prev => ({ ...prev, [s.code]: '' })); }}
                          >
                            Assign
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {subjects.length === 0 && (
            <div className="empty-state">
              <i className="ti ti-briefcase" />
              <div className="t">No subjects this semester</div>
              <div className="d">No active subjects found for the {selectedTerm.semester_display} semester. Add subjects in Programs &amp; Curriculum first.</div>
            </div>
          )}
        </>
      )}
    </>
  );
}

const CSS = `
  .fl-flash{padding:10px 16px;margin-bottom:1rem;font-size:13px;cursor:pointer}
  .fl-flash-ok{background:#e6f1ec;color:var(--adm-green)}
  .fl-flash-err{background:#f6e8e4;color:var(--adm-red)}
  .fl-faculty-name{font-family:'Inter',-apple-system,sans-serif;font-weight:500;font-size:18px;color:var(--adm-ink);letter-spacing:-.005em}
  .fl-faculty-dept{font-size:11px;color:var(--adm-muted);margin-top:2px}
  .fl-count-num{font-family:'Inter',-apple-system,sans-serif;font-weight:500;font-size:20px;color:var(--adm-ink)}
  .fl-count-lbl{font-size:10px;color:var(--adm-muted);text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-top:2px}
  .fl-badge{display:inline-flex;align-items:center;justify-content:center;background:var(--adm-amber-tint);color:var(--adm-amber);font-size:10px;font-weight:700;padding:2px 8px;margin-left:8px;letter-spacing:.06em}
  .fl-faculty-select{padding:6px 10px;border:1px solid var(--adm-line);background:#fff;font:13px/1.4 'Inter',sans-serif;color:var(--adm-ink);min-width:200px}
  .fl-btn-sm{padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;letter-spacing:.04em;border:1px solid var(--adm-line);background:#fff;font-family:inherit}
  .fl-btn-reassign{color:var(--adm-ink-2);border-color:#bae6fd;background:#e0f2fe}
  .fl-btn-remove{color:var(--adm-red);border-color:#fecaca;background:#fee2e2}
  .fl-btn-sm:disabled{opacity:.5;cursor:not-allowed}
`;
