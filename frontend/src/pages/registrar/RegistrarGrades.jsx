import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 20;

const YEAR_LEVELS = [
  { value: '', label: 'All Year Levels' },
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
];

export default function RegistrarGrades() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents]   = useState([]);
  const [totalCount, setTotal]    = useState(0);
  const [programs, setPrograms]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterYear, setFilterYear]       = useState('');
  const [offset, setOffset]       = useState(0);

  // load program list for filter dropdown
  useEffect(() => {
    api.get('/enrollment/programs/').then(res => setPrograms(res.data)).catch(() => {});
  }, []);

  // fetch whenever filters or page changes
  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
    if (search)        params.append('search',     search);
    if (filterProgram) params.append('program',    filterProgram);
    if (filterYear)    params.append('year_level', filterYear);

    api.get(`/auth/registrar/students/?${params}`)
      .then(res => {
        setStudents(res.data.results ?? res.data);
        setTotal(res.data.count ?? (res.data.results ?? res.data).length);
      })
      .catch(() => setError('Failed to load student list.'))
      .finally(() => setLoading(false));
  }, [search, filterProgram, filterYear, offset]);

  function handleSearch(e) {
    e.preventDefault();
    setOffset(0);
    setSearch(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput('');
    setSearch('');
    setOffset(0);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  function goToPage(p) {
    setOffset((p - 1) * PAGE_SIZE);
  }

  function buildPageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
    if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '…', current - 1, current, current + 1, '…', total];
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="NEMSU" className="sidebar-logo" />
          NEMSUonePortal
        </div>
        <Link className="sidebar-link" to="/registrar/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/registrar/enrollment">Enrollment Requests</Link>
        <Link className="sidebar-link active" to="/registrar/grades">List of Students</Link>
        <Link className="sidebar-link" to="/registrar/faculty">Faculty</Link>
        <Link className="sidebar-link" to="/registrar/schedule">Class Schedules</Link>
        <Link className="sidebar-link" to="/registrar/documents">Document Requests</Link>
        <Link className="sidebar-link" to="/registrar/academic-data">Academic Data</Link>
        <Link className="sidebar-link" to="/registrar/announcements">Announcements</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>List of Students</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {/* ── Filters ── */}
        <div style={styles.filterRow}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div>
              <label style={styles.filterLabel}>Search</label>
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Name or Student ID"
                style={{ ...styles.filterInput, minWidth: 220 }}
              />
            </div>
            <button type="submit" style={styles.btnSearch}>Search</button>
            {search && (
              <button type="button" onClick={clearSearch} style={styles.btnClear}>Clear</button>
            )}
          </form>

          <div>
            <label style={styles.filterLabel}>Program</label>
            <select
              value={filterProgram}
              onChange={e => { setFilterProgram(e.target.value); setOffset(0); }}
              style={styles.filterSelect}
            >
              <option value="">All Programs</option>
              {programs.map(p => (
                <option key={p.id} value={p.code}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.filterLabel}>Year Level</label>
            <select
              value={filterYear}
              onChange={e => { setFilterYear(e.target.value); setOffset(0); }}
              style={styles.filterSelect}
            >
              {YEAR_LEVELS.map(y => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div style={styles.alertError}>{error}</div>}

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading students…</p>
        ) : students.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No students match the selected filters.</p>
        ) : (
          <>
            <p style={styles.countLine}>
              {totalCount} student{totalCount !== 1 ? 's' : ''}
              {(search || filterProgram || filterYear) && ' matching filters'}
              {totalPages > 1 && ` — page ${currentPage} of ${totalPages}`}
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Student ID', 'Name', 'Department', 'Program', 'Year Level'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr
                      key={s.id}
                      style={styles.row}
                      onClick={() => navigate(`/registrar/grades/student/${s.id}`)}
                      title="Click to view grade history"
                    >
                      <td style={styles.td}>
                        <span style={styles.idChip}>{s.student_id}</span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: 600, color: '#1e3a5f' }}>
                        {s.full_name}
                      </td>
                      <td style={{ ...styles.td, color: '#6b7280', fontSize: '0.85rem' }}>
                        {s.department_name ?? '—'}
                      </td>
                      <td style={styles.td}>
                        {s.program_code
                          ? <span style={styles.programChip}>{s.program_code}</span>
                          : '—'}
                        {s.program_name && (
                          <span style={{ marginLeft: 6, color: '#6b7280', fontSize: '0.82rem' }}>
                            {s.program_name}
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {s.year_level_display
                          ? <span style={styles.yearChip}>{s.year_level_display}</span>
                          : <span style={{ color: '#9ca3af' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={styles.pageBtn(false, currentPage === 1)}
                >← Prev</button>

                {buildPageNumbers(currentPage, totalPages).map((item, i) =>
                  item === '…'
                    ? <span key={`e${i}`} style={styles.ellipsis}>…</span>
                    : <button
                        key={item}
                        onClick={() => goToPage(item)}
                        style={styles.pageBtn(item === currentPage, false)}
                      >{item}</button>
                )}

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={styles.pageBtn(false, currentPage === totalPages)}
                >Next →</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const styles = {
  filterRow: {
    display: 'flex', gap: '1rem', marginBottom: '1.5rem',
    flexWrap: 'wrap', alignItems: 'flex-end',
  },
  filterLabel: {
    display: 'block', fontSize: '0.8rem', fontWeight: 600,
    color: '#6b7280', marginBottom: '0.25rem',
  },
  filterInput: {
    padding: '0.4rem 0.75rem', borderRadius: 6,
    border: '1px solid #d1d5db', fontSize: '0.9rem',
  },
  filterSelect: {
    padding: '0.4rem 0.75rem', borderRadius: 6,
    border: '1px solid #d1d5db', fontSize: '0.9rem',
  },
  btnSearch: {
    background: '#1e3a5f', color: '#fff', border: 'none',
    padding: '0.4rem 1rem', borderRadius: 6, cursor: 'pointer',
    fontSize: '0.9rem', fontWeight: 600,
  },
  btnClear: {
    background: 'none', border: '1px solid #d1d5db',
    padding: '0.4rem 0.75rem', borderRadius: 6, cursor: 'pointer',
    fontSize: '0.85rem', color: '#374151',
  },
  alertError: {
    background: '#fee2e2', color: '#991b1b', padding: '0.75rem',
    borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem',
  },
  countLine: { fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.75rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' },
  th: {
    textAlign: 'left', padding: '0.5rem 0.75rem',
    background: '#f9fafb', borderBottom: '2px solid #e5e7eb',
    fontWeight: 600, color: '#374151', fontSize: '0.82rem',
  },
  row: { cursor: 'pointer', transition: 'background 0.1s' },
  td: { padding: '0.6rem 0.75rem', borderBottom: '1px solid #f3f4f6', color: '#1f2937' },
  idChip: {
    background: '#f3f4f6', color: '#374151', fontWeight: 600,
    padding: '0.15rem 0.55rem', borderRadius: 20, fontSize: '0.82rem',
  },
  programChip: {
    background: '#eff6ff', color: '#1d4ed8', fontWeight: 700,
    padding: '0.15rem 0.55rem', borderRadius: 20, fontSize: '0.8rem',
  },
  yearChip: {
    background: '#f0fdf4', color: '#166534', fontWeight: 600,
    padding: '0.15rem 0.55rem', borderRadius: 20, fontSize: '0.8rem',
  },
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
};
