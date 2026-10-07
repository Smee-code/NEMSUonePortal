import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useRegistrarShell } from '../../context/RegistrarShellContext';
import EnrollmentScheduleManager from '../../components/EnrollmentScheduleManager';

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
    'Medical Certificate', 'Accomplished Application Form',
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
  const [winOpen, setWinOpen] = useState(false);

  // Review modal
  const [selected,    setSelected]    = useState(null);
  const [remarks,     setRemarks]     = useState('');
  const [reviewing,   setReviewing]   = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [docs,        setDocs]        = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

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

      {/* Enrollment-window panel (collapsible) */}
      <div className="ad-win">
        <button className="ad-win-hd" onClick={() => setWinOpen(o => !o)}>
          <span className="ad-win-ic"><i className="ti ti-calendar-cog" /></span>
          <span>
            <span className="ad-win-tt">Enrollment window</span>
            <span className="ad-win-sb">Status, academic year, and schedule shown on the public landing page</span>
          </span>
          <i className={`ti ti-chevron-${winOpen ? 'up' : 'down'} ad-win-chev`} />
        </button>
        {winOpen && (
          <div className="ad-win-body">
            <EnrollmentScheduleManager />
          </div>
        )}
      </div>

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

            {/* Documents */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--reg-ink-2)', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-paperclip" style={{ fontSize: 15 }} /> Submitted documents
                {docsLoading && <span style={{ fontSize: 11, color: 'var(--reg-muted)', fontWeight: 400 }}>Loading…</span>}
              </div>
              {!docsLoading && docs.length === 0 && (
                <p style={{ fontSize: '.8rem', color: 'var(--reg-muted)', margin: 0, padding: '8px 12px', background: '#f9fafb' }}>
                  No documents uploaded by applicant.
                </p>
              )}
              {docs.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: '#fff', border: '1px solid var(--reg-line)', marginBottom: 5 }}>
                  <i className="ti ti-file-type-pdf" style={{ fontSize: 18, color: '#dc2626', flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--reg-ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.requirement_label}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--reg-muted)' }}>{doc.file_name} · {(doc.file_size / 1024).toFixed(0)} KB</div>
                  </div>
                  <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: '.75rem', color: 'var(--reg-ink)', textDecoration: 'underline', textUnderlineOffset: 2, fontWeight: 600, flexShrink: 0 }}>
                    View PDF
                  </a>
                </div>
              ))}
            </div>

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
    </>
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
