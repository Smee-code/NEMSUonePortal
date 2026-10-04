import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
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

const CSS = `
/* ── Header ── */
.er-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:1rem;
  padding-bottom:1.1rem; margin-bottom:1.3rem; border-bottom:1px solid var(--reg-line); flex-wrap:wrap; }
.er-eyebrow{ display:inline-flex; align-items:center; gap:10px; font-size:10px; letter-spacing:.16em;
  text-transform:uppercase; color:var(--reg-gold); font-weight:700; margin-bottom:.5rem; }
.er-eyebrow::before{ content:''; width:22px; height:1px; background:var(--reg-gold); }
.er-head h1{ margin:0; font:600 24px/1.15 'Inter',sans-serif; color:var(--reg-ink); letter-spacing:-.015em; }
.er-lede{ margin:.4rem 0 0; font-size:13.5px; color:var(--reg-muted); max-width:66ch; line-height:1.5; }
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
.er-figs{ display:grid; grid-template-columns:repeat(5,1fr); border:1px solid var(--reg-line); background:#fff; margin-bottom:1.25rem; }
.er-fig{ padding:14px 18px; border-right:1px solid var(--reg-line-soft); display:flex; flex-direction:column; gap:2px; }
.er-fig:last-child{ border-right:none; }
.er-fig-num{ font:600 26px/1 'Inter',sans-serif; color:var(--reg-ink); font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.er-fig-num.amber{ color:var(--reg-amber); } .er-fig-num.green{ color:var(--reg-green); } .er-fig-num.red{ color:var(--reg-red); }
.er-fig-lbl{ font-size:11.5px; color:var(--reg-muted); }

/* ── Segmented sub-tabs ── */
.er-seg{ display:inline-flex; border:1px solid var(--reg-line); background:#fff; margin-bottom:1.25rem; flex-wrap:wrap; }
.er-seg-btn{ display:inline-flex; align-items:center; gap:8px; padding:8px 16px; border:none; background:none;
  font:500 13px 'Inter',sans-serif; color:var(--reg-muted); cursor:pointer; border-right:1px solid var(--reg-line); transition:background .14s,color .14s; }
.er-seg-btn:last-child{ border-right:none; }
.er-seg-btn:hover{ color:var(--reg-ink); background:var(--reg-warm); }
.er-seg-btn.active{ background:var(--reg-ink); color:#fff; }
.er-seg-badge{ font:700 11px 'Inter',sans-serif; background:var(--reg-gold); color:#3a2c07; padding:1px 7px; border-radius:999px; font-variant-numeric:tabular-nums; }
.er-seg-btn.active .er-seg-badge{ background:#fff; color:var(--reg-ink); }

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
.er-pre-card{ background:#fff; border:1px solid var(--reg-line); border-left-width:4px; border-left-color:var(--reg-gold); padding:1rem 1.25rem; }

/* ── Request card content ── */
.er-rq-av{ width:40px; height:40px; border-radius:50%; background:var(--reg-ink); color:#fff; display:flex; align-items:center; justify-content:center; font:600 13px 'Inter',sans-serif; flex-shrink:0; margin-top:2px; }
.er-rq-body{ flex:1; min-width:0; }
.er-rq-top{ display:flex; align-items:center; justify-content:space-between; gap:.5rem; flex-wrap:wrap; }
.er-rq-name{ font:600 15px 'Inter',sans-serif; color:var(--reg-ink); letter-spacing:-.005em; }
.er-rq-status{ font:600 11px 'Inter',sans-serif; padding:3px 10px; white-space:nowrap; }
.er-rq-meta{ font-size:12.5px; color:var(--reg-muted); margin-top:3px; word-break:break-word; }
.er-rq-id{ font:12px ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--reg-ink); }
.er-rq-subs{ display:flex; flex-wrap:wrap; gap:6px; margin-top:9px; }
.er-rq-sub{ font-size:12px; padding:3px 9px; background:var(--reg-cool-2); color:var(--reg-ink-2); border:1px solid var(--reg-line-soft); }
.er-rq-remarks{ margin:.5rem 0 0; font-size:12.5px; color:var(--reg-ink); background:var(--reg-warm); border-left:2px solid var(--reg-line); padding:6px 10px; }
.er-rq-foot{ display:flex; align-items:center; justify-content:space-between; gap:.6rem; margin-top:11px; flex-wrap:wrap; }
.er-rq-when{ font-size:11.5px; color:var(--reg-faint); }
.er-rq-actions{ display:flex; gap:7px; }
.er-rq-btn{ display:inline-flex; align-items:center; gap:5px; padding:7px 13px; border:1px solid var(--reg-line); background:#fff; color:var(--reg-ink); font:600 12px 'Inter',sans-serif; cursor:pointer; transition:border-color .14s, background .14s, filter .14s; }
.er-rq-btn:hover{ border-color:var(--reg-ink); }
.er-rq-btn i{ font-size:14px; }
.er-rq-approve{ background:var(--reg-green); border-color:var(--reg-green); color:#fff; }
.er-rq-approve:hover{ filter:brightness(1.08); border-color:var(--reg-green); }
.er-rq-reject{ color:var(--reg-red); }
.er-rq-reject:hover{ border-color:var(--reg-red); background:var(--reg-red-tint); }

@media (max-width:820px){ .er-figs{ grid-template-columns:repeat(3,1fr); } .er-fig:nth-child(3){ border-right:none; } }
@media (max-width:520px){ .er-figs{ grid-template-columns:repeat(2,1fr); } .er-fig:nth-child(2){ border-right:none; } }
@media (prefers-reduced-motion: reduce){ .er-hbtn, .er-seg-btn, .er-req-card{ transition:none; } }
`;

export default function RegistrarEnrollmentRequests() {
  const { user } = useAuth();

  const [tab, setTab] = useState('requests');

  // ── Enrollment requests ──
  const [requests, setRequests]         = useState([]);
  const [terms, setTerms]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterTerm, setFilterTerm]     = useState('');
  const [searchQuery, setSearchQuery]   = useState('');

  // Selection & batch
  const [selectedIds, setSelectedIds]     = useState(new Set());
  const [batchLoading, setBatchLoading]   = useState(false);

  // Collapse per year group
  const [collapsedYears, setCollapsedYears] = useState(new Set());

  // Optimistic status overrides { id: 'approved' | 'rejected' }
  const [optimisticStatus, setOptimisticStatus] = useState({});

  // Toasts
  const [toasts, setToasts] = useState([]);

  // Review modal
  const [selected,     setSelected]     = useState(null);
  const [remarks,      setRemarks]      = useState('');
  const [reviewing,    setReviewing]    = useState(false);
  const [reviewError,  setReviewError]  = useState('');
  const [editSubjects, setEditSubjects] = useState([]);   // adjustable course list
  const [availCourses, setAvailCourses] = useState([]);   // offered courses to add
  const [addCourseId,  setAddCourseId]  = useState('');

  // ── Block assignment modal ──
  const [blockModal,    setBlockModal]    = useState(null);
  const [blockOptions,  setBlockOptions]  = useState([]);
  const [blockLoading,  setBlockLoading]  = useState(false);
  const [blockSelected, setBlockSelected] = useState('');
  const [blockSaving,   setBlockSaving]   = useState(false);
  const [blockError,    setBlockError]    = useState('');

  // ── Pre-enrollment tab ──
  const [pending,           setPending]           = useState([]);
  const [pendingLoading,    setPendingLoading]    = useState(false);
  const [pendingError,      setPendingError]      = useState('');
  const [pendingFilter,     setPendingFilter]     = useState('pending');
  const [pendingInline,     setPendingInline]     = useState([]);
  const [selectedPending,   setSelectedPending]   = useState(null);
  const [pendingRemarks,    setPendingRemarks]    = useState('');
  const [pendingReviewing,  setPendingReviewing]  = useState(false);
  const [pendingReviewError,setPendingReviewError] = useState('');
  const [pendingDocs,       setPendingDocs]       = useState([]);
  const [docsLoading,       setDocsLoading]       = useState(false);
  const [followupOpen,      setFollowupOpen]      = useState(false);
  const [followupMsg,       setFollowupMsg]       = useState('');
  const [followupSending,   setFollowupSending]   = useState(false);
  const [followupError,     setFollowupError]     = useState('');
  const [followupSuccess,   setFollowupSuccess]   = useState('');

  useEffect(() => { fetchTerms(); fetchPendingInline(); }, []);
  useEffect(() => { fetchRequests(); }, [filterStatus, filterTerm]);   // eslint-disable-line
  useEffect(() => { fetchPending(); }, [pendingFilter]);               // eslint-disable-line

  // ── Toast helper ──
  function addToast(type, message) {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }

  // ── Enrollment requests logic ──
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
        // Registrar-validated course list (used on approve).
        subject_ids: editSubjects.map(s => s.id),
      });
      addToast(newStatus === 'approved' ? 'success' : 'error',
        `${selected.student_name}: request ${newStatus}.`);
      setSelected(null);
      fetchRequests();   // refresh to show the finalized courses + status
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
      addToast('success', `${req.student_name}: request approved.`);
    } catch {
      setOptimisticStatus(p => { const n = { ...p }; delete n[req.id]; return n; });
      addToast('error', 'Approval failed. Please try again.');
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
      addToast(newStatus === 'approved' ? 'success' : 'error',
        `${succeeded.length} request${succeeded.length !== 1 ? 's' : ''} ${newStatus}.`);
    }
    if (failed) addToast('error', `${failed} request${failed !== 1 ? 's' : ''} failed.`);
  }

  // ── Block assignment logic ──
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
      addToast('success', `Block ${res.data.block_name ? `set to ${res.data.block_name}` : 'cleared'} for ${blockModal.student_name}.`);
      setBlockModal(null);
    } catch (err) {
      setBlockError(err.response?.data?.error || 'Failed to save block assignment.');
    } finally {
      setBlockSaving(false);
    }
  }

  // ── Pre-enrollment logic ──
  function fetchPending(statusOverride) {
    setPendingLoading(true);
    setPendingError('');
    const params = new URLSearchParams();
    const s = statusOverride ?? pendingFilter;
    if (s) params.append('status', s);
    api.get(`/enrollment/pending/?${params.toString()}`)
      .then(res => setPending(res.data))
      .catch(() => setPendingError('Failed to load pre-enrollment applications.'))
      .finally(() => setPendingLoading(false));
  }

  function fetchPendingInline() {
    api.get('/enrollment/pending/?status=pending')
      .then(res => setPendingInline(res.data))
      .catch(() => {});
  }

  function openPendingReview(app) {
    setSelectedPending(app);
    setPendingRemarks('');
    setPendingReviewError('');
    setPendingDocs([]);
    setFollowupOpen(false);
    setFollowupMsg('');
    setFollowupError('');
    setFollowupSuccess('');
    setDocsLoading(true);
    api.get(`/enrollment/pending/${app.id}/documents/`)
      .then(res => setPendingDocs(res.data))
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }

  async function handleFollowupEmail() {
    if (!followupMsg.trim()) { setFollowupError('Message is required.'); return; }
    setFollowupSending(true);
    setFollowupError('');
    setFollowupSuccess('');
    try {
      await api.post(`/enrollment/pending/${selectedPending.id}/followup-email/`, { message: followupMsg.trim() });
      setFollowupSuccess('Follow-up email sent successfully.');
      setFollowupOpen(false);
    } catch (err) {
      setFollowupError(err.response?.data?.error || 'Failed to send email.');
    } finally {
      setFollowupSending(false);
    }
  }

  async function handlePendingReview(newStatus) {
    if (newStatus === 'rejected' && !pendingRemarks.trim()) {
      setPendingReviewError('A reason is required when rejecting an application.');
      return;
    }
    setPendingReviewing(true);
    setPendingReviewError('');
    try {
      await api.patch(`/enrollment/pending/${selectedPending.id}/review/`, {
        status: newStatus, remarks: pendingRemarks.trim(),
      });
      setSelectedPending(null);
      fetchPending();
      fetchPendingInline();
    } catch (err) {
      const data = err.response?.data;
      setPendingReviewError(
        data?.remarks?.[0] || data?.detail || data?.non_field_errors?.[0] || 'Review failed. Please try again.'
      );
    } finally {
      setPendingReviewing(false);
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

      {/* ── Header ── */}
      <header className="er-head">
        <div className="er-head-l">
          <div className="er-eyebrow">Registrar · Admissions &amp; enrollment</div>
          <h1>Enrollment requests</h1>
          <p className="er-lede">
            Validate students&rsquo; enrollment for the term, and process incoming freshman, transferee, and returnee applications from the public site.
          </p>
        </div>
        {tab === 'requests' && selectedIds.size > 0 && (
          <div className="er-head-actions">
            <button className="er-hbtn" onClick={() => setSelectedIds(new Set())} disabled={batchLoading}>
              Clear
            </button>
            <button className="er-hbtn er-hbtn-reject" onClick={() => handleBatchAction('rejected')} disabled={batchLoading}>
              <i className="ti ti-x" /> Reject {selectedIds.size}
            </button>
            <button className="er-hbtn er-hbtn-approve" onClick={() => handleBatchAction('approved')} disabled={batchLoading}>
              <i className="ti ti-check" /> Approve {selectedIds.size}
            </button>
          </div>
        )}
      </header>

      {/* ── Figures ── */}
      <div className="er-figs">
        <div className="er-fig">
          <span className="er-fig-num">{loading ? '—' : statsBar.total}</span>
          <span className="er-fig-lbl">All requests</span>
        </div>
        <div className="er-fig">
          <span className="er-fig-num amber">{loading ? '—' : statsBar.pending}</span>
          <span className="er-fig-lbl">Pending review</span>
        </div>
        <div className="er-fig">
          <span className="er-fig-num green">{loading ? '—' : statsBar.approved}</span>
          <span className="er-fig-lbl">Approved</span>
        </div>
        <div className="er-fig">
          <span className="er-fig-num red">{loading ? '—' : statsBar.rejected}</span>
          <span className="er-fig-lbl">Rejected</span>
        </div>
        <div className="er-fig">
          <span className="er-fig-num">{pendingInline.length}</span>
          <span className="er-fig-lbl">Pre-enrollment</span>
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <div className="er-seg">
        <button className={`er-seg-btn${tab === 'requests' ? ' active' : ''}`} onClick={() => setTab('requests')}>
          Enrollment requests
          {statsBar.pending > 0 && <span className="er-seg-badge">{statsBar.pending}</span>}
        </button>
        <button className={`er-seg-btn${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
          Pre-enrollment
          {pendingInline.length > 0 && <span className="er-seg-badge">{pendingInline.length}</span>}
        </button>
        <button className={`er-seg-btn${tab === 'settings' ? ' active' : ''}`} onClick={() => setTab('settings')}>
          Enrollment window
        </button>
      </div>

      {/* ══════════════════════════════════════════
          Tab: Landing Page Settings
      ══════════════════════════════════════════ */}
      {tab === 'settings' && (
        <section style={{
          background: '#fff', border: '1px solid var(--reg-line)',
          borderRadius: 10, padding: '1rem 1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,.04)',
        }}>
          <div style={{ marginBottom: '.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '.98rem', color: 'var(--reg-ink)', fontWeight: 700 }}>
              Landing Page Settings
            </h3>
            <p style={{ margin: '.25rem 0 0', color: 'var(--reg-muted)', fontSize: '.84rem' }}>
              Control the enrollment status, academic year, and schedule shown on the public landing page.
            </p>
          </div>
          <EnrollmentScheduleManager />
        </section>
      )}

      {/* ══════════════════════════════════════════
          Tab: Pre-Enrollment Applications
      ══════════════════════════════════════════ */}
      {tab === 'pending' && (
        <div>
          <div className="toolbar">
            <span className="label">Status</span>
            <select value={pendingFilter} onChange={e => setPendingFilter(e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="activated">Activated</option>
            </select>
          </div>

          {pendingError && (
            <div style={{ background: 'var(--reg-red-tint)', color: 'var(--reg-red)', padding: '.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '.9rem' }}>
              {pendingError}
            </div>
          )}

          {pendingLoading ? (
            <p style={{ color: 'var(--reg-muted)' }}>Loading applications…</p>
          ) : pending.length === 0 ? (
            <div className="empty">
              <i className="ti ti-user-search" />
              <div className="t">No applications found</div>
              <div className="d">No pre-enrollment applications match the selected filter.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {pending.map(app => (
                <div key={app.id} className="er-pre-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--reg-ink)' }}>{app.full_name}</div>
                      <div style={{ fontSize: '.82rem', color: 'var(--reg-muted)' }}>
                        {app.email}{app.contact_number && <> · {app.contact_number}</>}
                      </div>
                      <div style={{ fontSize: '.85rem', color: 'var(--reg-ink-2)', marginTop: '.2rem' }}>
                        {app.student_type_display}
                        {app.program_name && <> · {app.program_name}</>}
                        {app.term_display && <> · {app.term_display}</>}
                      </div>
                      <div style={{ fontSize: '.78rem', color: 'var(--reg-faint)', marginTop: 2 }}>
                        Ref: {app.reference_number}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                      <PendingStatusBadge status={app.status} />
                      {app.status === 'pending' && (
                        <button className="btn-pri" style={{ fontSize: '.82rem' }} onClick={() => openPendingReview(app)}>
                          Review
                        </button>
                      )}
                    </div>
                  </div>
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
        </div>
      )}

      {/* ══════════════════════════════════════════
          Tab: Enrollment Requests
      ══════════════════════════════════════════ */}
      {tab === 'requests' && (
        <>
          {/* Batch actions floating bar */}
          {selectedIds.size > 0 && (
            <div className="er-batch-bar">
              <input
                type="checkbox"
                checked
                ref={el => { if (el) el.indeterminate = true; }}
                onChange={() => setSelectedIds(new Set())}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span style={{ color: '#e0e7ff', fontSize: '.88rem', fontWeight: 600, flex: 1 }}>
                {selectedIds.size} request{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => handleBatchAction('approved')}
                disabled={batchLoading}
                className="btn-sec"
                style={{ background: 'var(--reg-green)', color: '#fff', border: 'none', opacity: batchLoading ? .7 : 1 }}
              >
                <i className="ti ti-check" /> Approve all
              </button>
              <button
                onClick={() => handleBatchAction('rejected')}
                disabled={batchLoading}
                className="btn-sec"
                style={{ background: 'var(--reg-red)', color: '#fff', border: 'none', opacity: batchLoading ? .7 : 1 }}
              >
                <i className="ti ti-x" /> Reject all
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                style={{ padding: '.35rem .7rem', borderRadius: 6, border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: '#e0e7ff', fontSize: '.82rem', cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>
          )}

          {/* Toolbar: search + term + status pills */}
          <div className="toolbar">
            <div className="toolbar-search">
              <i className="ti ti-search" />
              <input
                type="text"
                placeholder="Search name, ID, email, program…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}>
              <option value="">All terms</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.semester_display} {t.year}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {[
                { value: '',         label: 'All'      },
                { value: 'pending',  label: 'Pending'  },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`subtab${filterStatus === opt.value ? ' active' : ''}`}
                  style={{ fontSize: '.78rem', padding: '.25rem .7rem' }}
                  onClick={() => setFilterStatus(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: 'var(--reg-red-tint)', color: 'var(--reg-red)', padding: '.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '.9rem' }}>
              {error}
            </div>
          )}

          {/* Pre-enrollment inline alert (pending on landing page) */}
          {pendingInline.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', fontWeight: 700, fontSize: '.95rem', color: 'var(--reg-ink)', borderLeft: '3px solid var(--reg-gold)', paddingLeft: '.65rem', marginBottom: '.75rem' }}>
                <i className="ti ti-user-plus" style={{ fontSize: 15, color: 'var(--reg-gold)' }} />
                <span>Pre-enrollment applications · from the public site</span>
                <span style={{ background: 'var(--reg-gold-tint)', color: '#8a6a12', padding: '.1rem .55rem', fontSize: '.75rem', fontWeight: 700 }}>
                  {pendingInline.length} pending
                </span>
              </div>
              <p style={{ fontSize: '.8rem', color: 'var(--reg-muted)', margin: '0 0 .75rem' }}>
                Freshmen, transferees, and returnees who applied through the public landing page. Approving sends them an account-creation email.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                {pendingInline.map(app => (
                  <div key={app.id} className="er-pre-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--reg-ink)' }}>
                          {app.full_name}
                          <span style={{ marginLeft: 8, background: 'var(--reg-gold-tint)', color: '#8a6a12', fontSize: '.72rem', fontWeight: 700, padding: '2px 7px' }}>
                            {app.student_type_display}
                          </span>
                        </div>
                        <div style={{ fontSize: '.82rem', color: 'var(--reg-muted)' }}>
                          {app.email}{app.contact_number && <> · {app.contact_number}</>}
                        </div>
                        <div style={{ fontSize: '.82rem', color: 'var(--reg-ink-2)', marginTop: 2 }}>
                          {app.program_name || 'No program specified'}
                          {app.term_display && <> · {app.term_display}</>}
                          <span style={{ color: 'var(--reg-faint)', marginLeft: 6 }}>Ref: {app.reference_number}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <PendingStatusBadge status={app.status} />
                        <button className="btn-pri" style={{ fontSize: '.82rem' }} onClick={() => openPendingReview(app)}>
                          Review
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '.78rem', color: 'var(--reg-faint)', marginTop: '.4rem' }}>
                      Submitted: {new Date(app.created_at).toLocaleString('en-PH')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Content ── */}
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
                <button
                  className="btn-sec"
                  style={{ marginTop: '1.25rem' }}
                  onClick={() => { setSearchQuery(''); setFilterTerm(''); }}
                >
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
                        <input
                          type="checkbox"
                          checked={allSel}
                          ref={el => { if (el) el.indeterminate = someSel; }}
                          onChange={() => toggleSelectYear(yr)}
                          style={{ width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
                        />
                      )}
                      <div className="er-year-hdr" style={{ margin: 0, flex: 1 }}>
                        <span>{label}</span>
                        {pendingInGrp.length > 0 && (
                          <span className="er-pend-count">{pendingInGrp.length} pending</span>
                        )}
                        <span className="er-year-count">{group.length} total</span>
                        <span style={{ fontSize: '.73rem', color: 'var(--reg-muted)', fontWeight: 400, marginLeft: 'auto' }}>
                          {reviewedCount}/{group.length} reviewed
                        </span>
                      </div>
                      <button
                        onClick={() => toggleCollapse(yr)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--reg-muted)', fontSize: 16, padding: '0 4px', flexShrink: 0 }}
                      >
                        <i className={`ti ${isCollapsed ? 'ti-chevron-down' : 'ti-chevron-up'}`} />
                      </button>
                    </div>

                    {/* Progress bar */}
                    {!isCollapsed && (
                      <div className="er-progress">
                        <div className="er-progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    )}

                    {/* Request cards */}
                    {!isCollapsed && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                        {group.map(req => {
                          const effStatus = req.status;
                          const inits     = initials(req.student_name);
                          const isSelected = selectedIds.has(req.id);

                          return (
                            <div key={req.id} className={`er-req-card er-req-${effStatus}${isSelected ? ' selected' : ''}`}>
                              <div style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start' }}>
                                {/* Checkbox for pending */}
                                {effStatus === 'pending' && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelect(req.id)}
                                    style={{ marginTop: 12, width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
                                  />
                                )}

                                {/* Avatar */}
                                <div className="er-rq-av">{inits}</div>

                                {/* Content */}
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
                                  </div>

                                  {req.subjects.length > 0 && (
                                    <div className="er-rq-subs">
                                      {req.subjects.map(sub => (
                                        <span key={sub.id} className="er-rq-sub">{sub.code} — {sub.name} ({sub.units}u)</span>
                                      ))}
                                    </div>
                                  )}

                                  {req.remarks && (
                                    <p className="er-rq-remarks"><strong>Remarks:</strong> {req.remarks}</p>
                                  )}

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

          {/* ── Review Modal ── */}
          {selected && (
            <div style={styles.modalBackdrop}>
              <div style={styles.modal}>
                <h3 style={{ margin: '0 0 .25rem', color: 'var(--reg-ink)', fontSize: '1.05rem' }}>
                  Review Enrollment Request
                </h3>
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
                        style={{ flex: 1, padding: '.45rem .6rem', border: '1px solid var(--reg-line)', borderRadius: 6, fontSize: '.82rem' }}>
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
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="Enter remarks..."
                  style={{ width: '100%', padding: '.5rem .75rem', borderRadius: 6, border: '1px solid var(--reg-line)', fontSize: '.9rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
                {reviewError && (
                  <p style={{ color: 'var(--reg-red)', fontSize: '.85rem', margin: '.35rem 0 0' }}>{reviewError}</p>
                )}
                <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                  <button className="btn-sec" onClick={() => setSelected(null)}>Cancel</button>
                  <button
                    className="btn-sec"
                    style={{ color: 'var(--reg-red)', borderColor: 'var(--reg-red)' }}
                    onClick={() => handleReview('rejected')}
                    disabled={reviewing}
                  >
                    Reject
                  </button>
                  <button
                    className="btn-pri"
                    style={{ background: 'var(--reg-green)', border: 'none' }}
                    onClick={() => handleReview('approved')}
                    disabled={reviewing || editSubjects.length === 0}
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Block Assignment Modal (outside tab so it persists) ── */}
      {blockModal && (
        <div style={styles.modalBackdrop} onClick={() => setBlockModal(null)}>
          <div style={{ ...styles.modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 .25rem', color: 'var(--reg-ink)', fontSize: '1.05rem' }}>
              Assign Block
            </h3>
            <p style={{ fontSize: '.85rem', color: 'var(--reg-muted)', margin: '0 0 1rem' }}>
              <strong>{blockModal.student_name}</strong> · {blockModal.program_code} · {blockModal.academic_term?.semester_display} {blockModal.academic_term?.year}
              <br />
              Current block: <strong>{blockModal.block_name || 'None'}</strong>
            </p>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '.85rem', color: 'var(--reg-ink-2)', marginBottom: '.35rem' }}>Block</label>
            {blockLoading ? (
              <p style={{ fontSize: '.85rem', color: 'var(--reg-muted)' }}>Loading blocks…</p>
            ) : blockOptions.length === 0 ? (
              <p style={{ fontSize: '.85rem', color: 'var(--reg-muted)', background: '#f9fafb', borderRadius: 6, padding: '.6rem .75rem', border: '1px solid var(--reg-line)' }}>
                No blocks found for this program and year level.
              </p>
            ) : (
              <select
                value={blockSelected}
                onChange={e => setBlockSelected(e.target.value)}
                style={{ width: '100%', padding: '.5rem .75rem', borderRadius: 6, border: '1px solid var(--reg-line)', fontSize: '.9rem', marginBottom: '.75rem', boxSizing: 'border-box' }}
              >
                <option value="">- Clear block assignment -</option>
                {blockOptions.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} - {b.enrolled_count}/{b.capacity} students{b.is_full ? ' (Full)' : ''}
                  </option>
                ))}
              </select>
            )}
            {blockError && (
              <p style={{ color: 'var(--reg-red)', fontSize: '.85rem', margin: '0 0 .5rem' }}>{blockError}</p>
            )}
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-sec" onClick={() => setBlockModal(null)}>Cancel</button>
              <button
                className="btn-pri"
                onClick={saveBlock}
                disabled={blockSaving || (blockOptions.length === 0 && !blockModal.block_name)}
              >
                {blockSaving ? 'Saving…' : 'Save block'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pre-enrollment Review Modal ── */}
      {selectedPending && (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modal, maxWidth: 580, maxHeight: '88vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 .25rem', color: 'var(--reg-ink)', fontSize: '1.05rem' }}>
              Review Pre-Enrollment Application
            </h3>
            <div style={{ background: '#f8fafc', border: '1px solid var(--reg-line)', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', fontSize: '.85rem', color: 'var(--reg-ink-2)' }}>
              <div><strong>{selectedPending.full_name}</strong> &nbsp;·&nbsp; {selectedPending.student_type_display}</div>
              {selectedPending.program_name && <div style={{ marginTop: 2 }}>{selectedPending.program_name}</div>}
              <div style={{ marginTop: 2 }}>{selectedPending.email} &nbsp;·&nbsp; Ref: <strong>{selectedPending.reference_number}</strong></div>
            </div>

            {/* Documents */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--reg-ink-2)', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-paperclip" style={{ fontSize: 15 }} /> Submitted Documents
                {docsLoading && <span style={{ fontSize: 11, color: 'var(--reg-muted)', fontWeight: 400 }}>Loading…</span>}
              </div>
              {!docsLoading && pendingDocs.length === 0 && (
                <p style={{ fontSize: '.8rem', color: 'var(--reg-muted)', margin: 0, padding: '8px 12px', background: '#f9fafb', borderRadius: 6 }}>
                  No documents uploaded by applicant.
                </p>
              )}
              {pendingDocs.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: '#fff', border: '1px solid var(--reg-line)', borderRadius: 7, marginBottom: 5 }}>
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

            <p style={{ fontSize: '.8rem', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: 6, color: '#1e40af', margin: '0 0 .85rem' }}>
              <i className="ti ti-info-circle" style={{ marginRight: 5 }} />
              Approving will send an email to the applicant with a link to create their student account.
            </p>

            <label style={{ display: 'block', fontWeight: 600, fontSize: '.85rem', color: 'var(--reg-ink-2)', marginBottom: '.35rem' }}>
              Remarks <span style={{ fontWeight: 400, color: 'var(--reg-muted)' }}>(required when rejecting)</span>
            </label>
            <textarea
              value={pendingRemarks}
              onChange={e => setPendingRemarks(e.target.value)}
              rows={3}
              placeholder="Enter remarks…"
              style={{ width: '100%', padding: '.5rem .75rem', borderRadius: 6, border: '1px solid var(--reg-line)', fontSize: '.9rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
            {pendingReviewError && (
              <p style={{ color: 'var(--reg-red)', fontSize: '.85rem', margin: '.35rem 0 0' }}>{pendingReviewError}</p>
            )}

            {/* Follow-up email */}
            {!followupOpen ? (
              <div style={{ marginTop: '.75rem' }}>
                <button
                  onClick={() => {
                    setFollowupOpen(true);
                    const missing = missingDocs(selectedPending.student_type, pendingDocs);
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
                  <i className="ti ti-mail" style={{ marginRight: 5, color: 'var(--reg-gold)' }} />Follow-up email to {selectedPending.email}
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--reg-muted)', marginBottom: '.4rem' }}>
                  The greeting (“Dear {selectedPending.full_name},”), reference number, and Registrar&rsquo;s Office signature are added automatically.
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
                  <button
                    className="btn-pri"
                    style={{ opacity: followupSending ? .7 : 1 }}
                    onClick={handleFollowupEmail}
                    disabled={followupSending}
                  >
                    {followupSending ? 'Sending…' : 'Send email'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-sec" onClick={() => setSelectedPending(null)}>Cancel</button>
              <button
                className="btn-sec"
                style={{ color: 'var(--reg-red)', borderColor: 'var(--reg-red)' }}
                onClick={() => handlePendingReview('rejected')}
                disabled={pendingReviewing}
              >
                Reject
              </button>
              <button
                className="btn-pri"
                style={{ background: 'var(--reg-green)', border: 'none' }}
                onClick={() => handlePendingReview('approved')}
                disabled={pendingReviewing}
              >
                Approve &amp; Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Stack ── */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.5rem', zIndex: 2000, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '.6rem 1rem', borderRadius: 8,
            background: t.type === 'success' ? 'var(--reg-green)' : 'var(--reg-red)',
            color: '#fff', fontWeight: 600, fontSize: '.88rem',
            boxShadow: '0 4px 12px rgba(0,0,0,.2)',
            minWidth: 220, maxWidth: 320, pointerEvents: 'auto',
          }}>
            <i className={`ti ${t.type === 'success' ? 'ti-check' : 'ti-alert-circle'}`} style={{ fontSize: 16, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontSize: 16, opacity: .8, lineHeight: 1 }}
            >
              <i className="ti ti-x" />
            </button>
          </div>
        ))}
      </div>
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
    background: '#fff', borderRadius: 10, padding: '1.5rem 2rem',
    width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  },
};
