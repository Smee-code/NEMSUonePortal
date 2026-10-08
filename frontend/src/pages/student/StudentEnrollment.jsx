import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const STATUS_META = {
  pending:  { label: 'Pending review', cls: 'pending'  },
  approved: { label: 'Approved',       cls: 'approved' },
  rejected: { label: 'Rejected',       cls: 'rejected' },
};

const YEAR_LABEL = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

// What the current-term record says in plain language, per status.
const STANDING = {
  approved: { line: 'Officially enrolled',               tone: 'var(--green)' },
  pending:  { line: 'Submitted — awaiting validation',   tone: 'var(--amber)' },
  rejected: { line: 'Not enrolled — see remarks below',  tone: 'var(--red)'   },
};

export default function StudentEnrollment() {
  const { user } = useAuth();

  const [history, setHistory]   = useState([]);
  const [offered, setOffered]   = useState(null);   // { term, program, year_level, already_submitted, courses }
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [historyModal, setHistoryModal] = useState(null); // a past enrollment to view

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [hRes, oRes] = await Promise.all([
        api.get('/enrollment/my/'),
        api.get('/enrollment/offered/'),
      ]);
      setHistory(hRes.data);
      setOffered(oRes.data);
    } catch { /* leave empty */ }
    finally { setLoading(false); }
  }

  const term        = offered?.term;
  const termLabel   = term ? term.label : 'No active term';
  const currentEnrollment = history.find(h => h.academic_term.id === term?.id);
  // Rejected requests aren't shown on the page — the student is told why by a
  // notification + email, and can simply enroll again below.
  const pastEnrollments   = history.filter(h => h.academic_term.id !== term?.id && h.status !== 'rejected');
  const courses     = offered?.courses || [];
  const eligible    = courses.filter(c => c.eligible);
  const blocked     = courses.filter(c => !c.eligible);
  const eligibleUnits = eligible.reduce((s, c) => s + parseFloat(c.units || 0), 0);

  async function handleSubmit() {
    setSubmitError('');
    setSubmitting(true);
    try {
      await api.post('/enrollment/enroll/continuing/', {});
      setSubmitSuccess(true);
      await load();
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="page"><p style={{ color: 'var(--muted)' }}>Loading enrollment…</p></div>;
  }

  return (
    <div className="page">
      <style>{CSS}</style>

      {/* ── Page head ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow">Academic · {termLabel}</div>
          <h2>My <em>enrollment</em></h2>
          <div className="sub">Your certificate of registration for the current term, and a record of the terms you’ve completed.</div>
        </div>
      </div>

      {/* ── Current enrollment (COR) — rejected requests are hidden here; the
             student is notified of a rejection and can just enroll again. ── */}
      {currentEnrollment && currentEnrollment.status !== 'rejected' && (
        <CurrentEnrollment enr={currentEnrollment} user={user} />
      )}

      {/* ── Enroll panel (when not enrolled this term, or after a rejection) ── */}
      {(!currentEnrollment || currentEnrollment.status === 'rejected') && (
        <EnrollPanel
          offered={offered} term={term} termLabel={termLabel}
          eligible={eligible} blocked={blocked} eligibleUnits={eligibleUnits}
          submitting={submitting} submitError={submitError} submitSuccess={submitSuccess}
          isResubmit={false}
          onSubmit={handleSubmit}
        />
      )}

      {/* ── History (a chronological record, so shown as a timeline) ── */}
      <div className="sec-head" style={{ marginTop: '2rem' }}>
        <div>
          <h3>Enrollment <em>history</em></h3>
          <div className="sub">{pastEnrollments.length
            ? `${pastEnrollments.length} completed term${pastEnrollments.length !== 1 ? 's' : ''} on record`
            : 'Past terms will appear here'}</div>
        </div>
      </div>
      {pastEnrollments.length === 0 ? (
        <div className="stu-empty"><i className="ti ti-clipboard-list" /><p>No completed terms yet. This is your first term on record.</p></div>
      ) : (
        <div className="se-tl">
          {pastEnrollments.map((req, i) => (
            <TimelineRow key={req.id} req={req} last={i === pastEnrollments.length - 1}
              onOpen={() => setHistoryModal(req)} />
          ))}
        </div>
      )}

      {historyModal && (
        <HistoryModal enr={historyModal} onClose={() => setHistoryModal(null)} />
      )}
    </div>
  );
}

/* ── Enrollment history detail modal ─────────────────────────── */
function HistoryModal({ enr, onClose }) {
  const meta = STATUS_META[enr.status] ?? STATUS_META.pending;
  const subjects = enr.subjects ?? [];
  return (
    <div className="se-overlay" onClick={onClose}>
      <div className="se-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="se-modal-head">
          <div>
            <div className="se-modal-eyebrow">Enrollment record</div>
            <div className="se-modal-term">
              {enr.academic_term.semester_display} {enr.academic_term.year}
            </div>
            <div className="se-modal-meta">
              {enr.year_level_display}
              {enr.program_code ? ` · ${enr.program_code}` : ''}
              {enr.block_name ? ` · ${enr.block_name}` : ''}
              {enr.student_type_display ? ` · ${enr.student_type_display}` : ''}
            </div>
          </div>
          <button className="se-modal-x" onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>
        </div>

        <div className="se-modal-body">
          <div className="se-modal-bh">
            <h4>Enrolled subjects</h4>
            <span className={`se-status se-status--${meta.cls}`}>{meta.label}</span>
          </div>
          {subjects.length > 0 ? (
            <div className="table-wrap">
              <table className="se-table">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Code</th>
                    <th>Descriptive title</th>
                    <th className="num" style={{ width: 80 }}>Units</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(s => (
                    <tr key={s.id || s.code}>
                      <td className="se-code">{s.code}</td>
                      <td className="se-title">{s.name}</td>
                      <td className="num">{fmtUnits(s.units)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Total academic load</td>
                    <td className="num">{fmtUnits(enr.total_units)} units</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="stu-empty"><i className="ti ti-clipboard-list" /><p>No subjects recorded for this term.</p></div>
          )}
          {enr.remarks && (
            <div className="se-remarks" style={{ marginTop: '1rem' }}>
              <i className="ti ti-message-2" />
              <span><strong>Registrar remarks:</strong> {enr.remarks}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Current enrollment / Certificate of Registration ────────────── */
function CurrentEnrollment({ enr, user }) {
  const standing = STANDING[enr.status] ?? STANDING.pending;
  const meta = STATUS_META[enr.status] ?? STATUS_META.pending;
  const subjects = enr.subjects ?? [];

  const facts = [
    ['Student No.', enr.student_id ?? user?.student_id ?? '—', true],
    ['Program',     enr.program_code ?? '—', false],
    ['Year Level',  enr.year_level_display ?? '—', false],
    ['Block',       enr.block_name ?? enr.block_code ?? '—', false],
  ];

  return (
    <div className="se-cor">
      {/* document header */}
      <div className="se-cor-top">
        <div>
          <div className="se-cor-eyebrow">Certificate of Registration</div>
          <h3 className="se-cor-term">
            {enr.academic_term.semester_display} <em>{enr.academic_term.year}</em>
          </h3>
          <div className="se-cor-standing" style={{ color: standing.tone }}>
            <i className={`ti ${enr.status === 'approved' ? 'ti-circle-check'
              : enr.status === 'rejected' ? 'ti-circle-x' : 'ti-clock'}`} />
            {standing.line}
            {enr.student_type_display ? ` · ${enr.student_type_display}` : ''}
          </div>
        </div>
        <span className={`se-status se-status--${meta.cls}`}>{meta.label}</span>
      </div>

      {/* registration facts */}
      <div className="se-cor-meta">
        {facts.map(([label, value, mono]) => (
          <div key={label}>
            <div className="se-dt">{label}</div>
            <div className={`se-dd${mono ? ' mono' : ''}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* enrolled subjects */}
      {subjects.length > 0 && (
        <div className="se-cor-body">
          <div className="se-cor-bh">
            <h4>Enrolled subjects</h4>
            <span>{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="table-wrap">
            <table className="se-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Code</th>
                  <th>Descriptive title</th>
                  <th className="num" style={{ width: 80 }}>Units</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map(s => (
                  <tr key={s.id || s.code}>
                    <td className="se-code">{s.code}</td>
                    <td className="se-title">{s.name}</td>
                    <td className="num">{fmtUnits(s.units)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Total academic load</td>
                  <td className="num">{fmtUnits(enr.total_units)} units</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {enr.remarks && (
        <div className="se-remarks">
          <i className="ti ti-message-2" />
          <span><strong>Registrar remarks:</strong> {enr.remarks}</span>
        </div>
      )}
    </div>
  );
}

/* ── Enroll panel ────────────────────────────────────────────── */
function EnrollPanel({ offered, term, termLabel, eligible, blocked, eligibleUnits, submitting, submitError, submitSuccess, isResubmit, onSubmit }) {
  if (submitSuccess || offered?.already_submitted) {
    return (
      <div className="se-submitted">
        <i className="ti ti-circle-check" />
        <h3>Enrollment {isResubmit ? 'resubmitted' : 'submitted'}</h3>
        <p>The registrar will review your enrollment and finalize your courses. You’ll be notified of the outcome.</p>
      </div>
    );
  }
  if (!term) return <ClosedNotice title="Enrollment is closed." desc="There’s no term open for enrollment right now. Please check back later." />;
  if (!term.enrollment_open) return <ClosedNotice title="Enrollment is closed." desc="Enrollment for this term isn’t open yet. Please check back later or contact the registrar." />;
  if (offered?.blocks_full) return <ClosedNotice title="Slots are full." desc="This program is no longer accepting students for your year level this term — all blocks are full. Please contact the registrar's office." icon="ti-users-group" />;
  if (!offered?.program || !offered?.year_level) {
    return <ClosedNotice title="Your record isn’t set up yet." desc="Your program and year level haven’t been set. Please contact the registrar’s office to enroll." icon="ti-user-question" />;
  }

  const yearLabel = YEAR_LABEL[offered.year_level] || `Year ${offered.year_level}`;

  return (
    <div className="se-cor">
      <div className="se-cor-top">
        <div>
          <div className="se-cor-eyebrow">{isResubmit ? 'Resubmit' : 'Enroll'} — {termLabel}</div>
          <h3 className="se-cor-term">{offered.program.code} · <em>{yearLabel}</em></h3>
          <div className="se-cor-sub">{isResubmit
            ? 'Your previous request was rejected (see the registrar’s remarks above). Review the courses and resubmit — the registrar will review it again.'
            : 'These courses are offered for your year level this semester. The registrar reviews your enrollment before it’s final.'}</div>
        </div>
      </div>

      <div className="se-cor-body">
        {eligible.length === 0 ? (
          <div className="se-note">No courses are available for you to enroll in this term. Please contact the registrar.</div>
        ) : (
          <div className="table-wrap">
            <table className="se-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Code</th>
                  <th>Descriptive title</th>
                  <th className="num" style={{ width: 80 }}>Units</th>
                </tr>
              </thead>
              <tbody>
                {eligible.map(c => (
                  <tr key={c.id}>
                    <td className="se-code">{c.code}</td>
                    <td className="se-title">{c.name}</td>
                    <td className="num">{fmtUnits(c.units)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>{eligible.length} course{eligible.length !== 1 ? 's' : ''}</td>
                  <td className="num">{fmtUnits(eligibleUnits)} units</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {blocked.length > 0 && (
          <div className="se-blocked">
            <div className="se-blocked-h">Not available yet</div>
            {blocked.map(c => (
              <div key={c.id} className="se-blocked-row">
                <span><strong>{c.code}</strong> — {c.name}</span>
                <span className="se-blocked-why">
                  <i className="ti ti-lock" />
                  {c.blocked_reason || `Requires passing ${c.prerequisite_code}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {submitError && <div className="se-error">{submitError}</div>}

        <div className="se-submit">
          <div className="se-submit-sum">
            <strong>{eligible.length}</strong> course{eligible.length !== 1 ? 's' : ''} ·{' '}
            <strong>{fmtUnits(eligibleUnits)}</strong> units
          </div>
          <button className="btn-pri" disabled={submitting || eligible.length === 0} onClick={onSubmit}>
            {submitting ? 'Submitting…' : isResubmit ? 'Resubmit enrollment' : 'Submit enrollment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClosedNotice({ title, desc, icon = 'ti-calendar-off' }) {
  return (
    <div className="se-closed">
      <i className={`ti ${icon}`} />
      <div>
        <div className="se-closed-t">{title}</div>
        <div className="se-closed-d">{desc}</div>
      </div>
    </div>
  );
}

/* ── History timeline row ────────────────────────────────────── */
function TimelineRow({ req, last, onOpen }) {
  const meta = STATUS_META[req.status] ?? STATUS_META.pending;
  return (
    <div className="se-tl-item">
      <div className="se-tl-rail">
        <span className={`se-tl-dot se-tl-dot--${meta.cls}`} />
        {!last && <span className="se-tl-line" />}
      </div>
      <button type="button" className="se-tl-card se-tl-card--clickable" onClick={onOpen}
        title="View enrolled subjects for this term">
        <div className="se-tl-main">
          <div className="se-tl-term">
            {req.academic_term.semester_display} {req.academic_term.year}
          </div>
          <div className="se-tl-meta">
            {req.year_level_display}
            {req.program_code ? ` · ${req.program_code}` : ''}
            {req.block_name ? ` · ${req.block_name}` : ''}
            {req.student_type_display ? ` · ${req.student_type_display}` : ''}
          </div>
          {req.remarks && <div className="se-tl-remarks">Remarks: {req.remarks}</div>}
        </div>
        <div className="se-tl-nums">
          <div className="se-tl-num"><strong>{req.subjects?.length ?? 0}</strong><span>subjects</span></div>
          <div className="se-tl-num"><strong>{fmtUnits(req.total_units)}</strong><span>units</span></div>
        </div>
        <span className={`se-status se-status--${meta.cls}`}>{meta.label}</span>
        <i className="ti ti-chevron-right se-tl-chev" />
      </button>
    </div>
  );
}

function fmtUnits(val) {
  const n = parseFloat(val);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

/* ── Scoped styles ───────────────────────────────────────────── */
const CSS = `
  /* Certificate-of-registration document */
  .se-cor{background:#fff;border:1px solid var(--line);border-top:3px solid var(--gold);margin-bottom:1rem;}
  .se-cor-top{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem 1.5rem;
    padding:1.5rem 1.75rem;border-bottom:1px solid var(--line-soft);flex-wrap:wrap;}
  .se-cor-eyebrow{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:.55rem;}
  .se-cor-term{font-family:'Inter',sans-serif;font-weight:500;font-size:27px;color:var(--ink);letter-spacing:-.015em;line-height:1.08;}
  .se-cor-term em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-weight:400;color:var(--ink-2);}
  .se-cor-standing{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:500;margin-top:.6rem;}
  .se-cor-standing i{font-size:16px;}
  .se-cor-sub{font-size:13px;color:var(--muted);margin-top:.6rem;max-width:560px;line-height:1.6;}

  /* status pill (shared by COR + timeline) */
  .se-status{display:inline-flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;
    letter-spacing:.09em;text-transform:uppercase;padding:6px 12px;white-space:nowrap;flex-shrink:0;}
  .se-status::before{content:'';width:7px;height:7px;border-radius:50%;}
  .se-status--approved{background:var(--green-tint);color:var(--green);}
  .se-status--approved::before{background:var(--green);}
  .se-status--pending{background:var(--amber-tint);color:var(--amber);}
  .se-status--pending::before{background:var(--amber);}
  .se-status--rejected{background:var(--red-tint);color:var(--red);}
  .se-status--rejected::before{background:var(--red);}

  /* registration facts */
  .se-cor-meta{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:1.5rem;
    padding:1.5rem 1.75rem;border-bottom:1px solid var(--line-soft);background:var(--warm);}
  .se-dt{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:7px;}
  .se-dd{font-weight:500;font-size:15px;color:var(--ink);}
  .se-dd.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.01em;}

  /* subjects table */
  .se-cor-body{padding:1.5rem 1.75rem 1.75rem;}
  .se-cor-bh{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:1rem;}
  .se-cor-bh h4{font-size:15px;font-weight:600;color:var(--ink);}
  .se-cor-bh span{font-size:12px;color:var(--muted);}
  .se-table{width:100%;border-collapse:collapse;font-size:13px;border:1px solid var(--line);}
  .se-table thead th{background:var(--warm);text-align:left;font-size:10px;letter-spacing:.12em;text-transform:uppercase;
    color:var(--muted);font-weight:600;padding:12px 18px;border-bottom:1px solid var(--line);}
  .se-table th.num,.se-table td.num{text-align:right;font-variant-numeric:tabular-nums;}
  .se-table td{padding:14px 18px;border-bottom:1px solid var(--line-soft);color:var(--ink);vertical-align:middle;}
  .se-table tbody tr:last-child td{border-bottom:0;}
  .se-table tbody tr:hover td{background:var(--cool);}
  .se-code{font-weight:600;color:var(--gold);letter-spacing:.03em;white-space:nowrap;}
  .se-title{font-weight:500;}
  .se-table tfoot td{padding:13px 18px;border-top:1px solid var(--line);background:var(--warm);
    font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600;}
  .se-table tfoot td.num{font-size:15px;letter-spacing:0;text-transform:none;color:var(--ink);font-weight:600;}

  .se-remarks{display:flex;gap:10px;align-items:flex-start;padding:1rem 1.75rem 1.25rem;font-size:13px;color:var(--ink);line-height:1.55;}
  .se-remarks i{color:var(--amber);font-size:16px;margin-top:1px;}

  /* enroll panel extras */
  .se-note{background:var(--warm);border:1px solid var(--line);padding:1.25rem;font-size:13px;color:var(--muted);}
  .se-blocked{margin-top:1.25rem;}
  .se-blocked-h{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:.6rem;}
  .se-blocked-row{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.6rem .85rem;
    background:var(--warm);border:1px solid var(--line-soft);margin-bottom:6px;font-size:13px;}
  .se-blocked-row>span:first-child{color:var(--muted);}
  .se-blocked-why{display:inline-flex;align-items:center;gap:5px;color:var(--amber);font-size:11.5px;flex-shrink:0;}
  .se-error{background:var(--red-tint);color:var(--red);padding:.75rem 1rem;margin-top:1rem;font-size:13px;}
  .se-submit{display:flex;justify-content:space-between;align-items:center;gap:1rem;
    border-top:1px solid var(--line-soft);padding-top:1.25rem;margin-top:1.25rem;}
  .se-submit-sum{font-size:13px;color:var(--muted);}
  .se-submit-sum strong{color:var(--ink);font-weight:600;}

  .se-submitted{background:var(--green-tint);border:1px solid #a7f3d0;padding:2.25rem 2rem;text-align:center;margin-bottom:1rem;}
  .se-submitted i{font-size:42px;color:var(--green);display:block;margin-bottom:.75rem;}
  .se-submitted h3{color:var(--green);font-size:22px;font-weight:500;margin-bottom:.5rem;}
  .se-submitted p{color:var(--ink);font-size:14px;max-width:460px;margin:0 auto;line-height:1.6;}

  .se-closed{background:var(--warm);border:1px solid var(--line);padding:1.5rem;margin-bottom:1rem;display:flex;align-items:center;gap:16px;}
  .se-closed i{font-size:28px;color:var(--muted);flex-shrink:0;}
  .se-closed-t{font-weight:600;color:var(--ink);margin-bottom:4px;}
  .se-closed-d{font-size:13px;color:var(--muted);line-height:1.55;}

  /* history timeline */
  .se-tl{display:flex;flex-direction:column;}
  .se-tl-item{display:grid;grid-template-columns:auto 1fr;gap:1.1rem;}
  .se-tl-rail{display:flex;flex-direction:column;align-items:center;}
  .se-tl-dot{width:13px;height:13px;border-radius:50%;margin-top:1.35rem;flex-shrink:0;
    box-shadow:0 0 0 3px #fff, 0 0 0 4px var(--line);}
  .se-tl-dot--approved{background:var(--green);box-shadow:0 0 0 3px #fff,0 0 0 4px var(--green);}
  .se-tl-dot--pending{background:var(--amber);box-shadow:0 0 0 3px #fff,0 0 0 4px var(--amber);}
  .se-tl-dot--rejected{background:var(--red);box-shadow:0 0 0 3px #fff,0 0 0 4px var(--red);}
  .se-tl-line{flex:1;width:2px;background:var(--line);margin:6px 0;}
  .se-tl-card{display:flex;align-items:center;gap:1.25rem;flex-wrap:wrap;
    background:#fff;border:1px solid var(--line);padding:1.1rem 1.4rem;margin-bottom:.9rem;flex:1;}
  .se-tl-main{flex:1;min-width:180px;}
  .se-tl-term{font-weight:500;font-size:18px;color:var(--ink);letter-spacing:-.005em;}
  .se-tl-meta{font-size:11.5px;color:var(--muted);margin-top:4px;}
  .se-tl-remarks{font-size:12px;color:var(--amber);margin-top:5px;font-style:italic;}
  .se-tl-nums{display:flex;gap:1.75rem;}
  .se-tl-num{text-align:center;}
  .se-tl-num strong{display:block;font-weight:500;font-size:20px;color:var(--ink);line-height:1;}
  .se-tl-num span{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600;}

  /* Clickable history card → opens the detail modal */
  .se-tl-card--clickable{width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer;
    transition:border-color .12s,box-shadow .12s;}
  .se-tl-card--clickable:hover{border-color:var(--ink);box-shadow:0 2px 12px rgba(10,22,40,.07);}
  .se-tl-card--clickable:focus-visible{outline:2px solid var(--ink);outline-offset:2px;}
  .se-tl-chev{font-size:18px;color:var(--faint);flex-shrink:0;}
  .se-tl-card--clickable:hover .se-tl-chev{color:var(--ink);}

  /* Enrollment history detail modal */
  .se-overlay{position:fixed;inset:0;background:rgba(10,22,40,.5);display:flex;align-items:center;
    justify-content:center;padding:1.5rem;z-index:1000;}
  .se-modal{background:#fff;border:1px solid var(--line);width:100%;max-width:620px;max-height:85vh;
    overflow:auto;box-shadow:0 20px 60px rgba(10,22,40,.25);}
  .se-modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;
    padding:1.5rem 1.75rem;border-bottom:1px solid var(--line-soft);}
  .se-modal-eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:.5rem;}
  .se-modal-term{font-family:'Inter',sans-serif;font-weight:500;font-size:22px;color:var(--ink);letter-spacing:-.01em;line-height:1.1;}
  .se-modal-meta{font-size:12px;color:var(--muted);margin-top:.5rem;}
  .se-modal-x{background:none;border:none;cursor:pointer;color:var(--muted);font-size:20px;line-height:1;padding:4px;flex-shrink:0;}
  .se-modal-x:hover{color:var(--ink);}
  .se-modal-body{padding:1.25rem 1.75rem 1.75rem;}
  .se-modal-bh{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.9rem;}
  .se-modal-bh h4{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600;margin:0;}

  @media(max-width:620px){
    .se-cor-term{font-size:23px;}
    .se-tl-card{gap:.75rem 1.1rem;}
    .se-tl-nums{gap:1.25rem;}
    .se-status{order:3;}
  }
`;
