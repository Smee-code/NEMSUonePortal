import { useEffect, useState } from 'react';
import api from '../../api/axios';

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: '#dbeafe', color: '#1e40af' },
  { bg: '#d1fae5', color: '#065f46' },
  { bg: '#fce7f3', color: '#9d174d' },
  { bg: '#ede9fe', color: '#5b21b6' },
  { bg: '#fef3c7', color: '#92400e' },
  { bg: '#e0f2fe', color: '#0c4a6e' },
  { bg: '#ffedd5', color: '#9a3412' },
];
function avatarColor(name) {
  const h = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const CSS = `
.fac-modal-backdrop{
  position:fixed;inset:0;background:rgba(0,0,0,0.5);
  display:flex;align-items:flex-start;justify-content:center;
  z-index:1000;padding:2rem 1rem;overflow-y:auto;
}
.fac-modal{
  background:#fff;border-radius:12px;
  width:100%;max-width:900px;
  box-shadow:0 12px 40px rgba(0,0,0,0.18);
  display:flex;flex-direction:column;overflow:hidden;
  max-height:calc(100vh - 4rem);
}
.fac-modal-header{
  display:flex;justify-content:space-between;align-items:flex-start;
  padding:1.25rem 1.5rem 1rem;border-bottom:1px solid var(--reg-line);
  flex-shrink:0;
}
.fac-modal-stats{
  display:flex;gap:.75rem;padding:1rem 1.5rem;
  background:var(--reg-warm);border-bottom:1px solid var(--reg-line);
  flex-wrap:wrap;flex-shrink:0;
}
.fac-stat-chip{
  background:#fff;border:1px solid var(--reg-line);border-radius:8px;
  padding:.5rem 1rem;text-align:center;
}
.fac-stat-chip-lbl{font-size:.72rem;color:var(--reg-muted);margin-bottom:2px}
.fac-modal-body{
  padding:1.25rem 1.5rem;overflow-y:auto;flex:1;
  display:flex;flex-direction:column;gap:.75rem;
}
.fac-term-block{border:1px solid var(--reg-line);border-radius:8px;overflow:hidden}
.fac-term-block.current{border-color:#2563eb}
.fac-term-header{
  width:100%;border:none;border-bottom:1px solid var(--reg-line);
  padding:.75rem 1rem;cursor:pointer;
  display:flex;justify-content:space-between;align-items:center;text-align:left;
}
.fac-term-header.current{background:var(--reg-cool-2)}
.fac-term-header:not(.current){background:var(--reg-warm)}
/* Department blocks */
.fac-dept-block{background:#fff;border:1px solid var(--reg-line);padding:1.5rem 1.25rem;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:4px;transition:border-color .15s,box-shadow .15s;font-family:inherit}
.fac-dept-block:hover{border-color:var(--reg-gold);box-shadow:0 6px 20px -12px rgba(10,22,40,.3)}
.fac-dept-ico{width:42px;height:42px;background:var(--reg-ink);color:#fff;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
.fac-dept-ico i{font-size:20px}
.fac-dept-name{font-size:15px;font-weight:600;color:var(--reg-ink);line-height:1.25}
.fac-dept-code{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--reg-gold);font-weight:600}
.fac-dept-count{font-size:12px;color:var(--reg-muted);margin-top:4px}
.fac-dept-bar{display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap}
.fac-dept-bar-title{font-size:18px;font-weight:600;color:var(--reg-ink)}
.fac-class-group{margin-bottom:1.75rem}
.fac-class-head{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--reg-gold);font-weight:700;padding-bottom:.5rem;margin-bottom:.75rem;border-bottom:1px solid var(--reg-line);display:flex;justify-content:space-between}
.fac-class-head span{color:var(--reg-muted)}
.fac-card{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--reg-line);padding:1rem;cursor:pointer;font-family:inherit;transition:border-color .15s}
.fac-card:hover{border-color:var(--reg-ink)}
.fac-card-name{font-size:14px;font-weight:600;color:var(--reg-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fac-card-sub{font-size:11px;color:var(--reg-muted);font-family:ui-monospace,monospace;margin-top:2px}
.fac-card-load{font-size:11px;color:var(--reg-faint);margin-top:3px}
`;

export default function RegistrarFaculty() {
  const [faculty,       setFaculty]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [selectedDept,  setSelectedDept]  = useState(null);   // department block opened

  const [selected,      setSelected]      = useState(null);
  const [detail,        setDetail]        = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError,   setDetailError]   = useState('');
  const [expandedTerms, setExpandedTerms] = useState({});

  useEffect(() => {
    api.get('/grades/registrar/faculty/')
      .then(res => setFaculty(res.data))
      .catch(() => setError('Failed to load faculty list.'))
      .finally(() => setLoading(false));
  }, []);

  function openDetail(f) {
    setSelected(f);
    setDetail(null);
    setDetailError('');
    setExpandedTerms({});
    setDetailLoading(true);
    api.get(`/grades/registrar/faculty/${f.id}/`)
      .then(res => {
        setDetail(res.data);
        const expanded = {};
        res.data.terms.forEach(t => { if (t.is_current) expanded[t.term_id] = true; });
        setExpandedTerms(expanded);
      })
      .catch(() => setDetailError('Failed to load faculty details.'))
      .finally(() => setDetailLoading(false));
  }

  function toggleTerm(termId) {
    setExpandedTerms(prev => ({ ...prev, [termId]: !prev[termId] }));
  }

  // Group faculty by department for the department-block view.
  const deptMap = {};
  faculty.forEach(f => {
    const code = f.department_code || 'UNASSIGNED';
    if (!deptMap[code]) deptMap[code] = { code, name: f.department_name || 'Unassigned', list: [] };
    deptMap[code].list.push(f);
  });
  const deptBlocks = Object.values(deptMap).sort((a, b) => a.code.localeCompare(b.code));

  // Faculty within the opened department, filtered by search and grouped by classification.
  const deptFaculty = (selectedDept ? deptMap[selectedDept.code]?.list ?? [] : []).filter(f => {
    const q = search.trim().toLowerCase();
    return !q || f.full_name.toLowerCase().includes(q) || (f.faculty_id || '').toLowerCase().includes(q);
  });
  const classGroups = {};
  deptFaculty.forEach(f => {
    const key = f.classification || 'Unclassified';
    (classGroups[key] = classGroups[key] || []).push(f);
  });
  // Core-program groups first, GEC and Unclassified last.
  const groupOrder = Object.keys(classGroups).sort((a, b) => {
    const rank = k => (k === 'GEC Faculty' ? 1 : k === 'Unclassified' ? 2 : 0);
    return rank(a) - rank(b) || a.localeCompare(b);
  });

  return (
    <>
      <style>{CSS}</style>

      {/* ── Page head ── */}
      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">Records · {deptBlocks.length} departments · {faculty.length} faculty</div>
          <h2>Faculty by <em>department</em></h2>
          <div className="sub">
            {selectedDept
              ? `Faculty of ${selectedDept.name}, grouped by their program (core faculty) or as GEC faculty.`
              : 'Open a department to see its faculty classified by program, or as GEC faculty.'}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--reg-red-tint)', color: 'var(--reg-red)', padding: '.75rem', marginBottom: '1rem', fontSize: '.9rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty"><i className="ti ti-loader" /><div className="t">Loading faculty…</div></div>
      ) : !selectedDept ? (
        deptBlocks.length === 0 ? (
          <div className="empty"><i className="ti ti-building" /><div className="t">No departments found.</div></div>
        ) : (
          <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {deptBlocks.map(d => (
              <button key={d.code} className="fac-dept-block" onClick={() => { setSelectedDept(d); setSearch(''); }}>
                <div className="fac-dept-ico"><i className="ti ti-building-bank" /></div>
                <div className="fac-dept-name">{d.name}</div>
                <div className="fac-dept-code">{d.code}</div>
                <div className="fac-dept-count">{d.list.length} faculty member{d.list.length !== 1 ? 's' : ''}</div>
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="fac-dept-bar">
            <button className="btn-sec" onClick={() => { setSelectedDept(null); setSearch(''); }}>
              <i className="ti ti-arrow-left" /> Departments
            </button>
            <div className="fac-dept-bar-title">{selectedDept.name}</div>
            <div className="toolbar-search" style={{ marginLeft: 'auto', maxWidth: 260 }}>
              <i className="ti ti-search" />
              <input placeholder="Search faculty…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {groupOrder.length === 0 ? (
            <div className="empty"><i className="ti ti-user-search" /><div className="t">No faculty match.</div></div>
          ) : groupOrder.map(group => (
            <div key={group} className="fac-class-group">
              <div className="fac-class-head">{group}<span>{classGroups[group].length}</span></div>
              <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {classGroups[group].map(f => {
                  const av = avatarColor(f.full_name);
                  return (
                    <button key={f.id} className="fac-card" onClick={() => openDetail(f)}>
                      <div className="avatar" style={{ width: 44, height: 44, fontSize: 13, background: av.bg, color: av.color, flexShrink: 0 }}>
                        {initials(f.full_name)}
                      </div>
                      <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                        <div className="fac-card-name">{f.full_name}</div>
                        <div className="fac-card-sub">{f.faculty_id || f.email}</div>
                        <div className="fac-card-load">{f.current_term_load} current · {f.total_assignments} all-time</div>
                      </div>
                      <i className="ti ti-chevron-right" style={{ color: 'var(--reg-faint)', flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
      {/* ── Faculty Detail Modal ── */}
      {selected && (
        <div className="fac-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="fac-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="fac-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  className="avatar"
                  style={{ width: 48, height: 48, fontSize: 14, background: avatarColor(selected.full_name).bg, color: avatarColor(selected.full_name).color, flexShrink: 0 }}
                >
                  {initials(selected.full_name)}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--reg-ink)', fontWeight: 700 }}>
                    {selected.full_name}
                  </h2>
                  <p style={{ margin: '.2rem 0 0', fontSize: '.85rem', color: 'var(--reg-muted)' }}>
                    {selected.faculty_id}
                    {selected.department_name && <> · {selected.department_name}</>}
                  </p>
                  <p style={{ margin: '.15rem 0 0', fontSize: '.82rem', color: 'var(--reg-faint)' }}>
                    {selected.email}
                  </p>
                </div>
              </div>
              <button
                className="btn-ghost"
                style={{ fontSize: '.85rem', padding: '.35rem .65rem' }}
                onClick={() => setSelected(null)}
              >
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Stats */}
            {detail && (
              <div className="fac-modal-stats">
                <div className="fac-stat-chip">
                  <div className="fac-stat-chip-lbl">Current load</div>
                  <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--reg-green)' }}>
                    {selected.current_term_load} subject{selected.current_term_load !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="fac-stat-chip">
                  <div className="fac-stat-chip-lbl">Total (all terms)</div>
                  <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--reg-cool)' }}>
                    {selected.total_assignments} subject{selected.total_assignments !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="fac-stat-chip">
                  <div className="fac-stat-chip-lbl">Terms on record</div>
                  <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--reg-ink)' }}>
                    {detail.terms.length}
                  </div>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="fac-modal-body">
              {detailLoading && (
                <p style={{ color: 'var(--reg-muted)' }}>Loading teaching history…</p>
              )}
              {detailError && (
                <div style={{ background: 'var(--reg-red-tint)', color: 'var(--reg-red)', padding: '.75rem', borderRadius: 6, fontSize: '.9rem' }}>
                  {detailError}
                </div>
              )}

              {detail && detail.terms.length === 0 && (
                <p style={{ color: 'var(--reg-muted)', fontSize: '.9rem' }}>
                  No teaching assignments found for this faculty member.
                </p>
              )}

              {detail && detail.terms.filter(t => t.is_current).map(term => (
                <div key={term.term_id} className={`fac-term-block${term.is_current ? ' current' : ''}`}>
                  <button
                    className={`fac-term-header${term.is_current ? ' current' : ''}`}
                    onClick={() => toggleTerm(term.term_id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      {term.is_current && (
                        <span className="tag approved" style={{ fontSize: '.68rem', padding: '1px 8px' }}>Current</span>
                      )}
                      <span style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--reg-ink)' }}>
                        {term.term_display}
                      </span>
                      <span style={{ color: 'var(--reg-muted)', fontSize: '.82rem' }}>
                        {term.assignments.length} subject{term.assignments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span style={{ color: 'var(--reg-faint)', fontSize: '.9rem' }}>
                      {expandedTerms[term.term_id] ? '^' : 'v'}
                    </span>
                  </button>

                  {expandedTerms[term.term_id] && (
                    <div style={{ overflowX: 'auto', maxHeight: 380 }}>
                      <table className="table">
                        <thead>
                          <tr>
                            {['Subject Code', 'Subject Name', 'Units', 'Year Level', 'Type', 'Students', 'Grades', 'Schedule'].map(h => (
                              <th key={h} style={{ position: 'sticky', top: 0, zIndex: 1 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {term.assignments.map(a => (
                            <tr key={a.id}>
                              <td style={{ fontWeight: 700, color: 'var(--reg-cool)', whiteSpace: 'nowrap' }}>
                                {a.subject_code}
                              </td>
                              <td style={{ fontSize: '.85rem' }}>{a.subject_name}</td>
                              <td style={{ textAlign: 'center', fontSize: '.85rem' }}>{a.subject_units}</td>
                              <td style={{ fontSize: '.82rem', whiteSpace: 'nowrap', color: 'var(--reg-muted)' }}>
                                {a.year_level_display || '-'}
                              </td>
                              <td>
                                <span className={`tag ${a.subject_type === 'major' ? 'pending' : 'outline'}`}>
                                  {a.subject_type_display}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  background: a.student_count > 0 ? '#eff6ff' : '#f9fafb',
                                  color: a.student_count > 0 ? '#1e40af' : 'var(--reg-faint)',
                                  borderRadius: 20, padding: '1px 9px',
                                  fontWeight: 700, fontSize: '.8rem',
                                }}>
                                  {a.student_count}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', fontSize: '.82rem' }}>
                                {a.grades_submitted > 0 ? (
                                  <span style={{ color: 'var(--reg-green)', fontWeight: 600 }}>
                                    {a.grades_submitted} submitted
                                  </span>
                                ) : a.grades_encoded > 0 ? (
                                  <span style={{ color: 'var(--reg-amber)' }}>
                                    {a.grades_encoded} encoded
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--reg-faint)' }}>-</span>
                                )}
                              </td>
                              <td style={{ fontSize: '.82rem', whiteSpace: 'nowrap', color: 'var(--reg-ink-2)' }}>
                                {a.schedule ? (
                                  <>
                                    <div style={{ fontWeight: 600 }}>{a.schedule.day}</div>
                                    <div style={{ color: 'var(--reg-muted)' }}>
                                      {a.schedule.start_time} – {a.schedule.end_time}
                                    </div>
                                    <div style={{ color: 'var(--reg-faint)' }}>{a.schedule.room}</div>
                                  </>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
