import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';

const STATUS_META = {
  submitted:  { label: 'Submitted',          cls: 'status-unverified' },
  processing: { label: 'Processing',         cls: 'pending'           },
  ready:      { label: 'Ready for release',  cls: 'role-faculty'      },
  released:   { label: 'Released',           cls: 'status-active'     },
  rejected:   { label: 'Rejected',           cls: 'status-locked'     },
};

const TRACKER_STEPS = [
  { key: 'submitted',  label: 'Submitted',  icon: 'ti-send' },
  { key: 'processing', label: 'Processing', icon: 'ti-settings' },
  { key: 'ready',      label: 'Ready',      icon: 'ti-package' },
  { key: 'released',   label: 'Released',   icon: 'ti-circle-check' },
];

const EMPTY_FORM = { document_type: '', purpose: '', copies: 1 };

function StatusTracker({ status }) {
  if (status === 'rejected') {
    return (
      <div className="dr-rejected">
        <i className="ti ti-circle-x" />
        <span>This request was rejected — see the registrar’s remarks below.</span>
      </div>
    );
  }
  const current = TRACKER_STEPS.findIndex(s => s.key === status);
  return (
    <div className="dr-track">
      {TRACKER_STEPS.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <div key={step.key} className="dr-step">
            <div className="dr-step-row">
              <span className={`dr-node dr-node--${state}`}>
                <i className={`ti ${state === 'done' ? 'ti-check' : step.icon}`} />
              </span>
              {i < TRACKER_STEPS.length - 1 && (
                <span className={`dr-conn ${i < current ? 'dr-conn--done' : ''}`} />
              )}
            </div>
            <span className={`dr-step-lbl dr-step-lbl--${state}`}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StudentDocuments() {
  const toast = useToast();
  const [requests, setRequests]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');   // inline: form validation only
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [docTypes, setDocTypes]       = useState([]);

  function fetchRequests() {
    setLoading(true);
    api.get('/documents/my/')
      .then(res => setRequests(res.data))
      .catch(() => toast('Failed to load document requests.', { type: 'error' }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchRequests();
    // The catalog is managed by the admin, so it's loaded from the server.
    api.get('/documents/types/')
      .then(res => setDocTypes((res.data || []).map(d => ({
        value: d.code, label: d.name, fee: parseFloat(d.fee),
        days: d.processing_days, desc: d.description,
      }))))
      .catch(() => { /* leave catalog empty on failure */ });
  }, []);

  function openForm(docType = '') {
    setForm({ ...EMPTY_FORM, document_type: docType });
    setError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setError('');
  }

  // While the modal is open: close on Esc and lock background scroll.
  useEffect(() => {
    if (!showForm) return;
    const onKey = e => { if (e.key === 'Escape') closeForm(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [showForm]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.document_type) { setError('Please select a document type.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/documents/request/', {
        document_type: form.document_type,
        purpose:       form.purpose.trim(),
        copies:        Number(form.copies),
      });
      toast('Your request has been submitted. The registrar will process it soon.', { type: 'success' });
      setShowForm(false);
      setForm(EMPTY_FORM);
      fetchRequests();
    } catch (err) {
      const data = err.response?.data;
      let msg;
      if (data?.error) {
        msg = data.error;
      } else if (data && typeof data === 'object') {
        msg = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
      } else {
        msg = 'Failed to submit request. Please try again.';
      }
      toast(msg, { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Derived stats ──────────────────────────────────────────── */
  const total      = requests.length;
  const processing = requests.filter(r => ['submitted','processing'].includes(r.status)).length;
  const ready      = requests.filter(r => r.status === 'ready').length;
  const released   = requests.filter(r => r.status === 'released').length;

  const feeOf  = v => docTypes.find(d => d.value === v)?.fee;

  return (
    <div className="page">
      <style>{CSS}</style>

      {/* ── Page head ──────────────────────────────────────── */}
      <div className="page-head">
        <div>
          <div className="eyebrow">Services · Registrar</div>
          <h2>Document <em>requests</em></h2>
          <div className="sub">Request official documents from the registrar’s office and track each one from submission to release.</div>
        </div>
        <div className="actions">
          <button className="btn-pri" onClick={() => openForm()}>
            <i className="ti ti-plus" /> New request
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-tint)', color: 'var(--red)', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: 13 }}>{error}</div>
      )}

      {/* ── Request form (modal) ───────────────────────────── */}
      {showForm && (
        <div className="dr-modal-back" onMouseDown={closeForm}>
          <div className="dr-modal" role="dialog" aria-modal="true" aria-label="New document request" onMouseDown={e => e.stopPropagation()}>
          <div className="card-head">
            <h4>New document request<span>Choose a document and submit — the registrar takes it from there</span></h4>
            <button className="btn-ghost" onClick={closeForm} aria-label="Close">
              <i className="ti ti-x" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="dr-form-grid">
              <div>
                <label className="dr-label">Document type</label>
                <select className="dr-input" value={form.document_type} onChange={e => setForm(p => ({ ...p, document_type: e.target.value }))} required>
                  <option value="">Select a document</option>
                  {docTypes.map(d => (
                    <option key={d.value} value={d.value}>{d.label} (₱{d.fee})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="dr-label">Number of copies</label>
                <input className="dr-input" type="number" min={1} max={5} value={form.copies} onChange={e => setForm(p => ({ ...p, copies: e.target.value }))} style={{ maxWidth: 130 }} />
              </div>
            </div>
            <div style={{ marginBottom: '1.1rem' }}>
              <label className="dr-label">Purpose <small style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</small></label>
              <textarea className="dr-input" value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} rows={3} maxLength={500} placeholder="e.g. For scholarship application, employment requirements…" style={{ resize: 'vertical' }} />
            </div>
            {form.document_type && (
              <div className="dr-fee-note">
                <i className="ti ti-receipt" />
                Payable at the cashier on claim: <strong>₱{feeOf(form.document_type)}</strong> per copy · <strong>₱{feeOf(form.document_type) * Number(form.copies || 1)}</strong> total
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn-pri" disabled={submitting} style={{ opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
              <button type="button" className="btn-sec" onClick={closeForm}>Cancel</button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* ── Ready-for-pickup banner (the actionable thing) ──── */}
      {ready > 0 && (
        <div className="dr-pickup">
          <i className="ti ti-map-pin" />
          <div>
            <strong>{ready} document{ready !== 1 ? 's' : ''} ready for pickup.</strong>{' '}
            Visit the Registrar’s Office to claim {ready !== 1 ? 'them' : 'it'}.
          </div>
        </div>
      )}

      {/* ── Requests list ──────────────────────────────────── */}
      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading requests…</p>
      ) : requests.length === 0 ? (
        <div className="stu-empty">
          <i className="ti ti-file-off" />
          <p>No document requests yet. Start one from the catalog below, or hit “New request”.</p>
        </div>
      ) : (
        <>
          <div className="dr-sec">
            <h4>My requests<span>{total} on record</span></h4>
            <div className="dr-facts">
              <span><b>{processing}</b> in progress</span>
              <span><b>{ready}</b> ready</span>
              <span><b>{released}</b> released</span>
            </div>
          </div>

          <div style={{ marginBottom: '2.25rem' }}>
            {requests.map(req => {
              const meta = STATUS_META[req.status] ?? STATUS_META.submitted;
              const isReady = req.status === 'ready';
              return (
                <div key={req.id} className={`dr-req${isReady ? ' is-ready' : ''}${req.status === 'rejected' ? ' is-rejected' : ''}`}>
                  <div className="dr-req-head">
                    <div style={{ minWidth: 0 }}>
                      <div className="dr-req-title">{req.document_type_display}</div>
                      <div className="dr-req-meta">
                        {req.copies} cop{req.copies !== 1 ? 'ies' : 'y'} ·
                        {' '}Filed {new Date(req.submitted_at || req.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {feeOf(req.document_type) ? ` · ₱${feeOf(req.document_type) * (req.copies || 1)}` : ''}
                      </div>
                      {req.purpose && <div className="dr-req-purpose">“{req.purpose}”</div>}
                    </div>
                    <span className={`tag ${meta.cls}`}>{meta.label}</span>
                  </div>

                  <div className="dr-req-body">
                    <StatusTracker status={req.status} />

                    {req.remarks && (
                      <div className={`dr-remarks dr-remarks--${req.status === 'rejected' ? 'bad' : 'good'}`}>
                        <strong>Registrar’s remarks:</strong> {req.remarks}
                      </div>
                    )}
                    <div className="dr-updated">Last updated {new Date(req.updated_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Document catalog ───────────────────────────────── */}
      <div className="sec-head">
        <div>
          <h3>Document <em>catalog</em></h3>
          <div className="sub">What the registrar’s office issues — pick one to start a request.</div>
        </div>
      </div>
      <div className="dr-cat">
        {docTypes.map(d => (
          <div key={d.value} className="dr-cat-card">
            <div className="dr-cat-eyebrow">{d.days} working days</div>
            <div className="dr-cat-name">{d.label}</div>
            <div className="dr-cat-desc">{d.desc}</div>
            <div className="dr-cat-foot">
              <div className="dr-cat-fee">₱{d.fee}<small>/copy</small></div>
              <button className="btn-sec" onClick={() => openForm(d.value)}>
                <i className="ti ti-plus" /> Request
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CSS = `
  /* request modal */
  .dr-modal-back{position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(6px);z-index:1200;
    display:flex;align-items:flex-start;justify-content:center;padding:6vh 1rem 2rem;overflow-y:auto;animation:drFade .18s ease;}
  @keyframes drFade{from{opacity:0}to{opacity:1}}
  .dr-modal{background:#fff;border-top:3px solid var(--gold);width:100%;max-width:580px;margin:auto;
    box-shadow:0 24px 64px -24px rgba(10,22,40,.5);animation:drPop .22s cubic-bezier(.4,0,.2,1);}
  @keyframes drPop{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}
  .dr-modal .card-head{padding:1.5rem 1.5rem 1.1rem;margin-bottom:0;}
  .dr-modal form{padding:1.4rem 1.5rem 1.6rem;}

  /* form */
  .dr-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;}
  .dr-label{display:block;font-weight:600;font-size:13px;color:var(--ink);margin-bottom:5px;}
  .dr-input{width:100%;padding:.55rem .7rem;border:1px solid var(--line);background:#fff;color:var(--ink);
    font:14px/1.4 'Inter',sans-serif;outline:none;box-sizing:border-box;transition:border-color .15s;}
  .dr-input:focus{border-color:var(--ink);}
  .dr-fee-note{display:flex;align-items:center;gap:9px;background:var(--warm);border:1px solid var(--line);
    padding:.7rem .9rem;margin-bottom:1.1rem;font-size:13px;color:var(--muted);}
  .dr-fee-note i{color:var(--gold);font-size:16px;}
  .dr-fee-note strong{color:var(--ink);font-weight:600;}

  /* ready banner */
  .dr-pickup{display:flex;align-items:center;gap:14px;background:var(--green-tint);border:1px solid #a7f3d0;
    border-left:3px solid var(--green);padding:1rem 1.25rem;margin-bottom:1.5rem;font-size:13.5px;color:var(--ink);}
  .dr-pickup i{font-size:24px;color:var(--green);flex-shrink:0;}
  .dr-pickup strong{color:var(--green);}

  /* section heading + facts */
  .dr-sec{display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap;margin-bottom:1rem;}
  .dr-sec h4{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;line-height:1.3;}
  .dr-sec h4 span{display:block;font-family:'Inter',sans-serif;font-weight:400;font-size:20px;color:var(--ink);
    text-transform:none;letter-spacing:-.01em;margin-top:4px;}
  .dr-facts{display:flex;gap:1.5rem;flex-wrap:wrap;}
  .dr-facts span{font-size:12px;color:var(--muted);}
  .dr-facts b{color:var(--ink);font-weight:600;font-size:15px;margin-right:5px;font-variant-numeric:tabular-nums;}

  /* request card */
  .dr-req{background:#fff;border:1px solid var(--line);margin-bottom:.9rem;}
  .dr-req.is-ready{border-left:3px solid var(--green);}
  .dr-req.is-rejected{border-left:3px solid var(--red);}
  .dr-req-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;
    padding:1.25rem 1.5rem;border-bottom:1px solid var(--line-soft);flex-wrap:wrap;}
  .dr-req-title{font-weight:500;font-size:18px;color:var(--ink);letter-spacing:-.005em;}
  .dr-req-meta{font-size:12px;color:var(--muted);margin-top:4px;}
  .dr-req-purpose{font-size:12.5px;color:var(--ink-2);margin-top:6px;font-style:italic;}
  .dr-req-body{padding:1.4rem 1.5rem 1.25rem;}

  /* tracker */
  .dr-track{display:flex;align-items:flex-start;}
  .dr-step{display:flex;flex-direction:column;align-items:flex-start;flex:1;min-width:0;}
  .dr-step:last-child{flex:0 0 auto;}
  .dr-step-row{display:flex;align-items:center;width:100%;}
  .dr-node{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid var(--line);background:#fff;color:var(--faint);}
  .dr-node i{font-size:14px;}
  .dr-node--done{background:var(--green);border-color:var(--green);color:#fff;}
  .dr-node--current{background:#fff;border-color:var(--gold);color:var(--gold);box-shadow:0 0 0 4px var(--gold-tint);}
  .dr-conn{flex:1;height:2px;background:var(--line);margin:0 6px;}
  .dr-conn--done{background:var(--green);}
  .dr-step-lbl{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;margin-top:8px;color:var(--muted);}
  .dr-step-lbl--done{color:var(--green);}
  .dr-step-lbl--current{color:var(--gold);}
  .dr-step-lbl--todo{color:var(--faint);}

  .dr-rejected{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--red);font-weight:600;}
  .dr-rejected i{font-size:18px;}

  .dr-remarks{padding:.65rem .9rem;font-size:13px;margin-top:1.1rem;line-height:1.5;}
  .dr-remarks--good{background:var(--green-tint);color:var(--green);}
  .dr-remarks--bad{background:var(--red-tint);color:var(--red);}
  .dr-remarks strong{font-weight:700;}
  .dr-updated{font-size:11px;color:var(--faint);margin-top:1rem;}

  /* catalog */
  .dr-cat{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);}
  .dr-cat-card{background:#fff;padding:1.4rem 1.5rem;display:flex;flex-direction:column;}
  .dr-cat-eyebrow{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:8px;}
  .dr-cat-name{font-weight:500;font-size:18px;color:var(--ink);letter-spacing:-.005em;margin-bottom:6px;}
  .dr-cat-desc{font-size:12.5px;color:var(--muted);line-height:1.55;margin-bottom:1.1rem;flex:1;}
  .dr-cat-foot{display:flex;align-items:center;justify-content:space-between;gap:1rem;}
  .dr-cat-fee{font-size:24px;font-weight:500;color:var(--ink);letter-spacing:-.01em;}
  .dr-cat-fee small{font-size:12px;color:var(--muted);font-weight:400;margin-left:2px;}

  @media(max-width:560px){
    .dr-form-grid{grid-template-columns:1fr;}
    .dr-step-lbl{font-size:9px;letter-spacing:.02em;}
    .dr-node{width:26px;height:26px;}
  }
`;
