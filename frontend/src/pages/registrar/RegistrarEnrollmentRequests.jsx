import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useRegistrarShell } from '../../context/RegistrarShellContext';

function initials(name) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

const CSS = `
/* ── Header ── */
.er-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:1rem;
  padding-bottom:1.1rem; margin-bottom:1.3rem; border-bottom:1px solid var(--reg-line); flex-wrap:wrap; }
.er-eyebrow{ display:inline-flex; align-items:center; gap:10px; font-size:10px; letter-spacing:.16em;
  text-transform:uppercase; color:var(--reg-gold); font-weight:700; margin-bottom:.5rem; }
.er-eyebrow::before{ content:''; width:22px; height:1px; background:var(--reg-gold); }
.er-head h1{ margin:0; font:600 24px/1.15 'Inter',sans-serif; color:var(--reg-ink); letter-spacing:-.015em; }
.er-head h1 em{ font-family:'Instrument Serif',Georgia,serif; font-style:italic; font-weight:400; color:var(--reg-gold); letter-spacing:0; }
.er-lede{ margin:.4rem 0 0; font-size:13.5px; color:var(--reg-muted); max-width:64ch; line-height:1.5; }
.er-head-actions{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.er-hbtn{ padding:8px 14px; border:1px solid var(--reg-line); background:#fff; font:600 12.5px 'Inter',sans-serif;
  color:var(--reg-muted); cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:background .14s,border-color .14s,color .14s; }
.er-hbtn:disabled{ opacity:.55; cursor:not-allowed; }
.er-hbtn:hover:not(:disabled){ border-color:var(--reg-ink); color:var(--reg-ink); }
.er-hbtn-reject{ color:var(--reg-red); border-color:var(--reg-red); }
.er-hbtn-reject:hover:not(:disabled){ background:var(--reg-red-tint); color:var(--reg-red); }
.er-hbtn-approve{ background:var(--reg-green); border-color:var(--reg-green); color:#fff; }
.er-hbtn-approve:hover:not(:disabled){ filter:brightness(1.08); }

/* ── Figures strip ── */
.er-figs{ display:grid; grid-template-columns:repeat(4,1fr); border:1px solid var(--reg-line); background:#fff; margin-bottom:1.25rem; }
.er-fig{ padding:14px 18px; border-right:1px solid var(--reg-line-soft); display:flex; flex-direction:column; gap:2px; }
.er-fig:last-child{ border-right:none; }
.er-fig-num{ font:600 26px/1 'Inter',sans-serif; color:var(--reg-ink); font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.er-fig-num.amber{ color:var(--reg-amber); } .er-fig-num.green{ color:var(--reg-green); } .er-fig-num.red{ color:var(--reg-red); }
.er-fig-lbl{ font-size:11.5px; color:var(--reg-muted); }

/* ── Year group ── */
.er-year-hdr{ display:flex; align-items:center; gap:.6rem; font:600 14px 'Inter',sans-serif; color:var(--reg-ink); margin-bottom:.5rem; }
.er-year-count{ padding:.1rem .55rem; font-size:11px; font-weight:600; background:var(--reg-cool-2); color:var(--reg-muted); font-variant-numeric:tabular-nums; }
.er-pend-count{ padding:.1rem .55rem; font-size:11px; font-weight:600; background:var(--reg-gold-tint); color:#8a6a12; font-variant-numeric:tabular-nums; }
.er-progress{ height:4px; background:var(--reg-cool-2); margin-bottom:.75rem; overflow:hidden; }
.er-progress-fill{ height:100%; background:var(--reg-green); transition:width .4s ease; }

/* ── Request cards ── */
.er-req-card{ background:#fff; border:1px solid var(--reg-line); border-left-width:4px; border-left-color:var(--reg-line); padding:1rem 1.25rem; transition:border-color .14s, box-shadow .14s; }
.er-req-pending{ border-left-color:var(--reg-gold); }
.er-req-approved{ border-left-color:var(--reg-green); }
.er-req-rejected{ border-left-color:var(--reg-red); }
.er-req-card.selected{ outline:2px solid var(--reg-ink); outline-offset:-1px; }
.er-batch-bar{ position:sticky; top:0; z-index:50; background:var(--reg-ink); padding:.65rem 1rem; margin-bottom:1rem;
  display:flex; align-items:center; gap:.75rem; box-shadow:0 8px 20px -12px rgba(10,22,40,.55); }

/* ── Request card content ── */
.er-rq-av{ width:40px; height:40px; border-radius:50%; background:var(--reg-ink); color:#fff; display:flex; align-items:center; justify-content:center; font:600 13px 'Inter',sans-serif; flex-shrink:0; margin-top:2px; }
.er-rq-body{ flex:1; min-width:0; }
.er-rq-top{ display:flex; align-items:center; justify-content:space-between; gap:.5rem; flex-wrap:wrap; }
.er-rq-name{ font:600 15px 'Inter',sans-serif; color:var(--reg-ink); letter-spacing:-.005em; }
.er-rq-status{ font:600 11px 'Inter',sans-serif; padding:3px 10px; white-space:nowrap; }
.er-rq-meta{ font-size:12.5px; color:var(--reg-muted); margin-top:3px; word-break:break-word; }
.er-rq-id{ font:12px ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--reg-ink); }
.er-courses{ margin-top:11px; }
.er-courses-hd{ font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--reg-faint); font-weight:700; margin-bottom:5px; }
.er-courses-hd span{ color:var(--reg-muted); font-weight:500; letter-spacing:0; text-transform:none; }
.er-courses-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr)); gap:0 1.75rem; }
.er-course{ display:grid; grid-template-columns:auto 1fr auto; align-items:baseline; gap:10px; padding:5px 2px; border-bottom:1px solid var(--reg-line-soft); min-width:0; }
.er-course-code{ font:600 12px ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--reg-ink); white-space:nowrap; }
.er-course-name{ font-size:12.5px; color:var(--reg-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
.er-course-u{ font-size:11.5px; color:var(--reg-faint); font-variant-numeric:tabular-nums; white-space:nowrap; }
.er-rq-remarks{ margin:.5rem 0 0; font-size:12.5px; color:var(--reg-ink); background:var(--reg-warm); border-left:2px solid var(--reg-line); padding:6px 10px; }
.er-rq-foot{ display:flex; align-items:center; justify-content:space-between; gap:.6rem; margin-top:11px; flex-wrap:wrap; }
.er-rq-when{ font-size:11.5px; color:var(--reg-faint); }
.er-rq-actions{ display:flex; gap:7px; flex-wrap:wrap; }
.er-rq-btn{ display:inline-flex; align-items:center; gap:5px; padding:7px 13px; border:1px solid var(--reg-line); background:#fff; color:var(--reg-ink); font:600 12px 'Inter',sans-serif; cursor:pointer; transition:border-color .14s, background .14s, filter .14s; }
.er-rq-btn:hover{ border-color:var(--reg-ink); }
.er-rq-btn i{ font-size:14px; }
.er-rq-approve{ background:var(--reg-green); border-color:var(--reg-green); color:#fff; }
.er-rq-approve:hover{ filter:brightness(1.08); border-color:var(--reg-green); }
.er-rq-reject{ color:var(--reg-red); }
.er-rq-reject:hover{ border-color:var(--reg-red); background:var(--reg-red-tint); }
.er-rq-block{ color:var(--reg-ink-2); }

@media (max-width:640px){ .er-figs{ grid-template-columns:repeat(2,1fr); } .er-fig:nth-child(2){ border-right:none; } }
@media (prefers-reduced-motion: reduce){ .er-hbtn, .er-req-card{ transition:none; } }
`;

export default function RegistrarEnrollmentRequests() {
  const { toast } = useRegistrarShell();

  const [requests, setRequests]         = useState([]);
  const [terms, setTerms]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterTerm, setFilterTerm]     = useState('');
  const [searchQuery, setSearchQuery]   = useState('');

  // Selection & batch
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // Collapse per year group
  const [collapsedYears, setCollapsedYears] = useState(new Set());

  // Optimistic status overrides { id: 'approved' | 'rejected' }
  const [optimisticStatus, setOptimisticStatus] = useState({});

  // Review modal
  const [selected,     setSelected]     = useState(null);
  const [remarks,      setRemarks]      = useState('');
  const [reviewing,    setReviewing]    = useState(false);
  const [reviewError,  setReviewError]  = useState('');
  const [editSubjects, setEditSubjects] = useState([]);   // adjustable course list
  const [availCourses, setAvailCourses] = useState([]);   // offered courses to add
  const [addCourseId,  setAddCourseId]  = useState('');

  // Block assignment modal
  const [blockModal,    setBlockModal]    = useState(null);
  const [blockOptions,  setBlockOptions]  = useState([]);
  const [blockLoading,  setBlockLoading]  = useState(false);
  const [blockSelected, setBlockSelected] = useState('');
  const [blockSaving,   setBlockSaving]   = useState(false);
  const [blockError,    setBlockError]    = useState('');

  useEffect(() => { fetchTerms(); }, []);
  useEffect(() => { fetchRequests(); }, [filterStatus, filterTerm]);   // eslint-disable-line

  function fetchTerms() {
    return api.get('/enrollment/terms/').then(res => setTerms(res.data)).catch(() => {});
  }

  function fetchRequests() {
    setLoading(true);
    setError('');
    setSelectedIds(new Set());
    setOptimisticStatus({});
    const params = new URLSearchParams();
    if (filterStatus) params.append('status', filterStatus);
    if (filterTerm)   params.append('term',   filterTerm);
    api.get(`/enrollment/requests/?${params.toString()}`)
      .then(res => setRequests(res.data))
      .catch(() => setError('Failed to load enrollment requests.'))
      .finally(() => setLoading(false));
  }

  function openReview(req) {
    setSelected(req);
    setRemarks('');
    setReviewError('');
    setAddCourseId('');
    setEditSubjects((req.subjects || []).map(s => ({ id: s.id, code: s.code, name: s.name, units: s.units })));
    setAvailCourses([]);
    const term = req.academic_term;
    if (req.program_id && req.year_level && term?.semester) {
      api.get(`/enrollment/subjects/?program=${req.program_id}&year_level=${req.year_level}&semester=${term.semester}`)
        .then(res => setAvailCourses(Array.isArray(res.data) ? res.data : []))
        .catch(() => setAvailCourses([]));
    }
  }

  function removeEditSubject(id) { setEditSubjects(prev => prev.filter(s => s.id !== id)); }
  function addEditSubject() {
    const c = availCourses.find(x => String(x.id) === String(addCourseId));
    if (!c) return;
    if (editSubjects.some(s => s.id === c.id)) { setAddCourseId(''); return; }
    setEditSubjects(prev => [...prev, { id: c.id, code: c.code, name: c.name, units: c.units }]);
    setAddCourseId('');
  }

  async function handleReview(newStatus) {
    if (newStatus === 'rejected' && !remarks.trim()) {
      setReviewError('A reason is required when rejecting a request.');
      return;
    }
    setReviewing(true);
    setReviewError('');
    try {
      await api.patch(`/enrollment/requests/${selected.id}/review/`, {
        status: newStatus, remarks: remarks.trim(),
        subject_ids: editSubjects.map(s => s.id),
      });
      toast(`${selected.student_name}: request ${newStatus}.`, newStatus === 'approved' ? 'success' : 'error');
      setSelected(null);
      fetchRequests();
    } catch (err) {
      const data = err.response?.data;
      setReviewError(data?.remarks?.[0] || data?.detail || data?.non_field_errors?.[0] || 'Review failed. Please try again.');
    } finally {
      setReviewing(false);
    }
  }

  async function handleInlineApprove(req) {
    setOptimisticStatus(p => ({ ...p, [req.id]: 'approved' }));
    try {
      await api.patch(`/enrollment/requests/${req.id}/review/`, { status: 'approved', remarks: '' });
      toast(`${req.student_name}: request approved.`, 'success');
    } catch {
      setOptimisticStatus(p => { const n = { ...p }; delete n[req.id]; return n; });
      toast('Approval failed. Please try again.', 'error');
    }
  }

  async function handleBatchAction(newStatus) {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBatchLoading(true);
    const defaultRemarks = newStatus === 'rejected' ? 'Rejected by registrar.' : '';
    const results = await Promise.allSettled(
      ids.map(id => api.patch(`/enrollment/requests/${id}/review/`, { status: newStatus, remarks: defaultRemarks }))
    );
    const succeeded = ids.filter((_, i) => results[i].status === 'fulfilled');
    const failed = ids.length - succeeded.length;
    setOptimisticStatus(p => {
      const n = { ...p };
      succeeded.forEach(id => { n[id] = newStatus; });
      return n;
    });
    setSelectedIds(new Set());
    setBatchLoading(false);
    if (succeeded.length) {
      toast(`${succeeded.length} request${succeeded.length !== 1 ? 's' : ''} ${newStatus}.`, newStatus === 'approved' ? 'success' : 'error');
    }
    if (failed) toast(`${failed} request${failed !== 1 ? 's' : ''} failed.`, 'error');
  }

  // ── Block assignment ──
  async function openBlockModal(req) {
    setBlockModal(req);
    setBlockSelected(req.block_name ? req.block_id ?? '' : '');
    setBlockError('');
    setBlockOptions([]);
    setBlockLoading(true);
    try {
      const params = new URLSearchParams();
      if (req.academic_term?.id) params.append('term',       req.academic_term.id);
      if (req.program_id)        params.append('program',    req.program_id);
      if (req.year_level)        params.append('year_level', req.year_level);
      const res = await api.get(`/enrollment/blocks/?${params.toString()}`);
      setBlockOptions(Array.isArray(res.data) ? res.data : (res.data.results ?? []));
    } catch {
      setBlockError('Failed to load blocks.');
    } finally {
      setBlockLoading(false);
    }
  }

  async function saveBlock() {
    setBlockSaving(true);
    setBlockError('');
    try {
      const payload = blockSelected ? { block_id: Number(blockSelected) } : { block_id: null };
      const res = await api.patch(`/enrollment/requests/${blockModal.id}/block/`, payload);
      setRequests(prev => prev.map(r =>
        r.id === blockModal.id ? { ...r, block_name: res.data.block_name, block_id: res.data.block_id } : r
      ));
      toast(`Block ${res.data.block_name ? `set to ${res.data.block_name}` : 'cleared'} for ${blockModal.student_name}.`, 'success');
      setBlockModal(null);
    } catch (err) {
      setBlockError(err.response?.data?.error || 'Failed to save block assignment.');
    } finally {
      setBlockSaving(false);
    }
  }

  // ── Derived data ──
  const allWithOptimistic = requests.map(r => ({ ...r, status: optimisticStatus[r.id] ?? r.status }));
  const statsBar = {
    total:    allWithOptimistic.length,
    pending:  allWithOptimistic.filter(r => r.status === 'pending').length,
    approved: allWithOptimistic.filter(r => r.status === 'approved').length,
    rejected: allWithOptimistic.filter(r => r.status === 'rejected').length,
  };

  const displayedRequests = allWithOptimistic.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.student_name  || '').toLowerCase().includes(q) ||
      (r.student_id    || '').toLowerCase().includes(q) ||
      (r.student_email || '').toLowerCase().includes(q) ||
      (r.program_code  || '').toLowerCase().includes(q)
    );
  });

  const YEAR_LABELS = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
  const grouped = {};
  displayedRequests.forEach(r => {
    const yr = r.year_level ?? 0;
    if (!grouped[yr]) grouped[yr] = [];
    grouped[yr].push(r);
  });
  const sortedYears = Object.keys(grouped).map(Number).sort((a, b) => {
    if (a === 0) return 1; if (b === 0) return -1; return a - b;
  });

  function toggleSelect(id) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSelectYear(yr) {
    const pendingInGrp = (grouped[yr] || []).filter(r => r.status === 'pending');
    const allSel = pendingInGrp.every(r => selectedIds.has(r.id));
    setSelectedIds(prev => {
      const n = new Set(prev);
      allSel ? pendingInGrp.forEach(r => n.delete(r.id)) : pendingInGrp.forEach(r => n.add(r.id));
      return n;
    });
  }
  function toggleCollapse(yr) {
    setCollapsedYears(prev => { const n = new Set(prev); n.has(yr) ? n.delete(yr) : n.add(yr); return n; });
  }

  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <header className="er-head">
        <div>
          <div className="er-eyebrow">Registrar · Enrollment</div>
          <h1>Enrollment <em>requests</em></h1>
          <p className="er-lede">
            Validate and finalize continuing students&rsquo; enrollment for the term — review each course load,
            assign a block, and approve or reject.
          </p>
        </div>
        {selectedIds.size > 0 && (
          <div className="er-head-actions">
            <button className="er-hbtn" onClick={() => setSelectedIds(new Set())} disabled={batchLoading}>Clear</button>
            <button className="er-hbtn er-hbtn-reject" onClick={() => handleBatchAction('rejected')} disabled={batchLoading}>
              <i className="ti ti-x" /> Reject {selectedIds.size}
            </button>
            <button className="er-hbtn er-hbtn-approve" onClick={() => handleBatchAction('approved')} disabled={batchLoading}>
              <i className="ti ti-check" /> Approve {selectedIds.size}
            </button>
          </div>
        )}
      </header>

      {/* Figures */}
      <div className="er-figs">
        <div className="er-fig"><span className="er-fig-num">{loading ? '—' : statsBar.total}</span><span className="er-fig-lbl">All requests</span></div>
        <div className="er-fig"><span className="er-fig-num amber">{loading ? '—' : statsBar.pending}</span><span className="er-fig-lbl">Pending review</span></div>
        <div className="er-fig"><span className="er-fig-num green">{loading ? '—' : statsBar.approved}</span><span className="er-fig-lbl">Approved</span></div>
        <div className="er-fig"><span className="er-fig-num red">{loading ? '—' : statsBar.rejected}</span><span className="er-fig-lbl">Rejected</span></div>
      </div>

      {/* Batch floating bar */}
      {selectedIds.size > 0 && (
        <div className="er-batch-bar">
          <input type="checkbox" checked ref={el => { if (el) el.indeterminate = true; }}
            onChange={() => setSelectedIds(new Set())} style={{ width: 16, height: 16, cursor: 'pointer' }} />
          <span style={{ color: '#e0e7ff', fontSize: '.88rem', fontWeight: 600, flex: 1 }}>
            {selectedIds.size} request{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button onClick={() => handleBatchAction('approved')} disabled={batchLoading} className="btn-sec"
            style={{ background: 'var(--reg-green)', color: '#fff', border: 'none', opacity: batchLoading ? .7 : 1 }}>
            <i className="ti ti-check" /> Approve all
          </button>
          <button onClick={() => handleBatchAction('rejected')} disabled={batchLoading} className="btn-sec"
            style={{ background: 'var(--reg-red)', color: '#fff', border: 'none', opacity: batchLoading ? .7 : 1 }}>
            <i className="ti ti-x" /> Reject all
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            style={{ padding: '.35rem .7rem', border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: '#e0e7ff', fontSize: '.82rem', cursor: 'pointer' }}>
            Clear
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-search">
          <i className="ti ti-search" />
          <input type="text" placeholder="Search name, ID, email, program…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}>
          <option value="">All terms</option>
          {terms.map(t => (<option key={t.id} value={t.id}>{t.semester_display} {t.year}</option>))}
        </select>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {[
            { value: '',         label: 'All'      },
            { value: 'pending',  label: 'Pending'  },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ].map(opt => (
            <button key={opt.value} className={`subtab${filterStatus === opt.value ? ' active' : ''}`}
              style={{ fontSize: '.78rem', padding: '.25rem .7rem' }} onClick={() => setFilterStatus(opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--reg-red-tint)', color: 'var(--reg-red)', padding: '.75rem', marginBottom: '1rem', fontSize: '.9rem' }}>{error}</div>
      )}

      {/* Content */}
      {loading ? (
        <p style={{ color: 'var(--reg-muted)' }}>Loading requests…</p>
      ) : displayedRequests.length === 0 ? (
        <div className="empty">
          <i className="ti ti-clipboard-x" />
          <div className="t">No requests found</div>
          <div className="d">
            {searchQuery.trim()
              ? `No results for "${searchQuery}". Try a different search term.`
              : `There are no ${filterStatus || ''} enrollment requests${filterTerm ? ' for the selected term' : ''}.`}
          </div>
          {(searchQuery || filterTerm) && (
            <button className="btn-sec" style={{ marginTop: '1.25rem' }} onClick={() => { setSearchQuery(''); setFilterTerm(''); }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {sortedYears.map(yr => {
            const group         = grouped[yr];
            const label         = yr === 0 ? 'Unknown Year Level' : YEAR_LABELS[yr] || `Year ${yr}`;
            const pendingInGrp  = group.filter(r => r.status === 'pending');
            const reviewedCount = group.filter(r => r.status !== 'pending').length;
            const progress      = group.length > 0 ? (reviewedCount / group.length) * 100 : 0;
            const allSel        = pendingInGrp.length > 0 && pendingInGrp.every(r => selectedIds.has(r.id));
            const someSel       = pendingInGrp.some(r => selectedIds.has(r.id)) && !allSel;
            const isCollapsed   = collapsedYears.has(yr);

            return (
              <div key={yr}>
                {/* Year group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: isCollapsed ? 0 : '.5rem' }}>
                  {pendingInGrp.length > 0 && (
                    <input type="checkbox" checked={allSel} ref={el => { if (el) el.indeterminate = someSel; }}
                      onChange={() => toggleSelectYear(yr)} style={{ width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }} />
                  )}
                  <div className="er-year-hdr" style={{ margin: 0, flex: 1 }}>
                    <span>{label}</span>
                    {pendingInGrp.length > 0 && (<span className="er-pend-count">{pendingInGrp.length} pending</span>)}
                    <span className="er-year-count">{group.length} total</span>
                    <span style={{ fontSize: '.73rem', color: 'var(--reg-muted)', fontWeight: 400, marginLeft: 'auto' }}>
                      {reviewedCount}/{group.length} reviewed
                    </span>
                  </div>
                  <button onClick={() => toggleCollapse(yr)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--reg-muted)', fontSize: 16, padding: '0 4px', flexShrink: 0 }}>
                    <i className={`ti ${isCollapsed ? 'ti-chevron-down' : 'ti-chevron-up'}`} />
                  </button>
                </div>

                {!isCollapsed && (
                  <div className="er-progress"><div className="er-progress-fill" style={{ width: `${progress}%` }} /></div>
                )}

                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                    {group.map(req => {
                      const effStatus = req.status;
                      const isSelected = selectedIds.has(req.id);
                      return (
                        <div key={req.id} className={`er-req-card er-req-${effStatus}${isSelected ? ' selected' : ''}`}>
                          <div style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start' }}>
                            {effStatus === 'pending' && (
                              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(req.id)}
                                style={{ marginTop: 12, width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }} />
                            )}
                            <div className="er-rq-av">{initials(req.student_name)}</div>
                            <div className="er-rq-body">
                              <div className="er-rq-top">
                                <span className="er-rq-name">{req.student_name}</span>
                                <span className="er-rq-status" style={
                                  effStatus === 'approved' ? { background: 'var(--reg-green-tint)', color: 'var(--reg-green)' }
                                    : effStatus === 'rejected' ? { background: 'var(--reg-red-tint)', color: 'var(--reg-red)' }
                                    : { background: 'var(--reg-gold-tint)', color: '#8a6a12' }
                                }>
                                  {effStatus === 'pending' ? 'Pending' : effStatus === 'approved' ? 'Approved' : 'Rejected'}
                                </span>
                              </div>

                              <div className="er-rq-meta">
                                <span className="er-rq-id">{req.student_id}</span> · {req.student_email}
                                {req.program_code && <> · {req.program_code}</>}
                                {req.block_name && <> · <strong style={{ color: 'var(--reg-ink-2)' }}>{req.block_name}</strong></>}
                              </div>

                              {req.subjects.length > 0 && (
                                <div className="er-courses">
                                  <div className="er-courses-hd">
                                    Courses <span>· {req.subjects.length} subjects · {req.subjects.reduce((s, c) => s + parseFloat(c.units || 0), 0)} units</span>
                                  </div>
                                  <div className="er-courses-grid">
                                    {req.subjects.map(sub => (
                                      <div key={sub.id} className="er-course" title={`${sub.code} — ${sub.name} (${sub.units}u)`}>
                                        <span className="er-course-code">{sub.code}</span>
                                        <span className="er-course-name">{sub.name}</span>
                                        <span className="er-course-u">{sub.units}u</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {req.remarks && (<p className="er-rq-remarks"><strong>Remarks:</strong> {req.remarks}</p>)}

                              <div className="er-rq-foot">
                                <span className="er-rq-when">
                                  Submitted {new Date(req.submitted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  {req.total_units > 0 ? ` · ${req.total_units} units` : ''}
                                  {req.academic_term ? ` · ${req.academic_term.semester_display} ${req.academic_term.year}` : ''}
                                </span>
                                <div className="er-rq-actions">
                                  {effStatus === 'pending' && (
                                    <>
                                      <button className="er-rq-btn er-rq-approve" onClick={() => handleInlineApprove(req)}>
                                        <i className="ti ti-check" /> Approve
                                      </button>
                                      <button className="er-rq-btn er-rq-reject" onClick={() => openReview(req)}>
                                        <i className="ti ti-x" /> Reject
                                      </button>
                                    </>
                                  )}
                                  {effStatus !== 'rejected' && (
                                    <button className="er-rq-btn er-rq-block" onClick={() => openBlockModal(req)}>
                                      <i className="ti ti-layout-grid" /> {req.block_name ? req.block_name : 'Assign block'}
                                    </button>
                                  )}
                                  <button className="er-rq-btn" onClick={() => openReview(req)}>
                                    <i className="ti ti-eye" /> Details
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {selected && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modal}>
            <h3 style={{ margin: '0 0 .25rem', color: 'var(--reg-ink)', fontSize: '1.05rem' }}>Review enrollment request</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--reg-muted)', margin: '0 0 1rem' }}>
              Student: <strong>{selected.student_name}</strong> ({selected.student_id})<br />
              Term: {selected.academic_term.semester_display} {selected.academic_term.year}
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.4rem', gap: '.5rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '.85rem', color: 'var(--reg-ink-2)' }}>
                  Courses ({editSubjects.length}) · {editSubjects.reduce((s, c) => s + parseFloat(c.units || 0), 0)} units
                </strong>
                {selected.student_uuid && (
                  <a href={`/registrar/grades/student/${selected.student_uuid}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: '.78rem', color: 'var(--reg-ink)', textDecoration: 'underline', textUnderlineOffset: 2, fontWeight: 600 }}>
                    <i className="ti ti-history" style={{ marginRight: 4 }} />View grade history
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: '.5rem' }}>
                {editSubjects.length === 0 && (
                  <p style={{ fontSize: '.82rem', color: 'var(--reg-muted)', margin: 0 }}>No courses yet — add at least one before approving.</p>
                )}
                {editSubjects.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem', padding: '6px 10px', background: 'var(--reg-warm)', border: '1px solid var(--reg-line-soft)', fontSize: '.83rem' }}>
                    <span><strong>{s.code}</strong> — {s.name} <span style={{ color: 'var(--reg-muted)' }}>({s.units}u)</span></span>
                    <button onClick={() => removeEditSubject(s.id)} title="Remove course"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--reg-faint)', fontSize: 15, flexShrink: 0, lineHeight: 1 }}>
                      <i className="ti ti-x" />
                    </button>
                  </div>
                ))}
              </div>
              {availCourses.filter(c => !editSubjects.some(s => s.id === c.id)).length > 0 && (
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <select value={addCourseId} onChange={e => setAddCourseId(e.target.value)}
                    style={{ flex: 1, padding: '.45rem .6rem', border: '1px solid var(--reg-line)', fontSize: '.82rem' }}>
                    <option value="">+ Add a course offered this term…</option>
                    {availCourses.filter(c => !editSubjects.some(s => s.id === c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name} ({c.units}u)</option>
                    ))}
                  </select>
                  <button className="btn-sec" onClick={addEditSubject} disabled={!addCourseId} style={{ fontSize: '.82rem' }}>Add</button>
                </div>
              )}
            </div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '.85rem', color: 'var(--reg-ink-2)', marginBottom: '.35rem' }}>
              Remarks <span style={{ fontWeight: 400, color: 'var(--reg-muted)' }}>(required when rejecting)</span>
            </label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} placeholder="Enter remarks..."
              style={{ width: '100%', padding: '.5rem .75rem', border: '1px solid var(--reg-line)', fontSize: '.9rem', resize: 'vertical', boxSizing: 'border-box' }} />
            {reviewError && (<p style={{ color: 'var(--reg-red)', fontSize: '.85rem', margin: '.35rem 0 0' }}>{reviewError}</p>)}
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-sec" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn-sec" style={{ color: 'var(--reg-red)', borderColor: 'var(--reg-red)' }}
                onClick={() => handleReview('rejected')} disabled={reviewing}>Reject</button>
              <button className="btn-pri" style={{ background: 'var(--reg-green)', border: 'none' }}
                onClick={() => handleReview('approved')} disabled={reviewing || editSubjects.length === 0}>Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* Block Assignment Modal */}
      {blockModal && (
        <div style={styles.modalBackdrop} onClick={() => setBlockModal(null)}>
          <div style={{ ...styles.modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 .25rem', color: 'var(--reg-ink)', fontSize: '1.05rem' }}>Assign block</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--reg-muted)', margin: '0 0 1rem' }}>
              <strong>{blockModal.student_name}</strong> · {blockModal.program_code} · {blockModal.academic_term?.semester_display} {blockModal.academic_term?.year}
              <br />Current block: <strong>{blockModal.block_name || 'None'}</strong>
            </p>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '.85rem', color: 'var(--reg-ink-2)', marginBottom: '.35rem' }}>Block</label>
            {blockLoading ? (
              <p style={{ fontSize: '.85rem', color: 'var(--reg-muted)' }}>Loading blocks…</p>
            ) : blockOptions.length === 0 ? (
              <p style={{ fontSize: '.85rem', color: 'var(--reg-muted)', background: '#f9fafb', padding: '.6rem .75rem', border: '1px solid var(--reg-line)' }}>
                No blocks found for this program and year level.
              </p>
            ) : (
              <select value={blockSelected} onChange={e => setBlockSelected(e.target.value)}
                style={{ width: '100%', padding: '.5rem .75rem', border: '1px solid var(--reg-line)', fontSize: '.9rem', marginBottom: '.75rem', boxSizing: 'border-box' }}>
                <option value="">- Clear block assignment -</option>
                {blockOptions.map(b => (
                  <option key={b.id} value={b.id}>{b.name} - {b.enrolled_count}/{b.capacity} students{b.is_full ? ' (Full)' : ''}</option>
                ))}
              </select>
            )}
            {blockError && (<p style={{ color: 'var(--reg-red)', fontSize: '.85rem', margin: '0 0 .5rem' }}>{blockError}</p>)}
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-sec" onClick={() => setBlockModal(null)}>Cancel</button>
              <button className="btn-pri" onClick={saveBlock} disabled={blockSaving || (blockOptions.length === 0 && !blockModal.block_name)}>
                {blockSaving ? 'Saving…' : 'Save block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
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
