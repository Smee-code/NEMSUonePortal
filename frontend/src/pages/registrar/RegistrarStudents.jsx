import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

const YEAR_LABELS = { 1: '1st year', 2: '2nd year', 3: '3rd year', 4: '4th year', 5: '5th year' };
const PAGE_SIZE = 20;

export default function RegistrarStudents() {
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [program,  setProgram]  = useState('');
  const [year,     setYear]     = useState('');
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);

  const [counts, setCounts] = useState({ total: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

  // Summary counts + program list (mount only).
  useEffect(() => {
    Promise.all([
      api.get('/auth/registrar/students/?limit=1&offset=0'),
      ...[1, 2, 3, 4, 5].map(y => api.get(`/auth/registrar/students/?limit=1&offset=0&year_level=${y}`)),
    ]).then(([all, ...ys]) => {
      setCounts({
        total: all.data?.count ?? 0,
        1: ys[0].data?.count ?? 0,
        2: ys[1].data?.count ?? 0,
        3: ys[2].data?.count ?? 0,
        4: ys[3].data?.count ?? 0,
        5: ys[4].data?.count ?? 0,
      });
    }).catch(() => {});
    api.get('/enrollment/programs/').then(r => setPrograms(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
    if (search)  params.set('search',     search);
    if (program) params.set('program',    program);
    if (year)    params.set('year_level', year);
    api.get(`/auth/registrar/students/?${params}`)
      .then(r => { setStudents(r.data?.results ?? r.data ?? []); setTotal(r.data?.count ?? 0); })
      .catch(() => { setStudents([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, program, year, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const YEARS = [
    { id: '',  label: 'All years', count: counts.total },
    { id: '1', label: '1st year',  count: counts[1] },
    { id: '2', label: '2nd year',  count: counts[2] },
    { id: '3', label: '3rd year',  count: counts[3] },
    { id: '4', label: '4th year',  count: counts[4] },
    { id: '5', label: '5th year',  count: counts[5] },
  ];

  const activeFilters = !!(search || program || year);

  return (
    <>
      <style>{CSS}</style>

      <header className="st-head">
        <h1>List of students</h1>
        <p className="st-lede">
          The student registry — {counts.total.toLocaleString()} on record. Search anyone, then open their full grade history.
        </p>
      </header>

      {/* Year filter bar with counts */}
      <div className="st-years">
        {YEARS.map(y => (
          <button
            key={y.id || 'all'}
            className={`st-year-btn${year === y.id ? ' active' : ''}`}
            onClick={() => { setYear(y.id); setPage(1); }}
          >
            <span className="st-year-num">{y.count.toLocaleString()}</span>
            <span className="st-year-lbl">{y.label}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="st-toolbar">
        <div className="st-search">
          <i className="ti ti-search" />
          <input
            placeholder="Search by name, ID, or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="st-select" value={program} onChange={e => { setProgram(e.target.value); setPage(1); }}>
          <option value="">All programs</option>
          {programs.map(p => <option key={p.id} value={p.code}>{p.code} — {p.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="st-empty">Loading students…</div>
      ) : students.length === 0 ? (
        <div className="st-empty">
          <i className="ti ti-users-group" />
          <div className="st-empty-t">No students found</div>
          <div className="st-empty-d">
            {activeFilters ? 'Nothing matches your search or filters.' : 'No students are on record yet.'}
          </div>
        </div>
      ) : (
        <>
          <div className="st-table-wrap">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID number</th>
                  <th>Program &amp; year</th>
                  <th>Status</th>
                  <th className="r"></th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="st-user">
                        <div className="st-avatar">{initials(s.full_name)}</div>
                        <div className="st-who">
                          <div className="st-name">{s.full_name || '—'}</div>
                          <div className="st-email">{s.institutional_email || s.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="st-id">{s.student_id || '—'}</span></td>
                    <td>
                      <span className="st-prog">{s.program_code || s.program || '—'}</span>
                      {s.year_level && (
                        <span className="st-year"> · {YEAR_LABELS[s.year_level] || `Year ${s.year_level}`}</span>
                      )}
                    </td>
                    <td>
                      <span className={`st-chip ${s.is_active ? 'active' : 'inactive'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="r">
                      <Link to={`/registrar/grades/student/${s.id}`} className="st-link">
                        <i className="ti ti-school" /> View grades
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="st-pager">
              <span className="st-pager-count">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div className="st-pager-ctrl">
                <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <i className="ti ti-chevron-left" /> Prev
                </button>
                <span className="st-pager-page">Page {page} of {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                  Next <i className="ti ti-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

const CSS = `
  /* ── Header ── */
  .st-head{ padding-bottom:1.1rem; margin-bottom:1.3rem; border-bottom:1px solid var(--reg-line); }
  .st-head h1{ margin:0; font:600 24px/1.15 'Inter',sans-serif; color:var(--reg-ink); letter-spacing:-.015em; }
  .st-lede{ margin:.4rem 0 0; font-size:13.5px; color:var(--reg-muted); max-width:66ch; line-height:1.5; }

  /* ── Year filter bar (counts + filter) ── */
  .st-years{ display:grid; grid-template-columns:repeat(6,1fr); border:1px solid var(--reg-line); background:#fff; margin-bottom:1.25rem; }
  .st-year-btn{ display:flex; flex-direction:column; gap:3px; align-items:flex-start; padding:14px 16px;
    border:none; border-right:1px solid var(--reg-line-soft); background:none; cursor:pointer; text-align:left; transition:background .14s; }
  .st-year-btn:last-child{ border-right:none; }
  .st-year-btn:hover{ background:var(--reg-warm); }
  .st-year-btn.active{ background:var(--reg-ink); }
  .st-year-num{ font:600 24px/1 'Inter',sans-serif; color:var(--reg-ink); font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
  .st-year-lbl{ font-size:11.5px; color:var(--reg-muted); }
  .st-year-btn.active .st-year-num, .st-year-btn.active .st-year-lbl{ color:#fff; }

  /* ── Toolbar ── */
  .st-toolbar{ display:flex; align-items:center; gap:.75rem; margin-bottom:1.1rem; flex-wrap:wrap; }
  .st-search{ flex:1; min-width:240px; display:flex; align-items:center; gap:8px; border:1px solid var(--reg-line); background:#fff; padding:0 12px; }
  .st-search:focus-within{ border-color:var(--reg-ink); }
  .st-search i{ color:var(--reg-faint); font-size:16px; }
  .st-search input{ flex:1; border:none; outline:none; padding:9px 0; font:13px 'Inter',sans-serif; background:none; color:var(--reg-ink); }
  .st-select{ border:1px solid var(--reg-line); background:#fff; padding:9px 12px; font:13px 'Inter',sans-serif; color:var(--reg-ink); outline:none; max-width:260px; }
  .st-select:focus{ border-color:var(--reg-ink); }

  /* ── Empty ── */
  .st-empty{ border:1px solid var(--reg-line); background:#fff; padding:3rem 1.5rem; text-align:center; color:var(--reg-muted); font-size:13px; }
  .st-empty i{ font-size:34px; color:var(--reg-faint); display:block; margin-bottom:.6rem; }
  .st-empty-t{ font-weight:600; color:var(--reg-ink); font-size:15px; }
  .st-empty-d{ margin-top:4px; }

  /* ── Registry table ── */
  .st-table-wrap{ border:1px solid var(--reg-line); background:#fff; overflow-x:auto; }
  .st-table{ width:100%; border-collapse:collapse; font-size:13px; min-width:680px; }
  .st-table th{ text-align:left; padding:11px 16px; font-size:11.5px; font-weight:600; color:var(--reg-muted);
    border-bottom:1px solid var(--reg-line); background:var(--reg-warm); white-space:nowrap; }
  .st-table th.r{ text-align:right; }
  .st-table td{ padding:11px 16px; border-bottom:1px solid var(--reg-line-soft); vertical-align:middle; }
  .st-table td.r{ text-align:right; }
  .st-table tbody tr:last-child td{ border-bottom:none; }
  .st-table tbody tr{ transition:background .12s; }
  .st-table tbody tr:hover{ background:var(--reg-warm); }

  .st-user{ display:flex; align-items:center; gap:11px; }
  .st-avatar{ width:34px; height:34px; border-radius:50%; background:var(--reg-ink); color:#fff;
    display:flex; align-items:center; justify-content:center; font:600 12px 'Inter',sans-serif; flex-shrink:0; }
  .st-who{ min-width:0; }
  .st-name{ font-weight:600; color:var(--reg-ink); }
  .st-email{ font-size:12px; color:var(--reg-muted); }
  .st-id{ font:12.5px ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--reg-ink); letter-spacing:.02em; }
  .st-prog{ color:var(--reg-ink); }
  .st-year{ color:var(--reg-muted); }
  .st-chip{ display:inline-block; font:600 11px 'Inter',sans-serif; padding:3px 10px; white-space:nowrap; }
  .st-chip.active{ background:var(--reg-green-tint); color:var(--reg-green); }
  .st-chip.inactive{ background:var(--reg-cool-2); color:var(--reg-muted); }
  .st-link{ display:inline-flex; align-items:center; gap:6px; font:600 12px 'Inter',sans-serif; color:var(--reg-ink);
    text-decoration:none; border:1px solid var(--reg-line); background:#fff; padding:7px 12px; white-space:nowrap; transition:border-color .14s, background .14s; }
  .st-link:hover{ border-color:var(--reg-ink); background:var(--reg-warm); }
  .st-link i{ font-size:14px; color:var(--reg-muted); }

  /* ── Pager ── */
  .st-pager{ display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-top:1.25rem; flex-wrap:wrap; }
  .st-pager-count{ font-size:12px; color:var(--reg-muted); }
  .st-pager-ctrl{ display:flex; align-items:center; gap:10px; }
  .st-pager-page{ font-size:12px; color:var(--reg-muted); font-variant-numeric:tabular-nums; }
  .st-pager-ctrl button{ display:inline-flex; align-items:center; gap:5px; padding:8px 13px; border:1px solid var(--reg-line);
    background:#fff; color:var(--reg-ink); font:600 12.5px 'Inter',sans-serif; cursor:pointer; }
  .st-pager-ctrl button:hover:not(:disabled){ border-color:var(--reg-ink); }
  .st-pager-ctrl button:disabled{ opacity:.45; cursor:not-allowed; }

  @media (max-width:820px){
    .st-years{ grid-template-columns:repeat(3,1fr); }
    .st-year-btn:nth-child(3){ border-right:none; }
  }
  @media (max-width:520px){
    .st-years{ grid-template-columns:repeat(2,1fr); }
    .st-year-btn:nth-child(2){ border-right:none; }
  }
  @media (prefers-reduced-motion: reduce){ .st-year-btn, .st-table tbody tr, .st-link{ transition:none; } }
`;
