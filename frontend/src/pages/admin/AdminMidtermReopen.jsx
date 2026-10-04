import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAdminShell } from '../../context/AdminShellContext';

export default function AdminMidtermReopen() {
  const { toast } = useAdminShell();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm]     = useState({ status: 'approved', admin_note: '' });
  const [reviewing, setReviewing]       = useState(false);
  const [reviewError, setReviewError]   = useState('');

  function fetchRequests() {
    setLoading(true);
    api.get('/grades/admin/midterm-reopen/')
      .then(res => setRequests(Array.isArray(res.data) ? res.data : (res.data.results ?? [])))
      .catch(() => toast('Failed to load reopen requests.', { type: 'error' }))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchRequests(); }, []);

  function openReview(r, status) {
    setReviewTarget(r);
    setReviewForm({ status, admin_note: '' });
    setReviewError('');
  }

  async function submitReview(e) {
    e.preventDefault();
    setReviewing(true);
    setReviewError('');
    try {
      await api.patch(`/grades/admin/midterm-reopen/${reviewTarget.id}/`, reviewForm);
      const action = reviewForm.status === 'approved' ? 'approved' : 'rejected';
      toast(`Reopen request for ${reviewTarget.subject_code} ${action}.`, {
        type: 'success',
        sub: reviewForm.status === 'approved' ? 'Midterms are unlocked for that class.' : undefined,
      });
      setReviewTarget(null);
      fetchRequests();
    } catch (err) {
      const d = err.response?.data;
      setReviewError((d && typeof d === 'object') ? Object.values(d).flat().join(' ') : 'Failed to submit review.');
    } finally {
      setReviewing(false);
    }
  }

  const statusPill = s => ({
    pending:  { bg: 'var(--adm-amber-tint)', color: '#92400e', label: 'Pending' },
    approved: { bg: 'var(--adm-green-tint)', color: '#065f46', label: 'Approved' },
    rejected: { bg: 'var(--adm-red-tint)',   color: '#991b1b', label: 'Rejected' },
  }[s] || { bg: 'var(--adm-cool)', color: 'var(--adm-ink)', label: s });

  const courseLabel = r => `${r.subject_code}${r.section ? ` [${r.section}]` : ''}`;
  const pending  = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">Grades · Faculty requests</div>
          <h2>Midterm <em>reopen</em> requests</h2>
          <div className="sub">
            Approving a request unlocks a subject's submitted midterm grades so the faculty
            can correct them. Students whose final grades are already in are not affected.
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mr-loading">Loading requests…</div>
      ) : (
        <>
          <div className="info-section">
            <div className="info-section-head">
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                Pending requests {pending.length > 0 && <span className="mr-badge">{pending.length}</span>}
              </div>
            </div>
            {pending.length === 0 ? (
              <div className="empty-state">
                <i className="ti ti-inbox" />
                <div className="t">No pending requests</div>
                <div className="d">Reopen requests from faculty will appear here for your review.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      {['Subject', 'Term', 'Reason', 'Requested by', 'Date', 'Actions'].map((h, i) => <th key={i}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map(r => (
                      <tr key={r.id}>
                        <td><strong>{courseLabel(r)}</strong><div style={{ fontSize: 11, color: 'var(--adm-muted)' }}>{r.subject_name}</div></td>
                        <td style={{ fontSize: 12 }}>{r.term_display}</td>
                        <td style={{ maxWidth: 240, fontSize: 12, color: 'var(--adm-muted)' }}>{r.reason || <em>No reason given</em>}</td>
                        <td style={{ fontSize: 12 }}>{r.requested_by_name}</td>
                        <td style={{ fontSize: 11, color: 'var(--adm-muted)' }}>
                          {r.created_at ? new Date(r.created_at).toLocaleDateString('en-PH') : '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="mr-btn-approve" onClick={() => openReview(r, 'approved')}>Approve</button>
                            <button className="mr-btn-reject" onClick={() => openReview(r, 'rejected')}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {resolved.length > 0 && (
            <div className="info-section">
              <div className="info-section-head">
                <div style={{ fontWeight: 600, fontSize: 13 }}>Resolved requests</div>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      {['Subject', 'Term', 'Status', 'Admin note', 'Requested by', 'Reviewed'].map((h, i) => <th key={i}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {resolved.map(r => {
                      const pill = statusPill(r.status);
                      return (
                        <tr key={r.id}>
                          <td><strong>{courseLabel(r)}</strong></td>
                          <td style={{ fontSize: 12 }}>{r.term_display}</td>
                          <td>
                            <span style={{ background: pill.bg, color: pill.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                              {pill.label}
                            </span>
                          </td>
                          <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                            {r.admin_note || '-'}
                          </td>
                          <td style={{ fontSize: 12 }}>{r.requested_by_name}</td>
                          <td style={{ fontSize: 11, color: 'var(--adm-muted)' }}>
                            {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString('en-PH') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Review modal ── */}
      {reviewTarget && (
        <div className="mr-overlay" onClick={() => !reviewing && setReviewTarget(null)}>
          <div className="mr-modal" onClick={e => e.stopPropagation()}>
            <div className="mr-modal-title">
              {reviewForm.status === 'approved' ? 'Approve' : 'Reject'} reopen request
            </div>
            <p style={{ fontSize: 13, color: 'var(--adm-muted)', marginBottom: '1rem' }}>
              <strong>{courseLabel(reviewTarget)}</strong> · {reviewTarget.subject_name}
              <br />{reviewTarget.term_display} · requested by {reviewTarget.requested_by_name}
              {reviewTarget.reason && <><br />Reason: <em>{reviewTarget.reason}</em></>}
              {reviewForm.status === 'approved' && (
                <><br /><br />This unlocks the class's submitted midterm grades (except students whose finals are already submitted).</>
              )}
            </p>

            {reviewError && <div className="mr-flash mr-flash-err">{reviewError}</div>}

            <form onSubmit={submitReview}>
              <div className="mr-form-row">
                <label className="mr-form-label">Decision</label>
                <select className="mr-form-input" value={reviewForm.status}
                  onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="approved">Approve — unlock midterms</option>
                  <option value="rejected">Reject — keep midterms locked</option>
                </select>
              </div>
              <div className="mr-form-row">
                <label className="mr-form-label">Admin note <span style={{ fontWeight: 400, color: 'var(--adm-faint)' }}>(optional)</span></label>
                <textarea
                  className="mr-form-input"
                  style={{ height: 72, resize: 'vertical' }}
                  placeholder="Add a note for the faculty…"
                  value={reviewForm.admin_note}
                  onChange={e => setReviewForm(f => ({ ...f, admin_note: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem', marginTop: '.75rem' }}>
                <button type="button" className="btn-sec" onClick={() => setReviewTarget(null)}>Cancel</button>
                <button
                  type="submit"
                  className="btn-pri"
                  disabled={reviewing}
                  style={reviewForm.status === 'rejected' ? { background: 'var(--adm-red)', borderColor: 'var(--adm-red)' } : {}}
                >
                  {reviewing ? 'Saving…' : reviewForm.status === 'approved' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const CSS = `
  .mr-loading{color:var(--adm-muted);padding:2rem 0;font-size:13px}
  .mr-badge{background:var(--adm-red);color:#fff;font-size:10px;font-weight:700;border-radius:999px;padding:1px 7px;margin-left:6px;vertical-align:middle}
  .mr-btn-approve{background:var(--adm-green-tint);color:#065f46;border:1px solid #6ee7b7;padding:4px 12px;font:700 11px/1 'Inter',sans-serif;cursor:pointer;white-space:nowrap}
  .mr-btn-reject{background:var(--adm-red-tint);color:#991b1b;border:1px solid #fca5a5;padding:4px 12px;font:700 11px/1 'Inter',sans-serif;cursor:pointer;white-space:nowrap}
  .mr-flash{padding:10px 16px;margin-bottom:.75rem;font-size:13px}
  .mr-flash-err{background:#f6e8e4;color:var(--adm-red)}
  .mr-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:50;display:flex;align-items:center;justify-content:center;padding:1rem}
  .mr-modal{background:#fff;border:1px solid var(--adm-line);padding:1.5rem;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,.18)}
  .mr-modal-title{font-size:15px;font-weight:600;color:var(--adm-ink);margin-bottom:.75rem}
  .mr-form-row{display:flex;flex-direction:column;gap:4px;margin-bottom:.75rem}
  .mr-form-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--adm-muted);font-weight:600}
  .mr-form-input{padding:9px 12px;border:1px solid var(--adm-line);background:#fff;font:13px/1.4 'Inter',sans-serif;color:var(--adm-ink);outline:none;width:100%;box-sizing:border-box}
  .mr-form-input:focus{border-color:var(--adm-ink)}
`;
