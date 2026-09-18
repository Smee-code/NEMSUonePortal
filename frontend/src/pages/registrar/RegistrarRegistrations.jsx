import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';

const TABS = [
  { key: 'pending',  label: 'Pending'  },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

function initials(name) {
  const p = (name || '').replace(',', '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
function fmtDate(s) {
  return s ? new Date(s).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export default function RegistrarRegistrations() {
  const [tab,     setTab]     = useState('pending');
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search,      setSearch]      = useState('');
  const [flash,   setFlash]   = useState('');

  const [reject,   setReject]   = useState(null);   // row being rejected
  const [remarks,  setRemarks]  = useState('');
  const [busyId,   setBusyId]   = useState(null);
  const [reviewErr, setReviewErr] = useState('');

  const fetchRows = useCallback(() => {
    setLoading(true); setError('');
    const params = new URLSearchParams({ status: tab });
    if (search) params.append('search', search);
    api.get(`/auth/registrar/registrations/?${params.toString()}`)
      .then(res => setRows(res.data.results ?? res.data))
      .catch(() => setError('Failed to load registration requests.'))
      .finally(() => setLoading(false));
  }, [tab, search]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  function handleSearch(e) { e.preventDefault(); setSearch(searchInput.trim()); }

  async function approve(row) {
    setBusyId(row.id); setError('');
    try {
      await api.post(`/auth/registrar/registrations/${row.id}/review/`, { action: 'approve' });
      setFlash(`${row.full_name} approved. They can now log in.`);
      fetchRows();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve.');
    } finally { setBusyId(null); }
  }

  async function submitReject(e) {
    e.preventDefault();
    if (!remarks.trim()) { setReviewErr('A reason is required.'); return; }
    setBusyId(reject.id); setReviewErr('');
    try {
      await api.post(`/auth/registrar/registrations/${reject.id}/review/`, { action: 'reject', remarks: remarks.trim() });
      setFlash(`${reject.full_name}'s registration was rejected.`);
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
        <div>
          <div className="eyebrow">Registrar · Account validation</div>
          <h2>Registration <em>requests</em></h2>
          <div className="sub">Verify each student's record in the university system, then approve or reject their portal account.</div>
        </div>
      </div>

      {flash && <div className="rr-flash rr-flash-ok">{flash}</div>}
      {error && <div className="rr-flash rr-flash-err">{error}</div>}

      <div className="rr-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`rr-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => { setTab(t.key); setFlash(''); }}
          >{t.label}</button>
        ))}
        <form className="rr-search" onSubmit={handleSearch}>
          <i className="ti ti-search" />
          <input placeholder="Search name, ID, or email…" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </form>
      </div>

      <div className="rr-card">
        {loading ? (
          <div className="rr-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="rr-empty">No {tab} registrations.</div>
        ) : (
          <table className="rr-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Submitted</th>
                {tab === 'pending' ? <th className="rr-right">Action</th> : <th>Reviewed by</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="rr-user">
                      <div className="rr-avatar">{initials(r.full_name)}</div>
                      <div>
                        <div className="rr-name">{r.full_name}</div>
                        <div className="rr-email">{r.institutional_email}</div>
                      </div>
                    </div>
                    {r.registration_status === 'rejected' && r.registration_remarks && (
                      <div className="rr-remarks">Reason: {r.registration_remarks}</div>
                    )}
                  </td>
                  <td className="rr-mono">{r.student_id}</td>
                  <td className="rr-muted">{fmtDate(r.date_joined)}</td>
                  {tab === 'pending' ? (
                    <td className="rr-right">
                      <button className="rr-btn rr-btn-approve" disabled={busyId === r.id} onClick={() => approve(r)}>
                        <i className="ti ti-check" /> Approve
                      </button>
                      <button className="rr-btn rr-btn-reject" disabled={busyId === r.id} onClick={() => { setReject(r); setRemarks(''); setReviewErr(''); }}>
                        <i className="ti ti-x" /> Reject
                      </button>
                    </td>
                  ) : (
                    <td className="rr-muted">{r.reviewed_by_name || '—'}<div className="rr-muted rr-sm">{fmtDate(r.registration_reviewed_at)}</div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {reject && (
        <div className="rr-overlay" onMouseDown={() => busyId == null && setReject(null)}>
          <div className="rr-modal" onMouseDown={e => e.stopPropagation()}>
            <h3>Reject <em>registration</em></h3>
            <p className="rr-modal-sub">Rejecting <strong>{reject.full_name}</strong> ({reject.student_id}). They'll be emailed the reason below.</p>
            <form onSubmit={submitReject}>
              <label className="rr-label">Reason for rejection</label>
              <textarea
                className="rr-textarea" rows={3} autoFocus
                placeholder="e.g. Student ID not found in the university records."
                value={remarks} onChange={e => setRemarks(e.target.value)}
              />
              {reviewErr && <div className="rr-flash rr-flash-err" style={{ marginTop: 8 }}>{reviewErr}</div>}
              <div className="rr-modal-foot">
                <button type="button" className="rr-btn rr-btn-ghost" onClick={() => setReject(null)} disabled={busyId != null}>Cancel</button>
                <button type="submit" className="rr-btn rr-btn-reject" disabled={busyId != null}>
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

const CSS = `
  .rr-flash{padding:10px 16px;margin-bottom:1rem;font-size:13px;border-radius:2px}
  .rr-flash-ok{background:var(--reg-green-tint);color:var(--reg-green)}
  .rr-flash-err{background:var(--reg-red-tint);color:var(--reg-red)}
  .rr-tabs{display:flex;align-items:center;gap:.25rem;margin-bottom:1rem;flex-wrap:wrap}
  .rr-tab{padding:7px 16px;border:1px solid var(--reg-line);background:#fff;font:500 13px 'Inter',sans-serif;color:var(--reg-muted);cursor:pointer}
  .rr-tab.active{background:var(--reg-ink);color:#fff;border-color:var(--reg-ink)}
  .rr-search{margin-left:auto;display:flex;align-items:center;gap:8px;border:1px solid var(--reg-line);background:#fff;padding:0 10px;min-width:240px}
  .rr-search i{color:var(--reg-faint);font-size:16px}
  .rr-search input{border:none;outline:none;padding:8px 0;font:13px 'Inter',sans-serif;flex:1;background:none}
  .rr-card{background:#fff;border:1px solid var(--reg-line);overflow-x:auto}
  .rr-empty{padding:2.5rem;text-align:center;color:var(--reg-muted);font-size:13px}
  .rr-table{width:100%;border-collapse:collapse;font-size:13px;min-width:640px}
  .rr-table th{text-align:left;padding:11px 16px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--reg-faint);font-weight:600;border-bottom:1px solid var(--reg-line);background:var(--reg-warm)}
  .rr-table td{padding:12px 16px;border-bottom:1px solid var(--reg-line-soft);vertical-align:top}
  .rr-right{text-align:right;white-space:nowrap}
  .rr-user{display:flex;align-items:center;gap:12px}
  .rr-avatar{width:34px;height:34px;border-radius:50%;background:var(--reg-ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0}
  .rr-name{font-weight:600;color:var(--reg-ink)}
  .rr-email{font-size:12px;color:var(--reg-muted)}
  .rr-remarks{font-size:12px;color:var(--reg-red);margin-top:6px}
  .rr-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--reg-ink)}
  .rr-muted{color:var(--reg-muted)}
  .rr-sm{font-size:11px}
  .rr-btn{padding:7px 12px;border:1px solid var(--reg-line);background:#fff;font:600 12px 'Inter',sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
  .rr-btn:disabled{opacity:.5;cursor:not-allowed}
  .rr-btn-approve{color:var(--reg-green);border-color:var(--reg-green)}
  .rr-btn-approve:hover:not(:disabled){background:var(--reg-green-tint)}
  .rr-btn-reject{color:var(--reg-red);border-color:var(--reg-red);margin-left:8px}
  .rr-btn-reject:hover:not(:disabled){background:var(--reg-red-tint)}
  .rr-btn-ghost{color:var(--reg-muted)}
  .rr-overlay{position:fixed;inset:0;z-index:200;background:rgba(10,22,40,.45);display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px;overflow-y:auto}
  .rr-modal{background:#fff;width:100%;max-width:440px;border:1px solid var(--reg-line);padding:1.5rem;box-shadow:0 24px 60px -20px rgba(10,22,40,.4)}
  .rr-modal h3{font-size:18px;color:var(--reg-ink);font-weight:600;margin:0 0 .35rem}
  .rr-modal h3 em{font-style:normal;color:var(--reg-gold)}
  .rr-modal-sub{font-size:13px;color:var(--reg-muted);margin:0 0 1rem;line-height:1.5}
  .rr-label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--reg-faint);font-weight:600;margin-bottom:5px}
  .rr-textarea{width:100%;border:1px solid var(--reg-line);padding:9px 11px;font:13px 'Inter',sans-serif;box-sizing:border-box;resize:vertical;outline:none}
  .rr-textarea:focus{border-color:var(--reg-gold)}
  .rr-modal-foot{display:flex;justify-content:flex-end;gap:.75rem;margin-top:1rem}
  @media(max-width:560px){.rr-search{margin-left:0;width:100%}.rr-btn-reject{margin-left:6px}}
`;
