import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAdminShell } from '../../context/AdminShellContext';

const YEAR_LABELS = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

function fillColor(pct) {
  if (pct >= 100) return 'var(--adm-red)';
  if (pct >= 85)  return 'var(--adm-amber)';
  return 'var(--adm-green)';
}

function FillBar({ pct }) {
  const color = fillColor(pct);
  return (
    <div style={{ height: 5, background: 'var(--adm-line)', borderRadius: 9999, overflow: 'hidden', width: '100%', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 9999, transition: 'width .3s' }} />
    </div>
  );
}

export default function AdminBlocks() {
  const { toast } = useAdminShell();

  const [terms, setTerms]               = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [blocks, setBlocks]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [dataLoading, setDataLoading]   = useState(false);
  const [error, setError]               = useState('');

  const [requests, setRequests]         = useState([]);
  const [reqLoading, setReqLoading]     = useState(false);
  const [activeTab, setActiveTab]       = useState('blocks');

  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm]     = useState({ status: 'approved', admin_note: '' });
  const [reviewing, setReviewing]       = useState(false);
  const [reviewError, setReviewError]   = useState('');

  const [detailBlock, setDetailBlock]       = useState(null);
  const [detailStudents, setDetailStudents] = useState([]);
  const [detailLoading, setDetailLoading]   = useState(false);

  useEffect(() => {
    api.get('/enrollment/admin/terms/')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
        setTerms(list);
        setSelectedTerm(list.find(t => t.is_active) ?? list[0] ?? null);
      })
      .catch(() => setError('Failed to load terms.'))
      .finally(() => setLoading(false));
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!selectedTerm) return;
    setDataLoading(true);
    api.get(`/enrollment/blocks/?term=${selectedTerm.id}`)
      .then(res => setBlocks(Array.isArray(res.data) ? res.data : (res.data.results ?? [])))
      .catch(() => setError('Failed to load blocks.'))
      .finally(() => setDataLoading(false));
  }, [selectedTerm]);

  function fetchRequests() {
    setReqLoading(true);
    api.get('/enrollment/block-expansion-requests/')
      .then(res => setRequests(Array.isArray(res.data) ? res.data : (res.data.results ?? [])))
      .catch(() => {})
      .finally(() => setReqLoading(false));
  }

  function openReview(req) {
    setReviewTarget(req);
    setReviewForm({ status: 'approved', admin_note: '' });
    setReviewError('');
  }

  async function submitReview(e) {
    e.preventDefault();
    setReviewing(true);
    try {
      await api.patch(`/enrollment/block-expansion-requests/${reviewTarget.id}/`, reviewForm);
      const action = reviewForm.status === 'approved' ? 'approved' : 'rejected';
      const msg = `Request for ${reviewTarget.block_name} ${action} successfully.`;
      toast(msg, { type: 'success' });
      setReviewTarget(null);
      fetchRequests();
      if (selectedTerm) {
        api.get(`/enrollment/blocks/?term=${selectedTerm.id}`)
          .then(res => setBlocks(Array.isArray(res.data) ? res.data : (res.data.results ?? [])));
      }
    } catch (err) {
      const d = err.response?.data;
      setReviewError(
        (d && typeof d === 'object') ? Object.values(d).flat().join(' ') : 'Failed to submit review.'
      );
    } finally {
      setReviewing(false);
    }
  }

  async function openDetail(block) {
    setDetailBlock(block);
    setDetailStudents([]);
    setDetailLoading(true);
    try {
      const res = await api.get(`/enrollment/blocks/${block.id}/`);
      setDetailStudents(res.data.students ?? []);
    } catch {
      setDetailStudents([]);
    } finally {
      setDetailLoading(false);
    }
  }

  const grouped = {};
  for (const b of blocks) {
    const prog = b.program_code;
    if (!grouped[prog]) grouped[prog] = { name: b.program_name, yearGroups: {} };
    const yl = b.year_level;
    if (!grouped[prog].yearGroups[yl]) grouped[prog].yearGroups[yl] = [];
    grouped[prog].yearGroups[yl].push(b);
  }

  const pendingRequests  = requests.filter(r => r.status === 'pending');
  const resolvedRequests = requests.filter(r => r.status !== 'pending');

  const totalEnrolled = blocks.reduce((s, b) => s + b.enrolled_count, 0);
  const totalCapacity = blocks.reduce((s, b) => s + b.capacity, 0);
  const avgFill       = blocks.length ? Math.round(blocks.reduce((s, b) => s + b.fill_pct, 0) / blocks.length) : 0;
  const activeCount   = blocks.filter(b => !b.is_full).length;

  const statusPill = s => ({
    pending:  { bg: 'var(--adm-amber-tint)', color: '#92400e', label: 'Pending' },
    approved: { bg: 'var(--adm-green-tint)', color: '#065f46', label: 'Approved' },
    rejected: { bg: 'var(--adm-red-tint)',   color: '#991b1b', label: 'Rejected' },
  }[s] || { bg: 'var(--adm-cool)', color: 'var(--adm-ink)', label: s });

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">Manage · {blocks.length} blocks</div>
          <h2>Block <em>management</em></h2>
          <div className="sub">Monitor enrollment blocks by program and year level, and review capacity expansion requests.</div>
        </div>
        <div className="actions">
          <button className="btn-sec" onClick={() => setActiveTab('requests')}>
            <i className="ti ti-inbox" /> Expansion requests
            {pendingRequests.length > 0 && (
              <span className="blk-badge">{pendingRequests.length}</span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="blk-flash blk-flash-err" onClick={() => setError('')}>{error}</div>
      )}

      {!loading && blocks.length > 0 && activeTab === 'blocks' && (
        <div className="stat-row">
          <div className="stat">
            <div className="num">{activeCount}</div>
            <div className="lbl">Active blocks</div>
          </div>
          <div className="stat">
            <div className="num">{totalCapacity}</div>
            <div className="lbl">Total capacity</div>
          </div>
          <div className="stat">
            <div className="num" style={{ color: 'var(--adm-green)' }}>{totalEnrolled}</div>
            <div className="lbl">Enrolled</div>
          </div>
          <div className="stat">
            <div className="num" style={{ color: 'var(--adm-amber)' }}>{avgFill}%</div>
            <div className="lbl">Avg fill rate</div>
          </div>
        </div>
      )}

      <div className="subtabs">
        <button className={`subtab${activeTab === 'blocks' ? ' active' : ''}`} onClick={() => setActiveTab('blocks')}>
          Block overview
        </button>
        <button className={`subtab${activeTab === 'requests' ? ' active' : ''}`} onClick={() => setActiveTab('requests')}>
          Expansion requests
          {pendingRequests.length > 0 && <span className="blk-badge">{pendingRequests.length}</span>}
        </button>
      </div>

      {/* ── TAB: Block Overview ── */}
      {activeTab === 'blocks' && (
        <>
          <div className="toolbar">
            <label style={{ fontSize: 12, color: 'var(--adm-muted)', fontWeight: 600 }}>Academic term</label>
            <select
              className="toolbar-search"
              style={{ width: 220 }}
              value={selectedTerm?.id ?? ''}
              onChange={e => setSelectedTerm(terms.find(t => t.id === parseInt(e.target.value)) ?? null)}
            >
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {t.semester_display} {t.year}{t.is_active ? ' (Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {loading || dataLoading ? (
            <div className="blk-loading">Loading blocks…</div>
          ) : blocks.length === 0 ? (
            <div className="empty-state">
              <i className="ti ti-layout-grid" />
              <div className="t">No blocks found</div>
              <div className="d">Blocks are created automatically when enrollments are approved for this term.</div>
            </div>
          ) : (
            Object.entries(grouped).map(([code, prog]) => (
              <div key={code} style={{ marginBottom: '1.5rem' }}>
                <div className="info-section-head" style={{ marginBottom: '.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--adm-ink)' }}>{code}</div>
                    <div style={{ fontSize: 12, color: 'var(--adm-muted)', marginTop: 2 }}>{prog.name}</div>
                  </div>
                </div>
                {Object.entries(prog.yearGroups).sort(([a],[b]) => a-b).map(([yl, yearBlocks]) => (
                  <div key={yl} style={{ marginBottom: '1rem' }}>
                    <div className="blk-year-label">{YEAR_LABELS[yl] ?? `Year ${yl}`}</div>
                    <div className="grid-cards">
                      {yearBlocks.map(b => (
                        <div key={b.id} style={{ borderTop: `3px solid ${fillColor(b.fill_pct)}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div className="blk-name">{b.name}</div>
                            <span className={`tag${b.is_full ? '' : ' success'}`} style={{ fontSize: 10 }}>
                              {b.is_full ? 'Full' : 'Open'}
                            </span>
                          </div>
                          <div className="blk-count-row">
                            <span className="blk-enrolled">{b.enrolled_count}</span>
                            <span className="blk-cap">/ {b.capacity} students</span>
                          </div>
                          <FillBar pct={b.fill_pct} />
                          <div className="blk-fill-label">
                            {b.fill_pct}% · {b.available_slots} slot{b.available_slots !== 1 ? 's' : ''} left
                          </div>
                          <button className="blk-btn-view" onClick={() => openDetail(b)}>
                            View students
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </>
      )}

      {/* ── TAB: Expansion Requests ── */}
      {activeTab === 'requests' && (
        <div>
          <div className="info-section" style={{ marginBottom: '1rem' }}>
            <div className="info-section-head">
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Pending requests</div>
                {pendingRequests.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--adm-muted)', marginTop: 2 }}>
                    {pendingRequests.length} awaiting review
                  </div>
                )}
              </div>
            </div>
            {reqLoading ? (
              <div className="blk-loading">Loading…</div>
            ) : pendingRequests.length === 0 ? (
              <div style={{ padding: '1rem', fontSize: 13, color: 'var(--adm-muted)' }}>No pending expansion requests.</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      {['Block', 'Program', 'Year', 'Current', 'Requested', 'Reason', 'Requested by', 'Date', ''].map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map(r => (
                      <tr key={r.id}>
                        <td><strong>{r.block_name}</strong></td>
                        <td>{r.block_program_code}</td>
                        <td>{r.block_year_level_display}</td>
                        <td>{r.current_capacity}</td>
                        <td style={{ fontWeight: 700, color: 'var(--adm-ink)' }}>{r.requested_capacity}</td>
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.reason || '-'}
                        </td>
                        <td>{r.requested_by_name}</td>
                        <td style={{ fontSize: 11, color: 'var(--adm-muted)' }}>
                          {new Date(r.created_at).toLocaleDateString('en-PH')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="blk-btn-approve" onClick={() => { openReview(r); setReviewForm({ status: 'approved', admin_note: '' }); }}>
                              Approve
                            </button>
                            <button className="blk-btn-reject" onClick={() => { openReview(r); setReviewForm({ status: 'rejected', admin_note: '' }); }}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {resolvedRequests.length > 0 && (
            <div className="info-section">
              <div className="info-section-head">
                <div style={{ fontWeight: 600, fontSize: 13 }}>Resolved requests</div>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      {['Block', 'Program', 'Year', 'Old cap', 'New cap', 'Status', 'Admin note', 'Requested by', 'Reviewed'].map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resolvedRequests.map(r => {
                      const pill = statusPill(r.status);
                      return (
                        <tr key={r.id}>
                          <td><strong>{r.block_name}</strong></td>
                          <td>{r.block_program_code}</td>
                          <td>{r.block_year_level_display}</td>
                          <td>{r.current_capacity}</td>
                          <td style={{ fontWeight: 700 }}>{r.requested_capacity}</td>
                          <td>
                            <span style={{ background: pill.bg, color: pill.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                              {pill.label}
                            </span>
                          </td>
                          <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.admin_note || '-'}
                          </td>
                          <td>{r.requested_by_name}</td>
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
        </div>
      )}

      {/* ── Review modal ── */}
      {reviewTarget && (
        <div className="blk-overlay" onClick={() => setReviewTarget(null)}>
          <div className="blk-modal" onClick={e => e.stopPropagation()}>
            <div className="blk-modal-title">
              {reviewForm.status === 'approved' ? 'Approve' : 'Reject'} expansion request
            </div>
            <p style={{ fontSize: 13, color: 'var(--adm-muted)', marginBottom: '1rem' }}>
              <strong>{reviewTarget.block_name}</strong> · {reviewTarget.block_program_code} · {reviewTarget.block_year_level_display}
              <br />
              Current capacity: <strong>{reviewTarget.current_capacity}</strong> → Requested: <strong>{reviewTarget.requested_capacity}</strong>
              {reviewTarget.reason && <><br />Reason: <em>{reviewTarget.reason}</em></>}
            </p>

            {reviewError && <div className="blk-flash blk-flash-err" style={{ marginBottom: '.75rem' }}>{reviewError}</div>}

            <form onSubmit={submitReview}>
              <div className="blk-form-row">
                <label className="blk-form-label">Decision</label>
                <select className="blk-form-input" value={reviewForm.status}
                  onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="approved">Approve: set new capacity to {reviewTarget.requested_capacity}</option>
                  <option value="rejected">Reject: keep current capacity at {reviewTarget.current_capacity}</option>
                </select>
              </div>
              <div className="blk-form-row">
                <label className="blk-form-label">
                  Admin note <span style={{ fontWeight: 400, color: 'var(--adm-faint)' }}>(optional)</span>
                </label>
                <textarea
                  className="blk-form-input"
                  style={{ height: 72, resize: 'vertical' }}
                  placeholder="Add a note for the registrar…"
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

      {/* ── Student detail modal ── */}
      {detailBlock && (
        <div className="blk-overlay" onClick={() => setDetailBlock(null)}>
          <div className="blk-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="blk-modal-title">Students in {detailBlock.name}</div>
            <p style={{ fontSize: 12, color: 'var(--adm-muted)', marginBottom: '1rem' }}>
              {detailBlock.program_code} · {detailBlock.year_level_display} · {detailBlock.enrolled_count} / {detailBlock.capacity} enrolled
            </p>
            {detailLoading ? (
              <div className="blk-loading">Loading…</div>
            ) : detailStudents.length === 0 ? (
              <p style={{ color: 'var(--adm-faint)', fontSize: 13 }}>No enrolled students in this block.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>{['#', 'Student ID', 'Name', 'Year level'].map((h, i) => <th key={i}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {detailStudents.map((s, i) => (
                      <tr key={s.enrollment_id}>
                        <td>{i + 1}</td>
                        <td>{s.student_id || '-'}</td>
                        <td style={{ fontWeight: 600 }}>{s.student_name}</td>
                        <td>{s.year_level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn-sec" onClick={() => setDetailBlock(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const CSS = `
  .blk-flash{padding:10px 16px;margin-bottom:1rem;font-size:13px;cursor:pointer}
  .blk-flash-ok{background:#e6f1ec;color:var(--adm-green)}
  .blk-flash-err{background:#f6e8e4;color:var(--adm-red)}
  .blk-loading{color:var(--adm-muted);padding:2rem 0;font-size:13px}
  .blk-badge{background:var(--adm-red);color:#fff;font-size:10px;font-weight:700;border-radius:999px;padding:1px 6px;margin-left:6px;vertical-align:middle}
  .blk-year-label{font-size:10px;font-weight:700;color:var(--adm-muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem}
  .blk-name{font-weight:700;font-size:15px;color:var(--adm-ink)}
  .blk-count-row{display:flex;align-items:baseline;gap:4px;margin:.35rem 0}
  .blk-enrolled{font-size:22px;font-weight:800;color:var(--adm-ink)}
  .blk-cap{font-size:12px;color:var(--adm-muted)}
  .blk-fill-label{font-size:10px;color:var(--adm-faint);margin-top:3px;text-align:right}
  .blk-btn-view{width:100%;margin-top:.65rem;background:var(--adm-cool);color:var(--adm-ink-2);border:1px solid var(--adm-line);padding:5px 0;font:600 11px/1 'Inter',sans-serif;cursor:pointer;text-align:center}
  .blk-btn-approve{background:var(--adm-green-tint);color:#065f46;border:1px solid #6ee7b7;padding:3px 10px;font:700 11px/1 'Inter',sans-serif;cursor:pointer;white-space:nowrap}
  .blk-btn-reject{background:var(--adm-red-tint);color:#991b1b;border:1px solid #fca5a5;padding:3px 10px;font:700 11px/1 'Inter',sans-serif;cursor:pointer;white-space:nowrap}
  .blk-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:50;display:flex;align-items:center;justify-content:center;padding:1rem}
  .blk-modal{background:#fff;border:1px solid var(--adm-line);padding:1.5rem;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,.18)}
  .blk-modal-title{font-size:15px;font-weight:600;color:var(--adm-ink);margin-bottom:.75rem}
  .blk-form-row{display:flex;flex-direction:column;gap:4px;margin-bottom:.75rem}
  .blk-form-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--adm-muted);font-weight:600}
  .blk-form-input{padding:9px 12px;border:1px solid var(--adm-line);background:#fff;font:13px/1.4 'Inter',sans-serif;color:var(--adm-ink);outline:none;width:100%;box-sizing:border-box}
  .blk-form-input:focus{border-color:var(--adm-ink)}
`;
