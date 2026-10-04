import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';

const DOC_TYPE_OPTIONS = [
  { value: '', label: 'All document types' },
  { value: 'certificate_of_enrollment', label: 'Certificate of Enrollment' },
  { value: 'transcript_of_records',     label: 'Transcript of Records' },
  { value: 'certificate_of_grades',     label: 'Certificate of Grades' },
];

const STATUS_LABELS = {
  submitted:  'Submitted',
  processing: 'Processing',
  ready:      'Ready for release',
  released:   'Released',
  rejected:   'Rejected',
};

// Pill colours per stage (the exact stage); the left rule (below) encodes whether
// the request needs an action from the registrar.
const STATUS_PILL = {
  submitted:  { bg: 'var(--reg-cool-2)',     color: 'var(--reg-muted)' },
  processing: { bg: '#e8eef8',               color: 'var(--reg-ink-2)' },
  ready:      { bg: 'var(--reg-gold-tint)',  color: '#8a6a12' },
  released:   { bg: 'var(--reg-green-tint)', color: 'var(--reg-green)' },
  rejected:   { bg: 'var(--reg-red-tint)',   color: 'var(--reg-red)' },
};

// The verb for advancing to the next stage.
const ADVANCE_VERB = {
  processing: 'Start processing',
  ready:      'Mark ready',
  released:   'Release',
  rejected:   'Reject',
};

const PAGE_LIMIT = 20;

function initials(name) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
function fmtDate(s) {
  return s ? new Date(s).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export default function RegistrarDocuments() {
  const toast = useToast();
  const [requests, setRequests]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [offset, setOffset]         = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [searchInput,   setSearchInput]   = useState('');
  const [searchQuery,   setSearchQuery]   = useState('');

  const [expandedId, setExpandedId] = useState(null);
  const [updateForm, setUpdateForm] = useState({});
  const [saving,     setSaving]     = useState(null);

  const [docCounts, setDocCounts] = useState({
    submitted: 0, processing: 0, ready: 0, released: 0, rejected: 0,
  });

  function fetchDocCounts() {
    api.get('/documents/counts/')
      .then(res => {
        const d = res.data || {};
        setDocCounts({
          submitted:  d.submitted  ?? 0,
          processing: d.processing ?? 0,
          ready:      d.ready      ?? 0,
          released:   d.released   ?? 0,
          rejected:   d.rejected   ?? 0,
        });
      })
      .catch(() => {});
  }

  const fetchRequests = useCallback((newOffset = offset) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ limit: PAGE_LIMIT, offset: newOffset });
    if (filterStatus)  params.append('status',        filterStatus);
    if (filterDocType) params.append('document_type', filterDocType);
    if (searchQuery)   params.append('student',       searchQuery);
    api.get(`/documents/all/?${params.toString()}`)
      .then(res => {
        setRequests(res.data.results ?? res.data);
        setTotal(res.data.count ?? (res.data.results ?? res.data).length);
      })
      .catch(err => {
        const msg = err.response?.status === 429
          ? 'Too many requests just now. Wait a moment and try again.'
          : 'Couldn’t load document requests. Refresh to try again.';
        toast(msg, { type: 'error' });
      })
      .finally(() => setLoading(false));
  }, [filterStatus, filterDocType, searchQuery, offset, toast]);

  useEffect(() => { fetchDocCounts(); }, []);

  useEffect(() => {
    setOffset(0);
    fetchRequests(0);
  }, [filterStatus, filterDocType, searchQuery]); // eslint-disable-line

  useEffect(() => {
    fetchRequests(offset);
  }, [offset]); // eslint-disable-line

  function handleSearch(e) { e.preventDefault(); setSearchQuery(searchInput.trim()); }
  function clearSearch() { setSearchInput(''); setSearchQuery(''); }

  function openExpand(req) {
    const id = req.id;
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!updateForm[id]) {
      setUpdateForm(prev => ({
        ...prev,
        [id]: { status: req.next_statuses[0] || '', remarks: req.remarks || '' },
      }));
    }
  }
  function setField(id, field, value) {
    setUpdateForm(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleUpdate(req) {
    const form = updateForm[req.id];
    if (!form?.status) { setError('Choose a new status first.'); return; }
    if (form.status === 'rejected' && !form.remarks?.trim()) {
      setError('Add a reason so the student knows why it was rejected.');
      return;
    }
    setError('');
    setSaving(req.id);
    try {
      await api.patch(`/documents/all/${req.id}/status/`, {
        status: form.status, remarks: form.remarks?.trim() || '',
      });
      toast(`${req.student_name}: ${STATUS_LABELS[form.status]}.`, { type: 'success' });
      setExpandedId(null);
      fetchRequests(offset);
      fetchDocCounts();
    } catch (err) {
      const data = err.response?.data;
      let msg;
      if (data?.status)                msg = Array.isArray(data.status)  ? data.status.join(' ')  : data.status;
      else if (data?.remarks)          msg = Array.isArray(data.remarks) ? data.remarks.join(' ') : data.remarks;
      else if (data?.non_field_errors) msg = data.non_field_errors.join(' ');
      else                             msg = 'Couldn’t update the status. Try again.';
      toast(msg, { type: 'error' });
    } finally { setSaving(null); }
  }

  async function handleAdvance(req) {
    const nextStatus = req.next_statuses?.[0];
    if (!nextStatus) return;
    setError('');
    setSaving(req.id);
    try {
      await api.patch(`/documents/all/${req.id}/status/`, { status: nextStatus, remarks: '' });
      toast(`${req.student_name}: ${STATUS_LABELS[nextStatus]}.`, { type: 'success' });
      fetchRequests(offset);
      fetchDocCounts();
    } catch {
      toast('Couldn’t advance the status. Try again.', { type: 'error' });
    } finally { setSaving(null); }
  }

  const totalAll    = Object.values(docCounts).reduce((s, v) => s + v, 0);
  const totalPages  = Math.ceil(total / PAGE_LIMIT);
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;

  // The pipeline doubles as the status filter. Submitted + ready are the stages
  // that need the registrar to act, so their counts flag in gold.
  const PIPE = [
    { id: '',           label: 'All',        count: totalAll,           act: false },
    { id: 'submitted',  label: 'Submitted',  count: docCounts.submitted, act: true  },
    { id: 'processing', label: 'Processing', count: docCounts.processing, act: false },
    { id: 'ready',      label: 'Ready',      count: docCounts.ready,     act: true  },
    { id: 'released',   label: 'Released',   count: docCounts.released,  act: false },
    { id: 'rejected',   label: 'Rejected',   count: docCounts.rejected,  act: false },
  ];

  return (
    <>
      <style>{CSS}</style>

      <header className="dr-head">
        <div className="dr-eyebrow">Registrar · Document services</div>
        <h1>Document requests</h1>
        <p className="dr-lede">
          Move each request through the pipeline — start processing, mark it ready, then release it at the counter.
        </p>
      </header>

      {/* Pipeline: per-stage counts that also filter the list */}
      <div className="dr-pipe" role="tablist" aria-label="Filter by status">
        {PIPE.map(p => (
          <button
            key={p.id || 'all'}
            role="tab"
            aria-selected={filterStatus === p.id}
            className={`dr-pipe-btn${filterStatus === p.id ? ' active' : ''}`}
            onClick={() => setFilterStatus(p.id)}
          >
            <span className={`dr-pipe-num${p.act && p.count > 0 ? ' act' : ''}`}>{p.count}</span>
            <span className="dr-pipe-lbl">{p.label}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="dr-toolbar">
        <form className="dr-search" onSubmit={handleSearch}>
          <i className="ti ti-search" />
          <input placeholder="Search by student name or ID…" value={searchInput}
            onChange={e => setSearchInput(e.target.value)} />
          {searchQuery && <button type="button" className="dr-clear" onClick={clearSearch}>Clear</button>}
        </form>
        <select className="dr-select" value={filterDocType} onChange={e => setFilterDocType(e.target.value)}>
          {DOC_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {error && <div className="dr-alert">{error}</div>}

      {!loading && total > 0 && (
        <p className="dr-count">
          Showing {offset + 1}–{Math.min(offset + PAGE_LIMIT, total)} of {total} request{total !== 1 ? 's' : ''}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="dr-empty">Loading requests…</div>
      ) : requests.length === 0 ? (
        <div className="dr-empty">
          <i className="ti ti-file-off" />
          <div className="dr-empty-t">No requests here</div>
          <div className="dr-empty-d">Nothing matches your current filters.</div>
        </div>
      ) : (
        <>
          <div className="dr-list">
            {requests.map(req => {
              const expanded = expandedId === req.id;
              const form     = updateForm[req.id] || {};
              const isSaving = saving === req.id;
              const next     = req.next_statuses?.[0];
              const hasNext  = !!next;
              const pill     = STATUS_PILL[req.status] || STATUS_PILL.submitted;

              return (
                <article key={req.id} className={`dr-item dr-st-${req.status}${expanded ? ' expanded' : ''}`}>
                  <div className="dr-row" onClick={() => openExpand(req)}>
                    <div className="dr-avatar">{initials(req.student_name)}</div>
                    <div className="dr-who">
                      <div className="dr-name">{req.student_name}</div>
                      <div className="dr-id">{req.student_id_no}</div>
                    </div>
                    <div className="dr-doc">
                      <div className="dr-doc-type">{req.document_type_display}</div>
                      <div className="dr-doc-meta">
                        {req.copies} cop{req.copies > 1 ? 'ies' : 'y'} · requested {fmtDate(req.submitted_at)}
                      </div>
                    </div>
                    <span className="dr-status" style={{ background: pill.bg, color: pill.color }}>
                      {STATUS_LABELS[req.status] || req.status}
                    </span>
                    <div className="dr-actions" onClick={e => e.stopPropagation()}>
                      {hasNext && (
                        <button className="dr-advance" onClick={() => handleAdvance(req)} disabled={isSaving}>
                          {ADVANCE_VERB[next] || 'Advance'}
                        </button>
                      )}
                      <button className="dr-caret" aria-label="Details" onClick={() => openExpand(req)}>
                        <i className={`ti ti-chevron-${expanded ? 'up' : 'down'}`} />
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="dr-panel">
                      <div className="dr-detail">
                        <div className="dr-cell">
                          <span className="dr-cell-lbl">Email</span>
                          <span className="dr-cell-val">{req.student_email || '—'}</span>
                        </div>
                        {req.purpose && (
                          <div className="dr-cell">
                            <span className="dr-cell-lbl">Purpose</span>
                            <span className="dr-cell-val">{req.purpose}</span>
                          </div>
                        )}
                        {req.processed_by_name && (
                          <div className="dr-cell">
                            <span className="dr-cell-lbl">Last handled by</span>
                            <span className="dr-cell-val">
                              {req.processed_by_name}{req.processed_at ? ` on ${fmtDate(req.processed_at)}` : ''}
                            </span>
                          </div>
                        )}
                        {req.remarks && (
                          <div className="dr-cell" style={{ gridColumn: '1 / -1' }}>
                            <span className="dr-cell-lbl">Current remarks</span>
                            <span className="dr-cell-val" style={{ color: req.status === 'rejected' ? 'var(--reg-red)' : 'var(--reg-ink)' }}>
                              {req.remarks}
                            </span>
                          </div>
                        )}
                      </div>

                      {hasNext ? (
                        <div className="dr-form">
                          <div className="dr-form-row">
                            <div className="dr-field">
                              <label className="dr-flabel">Move to</label>
                              <select className="dr-select" value={form.status || ''}
                                onChange={e => setField(req.id, 'status', e.target.value)}>
                                <option value="">Select stage…</option>
                                {req.next_statuses.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                              </select>
                            </div>
                            <div className="dr-field dr-field-grow">
                              <label className="dr-flabel">
                                Remarks
                                <span className={form.status === 'rejected' ? 'dr-req' : 'dr-opt'}>
                                  {form.status === 'rejected' ? ' (required)' : ' (optional)'}
                                </span>
                              </label>
                              <textarea className="dr-textarea" rows={2} maxLength={1000}
                                placeholder="Add a note for the student…"
                                value={form.remarks || ''} onChange={e => setField(req.id, 'remarks', e.target.value)} />
                            </div>
                          </div>
                          <button className="dr-save" onClick={() => handleUpdate(req)} disabled={isSaving || !form.status}>
                            {isSaving ? 'Saving…' : 'Save status'}
                          </button>
                        </div>
                      ) : (
                        <p className="dr-closed">
                          {req.status === 'released'
                            ? 'Released — this request is complete.'
                            : 'Rejected — no further changes.'}
                        </p>
                      )}
                      <p className="dr-updated">Last updated {new Date(req.updated_at).toLocaleString('en-PH')}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="dr-pager">
              <span className="dr-pager-count">
                Page {currentPage} of {totalPages}
              </span>
              <div className="dr-pager-ctrl">
                <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_LIMIT))}>
                  <i className="ti ti-chevron-left" /> Prev
                </button>
                <button disabled={offset + PAGE_LIMIT >= total} onClick={() => setOffset(offset + PAGE_LIMIT)}>
                  Next <i className="ti ti-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

const CSS = `
  /* ── Header ── */
  .dr-head{ padding-bottom:1.1rem; margin-bottom:1.3rem; border-bottom:1px solid var(--reg-line); }
  .dr-eyebrow{ display:inline-flex; align-items:center; gap:10px; font-size:10px; letter-spacing:.16em;
    text-transform:uppercase; color:var(--reg-gold); font-weight:700; margin-bottom:.5rem; }
  .dr-eyebrow::before{ content:''; width:22px; height:1px; background:var(--reg-gold); }
  .dr-head h1{ margin:0; font:600 24px/1.15 'Inter',sans-serif; color:var(--reg-ink); letter-spacing:-.015em; }
  .dr-lede{ margin:.4rem 0 0; font-size:13.5px; color:var(--reg-muted); max-width:66ch; line-height:1.5; }

  /* ── Pipeline filter (counts + filter) ── */
  .dr-pipe{ display:grid; grid-template-columns:repeat(6,1fr); border:1px solid var(--reg-line); background:#fff; margin-bottom:1.25rem; }
  .dr-pipe-btn{ display:flex; flex-direction:column; gap:3px; align-items:flex-start; padding:14px 16px;
    border:none; border-right:1px solid var(--reg-line-soft); background:none; cursor:pointer; text-align:left;
    transition:background .14s; }
  .dr-pipe-btn:last-child{ border-right:none; }
  .dr-pipe-btn:hover{ background:var(--reg-warm); }
  .dr-pipe-btn.active{ background:var(--reg-ink); }
  .dr-pipe-num{ font:600 25px/1 'Inter',sans-serif; color:var(--reg-ink); font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
  .dr-pipe-num.act{ color:var(--reg-gold); }
  .dr-pipe-lbl{ font-size:11.5px; color:var(--reg-muted); }
  .dr-pipe-btn.active .dr-pipe-num, .dr-pipe-btn.active .dr-pipe-lbl{ color:#fff; }

  /* ── Toolbar ── */
  .dr-toolbar{ display:flex; align-items:center; gap:.75rem; margin-bottom:1.1rem; flex-wrap:wrap; }
  .dr-search{ flex:1; min-width:240px; display:flex; align-items:center; gap:8px; border:1px solid var(--reg-line); background:#fff; padding:0 12px; }
  .dr-search:focus-within{ border-color:var(--reg-ink); }
  .dr-search i{ color:var(--reg-faint); font-size:16px; }
  .dr-search input{ flex:1; border:none; outline:none; padding:9px 0; font:13px 'Inter',sans-serif; background:none; color:var(--reg-ink); }
  .dr-clear{ border:none; background:none; color:var(--reg-muted); font:600 12px 'Inter',sans-serif; cursor:pointer; padding:4px 6px; }
  .dr-clear:hover{ color:var(--reg-ink); }
  .dr-select{ border:1px solid var(--reg-line); background:#fff; padding:9px 12px; font:13px 'Inter',sans-serif; color:var(--reg-ink); outline:none; }
  .dr-select:focus{ border-color:var(--reg-ink); }

  .dr-alert{ background:var(--reg-red-tint); color:var(--reg-red); padding:.7rem 1rem; font-size:13px; margin-bottom:1rem; }
  .dr-count{ font-size:12px; color:var(--reg-muted); margin:0 0 .75rem; }
  .dr-empty{ border:1px solid var(--reg-line); background:#fff; padding:3rem 1.5rem; text-align:center; color:var(--reg-muted); font-size:13px; }
  .dr-empty i{ font-size:34px; color:var(--reg-faint); display:block; margin-bottom:.6rem; }
  .dr-empty-t{ font-weight:600; color:var(--reg-ink); font-size:15px; }
  .dr-empty-d{ margin-top:4px; }

  /* ── Request cards ── */
  .dr-list{ display:flex; flex-direction:column; gap:9px; }
  .dr-item{ background:#fff; border:1px solid var(--reg-line); border-left-width:4px; border-left-color:var(--reg-line); }
  .dr-st-submitted{ border-left-color:var(--reg-gold); }
  .dr-st-processing{ border-left-color:var(--reg-ink-2); }
  .dr-st-ready{ border-left-color:var(--reg-gold); }
  .dr-st-released{ border-left-color:var(--reg-green); }
  .dr-st-rejected{ border-left-color:var(--reg-red); }
  .dr-item.expanded{ box-shadow:0 10px 26px -18px rgba(10,22,40,.5); }

  .dr-row{ display:flex; align-items:center; gap:14px; padding:13px 16px; cursor:pointer; }
  .dr-avatar{ width:38px; height:38px; border-radius:50%; background:var(--reg-ink); color:#fff;
    display:flex; align-items:center; justify-content:center; font:600 12.5px 'Inter',sans-serif; flex-shrink:0; }
  .dr-who{ min-width:0; width:190px; flex-shrink:0; }
  .dr-name{ font:600 14px 'Inter',sans-serif; color:var(--reg-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .dr-id{ font:12px ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--reg-muted); margin-top:1px; }
  .dr-doc{ flex:1; min-width:0; }
  .dr-doc-type{ font-size:13.5px; color:var(--reg-ink); }
  .dr-doc-meta{ font-size:11.5px; color:var(--reg-muted); margin-top:2px; }
  .dr-status{ font:600 11px 'Inter',sans-serif; padding:4px 10px; white-space:nowrap; flex-shrink:0; }
  .dr-actions{ display:flex; align-items:center; gap:6px; flex-shrink:0; }
  .dr-advance{ display:inline-flex; align-items:center; gap:5px; padding:8px 13px; border:1px solid var(--reg-ink);
    background:var(--reg-ink); color:#fff; font:600 12px 'Inter',sans-serif; cursor:pointer; white-space:nowrap; transition:filter .14s; }
  .dr-advance:hover:not(:disabled){ filter:brightness(1.15); }
  .dr-advance:disabled{ opacity:.55; cursor:not-allowed; }
  .dr-caret{ border:1px solid var(--reg-line); background:#fff; color:var(--reg-muted); cursor:pointer; padding:7px 9px; display:inline-flex; }
  .dr-caret:hover{ border-color:var(--reg-ink); color:var(--reg-ink); }

  /* ── Expand panel ── */
  .dr-panel{ border-top:1px solid var(--reg-line-soft); background:var(--reg-warm); padding:16px; }
  .dr-detail{ display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:.75rem 1.5rem; margin-bottom:1rem; }
  .dr-cell{ display:flex; flex-direction:column; gap:2px; }
  .dr-cell-lbl{ font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--reg-faint); font-weight:600; }
  .dr-cell-val{ font-size:13px; color:var(--reg-ink); }
  .dr-form{ background:#fff; border:1px solid var(--reg-line); padding:14px; }
  .dr-form-row{ display:flex; gap:.75rem; flex-wrap:wrap; align-items:flex-start; }
  .dr-field{ display:flex; flex-direction:column; gap:5px; }
  .dr-field-grow{ flex:1; min-width:200px; }
  .dr-flabel{ font-size:11px; font-weight:600; color:var(--reg-ink); }
  .dr-req{ color:var(--reg-red); font-weight:500; }
  .dr-opt{ color:var(--reg-faint); font-weight:400; }
  .dr-textarea{ width:100%; box-sizing:border-box; border:1px solid var(--reg-line); padding:8px 10px;
    font:13px/1.5 'Inter',sans-serif; resize:vertical; outline:none; color:var(--reg-ink); }
  .dr-textarea:focus{ border-color:var(--reg-ink); }
  .dr-save{ margin-top:.75rem; padding:9px 18px; border:1px solid var(--reg-ink); background:var(--reg-ink); color:#fff;
    font:600 12.5px 'Inter',sans-serif; cursor:pointer; transition:filter .14s; }
  .dr-save:hover:not(:disabled){ filter:brightness(1.15); }
  .dr-save:disabled{ opacity:.55; cursor:not-allowed; }
  .dr-closed{ font-size:13px; color:var(--reg-muted); margin:0; }
  .dr-updated{ font-size:11px; color:var(--reg-faint); margin:.75rem 0 0; }

  /* ── Pager ── */
  .dr-pager{ display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-top:1.25rem; flex-wrap:wrap; }
  .dr-pager-count{ font-size:12px; color:var(--reg-muted); }
  .dr-pager-ctrl{ display:flex; gap:8px; }
  .dr-pager-ctrl button{ display:inline-flex; align-items:center; gap:5px; padding:8px 13px; border:1px solid var(--reg-line);
    background:#fff; color:var(--reg-ink); font:600 12.5px 'Inter',sans-serif; cursor:pointer; }
  .dr-pager-ctrl button:hover:not(:disabled){ border-color:var(--reg-ink); }
  .dr-pager-ctrl button:disabled{ opacity:.45; cursor:not-allowed; }

  /* ── Responsive ── */
  @media (max-width:820px){
    .dr-pipe{ grid-template-columns:repeat(3,1fr); }
    .dr-pipe-btn:nth-child(3){ border-right:none; }
    .dr-who{ width:auto; }
    .dr-row{ flex-wrap:wrap; }
    .dr-doc{ flex-basis:100%; order:5; }
  }
  @media (max-width:520px){ .dr-pipe{ grid-template-columns:repeat(2,1fr); } .dr-pipe-btn:nth-child(2){ border-right:none; } }
  @media (prefers-reduced-motion: reduce){ .dr-pipe-btn, .dr-advance, .dr-save, .dr-caret{ transition:none; } }
`;
