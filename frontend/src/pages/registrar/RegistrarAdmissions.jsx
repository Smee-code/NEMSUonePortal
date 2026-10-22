import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useRegistrarShell } from '../../context/RegistrarShellContext';

function initials(name) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

// Required document labels per applicant type (must match the labels the
// applicant uploads under, from the landing admission form).
const REQUIRED_DOCS = {
  new: [
    'SHS Form 138 / Report Card', 'PSA Birth Certificate', 'Good Moral Certificate',
    'SHS Diploma / Certificate of Completion', '2x2 ID photos (4 copies)',
    'Medical Certificate', 'Entrance Exam Result / Admission Slip',
  ],
  transferee: [
    'Transcript of Records (TOR)', 'Honorable Dismissal', 'Good Moral Certificate',
    'PSA Birth Certificate', '2x2 ID photos (4 copies)', 'Medical Certificate',
    'Application / Admission Form',
  ],
  returnee: [
    'Previous Certificate of Registration (COR)', 'Readmission / Re-enrollment Form',
    'Clearance from last enrollment', 'Updated Medical Certificate',
  ],
};

function missingDocs(studentType, uploadedDocs) {
  const required = REQUIRED_DOCS[studentType] || [];
  const uploaded = new Set((uploadedDocs || []).map(d => d.requirement_label));
  return required.filter(label => !uploaded.has(label));
}

const FILTERS = [
  { value: '',          label: 'All'       },
  { value: 'pending',   label: 'Pending'   },
  { value: 'approved',  label: 'Approved'  },
  { value: 'rejected',  label: 'Rejected'  },
  { value: 'activated', label: 'Activated' },
];

const CSS = `
.ad-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:1rem;
  padding-bottom:1.1rem; margin-bottom:1.3rem; border-bottom:1px solid var(--reg-line); flex-wrap:wrap; }
.ad-eyebrow{ display:inline-flex; align-items:center; gap:10px; font-size:10px; letter-spacing:.16em;
  text-transform:uppercase; color:var(--reg-gold); font-weight:700; margin-bottom:.5rem; }
.ad-eyebrow::before{ content:''; width:22px; height:1px; background:var(--reg-gold); }
.ad-head h1{ margin:0; font:600 24px/1.15 'Inter',sans-serif; color:var(--reg-ink); letter-spacing:-.015em; }
.ad-head h1 em{ font-family:'Instrument Serif',Georgia,serif; font-style:italic; font-weight:400; color:var(--reg-gold); letter-spacing:0; }
.ad-lede{ margin:.4rem 0 0; font-size:13.5px; color:var(--reg-muted); max-width:62ch; line-height:1.5; }

/* Enrollment-window panel (collapsible) */
.ad-win{ border:1px solid var(--reg-line); background:#fff; margin-bottom:1.4rem; }
.ad-win-hd{ display:flex; align-items:center; gap:12px; width:100%; padding:13px 18px; background:none;
  border:none; cursor:pointer; text-align:left; font-family:'Inter',sans-serif; }
.ad-win-hd:hover{ background:var(--reg-warm); }
.ad-win-ic{ width:34px; height:34px; display:flex; align-items:center; justify-content:center;
  background:var(--reg-gold-tint); color:#8a6a12; flex-shrink:0; }
.ad-win-ic i{ font-size:17px; }
.ad-win-tt{ display:block; font:600 14px 'Inter',sans-serif; color:var(--reg-ink); }
.ad-win-sb{ display:block; font-size:12px; color:var(--reg-muted); margin-top:2px; }
.ad-win-chev{ margin-left:auto; color:var(--reg-faint); font-size:18px; }
.ad-win-body{ padding:0 18px 18px; border-top:1px solid var(--reg-line-soft); }

/* Figures strip */
.ad-figs{ display:grid; grid-template-columns:repeat(4,1fr); border:1px solid var(--reg-line); background:#fff; margin-bottom:1.25rem; }
.ad-fig{ padding:14px 18px; border-right:1px solid var(--reg-line-soft); display:flex; flex-direction:column; gap:2px; }
.ad-fig:last-child{ border-right:none; }
.ad-fig-num{ font:600 26px/1 'Inter',sans-serif; color:var(--reg-ink); font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.ad-fig-num.amber{ color:var(--reg-amber); } .ad-fig-num.green{ color:var(--reg-green); } .ad-fig-num.red{ color:var(--reg-red); }
.ad-fig-lbl{ font-size:11.5px; color:var(--reg-muted); }

/* Applicant cards */
.ad-card{ background:#fff; border:1px solid var(--reg-line); border-left-width:4px; border-left-color:var(--reg-line); padding:1rem 1.25rem; }
.ad-card-pending{ border-left-color:var(--reg-gold); }
.ad-card-approved{ border-left-color:var(--reg-green); }
.ad-card-rejected{ border-left-color:var(--reg-red); }
.ad-card-activated{ border-left-color:var(--reg-ink-2); }
.ad-type{ display:inline-block; margin-left:8px; background:var(--reg-gold-tint); color:#8a6a12; font-size:11px; font-weight:700; padding:2px 8px; vertical-align:middle; }

@media (max-width:820px){ .ad-figs{ grid-template-columns:repeat(2,1fr); } .ad-fig:nth-child(2){ border-right:none; } }
`;

export default function RegistrarAdmissions() {
  const { toast } = useRegistrarShell();

  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState('pending');

  // Review modal
  const [selected,    setSelected]    = useState(null);
  const [remarks,     setRemarks]     = useState('');
  const [reviewing,   setReviewing]   = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [docs,        setDocs]        = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [previewDoc,  setPreviewDoc]  = useState(null);

  // Follow-up email composer
  const [followupOpen,    setFollowupOpen]    = useState(false);
  const [followupMsg,     setFollowupMsg]     = useState('');
  const [followupSending, setFollowupSending] = useState(false);
  const [followupError,   setFollowupError]   = useState('');
  const [followupSuccess, setFollowupSuccess] = useState('');

  useEffect(() => { fetchApps(); }, []);

  function fetchApps() {
    setLoading(true);
    setError('');
    api.get('/enrollment/pending/?status=')
      .then(res => setApps(Array.isArray(res.data) ? res.data : (res.data.results ?? [])))
      .catch(() => setError('Failed to load admission applications.'))
      .finally(() => setLoading(false));
  }

  function openReview(app) {
    setSelected(app);
    setRemarks('');
    setReviewError('');
    setDocs([]);
    setFollowupOpen(false);
    setFollowupMsg('');
    setFollowupError('');
    setFollowupSuccess('');
    setDocsLoading(true);
    api.get(`/enrollment/pending/${app.id}/documents/`)
      .then(res => setDocs(res.data))
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }

  async function handleFollowupEmail() {
    if (!followupMsg.trim()) { setFollowupError('Message is required.'); return; }
    setFollowupSending(true);
    setFollowupError('');
    setFollowupSuccess('');
    try {
      await api.post(`/enrollment/pending/${selected.id}/followup-email/`, { message: followupMsg.trim() });
      setFollowupSuccess('Follow-up email sent.');
      setFollowupOpen(false);
      toast(`Follow-up email sent to ${selected.email}.`, 'success');
    } catch (err) {
      setFollowupError(err.response?.data?.error || 'Failed to send email.');
    } finally {
      setFollowupSending(false);
    }
  }

  async function handleReview(newStatus) {
    if (newStatus === 'rejected' && !remarks.trim()) {
      setReviewError('A reason is required when rejecting an application.');
      return;
    }
    setReviewing(true);
    setReviewError('');
    try {
      const res = await api.patch(`/enrollment/pending/${selected.id}/review/`, {
        status: newStatus, remarks: remarks.trim(),
      });
      const sid = res.data?.assigned_student_id;
      toast(
        newStatus === 'approved'
          ? `${selected.full_name} approved${sid ? ` · Student ID ${sid}` : ''} — account-creation email sent.`
          : `${selected.full_name}'s application rejected.`,
        newStatus === 'approved' ? 'success' : 'error',
      );
      setSelected(null);
      fetchApps();
    } catch (err) {
      const data = err.response?.data;
      setReviewError(
        data?.remarks?.[0] || data?.detail || data?.non_field_errors?.[0] || 'Review failed. Please try again.'
      );
    } finally {
      setReviewing(false);
    }
  }

  // Derived
  const stats = {
    pending:   apps.filter(a => a.status === 'pending').length,
    approved:  apps.filter(a => a.status === 'approved').length,
    rejected:  apps.filter(a => a.status === 'rejected').length,
    activated: apps.filter(a => a.status === 'activated').length,
  };
  const shown = filter ? apps.filter(a => a.status === filter) : apps;

  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <header className="ad-head">
        <div>
          <div className="ad-eyebrow">Registrar · Public intake</div>
          <h1>Admissions <em>applications</em></h1>
          <p className="ad-lede">
            Freshmen, transferees, and returnees who applied through the public landing page.
            Review their documents, then approve to send an account-creation email, or reject with a reason.
          </p>
        </div>
      </header>

      {/* Figures */}
      <div className="ad-figs">
        <div className="ad-fig"><span className="ad-fig-num amber">{loading ? '—' : stats.pending}</span><span className="ad-fig-lbl">Pending review</span></div>
        <div className="ad-fig"><span className="ad-fig-num green">{loading ? '—' : stats.approved}</span><span className="ad-fig-lbl">Approved</span></div>
        <div className="ad-fig"><span className="ad-fig-num red">{loading ? '—' : stats.rejected}</span><span className="ad-fig-lbl">Rejected</span></div>
        <div className="ad-fig"><span className="ad-fig-num">{loading ? '—' : stats.activated}</span><span className="ad-fig-lbl">Activated</span></div>
      </div>

      {/* Filter */}
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`subtab${filter === f.value ? ' active' : ''}`}
              style={{ fontSize: '.78rem', padding: '.25rem .7rem' }}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--reg-red-tint)', color: 'var(--reg-red)', padding: '.75rem', marginBottom: '1rem', fontSize: '.9rem' }}>
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p style={{ color: 'var(--reg-muted)' }}>Loading applications…</p>
      ) : shown.length === 0 ? (
        <div className="empty">
          <i className="ti ti-user-search" />
          <div className="t">No applications</div>
          <div className="d">No {filter || ''} admission applications right now.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {shown.map(app => (
            <div key={app.id} className={`ad-card ad-card-${app.status}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.6rem' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--reg-ink)' }}>
                    {app.full_name}
                    <span className="ad-type">{app.student_type_display}</span>
                  </div>
                  <div style={{ fontSize: '.82rem', color: 'var(--reg-muted)', marginTop: 2 }}>
                    {app.email}{app.contact_number && <> · {app.contact_number}</>}
                  </div>
                  <div style={{ fontSize: '.82rem', color: 'var(--reg-ink-2)', marginTop: 2 }}>
                    {app.program_name || 'No program specified'}
                    {app.term_display && <> · {app.term_display}</>}
                    <span style={{ color: 'var(--reg-faint)', marginLeft: 6 }}>Ref: {app.reference_number}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexShrink: 0 }}>
                  <PendingStatusBadge status={app.status} />
                  {app.status === 'pending' && (
                    <button className="btn-pri" style={{ fontSize: '.82rem' }} onClick={() => openReview(app)}>
                      Review
                    </button>
                  )}
                </div>
              </div>
              {app.assigned_student_id && (
                <p style={{ marginTop: '.5rem', fontSize: '.85rem', color: 'var(--reg-ink)' }}>
                  <i className="ti ti-id-badge-2" style={{ marginRight: 5, color: 'var(--reg-gold)' }} />
                  Student ID: <strong style={{ fontFamily: 'ui-monospace,monospace' }}>{app.assigned_student_id}</strong>
                </p>
              )}
              {app.remarks && (
                <p style={{ marginTop: '.5rem', fontSize: '.85rem', color: 'var(--reg-ink-2)', fontStyle: 'italic' }}>
                  Remarks: {app.remarks}
                </p>
              )}
              <div style={{ fontSize: '.78rem', color: 'var(--reg-faint)', marginTop: '.4rem' }}>
                Submitted: {new Date(app.created_at).toLocaleString('en-PH')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review modal */}
      {selected && (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modal, maxWidth: 580, maxHeight: '88vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 .25rem', color: 'var(--reg-ink)', fontSize: '1.05rem' }}>
              Review admission application
            </h3>
            <div style={{ background: '#f8fafc', border: '1px solid var(--reg-line)', padding: '10px 14px', margin: '0 0 1rem', fontSize: '.85rem', color: 'var(--reg-ink-2)' }}>
              <div><strong>{selected.full_name}</strong> &nbsp;·&nbsp; {selected.student_type_display}</div>
              {selected.program_name && <div style={{ marginTop: 2 }}>{selected.program_name}</div>}
              <div style={{ marginTop: 2 }}>{selected.email} &nbsp;·&nbsp; Ref: <strong>{selected.reference_number}</strong></div>
            </div>

            {/* Applicant details (from the enrollment form) */}
            {(() => {
              const d = selected.details || {};
              const addr = d.address || {};
              const edu = d.education || {};
              const par = d.parents || {};
              const sp = d.spouse || null;
              const YL = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
              const sch = o => (o ? `${o.school || '-'}${o.year_graduated ? ` (${o.year_graduated})` : ''}` : null);
              const Row = ({ k, v }) => (v ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: '.8rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: 'var(--reg-muted)', flexShrink: 0 }}>{k}</span>
                  <span style={{ color: 'var(--reg-ink-2)', fontWeight: 500, textAlign: 'right' }}>{v}</span>
                </div>
              ) : null);
              const Sec = ({ t, children }) => (
                <div style={{ marginBottom: '.6rem' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--reg-gold)', margin: '0 0 2px' }}>{t}</div>
                  {children}
                </div>
              );
              return (
                <div style={{ marginBottom: '1rem', border: '1px solid var(--reg-line)', padding: '10px 14px', background: '#fff' }}>
                  <Sec t="Personal">
                    <Row k="Middle name" v={selected.middle_name} />
                    <Row k="Suffix" v={selected.suffix} />
                    <Row k="Contact" v={selected.contact_number} />
                    <Row k="Date of birth" v={selected.date_of_birth} />
                    <Row k="Birthplace" v={d.birthplace} />
                    <Row k="Sex" v={selected.sex} />
                    <Row k="Civil status" v={d.civil_status} />
                    <Row k="Citizenship" v={d.citizenship} />
                    <Row k="Religion" v={d.religion} />
                    <Row k="Ethnicity" v={d.ethnicity} />
                    <Row k="Major" v={d.major} />
                    <Row k="Year level" v={YL[selected.year_level]} />
                  </Sec>
                  {(addr.brgy || addr.town || addr.province) && (
                    <Sec t="Address"><Row k="Current address" v={[addr.brgy, addr.town, addr.province, addr.zip].filter(Boolean).join(', ')} /></Sec>
                  )}
                  {sp && (sp.name || sp.address) && (
                    <Sec t="Spouse"><Row k="Name" v={sp.name} /><Row k="Address" v={sp.address} /></Sec>
                  )}
                  {(par.father || par.mother || par.address) && (
                    <Sec t="Parent / Guardian"><Row k="Father" v={par.father} /><Row k="Mother" v={par.mother} /><Row k="Address" v={par.address} /></Sec>
                  )}
                  {(edu.elementary || edu.junior_high || edu.senior_high) && (
                    <Sec t="Education">
                      <Row k="Elementary" v={sch(edu.elementary)} />
                      <Row k="Junior High" v={sch(edu.junior_high)} />
                      <Row k="Senior High" v={sch(edu.senior_high)} />
                      {edu.last_attended && <Row k="Last attended" v={sch(edu.last_attended)} />}
                    </Sec>
                  )}
                </div>
              );
            })()}

            {/* Document checklist */}
            {(() => {
              const required = REQUIRED_DOCS[selected.student_type] || [];
              const byLabel = {};
              (docs || []).forEach(d => { byLabel[d.requirement_label] = d; });
              const submittedCount = required.filter(l => byLabel[l]).length;
              const extras = (docs || []).filter(d => !required.includes(d.requirement_label));
              return (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--reg-ink-2)', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <i className="ti ti-list-check" style={{ fontSize: 15 }} /> Document checklist
                    {docsLoading
                      ? <span style={{ fontSize: 11, color: 'var(--reg-muted)', fontWeight: 400 }}>Loading…</span>
                      : <span style={{ fontSize: 11, fontWeight: 600, color: submittedCount === required.length ? 'var(--reg-green)' : '#b45309' }}>
                          {submittedCount} of {required.length} submitted
                        </span>}
                  </div>
                  {required.map(label => {
                    const doc = byLabel[label];
                    const ok = !!doc;
                    return (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: ok ? '#fff' : '#fff7ed', border: `1px solid ${ok ? 'var(--reg-line)' : '#fed7aa'}`, marginBottom: 5 }}>
                        <i className={`ti ${ok ? 'ti-circle-check-filled' : 'ti-alert-circle'}`} style={{ fontSize: 18, color: ok ? 'var(--reg-green)' : '#d97706', flexShrink: 0 }} />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--reg-ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                          <div style={{ fontSize: '.75rem', color: ok ? 'var(--reg-muted)' : '#b45309' }}>
                            {ok ? `${doc.file_name} · ${(doc.file_size / 1024).toFixed(0)} KB` : 'Missing — not uploaded'}
                          </div>
                        </div>
                        {ok && (
                          <button type="button" onClick={() => setPreviewDoc({ ...doc, pendingId: selected.id })} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '.75rem', color: 'var(--reg-ink)', background: 'none', border: '1px solid var(--reg-line)', padding: '4px 9px', borderRadius: 5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                            <i className="ti ti-eye" style={{ fontSize: 14 }} /> Preview
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {extras.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--reg-muted)', margin: '.6rem 0 .35rem' }}>Other uploaded</div>
                      {extras.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: '#fff', border: '1px solid var(--reg-line)', marginBottom: 5 }}>
                          <i className="ti ti-file-type-pdf" style={{ fontSize: 18, color: '#dc2626', flexShrink: 0 }} />
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--reg-ink-2)' }}>{doc.requirement_label}</div>
                            <div style={{ fontSize: '.75rem', color: 'var(--reg-muted)' }}>{doc.file_name} · {(doc.file_size / 1024).toFixed(0)} KB</div>
                          </div>
                          <button type="button" onClick={() => setPreviewDoc({ ...doc, pendingId: selected.id })} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '.75rem', color: 'var(--reg-ink)', background: 'none', border: '1px solid var(--reg-line)', padding: '4px 9px', borderRadius: 5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                            <i className="ti ti-eye" style={{ fontSize: 14 }} /> Preview
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })()}

            <p style={{ fontSize: '.8rem', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', color: '#1e40af', margin: '0 0 .85rem' }}>
              <i className="ti ti-info-circle" style={{ marginRight: 5 }} />
              Approving sends the applicant an email with a link to create their student account.
            </p>

            <label style={{ display: 'block', fontWeight: 600, fontSize: '.85rem', color: 'var(--reg-ink-2)', marginBottom: '.35rem' }}>
              Remarks <span style={{ fontWeight: 400, color: 'var(--reg-muted)' }}>(required when rejecting)</span>
            </label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={3}
              placeholder="Enter remarks…"
              style={{ width: '100%', padding: '.5rem .75rem', border: '1px solid var(--reg-line)', fontSize: '.9rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
            {reviewError && <p style={{ color: 'var(--reg-red)', fontSize: '.85rem', margin: '.35rem 0 0' }}>{reviewError}</p>}

            {/* Follow-up email */}
            {!followupOpen ? (
              <div style={{ marginTop: '.75rem' }}>
                <button
                  onClick={() => {
                    setFollowupOpen(true);
                    const missing = missingDocs(selected.student_type, docs);
                    const list = missing.length
                      ? missing.map(m => `• ${m}`).join('\n')
                      : '• (all required documents appear to be submitted — add any notes here)';
                    const noun = missing.length === 1 ? 'document is' : 'documents are';
                    const it = missing.length === 1 ? 'it' : 'them';
                    setFollowupMsg(
                      `We have reviewed your pre-enrollment application and found that the following required ${noun} still missing or incomplete:\n\n${list}\n\nPlease submit ${it} at your earliest convenience so we can continue processing your application.`
                    );
                  }}
                  style={{ fontSize: '.82rem', color: '#8a6a12', background: 'var(--reg-gold-tint)', border: '1px solid var(--reg-gold)', padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}
                >
                  <i className="ti ti-mail" style={{ marginRight: 5 }} />Send follow-up email
                </button>
                {followupSuccess && <span style={{ marginLeft: 10, fontSize: '.8rem', color: 'var(--reg-green)' }}>{followupSuccess}</span>}
              </div>
            ) : (
              <div style={{ marginTop: '.75rem', background: 'var(--reg-warm)', border: '1px solid var(--reg-line)', borderLeft: '3px solid var(--reg-gold)', padding: '10px 14px' }}>
                <div style={{ fontWeight: 600, fontSize: '.82rem', color: 'var(--reg-ink)', marginBottom: '.25rem' }}>
                  <i className="ti ti-mail" style={{ marginRight: 5, color: 'var(--reg-gold)' }} />Follow-up email to {selected.email}
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--reg-muted)', marginBottom: '.4rem' }}>
                  The greeting (&ldquo;Dear {selected.full_name},&rdquo;), reference number, and Registrar&rsquo;s Office signature are added automatically.
                </div>
                <textarea
                  value={followupMsg}
                  onChange={e => setFollowupMsg(e.target.value)}
                  rows={5}
                  style={{ width: '100%', padding: '.5rem .75rem', border: '1px solid var(--reg-line)', fontSize: '.82rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                {followupError && <p style={{ color: 'var(--reg-red)', fontSize: '.8rem', margin: '.25rem 0 0' }}>{followupError}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: '.5rem' }}>
                  <button className="btn-sec" onClick={() => setFollowupOpen(false)}>Cancel</button>
                  <button className="btn-pri" style={{ opacity: followupSending ? .7 : 1 }} onClick={handleFollowupEmail} disabled={followupSending}>
                    {followupSending ? 'Sending…' : 'Send email'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-sec" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn-sec" style={{ color: 'var(--reg-red)', borderColor: 'var(--reg-red)' }} onClick={() => handleReview('rejected')} disabled={reviewing}>
                Reject
              </button>
              <button className="btn-pri" style={{ background: 'var(--reg-green)', border: 'none' }} onClick={() => handleReview('approved')} disabled={reviewing}>
                Approve &amp; send email
              </button>
            </div>
          </div>
        </div>
      )}

      {previewDoc && <PdfPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </>
  );
}

function PdfPreviewModal({ doc, onClose }) {
  const [blobUrl, setBlobUrl] = useState('');
  const [status, setStatus]   = useState('loading'); // loading | ready | error

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Fetch the PDF through the authenticated API as a blob. A blob: URL renders
  // in the iframe regardless of X-Frame-Options and without needing /media to be
  // reachable from the browser, so this works in dev (proxy) and in production.
  useEffect(() => {
    let objUrl;
    let active = true;
    setStatus('loading'); setBlobUrl('');
    api.get(`/enrollment/pending/${doc.pendingId}/documents/${doc.id}/file/`, { responseType: 'blob' })
      .then(res => {
        if (!active) return;
        objUrl = URL.createObjectURL(res.data);
        setBlobUrl(objUrl);
        setStatus('ready');
      })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; if (objUrl) URL.revokeObjectURL(objUrl); };
  }, [doc.pendingId, doc.id]);

  const sizeKB = doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : '';
  return (
    <div
      onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,.6)', zIndex: 1300, display: 'flex', flexDirection: 'column', padding: '2.5vh 2vw', boxSizing: 'border-box' }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 960, margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px -18px rgba(10,22,40,.5)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '.75rem 1.1rem', borderBottom: '1px solid #e9edf3' }}>
          <i className="ti ti-file-type-pdf" style={{ fontSize: 20, color: '#dc2626', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '.9rem', fontWeight: 700, color: '#0a1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {doc.requirement_label || doc.file_name}
            </div>
            <div style={{ fontSize: '.72rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {doc.file_name}{sizeKB && ` · ${sizeKB}`}
            </div>
          </div>
          <a
            href={blobUrl || undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!blobUrl}
            onClick={e => { if (!blobUrl) e.preventDefault(); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.78rem', fontWeight: 600, color: blobUrl ? '#0a3a6e' : '#9aa4b2', textDecoration: 'none', border: '1px solid #cdd7e5', padding: '5px 11px', borderRadius: 6, flexShrink: 0, pointerEvents: blobUrl ? 'auto' : 'none' }}
          >
            <i className="ti ti-external-link" style={{ fontSize: 14 }} /> Open
          </a>
          <button onClick={onClose} aria-label="Close preview" style={{ background: 'none', border: 'none', color: '#9aa4b2', fontSize: 22, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', background: '#525659', minHeight: 0 }}>
          {status === 'loading' && (
            <div style={{ margin: 'auto', color: '#e5e7eb', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-loader-2" style={{ fontSize: 26, animation: 'spin 1s linear infinite' }} />
              Loading document…
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
          {status === 'error' && (
            <div style={{ margin: 'auto', color: '#fecaca', fontSize: 13, textAlign: 'center', maxWidth: 320, padding: 20 }}>
              <i className="ti ti-file-alert" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
              Couldn’t load this document. It may have been removed or is temporarily unavailable.
            </div>
          )}
          {status === 'ready' && (
            <iframe
              title={`Preview of ${doc.file_name}`}
              src={`${blobUrl}#toolbar=1&view=FitH`}
              style={{ flex: 1, width: '100%', border: 'none' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PendingStatusBadge({ status }) {
  const map = {
    pending:   { label: 'Pending',   cls: 'pending'   },
    approved:  { label: 'Approved',  cls: 'approved'  },
    rejected:  { label: 'Rejected',  cls: 'rejected'  },
    activated: { label: 'Activated', cls: 'status-active' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'outline' };
  return <span className={`tag ${cls}`}>{label}</span>;
}

const styles = {
  modalBackdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', padding: '1.5rem 2rem',
    width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  },
};
