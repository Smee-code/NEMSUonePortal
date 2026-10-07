import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useShell } from '../../components/layout/StudentShell';

function formatUnits(val) {
  const n = parseFloat(val);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function gradeColor(grade) {
  if (!grade) return 'var(--muted)';
  const n = parseFloat(grade);
  if (isNaN(n)) return grade === 'INC' ? 'var(--amber)' : 'var(--red)';
  if (n <= 1.75) return 'var(--green)';
  if (n <= 2.5)  return 'var(--ink)';
  if (n <= 3.0)  return 'var(--amber)';
  return 'var(--red)';
}

function wGpa(records) {
  const numeric = records.filter(r => r.grade != null && !isNaN(parseFloat(r.grade)));
  if (!numeric.length) return null;
  const totalU   = numeric.reduce((s, r) => s + parseFloat(r.subject_units || 0), 0);
  const weighted = numeric.reduce((s, r) => s + parseFloat(r.grade) * parseFloat(r.subject_units || 0), 0);
  return totalU > 0 ? (weighted / totalU).toFixed(2) : null;
}

/* A "back subject" leaves a student off the regular block sequence: a posted
   grade that is failing (numeric > 3.0 in the 5-point scale), Incomplete, or
   Dropped and therefore still has to be retaken/completed. */
function isBackSubject(r) {
  if (!r.is_submitted) return false;
  const raw = (r.grade ?? '').toString().trim().toUpperCase();
  if (!raw) return false;
  if (['INC', 'DRP', 'DRP.', 'DROP', 'DROPPED', 'UD', 'FDA', 'F', 'FAILED'].includes(raw)) return true;
  const n = parseFloat(raw);
  return !isNaN(n) && n > 3.0;
}

/* Marker position (0–100%) for a grade on the 1.00 → 5.00 scale. */
function scalePct(grade) {
  const n = parseFloat(grade);
  if (isNaN(n)) return null;
  return Math.min(100, Math.max(0, ((n - 1) / 4) * 100));
}

export default function StudentGrades() {
  const { currentTerm } = useShell();
  const [grades, setGrades]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/grades/my/')
      .then(res => setGrades(res.data))
      .catch(() => setError('Failed to load grades. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  /* ── Group by term ─────────────────────────────────────────── */
  const byTerm = grades.reduce((acc, g) => {
    const key = g.term_display;
    if (!acc[key]) acc[key] = { display: g.term_display, year: g.term_year, semester: g.term_semester, records: [] };
    acc[key].records.push(g);
    return acc;
  }, {});

  const termList = Object.values(byTerm).sort((a, b) =>
    b.year.localeCompare(a.year) || a.semester.localeCompare(b.semester)
  );

  /* ── Identify current term records ─────────────────────────── */
  // Match the EXACT active term (same year AND semester). Matching on year
  // alone wrongly pulled in the other semester of the same academic year.
  const activeDisplay = currentTerm ? `${currentTerm.semester_display} ${currentTerm.year}` : null;
  const currentTermKey = currentTerm
    ? termList.find(t =>
        t.display === activeDisplay ||
        (t.year === currentTerm.year && t.semester === currentTerm.semester)
      )?.display
    : termList[0]?.display;

  const currentRecords = currentTermKey ? byTerm[currentTermKey]?.records ?? [] : [];
  const historyTerms   = termList.filter(t => t.display !== currentTermKey);

  /* ── Stats ─────────────────────────────────────────────────── */
  const allGraded      = grades.filter(g => g.grade != null && !isNaN(parseFloat(g.grade)));
  const cumulativeGwa  = wGpa(allGraded);

  const currentGraded  = currentRecords.filter(g => g.grade != null && !isNaN(parseFloat(g.grade)));
  const currentGwa     = wGpa(currentGraded);
  const currentUnits   = currentRecords.reduce((s, r) => s + parseFloat(r.subject_units || 0), 0);
  const currentPosted  = currentRecords.some(r =>
    r.midterm_grade != null || r.final_grade != null || (r.grade && !isNaN(parseFloat(r.grade)))
  );

  const totalUnitsEarned = allGraded
    .filter(g => parseFloat(g.grade) <= 3.0)
    .reduce((s, r) => s + parseFloat(r.subject_units || 0), 0);

  /* ── Academic standing ─────────────────────────────────────── */
  const backSubjects = grades.filter(isBackSubject);
  const isIrregular  = backSubjects.length > 0;
  const standing     = grades.length === 0 ? null : (isIrregular ? 'Irregular' : 'Regular');

  const termLabel = currentTerm
    ? `${currentTerm.semester_display} ${currentTerm.year}`
    : (termList[0]?.display ?? 'No grades yet');

  const markerPct = scalePct(cumulativeGwa);

  if (loading) return <div className="page"><p style={{ color: 'var(--muted)' }}>Loading grades…</p></div>;

  return (
    <div className="page">
      <style>{GH_CSS}</style>

      {/* ── Page head ──────────────────────────────────────── */}
      <div className="page-head">
        <div>
          <div className="eyebrow">Academic · {formatUnits(totalUnitsEarned)} units earned</div>
          <h2>My <em>grades</em></h2>
          <div className="sub">Midterm and final grades for the current term, with your full grade history per academic semester.</div>
        </div>
        {grades.length > 0 && (
          <div className="actions">
            <button className="btn-sec" onClick={() => window.print()}>
              <i className="ti ti-printer" /> Print
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: 'var(--red-tint)', color: 'var(--red)', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: 13 }}>{error}</div>
      )}

      {grades.length === 0 && !error ? (
        <div className="stu-empty">
          <i className="ti ti-school" />
          <p>No grades available yet. Grades appear here once your faculty submits them.</p>
        </div>
      ) : (
        <>
          {/* ── Standing hero ───────────────────────────────── */}
          <div className="gr-hero">
            <div className="gr-hero-l">
              <div className="gr-hero-top">
                <div>
                  <div className="gr-lbl">Cumulative GWA</div>
                  <div className="gr-gwa" style={{ color: cumulativeGwa ? gradeColor(cumulativeGwa) : 'var(--muted)' }}>
                    {cumulativeGwa ?? '—'}
                  </div>
                </div>
                {standing && (
                  <span className={`gr-standing gr-standing--${isIrregular ? 'irr' : 'reg'}`}>
                    <i className={`ti ${isIrregular ? 'ti-alert-triangle' : 'ti-circle-check'}`} />
                    {standing}
                  </span>
                )}
              </div>
              <div className="gr-desc">
                {cumulativeGwa
                  ? <>Weighted across <strong>{allGraded.length}</strong> graded subject{allGraded.length !== 1 ? 's' : ''} · <strong>{formatUnits(totalUnitsEarned)}</strong> units earned
                      {isIrregular && <> · <span style={{ color: 'var(--amber)' }}>{backSubjects.length} back subject{backSubjects.length !== 1 ? 's' : ''} to resolve</span></>}</>
                  : 'No numeric grades on record yet.'}
              </div>

              {/* 1.00 → 5.00 scale with the passing line at 3.00 */}
              {markerPct != null && (
                <div className="gr-scale">
                  <div className="gr-track">
                    <span className="gr-pass" style={{ left: '50%' }} />
                    <span className="gr-marker" style={{ left: `${markerPct}%`, background: gradeColor(cumulativeGwa) }} />
                  </div>
                  <div className="gr-ticks">
                    <span>1.00 · Excellent</span>
                    <span className="gr-tick-mid">3.00 · Passing</span>
                    <span>5.00 · Failed</span>
                  </div>
                </div>
              )}
            </div>

            <div className="gr-hero-r">
              <div className="gr-stat">
                <span className="gr-stat-l">This term · GWA</span>
                <span className="gr-stat-v" style={{ color: currentGwa ? gradeColor(currentGwa) : 'var(--ink)' }}>{currentGwa ?? '—'}</span>
              </div>
              <div className="gr-stat">
                <span className="gr-stat-l">Units this term</span>
                <span className="gr-stat-v">{formatUnits(currentUnits)}</span>
              </div>
              <div className="gr-stat">
                <span className="gr-stat-l">Total units earned</span>
                <span className="gr-stat-v">{formatUnits(totalUnitsEarned)}</span>
              </div>
            </div>
          </div>

          {/* ── Current term grades ─────────────────────────── */}
          {currentRecords.length > 0 && (
            <>
              <div className="gr-sec gr-sec--now">
                <h4>Current term<span>{termLabel}{currentTerm?.block_code ? ` · ${currentTerm.block_code}` : ''}</span></h4>
              </div>
              {!currentPosted && (
                <div className="gr-pending-note">
                  <i className="ti ti-clock" />
                  <span>Your grades for this term haven’t been posted yet — they’ll appear here once your instructors submit them.</span>
                </div>
              )}
              <div className="table-wrap" style={{ marginBottom: '2.75rem' }}>
                <table className="gr-table gr-table--now">
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>Code</th>
                      <th>Subject</th>
                      <th>Instructor</th>
                      <th className="num" style={{ width: 56 }}>Units</th>
                      <th className="num" style={{ width: 78 }}>Midterm</th>
                      <th className="num" style={{ width: 78 }}>Final</th>
                      <th className="num" style={{ width: 96 }}>Final Grade</th>
                      <th style={{ width: 120 }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.map(r => (
                      <tr key={r.id}>
                        <td className="gr-code">
                          {r.subject_code}{r.section ? <span className="gr-sec-tag"> [{r.section}]</span> : ''}
                        </td>
                        <td className="gr-name">{r.subject_name}</td>
                        <td className="gr-mut">{r.faculty_name || '—'}</td>
                        <td className="num">{formatUnits(r.subject_units)}</td>
                        <td className="num gr-val" style={{ color: gradeColor(r.midterm_grade) }}>{r.midterm_grade ?? '—'}</td>
                        <td className="num gr-val" style={{ color: gradeColor(r.final_grade) }}>{r.final_grade ?? '—'}</td>
                        <td className="num gr-val gr-val--final" style={{ color: gradeColor(r.grade) }}>{r.grade ?? '—'}</td>
                        <td><RemarkTag r={r} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Grade history ───────────────────────────────── */}
          {historyTerms.length > 0 && (
            <>
              <div className="gr-sec gr-sec--quiet">
                <h4>Grade history<span>{historyTerms.length} completed term{historyTerms.length !== 1 ? 's' : ''}</span></h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {historyTerms.map((term) => {
                  const termGpa = wGpa(term.records);
                  const termUnits = term.records.reduce((s, r) => s + parseFloat(r.subject_units || 0), 0);
                  return (
                    <TermHistorySection key={term.display} term={term} gpa={termGpa} totalUnits={termUnits} defaultOpen={false} />
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function RemarkTag({ r }) {
  if (!r.is_submitted) return <span className="gr-tag gr-tag--pend">Not yet posted</span>;
  const passed = parseFloat(r.grade) <= 3.0;
  return (
    <span className={`gr-tag gr-tag--${passed ? 'pass' : 'fail'}`}>
      {r.remarks || (passed ? 'Passed' : 'Failed')}
    </span>
  );
}

const GH_CSS = `
  /* Standing hero */
  .gr-hero{display:grid;grid-template-columns:1.5fr 1fr;background:#fff;border:1px solid var(--line);
    border-top:3px solid var(--gold);margin-bottom:1.75rem;}
  .gr-hero-l{padding:1.75rem 1.9rem;border-right:1px solid var(--line-soft);}
  .gr-hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;}
  .gr-lbl{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:.4rem;}
  .gr-gwa{font-family:'Inter',sans-serif;font-weight:500;font-size:52px;line-height:1;letter-spacing:-.025em;font-variant-numeric:tabular-nums;}
  .gr-standing{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:700;letter-spacing:.08em;
    text-transform:uppercase;padding:7px 13px;white-space:nowrap;}
  .gr-standing i{font-size:14px;}
  .gr-standing--reg{background:var(--green-tint);color:var(--green);}
  .gr-standing--irr{background:var(--amber-tint);color:var(--amber);}
  .gr-desc{font-size:13px;color:var(--muted);margin-top:.85rem;line-height:1.55;}
  .gr-desc strong{color:var(--ink);font-weight:600;}

  /* 1.00 → 5.00 scale */
  .gr-scale{margin-top:1.4rem;}
  .gr-track{position:relative;height:8px;border-radius:999px;
    background:linear-gradient(90deg,var(--green) 0%,var(--green) 19%,#c9cdd6 30%,#c9cdd6 44%,var(--amber) 52%,#e0b878 62%,var(--red) 78%,var(--red) 100%);}
  .gr-pass{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--ink);opacity:.45;transform:translateX(-50%);}
  .gr-marker{position:absolute;top:50%;width:16px;height:16px;border-radius:50%;border:3px solid #fff;
    transform:translate(-50%,-50%);box-shadow:0 1px 4px rgba(10,22,40,.35);}
  .gr-ticks{display:flex;justify-content:space-between;margin-top:9px;font-size:10px;color:var(--faint);
    letter-spacing:.03em;font-weight:500;}
  .gr-ticks .gr-tick-mid{color:var(--muted);font-weight:600;}

  /* supporting stat rail */
  .gr-hero-r{display:flex;flex-direction:column;justify-content:center;padding:1rem 1.9rem;}
  .gr-stat{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid var(--line-soft);}
  .gr-stat:last-child{border-bottom:none;}
  .gr-stat-l{font-size:12px;color:var(--muted);}
  .gr-stat-v{font-size:22px;font-weight:500;color:var(--ink);letter-spacing:-.015em;font-variant-numeric:tabular-nums;}

  /* section heading */
  .gr-sec{margin-bottom:1rem;}
  .gr-sec h4{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;line-height:1.3;}
  .gr-sec h4 span{display:block;font-family:'Inter',sans-serif;font-weight:400;font-size:20px;color:var(--ink);
    text-transform:none;letter-spacing:-.01em;margin-top:4px;}
  /* Current term = focal; its eyebrow carries the gold accent. */
  .gr-sec--now h4{color:var(--gold);}
  .gr-sec--now h4 span{font-size:23px;font-weight:500;color:var(--ink);}
  /* Grade history = quiet, recedes beneath the current term. */
  .gr-sec--quiet{margin-top:2.75rem;margin-bottom:.75rem;}
  .gr-sec--quiet h4 span{font-size:14px;font-weight:500;color:var(--ink-2);}
  .gr-pending-note{display:flex;align-items:center;gap:9px;background:var(--warm);border:1px solid var(--line);
    border-left:3px solid var(--gold);padding:.8rem 1.1rem;margin-bottom:1rem;font-size:13px;color:var(--ink-2);line-height:1.5;}
  .gr-pending-note i{font-size:17px;color:var(--gold);flex-shrink:0;}

  /* grade table */
  .gr-table{width:100%;border-collapse:collapse;font-size:13px;border:1px solid var(--line);background:#fff;}
  /* Current-term table: raised, gold-accented focal panel. */
  .gr-table--now{border-top:3px solid var(--gold);box-shadow:0 10px 30px -18px rgba(10,22,40,.4);}
  .gr-table thead th{background:var(--warm);text-align:left;font-size:10px;letter-spacing:.12em;text-transform:uppercase;
    color:var(--muted);font-weight:600;padding:12px 16px;border-bottom:1px solid var(--line);}
  .gr-table th.num,.gr-table td.num{text-align:right;font-variant-numeric:tabular-nums;}
  .gr-table td{padding:14px 16px;border-bottom:1px solid var(--line-soft);color:var(--ink);vertical-align:middle;}
  .gr-table tbody tr:last-child td{border-bottom:0;}
  .gr-table tbody tr:hover td{background:var(--cool);}
  .gr-code{font-weight:600;color:var(--gold);letter-spacing:.03em;white-space:nowrap;}
  .gr-sec-tag{color:var(--muted);font-weight:500;}
  .gr-name{font-weight:500;color:var(--ink);}
  .gr-mut{color:var(--muted);}
  .gr-val{font-weight:500;}
  .gr-val--final{font-size:16px;font-weight:600;}

  .gr-tag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:4px 9px;}
  .gr-tag--pass{background:var(--green-tint);color:var(--green);}
  .gr-tag--fail{background:var(--red-tint);color:var(--red);}
  .gr-tag--pend{background:var(--cool-2);color:var(--muted);}

  /* history accordion — intentionally quiet: lighter border, smaller type */
  .gh-term{border:1px solid var(--line-soft);background:var(--warm);}
  .gh-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.8rem 1.2rem;cursor:pointer;
    background:transparent;transition:background .12s;}
  .gh-head:hover{background:#fff;}
  .gh-head.is-open{border-bottom:1px solid var(--line-soft);background:#fff;}
  .gh-head-l{display:flex;align-items:center;gap:.9rem;min-width:0;}
  .gh-gwa{display:flex;flex-direction:column;align-items:center;justify-content:center;width:50px;height:42px;flex-shrink:0;
    background:#fff;border:1px solid var(--line-soft);}
  .gh-gwa b{font-size:16px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums;}
  .gh-gwa span{font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-top:3px;}
  .gh-term-name{font-weight:500;font-size:15px;color:var(--ink-2);letter-spacing:-.005em;}
  .gh-term-meta{font-size:11px;color:var(--muted);margin-top:2px;}
  .gh-head-r{display:flex;align-items:center;gap:1rem;flex-shrink:0;}
  .gh-chev{color:var(--muted);font-size:15px;transition:transform .15s;}
  .gh-chev.is-open{transform:rotate(180deg);}

  .gh-list{display:flex;flex-direction:column;}
  .gh-item{display:flex;align-items:center;gap:1rem;padding:.95rem 1.4rem;border-top:1px solid var(--line-soft);transition:background .12s;}
  .gh-item:hover{background:var(--warm);}
  .gh-main{flex:1;min-width:0;}
  .gh-code{font-size:11px;font-weight:600;color:var(--gold);letter-spacing:.05em;}
  .gh-sec{color:var(--muted);font-weight:500;}
  .gh-name{font-size:14px;font-weight:500;color:var(--ink);margin-top:2px;line-height:1.3;}
  .gh-meta{font-size:12px;color:var(--muted);margin-top:3px;}
  .gh-grades{display:flex;align-items:flex-end;gap:1.75rem;flex-shrink:0;}
  .gh-grade{text-align:center;min-width:44px;}
  .gh-glabel{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--faint);font-weight:600;white-space:nowrap;}
  .gh-gval{font-size:15px;font-weight:500;margin-top:3px;font-variant-numeric:tabular-nums;line-height:1;}
  .gh-final .gh-gval{font-size:22px;font-weight:600;}
  .gh-remark{flex-shrink:0;min-width:92px;text-align:right;}

  @media(max-width:820px){
    .gr-hero{grid-template-columns:1fr;}
    .gr-hero-l{border-right:none;border-bottom:1px solid var(--line-soft);}
    .gr-hero-r{padding:1rem 1.9rem 1.5rem;}
  }
  @media(max-width:600px){
    .gr-gwa{font-size:44px;}
    .gh-item{flex-wrap:wrap;gap:.75rem 1rem;}
    .gh-main{flex-basis:100%;}
    .gh-grades{gap:1.5rem;order:2;}
    .gh-grade{text-align:left;}
    .gh-remark{order:2;margin-left:auto;text-align:right;align-self:center;}
    .gh-gwa{width:52px;height:46px;}
  }
`;

function TermHistorySection({ term, gpa, totalUnits, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="gh-term">
      <div className={`gh-head${open ? ' is-open' : ''}`} onClick={() => setOpen(o => !o)}>
        <div className="gh-head-l">
          <div className="gh-gwa">
            <b style={{ color: gpa ? gradeColor(gpa) : 'var(--muted)' }}>{gpa ?? '—'}</b>
            <span>GWA</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="gh-term-name">{term.display}</div>
            <div className="gh-term-meta">{term.records.length} subjects · {formatUnits(totalUnits)} units</div>
          </div>
        </div>
        <div className="gh-head-r">
          <span className="gr-tag gr-tag--pass">Completed</span>
          <i className={`ti ti-chevron-down gh-chev${open ? ' is-open' : ''}`} />
        </div>
      </div>

      {open && (
        <div className="gh-list">
          {term.records.map(r => {
            const passed = parseFloat(r.grade) <= 3.0;
            return (
              <div key={r.id} className="gh-item">
                <div className="gh-main">
                  <div className="gh-code">
                    {r.subject_code}{r.section ? <span className="gh-sec"> [{r.section}]</span> : ''}
                  </div>
                  <div className="gh-name">{r.subject_name}</div>
                  <div className="gh-meta">
                    {r.faculty_name || 'No instructor'} · {formatUnits(r.subject_units)} unit{formatUnits(r.subject_units) === '1' ? '' : 's'}
                  </div>
                </div>
                <div className="gh-grades">
                  <div className="gh-grade">
                    <div className="gh-glabel">Midterm</div>
                    <div className="gh-gval" style={{ color: gradeColor(r.midterm_grade) }}>{r.midterm_grade ?? '—'}</div>
                  </div>
                  <div className="gh-grade">
                    <div className="gh-glabel">Final</div>
                    <div className="gh-gval" style={{ color: gradeColor(r.final_grade) }}>{r.final_grade ?? '—'}</div>
                  </div>
                  <div className="gh-grade gh-final">
                    <div className="gh-glabel">Final Grade</div>
                    <div className="gh-gval" style={{ color: gradeColor(r.grade) }}>{r.grade ?? '—'}</div>
                  </div>
                </div>
                <div className="gh-remark">
                  {r.is_submitted ? (
                    <span className={`gr-tag gr-tag--${passed ? 'pass' : 'fail'}`}>
                      {r.remarks || (passed ? 'Passed' : 'Failed')}
                    </span>
                  ) : (
                    <span className="gr-tag gr-tag--pend">Not yet posted</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
