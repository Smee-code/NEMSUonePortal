import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const PAGE_SIZE = 20;

const YEAR_LABELS = {
  1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year', 5: '5th Year',
};

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default function RegistrarGrades() {
  const navigate = useNavigate();

  const [students,    setStudents]    = useState([]);
  const [totalCount,  setTotal]       = useState(0);
  const [programs,    setPrograms]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  const [search,        setSearch]        = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterYear,    setFilterYear]    = useState('');
  const [offset,        setOffset]        = useState(0);

  useEffect(() => {
    api.get('/enrollment/programs/').then(res => setPrograms(res.data)).catch(() => {});
  }, []);

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

  const totalPages  = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  function goToPage(p) { setOffset((p - 1) * PAGE_SIZE); }

  function buildPageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
    if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '…', current - 1, current, current + 1, '…', total];
  }

  return (
    <>
      {/* ── Page head ── */}
      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">Records · {totalCount.toLocaleString()} students</div>
          <h2>Grade <em>records</em></h2>
          <div className="sub">
            Search for any student and view their complete grade history across all academic terms.
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="toolbar">
        <div className="toolbar-search">
          <i className="ti ti-search" />
          <input
            placeholder="Search by name or student ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setOffset(0); }}
          />
        </div>
        <select
          value={filterProgram}
          onChange={e => { setFilterProgram(e.target.value); setOffset(0); }}
        >
          <option value="">All programs</option>
          {programs.map(p => (
            <option key={p.id} value={p.code}>{p.code} - {p.name}</option>
          ))}
        </select>
        <select
          value={filterYear}
          onChange={e => { setFilterYear(e.target.value); setOffset(0); }}
        >
          <option value="">All year levels</option>
          {[1, 2, 3, 4].map(y => (
            <option key={y} value={y}>{YEAR_LABELS[y]}</option>
          ))}
        </select>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: 'var(--reg-red-tint)', color: 'var(--reg-red)', padding: '.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '.88rem' }}>
          {error}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="empty">
          <i className="ti ti-loader" />
          <div className="t">Loading students…</div>
        </div>
      ) : students.length === 0 ? (
        <div className="empty">
          <i className="ti ti-users-off" />
          <div className="t">No students found</div>
          <div className="d">Try adjusting your search or filter criteria.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>ID number</th>
                <th>Program / Year</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr
                  key={s.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/registrar/grades/student/${s.id}`)}
                  title="Click to view grade history"
                >
                  <td>
                    <div className="row-user">
                      <div className="avatar sm">{initials(s.full_name)}</div>
                      <div className="meta">
                        <div className="name">{s.full_name || '-'}</div>
                        <div className="email">{s.institutional_email || s.email || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td
                    style={{ fontFamily: 'ui-monospace,SFMono-Regular,monospace', fontSize: 12, color: 'var(--reg-muted)' }}
                  >
                    {s.student_id || '-'}
                  </td>
                  <td>
                    {s.program_code
                      ? <span style={{ fontWeight: 700, color: 'var(--reg-cool)', fontSize: '.82rem', fontFamily: 'ui-monospace,monospace' }}>{s.program_code}</span>
                      : <span style={{ color: 'var(--reg-muted)' }}>-</span>}
                    {s.year_level && (
                      <span style={{ color: 'var(--reg-muted)', marginLeft: 4, fontSize: '.82rem' }}>
                        · {YEAR_LABELS[s.year_level] || `Year ${s.year_level}`}
                      </span>
                    )}
                    {s.program_name && (
                      <div style={{ fontSize: '.75rem', color: 'var(--reg-muted)', marginTop: 2 }}>{s.program_name}</div>
                    )}
                  </td>
                  <td>
                    {s.is_active
                      ? <span className="tag status-active">Active</span>
                      : <span className="tag status-inactive">Inactive</span>}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      className="btn-sec"
                      style={{ padding: '5px 10px', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => navigate(`/registrar/grades/student/${s.id}`)}
                    >
                      <i className="ti ti-school" /> Grades
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <div className="count">
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
              </div>
              <div className="controls">
                <button disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
                  <i className="ti ti-chevron-left" />
                </button>
                {buildPageNumbers(currentPage, totalPages).map((item, i) =>
                  item === '…'
                    ? <span key={`e${i}`} style={{ padding: '0 .2rem', color: 'var(--reg-muted)' }}>…</span>
                    : <button
                        key={item}
                        className={currentPage === item ? 'active' : ''}
                        onClick={() => goToPage(item)}
                      >{item}</button>
                )}
                <button disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>
                  <i className="ti ti-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
