import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';

const TABS = [
  { key: 'pending',  label: 'Pending'  },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

function fmtDate(s) {
  return s ? new Date(s).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
}
function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function EncoderApplications() {
  const toast = useToast();
  const [tab,     setTab]     = useState('pending');
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const [reject,    setReject]    = useState(null);
  const [remarks,   setRemarks]   = useState('');
  const [busyId,    setBusyId]    = useState(null);
  const [reviewErr, setReviewErr] = useState('');

  const fetchRows = useCallback(() => {
    setLoading(true);
    api.get(`/enrollment/pending/?status=${tab}`)
      .then(res => setRows(res.data.results ?? res.data))
      .catch(() => toast('Failed to load applications.', { type: 'error' }))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  async function approve(row) {
    setBusyId(row.id);
    try {
      await api.patch(`/enrollment/pending/${row.id}/review/`, { status: 'approved' });
      toast(`${row.full_name} approved. Notified they qualify for the entrance exam.`, { type: 'success' });
      fetchRows();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to approve.', { type: 'error' });
    } finally { setBusyId(null); }
  }

  async function submitReject(e) {
    e.preventDefault();
    if (!remarks.trim()) { setReviewErr('A reason is required.'); return; }
    setBusyId(reject.id); setReviewErr('');
    try {
      await api.patch(`/enrollment/pending/${reject.id}/review/`, { status: 'rejected', remarks: remarks.trim() });
      toast(`${reject.full_name}'s application was rejected.`, { type: 'success' });
      setReject(null); setRemarks('');
      fetchRows();
    } catch (err) {
      setReviewErr(err.response?.data?.remarks?.[0] || err.response?.data?.error || 'Failed to reject.');
    } finally { setBusyId(null); }
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div className="eyebrow">Admissions · Department review</div>
        <h2>Freshman <em>applications</em></h2>
        <div className="sub">Review incoming applicants for your department's programs. Approving notifies them that they qualify for the entrance exam. No account is created yet.</div>
      </div>

      <div className="ea-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`ea-tab${tab === t.key ? ' active' : ''}`} onClick={() => { setTab(t.key); setExpanded(null); }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="ea-card">
        {loading ? (
          <div className="ea-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="ea-empty">No {tab} applications for your department.</div>
        ) : (
          <table className="ea-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Program</th>
                <th>Ref. no.</th>
                <th>Submitted</th>
                <th className="ea-right">{tab === 'pending' ? 'Action' : 'Reviewed'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.flatMap(r => {
                const isOpen = expanded === r.id;
                const out = [
                  <tr key={r.id} className={isOpen ? 'ea-row-open' : ''}>
                    <td>
                      <button className="ea-link" onClick={() => setExpanded(isOpen ? null : r.id)}>
                        <i className={`ti ${isOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} />
                        <span>
                          <span className="ea-name">{r.full_name}</span>
                          <span className="ea-email">{r.email}</span>
                        </span>
                      </button>
                    </td>
                    <td className="ea-muted">{r.program_code || '-'}</td>
                    <td className="ea-mono">{r.reference_number}</td>
                    <td className="ea-muted">{fmtDate(r.created_at)}</td>
                    <td className="ea-right">
                      {tab === 'pending' ? (
                        <>
                          <button className="ea-btn ea-btn-approve" disabled={busyId === r.id} onClick={() => approve(r)}>
                            <i className="ti ti-check" /> Approve
                          </button>
                          <button className="ea-btn ea-btn-reject" disabled={busyId === r.id} onClick={() => { setReject(r); setRemarks(''); setReviewErr(''); }}>
                            <i className="ti ti-x" /> Reject
                          </button>
                        </>
                      ) : (
                        <span className="ea-muted">{r.reviewed_by_name || '-'}<div className="ea-sm">{fmtDate(r.reviewed_at)}</div></span>
                      )}
                    </td>
                  </tr>,
                ];
                if (isOpen) {
                  out.push(
                    <tr key={`${r.id}-d`} className="ea-detail-row">
                      <td colSpan={5}>
                        <div className="ea-detail">
                          <div className="ea-detail-grid">
                            <Detail label="Full name" value={r.full_name} />
                            <Detail label="Type" value={r.student_type_display} />
                            <Detail label="Program" value={r.program_name} />
                            <Detail label="Department" value={r.department_name} />
                            <Detail label="Contact" value={r.contact_number || '-'} />
                            <Detail label="Sex" value={r.sex || '-'} />
                            <Detail label="Date of birth" value={fmtDate(r.date_of_birth)} />
                            <Detail label="Term" value={r.term_display || '-'} />
                          </div>
                          <div className="ea-docs">
                            <div className="ea-docs-title">Submitted documents ({(r.documents || []).length})</div>
                            {(r.documents || []).length === 0 ? (
                              <div className="ea-muted ea-sm">No documents uploaded.</div>
                            ) : (
                              <div className="ea-doc-list">
                                {r.documents.map(d => (
                                  <a key={d.id} className="ea-doc" href={d.url} target="_blank" rel="noreferrer">
                                    <i className="ti ti-file-text" />
                                    <span className="ea-doc-label">{d.requirement_label}</span>
                                    <span className="ea-doc-size">{fmtSize(d.file_size)}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          {r.status === 'rejected' && r.remarks && (
                            <div className="ea-remarks">Reason for rejection: {r.remarks}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }
                return out;
              })}
            </tbody>
          </table>
        )}
      </div>

      {reject && (
        <div className="ea-overlay" onMouseDown={() => busyId == null && setReject(null)}>
          <div className="ea-modal" onMouseDown={e => e.stopPropagation()}>
            <h3>Reject <em>application</em></h3>
            <p className="ea-modal-sub">Rejecting <strong>{reject.full_name}</strong> ({reject.reference_number}). They'll be emailed the reason below.</p>
            <form onSubmit={submitReject}>
              <label className="ea-label">Reason for rejection</label>
              <textarea className="ea-textarea" rows={3} autoFocus placeholder="e.g. Incomplete requirements, missing Form 138." value={remarks} onChange={e => setRemarks(e.target.value)} />
              {reviewErr && <div className="ea-flash ea-flash-err" style={{ marginTop: 8 }}>{reviewErr}</div>}
              <div className="ea-modal-foot">
                <button type="button" className="ea-btn ea-btn-ghost" onClick={() => setReject(null)} disabled={busyId != null}>Cancel</button>
                <button type="submit" className="ea-btn ea-btn-reject" disabled={busyId != null}>
                  {busyId != null ? 'Rejecting…' : 'Confirm rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="ea-dlabel">{label}</div>
      <div className="ea-dval">{value || '-'}</div>
    </div>
  );
}

const CSS = `
  .ea-flash{padding:10px 16px;margin-bottom:1rem;font-size:13px;border-radius:2px}
  .ea-flash-ok{background:var(--enc-green-tint);color:var(--enc-green)}
  .ea-flash-err{background:var(--enc-red-tint);color:var(--enc-red)}
  .ea-tabs{display:flex;gap:.25rem;margin-bottom:1rem;flex-wrap:wrap}
  .ea-tab{padding:7px 16px;border:1px solid var(--enc-line);background:#fff;font:500 13px 'Inter',sans-serif;color:var(--enc-muted);cursor:pointer}
  .ea-tab.active{background:var(--enc-ink);color:#fff;border-color:var(--enc-ink)}
  .ea-card{background:#fff;border:1px solid var(--enc-line);overflow-x:auto}
  .ea-empty{padding:2.5rem;text-align:center;color:var(--enc-muted);font-size:13px}
  .ea-table{width:100%;border-collapse:collapse;font-size:13px;min-width:720px}
  .ea-table th{text-align:left;padding:11px 16px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--enc-faint);font-weight:600;border-bottom:1px solid var(--enc-line);background:var(--enc-warm)}
  .ea-table td{padding:12px 16px;border-bottom:1px solid var(--enc-line-soft);vertical-align:top}
  .ea-row-open>td{background:var(--enc-cool)}
  .ea-right{text-align:right;white-space:nowrap}
  .ea-link{display:flex;align-items:flex-start;gap:9px;background:none;border:none;cursor:pointer;font-family:inherit;text-align:left;padding:0;color:inherit}
  .ea-link i{font-size:15px;color:var(--enc-faint);margin-top:2px}
  .ea-name{display:block;font-weight:600;color:var(--enc-ink)}
  .ea-email{display:block;font-size:12px;color:var(--enc-muted)}
  .ea-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--enc-ink)}
  .ea-muted{color:var(--enc-muted)}
  .ea-sm{font-size:11px}
  .ea-btn{padding:7px 12px;border:1px solid var(--enc-line);background:#fff;font:600 12px 'Inter',sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
  .ea-btn:disabled{opacity:.5;cursor:not-allowed}
  .ea-btn-approve{color:var(--enc-green);border-color:var(--enc-green)}
  .ea-btn-approve:hover:not(:disabled){background:var(--enc-green-tint)}
  .ea-btn-reject{color:var(--enc-red);border-color:var(--enc-red);margin-left:8px}
  .ea-btn-reject:hover:not(:disabled){background:var(--enc-red-tint)}
  .ea-btn-ghost{color:var(--enc-muted)}
  .ea-detail-row>td{background:var(--enc-cool);border-bottom:2px solid var(--enc-line)}
  .ea-detail{padding:1.25rem 1.5rem}
  .ea-detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem 1.5rem;margin-bottom:1.25rem}
  .ea-dlabel{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--enc-faint);font-weight:600;margin-bottom:3px}
  .ea-dval{font-size:13px;color:var(--enc-ink)}
  .ea-docs-title{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--enc-muted);font-weight:600;margin-bottom:8px}
  .ea-doc-list{display:flex;flex-wrap:wrap;gap:8px}
  .ea-doc{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--enc-line);background:#fff;text-decoration:none;color:var(--enc-ink);font-size:12px}
  .ea-doc:hover{border-color:var(--enc-gold)}
  .ea-doc i{color:var(--enc-gold);font-size:15px}
  .ea-doc-size{color:var(--enc-faint);font-size:11px}
  .ea-remarks{margin-top:1rem;font-size:12px;color:var(--enc-red)}
  .ea-overlay{position:fixed;inset:0;z-index:200;background:rgba(10,22,40,.45);display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px;overflow-y:auto}
  .ea-modal{background:#fff;width:100%;max-width:440px;border:1px solid var(--enc-line);padding:1.5rem;box-shadow:0 24px 60px -20px rgba(10,22,40,.4)}
  .ea-modal h3{font-size:18px;color:var(--enc-ink);font-weight:600;margin:0 0 .35rem}
  .ea-modal h3 em{font-style:normal;color:var(--enc-gold)}
  .ea-modal-sub{font-size:13px;color:var(--enc-muted);margin:0 0 1rem;line-height:1.5}
  .ea-label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--enc-faint);font-weight:600;margin-bottom:5px}
  .ea-textarea{width:100%;border:1px solid var(--enc-line);padding:9px 11px;font:13px 'Inter',sans-serif;box-sizing:border-box;resize:vertical;outline:none}
  .ea-textarea:focus{border-color:var(--enc-gold)}
  .ea-modal-foot{display:flex;justify-content:flex-end;gap:.75rem;margin-top:1rem}
  @media(max-width:560px){.ea-btn-reject{margin-left:6px}}
`;
