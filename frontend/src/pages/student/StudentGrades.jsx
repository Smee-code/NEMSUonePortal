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
  const currentTermKey = currentTerm
    ? termList.find(t =>
        t.year === currentTerm.year ||
        t.display?.includes(currentTerm.semester_display)
      )?.display
    : termList[0]?.display;

  const currentRecords = currentTermKey ? byTerm[currentTermKey]?.records ?? [] : [];
  const historyTerms   = termList.filter(t => t.display !== currentTermKey);

  /* ── KPI stats ─────────────────────────────────────────────── */
  const allGraded      = grades.filter(g => g.grade != null && !isNaN(parseFloat(g.grade)));
  const cumulativeGwa  = wGpa(allGraded);

  const currentGraded  = currentRecords.filter(g => g.grade != null && !isNaN(parseFloat(g.grade)));
  const currentGwa     = wGpa(currentGraded);
  const currentUnits   = currentRecords.reduce((s, r) => s + parseFloat(r.subject_units || 0), 0);

  const totalUnitsEarned = allGraded
    .filter(g => parseFloat(g.grade) <= 3.0)
    .reduce((s, r) => s + parseFloat(r.subject_units || 0), 0);

  /* ── Academic standing ─────────────────────────────────────── */
  // Irregular = carrying at least one back subject (failed / INC / dropped).
  const backSubjects = grades.filter(isBackSubject);
  const isIrregular  = backSubjects.length > 0;
  const standing     = grades.length === 0 ? null : (isIrregular ? 'Irregular' : 'Regular');

  const termLabel = currentTerm
    ? `${currentTerm.semester_display} ${currentTerm.year}`
    : (termList[0]?.display ?? 'No grades yet');

  if (loading) return <div className="page"><p style={{ color: 'var(--muted)' }}>Loading grades…</p></div>;

  return (
    <div className="page">
      <style>{GH_CSS}</style>

      {/* ── Page head ──────────────────────────────────────── */}
      <div className="page-head">
        <div>
          <div className="eyebrow">Academic · {totalUnitsEarned} units earned</div>
          <h2>My <em>grades</em></h2>
          <div className="sub">Midterm and final grades for the current term, with full grade history per academic semester.</div>
        </div>
        <div className="actions">
          <button className="btn-sec" onClick={() => {}}>
            <i className="ti ti-file-export" /> Export PDF
          </button>
        </div>
      </div>

      {/* ── Stat row ───────────────────────────────────────── */}
      <div className="stat-row" style={{ marginBottom: '1.75rem' }}>
        <div className="stat">
          <div className="num">{cumulativeGwa ?? '-'}</div>
          <div className="lbl">Cumulative GWA</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: currentGwa ? 'var(--green)' : undefined }}>{currentGwa ?? '-'}</div>
          <div className="lbl">This term · GWA</div>
        </div>
        <div className="stat">
          <div className="num">{formatUnits(currentUnits)}</div>
          <div className="lbl">Units this term</div>
        </div>
        <div className="stat">
          <div className="num">{formatUnits(totalUnitsEarned)}</div>
          <div className="lbl">Total units earned</div>
        </div>
        <div className="stat">
          <div className="num">
            {standing ? (
              <span
                className={`tag ${isIrregular ? 'status-locked' : 'status-active'}`}
                style={{ fontSize: 11 }}
                title={isIrregular
                  ? `${backSubjects.length} back subject${backSubjects.length !== 1 ? 's' : ''} (failed, incomplete, or dropped) still to be resolved`
                  : 'No failed, incomplete, or dropped subjects on record'}
              >
                {standing}
              </span>
            ) : '-'}
          </div>
          <div className="lbl">
            Standing{isIrregular ? ` · ${backSubjects.length} back subject${backSubjects.length !== 1 ? 's' : ''}` : ''}
          </div>
        </div>
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
          {/* ── Current term grades ─────────────────────────── */}
          {currentRecords.length > 0 && (
            <>
              <div className="card-head" style={{ background: 'transparent', border: 0, padding: 0, marginBottom: '1rem' }}>
                <h4>Current term<span>{termLabel}{currentTerm?.block_code ? ` · ${currentTerm.block_code}` : ''}</span></h4>
              </div>
              <div className="table-wrap" style={{ marginBottom: '2rem' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 110 }}>Code</th>
                      <th>Subject</th>
                      <th>Instructor</th>
                      <th className="num" style={{ width: 60 }}>Units</th>
                      <th className="num" style={{ width: 80 }}>Midterm</th>
                      <th className="num" style={{ width: 80 }}>Final</th>
                      <th style={{ width: 120 }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600, color: 'var(--gold)', letterSpacing: '.04em' }}>
                          {r.subject_code}{r.section ? <span style={{ color: 'var(--muted)', fontWeight: 500 }}> [{r.section}]</span> : ''}
                        </td>
                        <td><strong style={{ fontWeight: 500, color: 'var(--ink)' }}>{r.subject_name}</strong></td>
                        <td style={{ color: 'var(--muted)' }}>{r.faculty_name || '-'}</td>
                        <td className="num">{formatUnits(r.subject_units)}</td>
                        <td className="num" style={{ fontWeight: 500, color: gradeColor(r.midterm_grade) }}>{r.midterm_grade ?? '-'}</td>
                        <td className="num" style={{ fontWeight: 500, color: gradeColor(r.final_grade) }}>{r.final_grade ?? '-'}</td>
                        <td>
                          {r.is_submitted ? (
                            <span className={`tag ${parseFloat(r.grade) <= 3.0 ? 'status-active' : 'status-locked'}`} style={{ fontSize: 10 }}>
                              {r.remarks || (parseFloat(r.grade) <= 3.0 ? 'Passed' : 'Failed')}
                            </span>
                          ) : (
                            <span className="tag pending" style={{ fontSize: 10 }}>Not yet posted</span>
                          )}
                        </td>
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
              <div className="card-head" style={{ background: 'transparent', border: 0, padding: 0, marginBottom: '1rem' }}>
                <h4>Grade history<span>{historyTerms.length} completed term{historyTerms.length !== 1 ? 's' : ''}</span></h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {historyTerms.map(term => {
                  const termGpa = wGpa(term.records);
                  const termUnits = term.records.reduce((s, r) => s + parseFloat(r.subject_units || 0), 0);
                  return (
                    <TermHistorySection key={term.display} term={term} gpa={termGpa} totalUnits={termUnits} />
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

const GH_CSS = `
  .gh-list{display:flex;flex-direction:column;background:#fff;}
  .gh-item{display:flex;align-items:center;gap:1rem;padding:.9rem 1.25rem;border-top:1px solid var(--line-soft);transition:background .12s;}
  .gh-item:first-child{border-top:none;}
  .gh-item:hover{background:var(--warm);}
  .gh-main{flex:1;min-width:0;}
  .gh-code{font-size:11px;font-weight:600;color:var(--gold);letter-spacing:.05em;}
  .gh-sec{color:var(--muted);font-weight:500;}
  .gh-name{font-size:14px;font-weight:500;color:var(--ink);margin-top:2px;line-height:1.3;}
  .gh-meta{font-size:12px;color:var(--muted);margin-top:3px;}
  .gh-grades{display:flex;align-items:flex-end;gap:1.75rem;flex-shrink:0;}
  .gh-grade{text-align:center;min-width:44px;}
  .gh-glabel{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--faint);font-weight:600;}
  .gh-gval{font-size:15px;font-weight:500;margin-top:3px;font-variant-numeric:tabular-nums;line-height:1;}
  .gh-final .gh-gval{font-size:22px;font-weight:600;}
  .gh-remark{flex-shrink:0;min-width:88px;text-align:right;}
  @media(max-width:600px){
    .gh-item{flex-wrap:wrap;gap:.75rem 1rem;padding:1rem 1.1rem;}
    .gh-main{flex-basis:100%;}
    .gh-grades{gap:1.5rem;order:2;}
    .gh-grade{text-align:left;}
    .gh-remark{order:2;margin-left:auto;text-align:right;align-self:center;}
  }
`;

function TermHistorySection({ term, gpa, totalUnits }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="info-section" style={{ marginBottom: 0 }}>
      <div
        className="info-section-head"
        style={{ background: '#fff', borderBottom: open ? '1px solid var(--line)' : 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <div style={{ fontWeight: 500, fontSize: 18, color: 'var(--ink)', letterSpacing: '-.005em' }}>{term.display}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {term.records.length} subjects · {formatUnits(totalUnits)} units
            {gpa ? <> · GWA <strong style={{ color: 'var(--ink)' }}>{gpa}</strong></> : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span className="tag status-active">Completed</span>
          <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ color: 'var(--muted)', fontSize: 14 }} />
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
                    <div className="gh-gval" style={{ color: gradeColor(r.midterm_grade) }}>{r.midterm_grade ?? '-'}</div>
                  </div>
                  <div className="gh-grade gh-final">
                    <div className="gh-glabel">Final</div>
                    <div className="gh-gval" style={{ color: gradeColor(r.final_grade) }}>{r.final_grade ?? '-'}</div>
                  </div>
                </div>
                <div className="gh-remark">
                  {r.is_submitted ? (
                    <span className={`tag ${passed ? 'status-active' : 'status-locked'}`} style={{ fontSize: 10 }}>
                      {r.remarks || (passed ? 'Passed' : 'Failed')}
                    </span>
                  ) : (
                    <span className="tag pending" style={{ fontSize: 10 }}>Not yet posted</span>
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
