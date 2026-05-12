import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function RegistrarFaculty() {
  const { user, logout } = useAuth();

  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const [selected, setSelected] = useState(null);   // faculty object from list
  const [detail, setDetail] = useState(null);        // full detail from API
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
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
        // Auto-expand current terms
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

  const depts = [...new Set(faculty.map(f => f.department_code).filter(Boolean))].sort();

  const filtered = faculty.filter(f => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      f.full_name.toLowerCase().includes(q) ||
      (f.faculty_id || '').toLowerCase().includes(q) ||
      (f.email || '').toLowerCase().includes(q);
    const matchDept = !filterDept || f.department_code === filterDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link" to="/registrar/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/registrar/enrollment">Enrollment Requests</Link>
        <Link className="sidebar-link" to="/registrar/grades">List of Students</Link>
        <Link className="sidebar-link active" to="/registrar/faculty">Faculty</Link>
        <Link className="sidebar-link" to="/registrar/schedule">Class Schedules</Link>
        <Link className="sidebar-link" to="/registrar/documents">Document Requests</Link>
        <Link className="sidebar-link" to="/registrar/academic-data">Academic Data</Link>
        <Link className="sidebar-link" to="/registrar/announcements">Announcements</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Faculty</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={styles.filterLabel}>Search</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name, ID, or email"
              style={{ ...styles.filterInput, minWidth: 220 }}
            />
          </div>
          <div>
            <label style={styles.filterLabel}>Department</label>
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              style={styles.filterInput}
            >
              <option value="">All Departments</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {error && <div style={styles.alertError}>{error}</div>}

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading faculty...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No faculty found.</p>
        ) : (
          <>
            <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.75rem' }}>
              {filtered.length} faculty member{filtered.length !== 1 ? 's' : ''}
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Faculty ID', 'Name', 'Email', 'Department', 'Current Load', 'All-Time', ''].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => (
                    <tr key={f.id} style={{ background: '#fff', cursor: 'pointer' }}
                      onClick={() => openDetail(f)}>
                      <td style={styles.td}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#374151' }}>
                          {f.faculty_id}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: 600, color: '#1f2937' }}>
                        {f.full_name}
                      </td>
                      <td style={{ ...styles.td, color: '#6b7280', fontSize: '0.85rem' }}>
                        {f.email}
                      </td>
                      <td style={styles.td}>
                        {f.department_code ? (
                          <span style={styles.deptPill}>{f.department_code}</span>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.82rem' }}> - </span>
                        )}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={{
                          background: f.current_term_load > 0 ? '#d1fae5' : '#f3f4f6',
                          color: f.current_term_load > 0 ? '#065f46' : '#9ca3af',
                          borderRadius: 20, padding: '2px 10px',
                          fontWeight: 700, fontSize: '0.82rem',
                        }}>
                          {f.current_term_load} subject{f.current_term_load !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
                        {f.total_assignments}
                      </td>
                      <td style={styles.td}>
                        <button style={styles.btnView} onClick={e => { e.stopPropagation(); openDetail(f); }}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Detail Modal */}
        {selected && (
          <div style={styles.modalBackdrop} onClick={() => setSelected(null)}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>

              {/* Modal header */}
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#1e3a5f' }}>
                    {selected.full_name}
                  </h2>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                    {selected.faculty_id}
                    {selected.department_name && <> &middot; {selected.department_name}</>}
                  </p>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: '#9ca3af' }}>
                    {selected.email}
                  </p>
                </div>
                <button style={styles.btnClose} onClick={() => setSelected(null)}>x</button>
              </div>

              {/* Stats bar */}
              {detail && (
                <div style={styles.statsBar}>
                  <StatChip label="Current Load" value={`${selected.current_term_load} subject${selected.current_term_load !== 1 ? 's' : ''}`} color="#065f46" bg="#d1fae5" />
                  <StatChip label="Total (All Terms)" value={`${selected.total_assignments} subject${selected.total_assignments !== 1 ? 's' : ''}`} color="#1e40af" bg="#dbeafe" />
                  <StatChip label="Terms" value={`${detail.terms.length}`} color="#374151" bg="#f3f4f6" />
                </div>
              )}

              <div style={styles.modalBody}>
                {detailLoading && <p style={{ color: '#6b7280' }}>Loading teaching history...</p>}
                {detailError && <div style={styles.alertError}>{detailError}</div>}

                {detail && detail.terms.length === 0 && (
                  <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    No teaching assignments found for this faculty member.
                  </p>
                )}

                {detail && detail.terms.filter(t => t.is_current).map(term => (
                  <div key={term.term_id} style={{
                    ...styles.termBlock,
                    borderColor: term.is_current ? '#2563eb' : '#e5e7eb',
                  }}>
                    {/* Term header */}
                    <button
                      style={styles.termHeader(term.is_current)}
                      onClick={() => toggleTerm(term.term_id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {term.is_current && (
                          <span style={styles.currentPill}>Current</span>
                        )}
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1f2937' }}>
                          {term.term_display}
                        </span>
                        <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>
                          {term.assignments.length} subject{term.assignments.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                        {expandedTerms[term.term_id] ? '^' : 'v'}
                      </span>
                    </button>

                    {/* Assignments table */}
                    {expandedTerms[term.term_id] && (
                      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 380 }}>
                        <table style={{ ...styles.table, marginTop: 0 }}>
                          <thead>
                            <tr>
                              {['Subject Code', 'Subject Name', 'Units', 'Year Level', 'Type', 'Students', 'Grades', 'Schedule'].map(h => (
                                <th key={h} style={{ ...styles.th, position: 'sticky', top: 0, zIndex: 1 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {term.assignments.map(a => (
                              <tr key={a.id} style={{ background: '#fff' }}>
                                <td style={{ ...styles.td, fontWeight: 700, color: '#1e3a5f', whiteSpace: 'nowrap' }}>
                                  {a.subject_code}
                                </td>
                                <td style={{ ...styles.td, fontSize: '0.85rem' }}>
                                  {a.subject_name}
                                </td>
                                <td style={{ ...styles.td, textAlign: 'center', fontSize: '0.85rem' }}>
                                  {a.subject_units}
                                </td>
                                <td style={{ ...styles.td, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                  {a.year_level_display || ' - '}
                                </td>
                                <td style={styles.td}>
                                  <span style={a.subject_type === 'major' ? styles.majorPill : styles.minorPill}>
                                    {a.subject_type_display}
                                  </span>
                                </td>
                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                  <span style={{
                                    background: a.student_count > 0 ? '#eff6ff' : '#f9fafb',
                                    color: a.student_count > 0 ? '#1e40af' : '#9ca3af',
                                    borderRadius: 20, padding: '1px 9px',
                                    fontWeight: 700, fontSize: '0.8rem',
                                  }}>
                                    {a.student_count}
                                  </span>
                                </td>
                                <td style={{ ...styles.td, textAlign: 'center', fontSize: '0.82rem' }}>
                                  {a.grades_submitted > 0 ? (
                                    <span style={{ color: '#065f46', fontWeight: 600 }}>
                                      {a.grades_submitted} submitted
                                    </span>
                                  ) : a.grades_encoded > 0 ? (
                                    <span style={{ color: '#92400e' }}>
                                      {a.grades_encoded} encoded
                                    </span>
                                  ) : (
                                    <span style={{ color: '#9ca3af' }}> - </span>
                                  )}
                                </td>
                                <td style={{ ...styles.td, fontSize: '0.82rem', whiteSpace: 'nowrap', color: '#374151' }}>
                                  {a.schedule ? (
                                    <>
                                      <div style={{ fontWeight: 600 }}>{a.schedule.day}</div>
                                      <div style={{ color: '#6b7280' }}>
                                        {a.schedule.start_time} - {a.schedule.end_time}
                                      </div>
                                      <div style={{ color: '#9ca3af' }}>{a.schedule.room}</div>
                                    </>
                                  ) : ' - '}
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
      </main>
    </div>
  );
}

function StatChip({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 8, padding: '0.5rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: '0.92rem', color }}>{value}</div>
    </div>
  );
}

const styles = {
  filterLabel: {
    display: 'block', fontSize: '0.8rem', fontWeight: 600,
    color: '#6b7280', marginBottom: '0.25rem',
  },
  filterInput: {
    padding: '0.4rem 0.75rem', borderRadius: 6,
    border: '1px solid #d1d5db', fontSize: '0.9rem',
  },
  alertError: {
    background: '#fee2e2', color: '#991b1b', padding: '0.75rem',
    borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' },
  th: {
    textAlign: 'left', padding: '0.5rem 0.75rem',
    background: '#f9fafb', borderBottom: '2px solid #e5e7eb',
    fontWeight: 600, color: '#374151', fontSize: '0.8rem',
    whiteSpace: 'nowrap',
  },
  td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6', color: '#1f2937', verticalAlign: 'top' },
  deptPill: {
    background: '#eff6ff', color: '#1e40af', borderRadius: 4,
    padding: '2px 8px', fontWeight: 700, fontSize: '0.78rem',
  },
  btnView: {
    background: '#1e3a5f', color: '#fff', border: 'none',
    padding: '0.3rem 0.75rem', borderRadius: 4, cursor: 'pointer',
    fontSize: '0.8rem', fontWeight: 600,
  },
  modalBackdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    zIndex: 1000, padding: '2rem 1rem',
  },
  modal: {
    background: '#fff', borderRadius: 12,
    width: '100%', maxWidth: 900,
    maxHeight: 'calc(100vh - 4rem)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '1.25rem 1.5rem 1rem',
    borderBottom: '1px solid #e5e7eb',
  },
  statsBar: {
    display: 'flex', gap: '0.75rem', padding: '1rem 1.5rem',
    background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
    flexWrap: 'wrap',
  },
  modalBody: {
    padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1,
    display: 'flex', flexDirection: 'column', gap: '0.75rem',
  },
  btnClose: {
    background: 'none', border: '1px solid #e5e7eb', borderRadius: 6,
    padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.9rem',
    color: '#6b7280', lineHeight: 1,
  },
  termBlock: {
    border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden',
  },
  termHeader: (isCurrent) => ({
    width: '100%', background: isCurrent ? '#eff6ff' : '#f9fafb',
    border: 'none', borderBottom: '1px solid #e5e7eb',
    padding: '0.75rem 1rem', cursor: 'pointer',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    textAlign: 'left',
  }),
  currentPill: {
    background: '#2563eb', color: '#fff', borderRadius: 20,
    padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700,
  },
  majorPill: {
    background: '#fef3c7', color: '#92400e', borderRadius: 4,
    padding: '1px 7px', fontSize: '0.75rem', fontWeight: 600,
  },
  minorPill: {
    background: '#f3f4f6', color: '#6b7280', borderRadius: 4,
    padding: '1px 7px', fontSize: '0.75rem', fontWeight: 600,
  },
};

