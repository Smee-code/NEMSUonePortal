import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const YEARS = [1, 2, 3, 4];
const YEAR_LABEL = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
const SEMS = [
  { key: 'first', label: '1st Semester' },
  { key: 'second', label: '2nd Semester' },
  { key: 'summer', label: 'Summer' },
];

function fmtUnits(val) {
  const n = parseFloat(val);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function gradeColor(grade) {
  const n = parseFloat(grade);
  if (isNaN(n)) return 'var(--amber)';
  if (n <= 1.75) return 'var(--green)';
  if (n <= 2.5)  return 'var(--ink)';
  if (n <= 3.0)  return 'var(--amber)';
  return 'var(--red)';
}

// Classify a course against the student's grade records.
// → 'passed' (settled, ≤3.00), 'back' (failed / INC / dropped), or 'upcoming'.
function statusOf(code, gradeMap) {
  const r = gradeMap[code];
  if (!r || !r.is_submitted || r.grade == null) return { key: 'upcoming', grade: null };
  const raw = String(r.grade).trim().toUpperCase();
  const n = parseFloat(raw);
  if (!isNaN(n)) return n <= 3.0 ? { key: 'passed', grade: r.grade } : { key: 'back', grade: r.grade };
  return { key: 'back', grade: r.grade }; // INC / DRP
}

export default function StudentCurriculum() {
  const { user } = useAuth();
  const [data, setData]     = useState(null);
  const [gradeMap, setGMap] = useState({});
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    Promise.allSettled([
      api.get('/enrollment/my-curriculum/'),
      api.get('/grades/my/'),
    ]).then(([curRes, grRes]) => {
      if (curRes.status === 'fulfilled') setData(curRes.value.data);
      else setError('Failed to load your curriculum.');
      if (grRes.status === 'fulfilled') {
        const map = {};
        (grRes.value.data || []).forEach(g => { map[g.subject_code] = g; });
        setGMap(map);
      }
    }).finally(() => setLoad(false));
  }, []);

  const subjects   = data?.subjects ?? [];
  const totalUnits = subjects.reduce((a, s) => a + parseFloat(s.units || 0), 0);

  // Progress: completed = passed courses.
  const passed = subjects.filter(s => statusOf(s.code, gradeMap).key === 'passed');
  const earnedUnits   = passed.reduce((a, s) => a + parseFloat(s.units || 0), 0);
  const pct = totalUnits > 0 ? Math.round((earnedUnits / totalUnits) * 100) : 0;

  const currentYear = user?.year_level || null;

  return (
    <div className="page">
      <style>{CSS}</style>
      <div className="page-head">
        <div>
          <div className="eyebrow">Academic{data?.program_code ? ` · ${data.program_code}` : ''}</div>
          <h2>My <em>curriculum</em></h2>
          <div className="sub">Your official course map — every subject in the program, and how far you’ve come.</div>
        </div>
      </div>

      {error && <div style={{ background: 'var(--red-tint)', color: 'var(--red)', padding: '.75rem 1rem', fontSize: 13, marginBottom: '1.5rem' }}>{error}</div>}

      {loading ? (
        <div className="stu-empty"><p>Loading…</p></div>
      ) : !data?.curriculum && subjects.length === 0 && !data?.code ? (
        <div className="stu-empty">
          <i className="ti ti-book-2" />
          <p>No curriculum has been assigned to you yet. Please contact the registrar.</p>
        </div>
      ) : (
        <>
          {/* ── Progress hero ──────────────────────────────── */}
          <div className="sc-hero">
            <div className="sc-hero-top">
              <div>
                <div className="sc-hero-eyebrow">Degree progress</div>
                <h3 className="sc-hero-code">{data.code}</h3>
                <div className="sc-hero-sub">
                  {data.program_name || data.program_code || 'Program'} · Effective {data.year_effective}
                </div>
              </div>
              <div className="sc-hero-pct">
                <span className="sc-hero-pct-n">{pct}<small>%</small></span>
                <span className="sc-hero-pct-l">complete</span>
              </div>
            </div>

            <div className="sc-bar"><span className="sc-bar-fill" style={{ width: `${pct}%` }} /></div>

            <div className="sc-hero-stats">
              <span><b>{passed.length}</b> of {subjects.length} courses passed</span>
              <span><b>{fmtUnits(earnedUnits)}</b> of {fmtUnits(totalUnits)} units earned</span>
              <span><b>{fmtUnits(totalUnits - earnedUnits)}</b> units remaining</span>
            </div>
          </div>

          {/* ── Year-by-year course map ─────────────────────── */}
          {YEARS.map(yr => {
            const yrSubs = subjects.filter(s => s.year_level === yr);
            if (yrSubs.length === 0) return null;
            const yrPassed = yrSubs.filter(s => statusOf(s.code, gradeMap).key === 'passed').length;
            const isCurrent = currentYear === yr;
            return (
              <div key={yr} className="sc-year">
                <div className="sc-year-h">
                  <div className="sc-year-title">
                    {YEAR_LABEL[yr]}
                    {isCurrent && <span className="sc-here">You are here</span>}
                  </div>
                  <div className="sc-year-prog">{yrPassed}/{yrSubs.length} passed</div>
                </div>

                {SEMS.map(sem => {
                  const cell = yrSubs.filter(s => s.semester === sem.key);
                  if (cell.length === 0) return null;
                  const units = cell.reduce((a, s) => a + parseFloat(s.units || 0), 0);
                  return (
                    <div key={sem.key} className="sc-sem">
                      <div className="sc-sem-h">{sem.label}<span>{fmtUnits(units)} units</span></div>
                      <div className="table-wrap">
                        <table className="sc-table">
                          <thead>
                            <tr>
                              <th className="sc-th-st" />
                              <th style={{ width: 120 }}>Code</th>
                              <th>Descriptive title</th>
                              <th style={{ width: 110 }}>Prereq</th>
                              <th className="num" style={{ width: 90 }}>Grade</th>
                              <th className="num" style={{ width: 64 }}>Units</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cell.map(s => {
                              const st = statusOf(s.code, gradeMap);
                              return (
                                <tr key={s.id} className={`sc-row sc-row--${st.key}`}>
                                  <td className="sc-td-st">
                                    <span className={`sc-dot sc-dot--${st.key}`}>
                                      {st.key === 'passed' && <i className="ti ti-check" />}
                                      {st.key === 'back' && <i className="ti ti-alert-triangle" />}
                                    </span>
                                  </td>
                                  <td className="sc-code">
                                    {s.code}
                                    {s.subject_type === 'major' && <span className="sc-type">Major</span>}
                                  </td>
                                  <td className="sc-name">{s.name}</td>
                                  <td className="sc-prereq">{s.prerequisite_code || '—'}</td>
                                  <td className="num sc-grade" style={{ color: st.grade ? gradeColor(st.grade) : 'var(--faint)' }}>
                                    {st.grade ?? '—'}
                                  </td>
                                  <td className="num">{fmtUnits(s.units)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ── Legend ──────────────────────────────────────── */}
          <div className="sc-legend">
            <span><span className="sc-dot sc-dot--passed"><i className="ti ti-check" /></span> Passed</span>
            <span><span className="sc-dot sc-dot--back"><i className="ti ti-alert-triangle" /></span> Failed / incomplete</span>
            <span><span className="sc-dot sc-dot--upcoming" /> Not yet taken</span>
          </div>
        </>
      )}
    </div>
  );
}

const CSS = `
  /* Progress hero */
  .sc-hero{background:#fff;border:1px solid var(--line);border-top:3px solid var(--gold);
    padding:1.6rem 1.9rem 1.75rem;margin-bottom:2rem;}
  .sc-hero-top{display:flex;justify-content:space-between;align-items:flex-start;gap:1.5rem;flex-wrap:wrap;margin-bottom:1.25rem;}
  .sc-hero-eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:.45rem;}
  .sc-hero-code{font-family:'Inter',sans-serif;font-weight:500;font-size:28px;color:var(--ink);letter-spacing:-.015em;line-height:1.05;}
  .sc-hero-sub{font-size:13px;color:var(--muted);margin-top:.5rem;}
  .sc-hero-pct{display:flex;flex-direction:column;align-items:flex-end;line-height:1;}
  .sc-hero-pct-n{font-family:'Inter',sans-serif;font-weight:500;font-size:40px;color:var(--gold);letter-spacing:-.02em;font-variant-numeric:tabular-nums;}
  .sc-hero-pct-n small{font-size:20px;margin-left:2px;}
  .sc-hero-pct-l{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-top:6px;}
  .sc-bar{height:8px;background:var(--line-soft);overflow:hidden;}
  .sc-bar-fill{display:block;height:100%;background:linear-gradient(90deg,var(--gold-soft),var(--gold));transition:width .6s cubic-bezier(.4,0,.2,1);}
  .sc-hero-stats{display:flex;flex-wrap:wrap;gap:.4rem 1.75rem;margin-top:1rem;font-size:12.5px;color:var(--muted);}
  .sc-hero-stats b{color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums;}

  /* Year block */
  .sc-year{margin-bottom:2.25rem;}
  .sc-year-h{display:flex;justify-content:space-between;align-items:center;gap:1rem;
    padding-bottom:.6rem;margin-bottom:1rem;border-bottom:2px solid var(--ink);}
  .sc-year-title{display:flex;align-items:center;gap:12px;font-family:'Inter',sans-serif;font-weight:500;font-size:20px;color:var(--ink);letter-spacing:-.01em;}
  .sc-here{font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;font-weight:700;color:#fff;background:var(--gold);padding:3px 9px;}
  .sc-year-prog{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600;font-variant-numeric:tabular-nums;}
  .sc-sem{margin-bottom:1.25rem;}
  .sc-sem-h{display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:var(--muted);
    text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem;}

  /* Course table */
  .sc-table{width:100%;border-collapse:collapse;font-size:13px;border:1px solid var(--line);background:#fff;}
  .sc-table thead th{background:var(--warm);text-align:left;font-size:10px;letter-spacing:.12em;text-transform:uppercase;
    color:var(--muted);font-weight:600;padding:11px 14px;border-bottom:1px solid var(--line);}
  .sc-table th.sc-th-st{width:40px;padding-left:16px;padding-right:0;}
  .sc-table th.num,.sc-table td.num{text-align:right;font-variant-numeric:tabular-nums;}
  .sc-table td{padding:12px 14px;border-bottom:1px solid var(--line-soft);color:var(--ink);vertical-align:middle;}
  .sc-table tbody tr:last-child td{border-bottom:0;}
  .sc-table tbody tr:hover td{background:var(--cool);}
  .sc-row--passed td{background:rgba(10,124,82,.035);}
  .sc-row--passed:hover td{background:rgba(10,124,82,.07);}
  .sc-td-st{padding-left:16px;padding-right:0;}
  .sc-dot{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;flex-shrink:0;}
  .sc-dot i{font-size:11px;color:#fff;}
  .sc-dot--passed{background:var(--green);}
  .sc-dot--back{background:var(--amber);}
  .sc-dot--upcoming{background:transparent;border:1.5px solid var(--line);width:15px;height:15px;}
  .sc-code{font-weight:600;color:var(--gold);letter-spacing:.03em;white-space:nowrap;}
  .sc-type{display:inline-block;margin-left:7px;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;
    font-weight:700;color:var(--ink-2);background:var(--cool-2);padding:2px 6px;vertical-align:middle;}
  .sc-name{font-weight:500;color:var(--ink);}
  .sc-prereq{color:var(--muted);}
  .sc-grade{font-weight:600;}

  /* Legend */
  .sc-legend{display:flex;flex-wrap:wrap;gap:.75rem 1.75rem;padding:1rem 1.1rem;background:var(--warm);
    border:1px solid var(--line);font-size:12px;color:var(--muted);}
  .sc-legend>span{display:inline-flex;align-items:center;gap:8px;}

  @media(max-width:600px){
    .sc-hero-code{font-size:23px;}
    .sc-hero-pct-n{font-size:34px;}
  }
`;
