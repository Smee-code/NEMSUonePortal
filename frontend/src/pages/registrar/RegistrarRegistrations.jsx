import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';

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
function relTime(s) {
  if (!s) return '';
  const days = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7)  return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} ago`;
  return `on ${fmtDate(s)}`;
}

export default function RegistrarRegistrations() {
  const toast = useToast();
  const [tab,     setTab]     = useState('pending');
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search,      setSearch]      = useState('');

  const [reject,    setReject]    = useState(null);   // row being rejected
  const [remarks,   setRemarks]   = useState('');
  const [busyId,    setBusyId]    = useState(null);
  const [reviewErr, setReviewErr] = useState('');

  const fetchRows = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ status: tab });
    if (search) params.append('search', search);
    api.get(`/auth/registrar/registrations/?${params.toString()}`)
      .then(res => setRows(res.data.results ?? res.data))
      .catch(() => toast('Couldn’t load registration requests. Refresh to try again.', { type: 'error' }))
      .finally(() => setLoading(false));
  }, [tab, search, toast]);

  const fetchPendingCount = useCallback(() => {
    api.get('/auth/registrar/registrations/?status=pending&page_size=1')
      .then(res => setPendingCount(res.data?.count ?? (Array.isArray(res.data) ? res.data.length : 0)))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { fetchPendingCount(); }, [fetchPendingCount]);

  function handleSearch(e) { e.preventDefault(); setSearch(searchInput.trim()); }

  async function approve(row) {
    setBusyId(row.id);
    try {
      await api.post(`/auth/registrar/registrations/${row.id}/review/`, { action: 'approve' });
      toast(`${row.full_name} approved — they can now sign in.`, { type: 'success' });
      fetchRows(); fetchPendingCount();
    } catch (err) {
      toast(err.response?.data?.error || 'Couldn’t approve this request.', { type: 'error' });
    } finally { setBusyId(null); }
  }

  async function submitReject(e) {
    e.preventDefault();
    if (!remarks.trim()) { setReviewErr('Give a reason so the student knows what to fix.'); return; }
    setBusyId(reject.id); setReviewErr('');
    try {
      await api.post(`/auth/registrar/registrations/${reject.id}/review/`, { action: 'reject', remarks: remarks.trim() });
      toast(`${reject.full_name}'s registration was rejected.`, { type: 'success' });
      setReject(null); setRemarks('');
      fetchRows(); fetchPendingCount();
    } catch (err) {
      toast(err.response?.data?.remarks?.[0] || err.response?.data?.error || 'Couldn’t reject this request.', { type: 'error' });
    } finally { setBusyId(null); }
  }

  const lede = tab === 'pending'
    ? (pendingCount === 0
        ? 'No one is waiting. New sign-ups land here for you to verify.'
        : pendingCount == null
          ? 'Check each student’s ID against the university records, then admit or reject their account.'
          : `${pendingCount} ${pendingCount === 1 ? 'student is' : 'students are'} waiting. Check each ID against the university records, then admit or reject.`)
    : `A record of ${tab} registrations and who decided them.`;

  return (
    <>
      <style>{CSS}</style>

      <header className="rr-head">
        <h1>Registration requests</h1>
        <p className="rr-lede">{lede}</p>
      </header>

      <div className="rr-toolbar">
        <div className="rr-seg">
          {TABS.map(t => (
            <button key={t.key} className={`rr-seg-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
              {t.key === 'pending' && pendingCount > 0 && <span className="rr-seg-badge">{pendingCount}</span>}
            </button>
          ))}
        </div>
        <form className="rr-search" onSubmit={handleSearch}>
          <i className="ti ti-search" />
          <input placeholder="Search name, ID, or email…" value={searchInput}
            onChange={e => setSearchInput(e.target.value)} />
        </form>
      </div>

      {loading ? (
        <div className="rr-empty">Loading requests…</div>
      ) : rows.length === 0 ? (
        <div className="rr-empty">
          <i className={`ti ${tab === 'pending' ? 'ti-inbox-check' : 'ti-folder'}`} />
          <div className="rr-empty-t">
            {tab === 'pending' ? 'Nothing waiting'
              : search ? `No ${tab} requests match “${search}”.`
              : `No ${tab} registrations yet`}
          </div>
          {tab === 'pending' && !search && <div className="rr-empty-d">You’re all caught up on account verification.</div>}
        </div>
      ) : (
        <div className="rr-list">
          {rows.map(r => (
            <article className={`rr-item rr-${tab}`} key={r.id}>
              <div className="rr-item-main">
                <div className="rr-avatar">{initials(r.full_name)}</div>
                <div className="rr-item-body">
                  <div className="rr-item-top">
                    <span className="rr-name">{r.full_name}</span>
                    <span className="rr-when">
                      {tab === 'pending' ? `Applied ${relTime(r.date_joined)}` : fmtDate(r.date_joined)}
                    </span>
                  </div>
                  <div className="rr-email">{r.institutional_email}</div>
                  <div className="rr-idline">
                    <span className="rr-idlabel">Student ID</span>
                    <span className="rr-id">{r.student_id || '—'}</span>
                  </div>

                  {tab === 'rejected' && r.registration_remarks && (
                    <div className="rr-reason"><strong>Reason:</strong> {r.registration_remarks}</div>
                  )}
                  {tab !== 'pending' && (
                    <div className={`rr-decided rr-decided-${tab}`}>
                      <i className={`ti ${tab === 'approved' ? 'ti-circle-check' : 'ti-circle-x'}`} />
                      {tab === 'approved' ? 'Approved' : 'Rejected'} by {r.reviewed_by_name || 'registrar'}
                      {r.registration_reviewed_at ? ` on ${fmtDate(r.registration_reviewed_at)}` : ''}
                    </div>
                  )}
                </div>
              </div>

              {tab === 'pending' && (
                <div className="rr-item-actions">
                  <button className="rr-btn rr-btn-reject" disabled={busyId === r.id}
                    onClick={() => { setReject(r); setRemarks(''); setReviewErr(''); }}>
                    <i className="ti ti-x" /> Reject
                  </button>
                  <button className="rr-btn rr-btn-approve" disabled={busyId === r.id} onClick={() => approve(r)}>
                    <i className="ti ti-check" /> {busyId === r.id ? 'Approving…' : 'Approve'}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {reject && (
        <div className="rr-overlay" onMouseDown={() => busyId == null && setReject(null)}>
          <div className="rr-modal" onMouseDown={e => e.stopPropagation()}>
            <h3>Reject registration</h3>
            <p className="rr-modal-sub">
              Rejecting <strong>{reject.full_name}</strong> ({reject.student_id}). They’ll be emailed the reason below.
            </p>
            <form onSubmit={submitReject}>
              <label className="rr-label">Reason for rejection</label>
              <textarea
                className="rr-textarea" rows={3} autoFocus
                placeholder="e.g. Student ID not found in the university records."
                value={remarks} onChange={e => setRemarks(e.target.value)}
              />
              {reviewErr && <div className="rr-flash rr-flash-err">{reviewErr}</div>}
              <div className="rr-modal-foot">
                <button type="button" className="rr-btn rr-btn-ghost" onClick={() => setReject(null)} disabled={busyId != null}>Cancel</button>
                <button type="submit" className="rr-btn rr-btn-reject-solid" disabled={busyId != null}>
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
  /* ── Header ── */
  .rr-head{ padding-bottom:1.1rem; margin-bottom:1.3rem; border-bottom:1px solid var(--reg-line); }
  .rr-head h1{ margin:0; font:600 24px/1.15 'Inter',sans-serif; color:var(--reg-ink); letter-spacing:-.015em; }
  .rr-lede{ margin:.4rem 0 0; font-size:13.5px; color:var(--reg-muted); max-width:62ch; line-height:1.5; }

  /* ── Toolbar: segmented tabs + search ── */
  .rr-toolbar{ display:flex; align-items:center; gap:1rem; margin-bottom:1.25rem; flex-wrap:wrap; }
  .rr-seg{ display:inline-flex; border:1px solid var(--reg-line); background:#fff; }
  .rr-seg-btn{ display:inline-flex; align-items:center; gap:8px; padding:8px 16px; border:none; background:none;
    font:500 13px 'Inter',sans-serif; color:var(--reg-muted); cursor:pointer; border-right:1px solid var(--reg-line);
    transition:background .14s, color .14s; }
  .rr-seg-btn:last-child{ border-right:none; }
  .rr-seg-btn:hover{ color:var(--reg-ink); background:var(--reg-warm); }
  .rr-seg-btn.active{ background:var(--reg-ink); color:#fff; }
  .rr-seg-badge{ font:700 11px 'Inter',sans-serif; background:var(--reg-gold); color:#3a2c07; padding:1px 7px;
    border-radius:999px; font-variant-numeric:tabular-nums; }
  .rr-seg-btn.active .rr-seg-badge{ background:#fff; color:var(--reg-ink); }
  .rr-search{ margin-left:auto; display:flex; align-items:center; gap:8px; border:1px solid var(--reg-line);
    background:#fff; padding:0 12px; min-width:250px; }
  .rr-search:focus-within{ border-color:var(--reg-ink); }
  .rr-search i{ color:var(--reg-faint); font-size:16px; }
  .rr-search input{ border:none; outline:none; padding:9px 0; font:13px 'Inter',sans-serif; flex:1; background:none; color:var(--reg-ink); }

  /* ── Empty ── */
  .rr-empty{ border:1px solid var(--reg-line); background:#fff; padding:3rem 1.5rem; text-align:center; color:var(--reg-muted); font-size:13px; }
  .rr-empty i{ font-size:34px; color:var(--reg-faint); display:block; margin-bottom:.6rem; }
  .rr-empty-t{ font-weight:600; color:var(--reg-ink); font-size:15px; }
  .rr-empty-d{ margin-top:4px; font-size:13px; }

  /* ── Case list ── */
  .rr-list{ display:flex; flex-direction:column; gap:10px; }
  .rr-item{ position:relative; display:flex; align-items:center; justify-content:space-between; gap:1rem;
    background:#fff; border:1px solid var(--reg-line); padding:16px 18px 16px 21px; flex-wrap:wrap; }
  .rr-item::before{ content:''; position:absolute; left:0; top:0; bottom:0; width:4px; }
  .rr-pending::before{ background:var(--reg-gold); }
  .rr-approved::before{ background:var(--reg-green); }
  .rr-rejected::before{ background:var(--reg-red); }

  .rr-item-main{ display:flex; gap:14px; align-items:flex-start; min-width:0; flex:1; }
  .rr-avatar{ width:40px; height:40px; border-radius:50%; background:var(--reg-ink); color:#fff;
    display:flex; align-items:center; justify-content:center; font:600 13px 'Inter',sans-serif; flex-shrink:0; }
  .rr-item-body{ min-width:0; }
  .rr-item-top{ display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; }
  .rr-name{ font:600 15px 'Inter',sans-serif; color:var(--reg-ink); letter-spacing:-.005em; }
  .rr-when{ font-size:11.5px; color:var(--reg-faint); }
  .rr-email{ font-size:12.5px; color:var(--reg-muted); margin-top:1px; word-break:break-all; }
  .rr-idline{ display:inline-flex; align-items:center; gap:8px; margin-top:8px;
    background:var(--reg-cool-2); border:1px solid var(--reg-line-soft); padding:3px 9px; }
  .rr-idlabel{ font-size:9.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--reg-faint); font-weight:700; }
  .rr-id{ font:600 13px ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--reg-ink); letter-spacing:.02em; }
  .rr-reason{ margin-top:8px; font-size:12.5px; color:var(--reg-ink); background:var(--reg-red-tint);
    border-left:2px solid var(--reg-red); padding:6px 10px; }
  .rr-reason strong{ color:var(--reg-red); }
  .rr-decided{ display:inline-flex; align-items:center; gap:6px; margin-top:8px; font-size:12px; color:var(--reg-muted); }
  .rr-decided i{ font-size:15px; }
  .rr-decided-approved i{ color:var(--reg-green); }
  .rr-decided-rejected i{ color:var(--reg-red); }

  /* ── Actions ── */
  .rr-item-actions{ display:flex; align-items:center; gap:9px; flex-shrink:0; }
  .rr-btn{ padding:9px 16px; border:1px solid var(--reg-line); background:#fff; font:600 12.5px 'Inter',sans-serif;
    cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:background .14s, border-color .14s, color .14s; }
  .rr-btn:disabled{ opacity:.5; cursor:not-allowed; }
  .rr-btn:focus-visible{ outline:2px solid var(--reg-ink); outline-offset:2px; }
  .rr-btn-approve{ background:var(--reg-green); border-color:var(--reg-green); color:#fff; }
  .rr-btn-approve:hover:not(:disabled){ filter:brightness(1.08); }
  .rr-btn-reject{ color:var(--reg-muted); }
  .rr-btn-reject:hover:not(:disabled){ color:var(--reg-red); border-color:var(--reg-red); background:var(--reg-red-tint); }

  /* ── Reject modal ── */
  .rr-overlay{ position:fixed; inset:0; z-index:200; background:rgba(10,22,40,.45);
    display:flex; align-items:flex-start; justify-content:center; padding:6vh 16px; overflow-y:auto; }
  .rr-modal{ background:#fff; width:100%; max-width:460px; border:1px solid var(--reg-line); padding:1.6rem;
    box-shadow:0 24px 60px -20px rgba(10,22,40,.45); }
  .rr-modal h3{ font:600 18px 'Inter',sans-serif; color:var(--reg-ink); margin:0 0 .4rem; }
  .rr-modal-sub{ font-size:13px; color:var(--reg-muted); margin:0 0 1.1rem; line-height:1.55; }
  .rr-label{ display:block; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--reg-faint); font-weight:600; margin-bottom:6px; }
  .rr-textarea{ width:100%; border:1px solid var(--reg-line); padding:10px 12px; font:13px/1.5 'Inter',sans-serif;
    box-sizing:border-box; resize:vertical; outline:none; color:var(--reg-ink); }
  .rr-textarea:focus{ border-color:var(--reg-ink); }
  .rr-flash{ padding:9px 12px; font-size:12.5px; margin-top:10px; }
  .rr-flash-err{ background:var(--reg-red-tint); color:var(--reg-red); }
  .rr-modal-foot{ display:flex; justify-content:flex-end; gap:.6rem; margin-top:1.2rem; }
  .rr-btn-ghost{ color:var(--reg-muted); }
  .rr-btn-ghost:hover:not(:disabled){ border-color:var(--reg-ink); color:var(--reg-ink); }
  .rr-btn-reject-solid{ background:var(--reg-red); border-color:var(--reg-red); color:#fff; }
  .rr-btn-reject-solid:hover:not(:disabled){ filter:brightness(1.08); }

  @media (max-width:560px){
    .rr-search{ margin-left:0; width:100%; min-width:0; }
    .rr-item{ align-items:flex-start; }
    .rr-item-actions{ width:100%; }
    .rr-item-actions .rr-btn{ flex:1; justify-content:center; }
  }
  @media (prefers-reduced-motion: reduce){ .rr-seg-btn, .rr-btn{ transition:none; } }
`;
