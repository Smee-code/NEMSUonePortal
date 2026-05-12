import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import EnrollmentScheduleManager from '../../components/EnrollmentScheduleManager';

export default function RegistrarEnrollmentRequests() {
  const { user, logout } = useAuth();

  const [tab, setTab] = useState('requests');

  const [requests, setRequests] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterTerm, setFilterTerm] = useState('');

  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Pre-enrollment tab state
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState('');
  const [pendingFilter, setPendingFilter] = useState('pending');
  // Separate always-pending list shown inline in Enrollment Requests tab
  const [pendingInline, setPendingInline] = useState([]);
  const [selectedPending, setSelectedPending] = useState(null);
  const [pendingRemarks, setPendingRemarks] = useState('');
  const [pendingReviewing, setPendingReviewing] = useState(false);
  const [pendingReviewError, setPendingReviewError] = useState('');
  // Documents for selected pre-enrollment
  const [pendingDocs, setPendingDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  // Follow-up email
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupMsg, setFollowupMsg] = useState('');
  const [followupSending, setFollowupSending] = useState(false);
  const [followupError, setFollowupError] = useState('');
  const [followupSuccess, setFollowupSuccess] = useState('');

  useEffect(() => {
    fetchTerms();
    fetchPendingInline();
  }, []);

  function fetchTerms() {
    return api.get('/enrollment/terms/')
      .then(res => setTerms(res.data))
      .catch(() => {});
  }

  useEffect(() => {
    fetchRequests();
  }, [filterStatus, filterTerm]);

  useEffect(() => {
    fetchPending();
  }, [pendingFilter]);

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
    // Load submitted documents
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
        status: newStatus,
        remarks: pendingRemarks.trim(),
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

  function fetchRequests() {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (filterStatus) params.append('status', filterStatus);
    if (filterTerm) params.append('term', filterTerm);
    api.get(`/enrollment/requests/?${params.toString()}`)
      .then(res => setRequests(res.data))
      .catch(() => setError('Failed to load enrollment requests.'))
      .finally(() => setLoading(false));
  }

  function openReview(req) {
    setSelected(req);
    setRemarks('');
    setReviewError('');
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
        status: newStatus,
        remarks: remarks.trim(),
      });
      setSelected(null);
      fetchRequests();
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.remarks?.[0] ||
        data?.detail ||
        data?.non_field_errors?.[0] ||
        'Review failed. Please try again.';
      setReviewError(msg);
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link" to="/registrar/dashboard">Dashboard</Link>
        <Link className="sidebar-link active" to="/registrar/enrollment">Enrollment Requests</Link>
        <Link className="sidebar-link" to="/registrar/grades">List of Students</Link>
        <Link className="sidebar-link" to="/registrar/faculty">Faculty</Link>
        <Link className="sidebar-link" to="/registrar/schedule">Class Schedules</Link>
        <Link className="sidebar-link" to="/registrar/documents">Document Requests</Link>
        <Link className="sidebar-link" to="/registrar/academic-data">Academic Data</Link>
        <Link className="sidebar-link" to="/registrar/announcements">Announcements</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Enrollment Requests</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: 0 }}>
          {[
            { key: 'requests',    label: 'Enrollment Requests',         icon: 'ti-list-check' },
            { key: 'pending',     label: 'Pre-Enrollment Applications', icon: 'ti-user-plus'  },
            { key: 'settings',   label: 'Landing Page Settings',       icon: 'ti-settings'   },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', border: 'none', borderBottom: tab === t.key ? '2px solid #1e3a5f' : '2px solid transparent',
              background: 'none', cursor: 'pointer', fontSize: '0.88rem', fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? '#1e3a5f' : '#6b7280', marginBottom: -1,
            }}>
              <i className={`ti ${t.icon}`} style={{ fontSize: 15 }} />{t.label}
            </button>
          ))}
        </div>

        {/* ── Landing Page Settings ── */}
        {tab === 'settings' && (
        <section style={{ ...styles.termPanel, marginBottom: '1.5rem' }}>
          <div style={styles.termPanelHeader}>
            <div>
              <h2 style={styles.panelTitle}>Landing Page Settings</h2>
              <p style={styles.panelSubtitle}>Control the enrollment status, academic year, and schedule shown on the public landing page.</p>
            </div>
          </div>
          <EnrollmentScheduleManager />
        </section>
        )}

        {/* ── Pre-Enrollment Applications tab ── */}
        {tab === 'pending' && (
          <div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <label style={styles.filterLabel}>Status</label>
                <select value={pendingFilter} onChange={e => setPendingFilter(e.target.value)} style={styles.filterSelect}>
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="activated">Activated</option>
                </select>
              </div>
            </div>

            {pendingError && <div style={styles.alertError}>{pendingError}</div>}

            {pendingLoading ? (
              <p style={{ color: '#6b7280' }}>Loading applications…</p>
            ) : pending.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No pre-enrollment applications match the selected filter.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pending.map(app => (
                  <div key={app.id} style={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1f2937' }}>{app.full_name}</div>
                        <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                          {app.email}
                          {app.contact_number && <> &middot; {app.contact_number}</>}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#374151', marginTop: '0.2rem' }}>
                          {app.student_type_display}
                          {app.program_name && <> &middot; {app.program_name}</>}
                          {app.term_display && <> &middot; {app.term_display}</>}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 2 }}>Ref: {app.reference_number}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <PendingStatusBadge status={app.status} />
                        {app.status === 'pending' && (
                          <button onClick={() => openPendingReview(app)} style={styles.btnReview}>Review</button>
                        )}
                      </div>
                    </div>
                    {app.remarks && (
                      <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#374151', fontStyle: 'italic' }}>
                        Remarks: {app.remarks}
                      </p>
                    )}
                    <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.4rem' }}>
                      Submitted: {new Date(app.created_at).toLocaleString('en-PH')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pending enrollment review modal */}
            {selectedPending && (
              <div style={styles.modalBackdrop}>
                <div style={{ ...styles.modal, maxWidth: 580, maxHeight: '88vh', overflowY: 'auto' }}>
                  <h3 style={{ margin: '0 0 0.25rem', color: '#1e3a5f', fontSize: '1.05rem' }}>
                    Review Pre-Enrollment Application
                  </h3>

                  {/* Applicant info */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', fontSize: '0.85rem', color: '#374151' }}>
                    <div><strong>{selectedPending.full_name}</strong> &nbsp;·&nbsp; {selectedPending.student_type_display}</div>
                    {selectedPending.program_name && <div style={{ marginTop: 2 }}>{selectedPending.program_name}</div>}
                    <div style={{ marginTop: 2 }}>{selectedPending.email} &nbsp;·&nbsp; Ref: <strong>{selectedPending.reference_number}</strong></div>
                  </div>

                  {/* Submitted documents */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="ti ti-paperclip" style={{ fontSize: 15 }} /> Submitted Documents
                      {docsLoading && <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>Loading…</span>}
                    </div>
                    {!docsLoading && pendingDocs.length === 0 && (
                      <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0, padding: '8px 12px', background: '#f9fafb', borderRadius: 6 }}>No documents uploaded by applicant.</p>
                    )}
                    {pendingDocs.map(doc => (
                      <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 7, marginBottom: 5 }}>
                        <i className="ti ti-file-type-pdf" style={{ fontSize: 18, color: '#dc2626', flexShrink: 0 }} />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.requirement_label}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{doc.file_name} &nbsp;·&nbsp; {(doc.file_size / 1024).toFixed(0)} KB</div>
                        </div>
                        <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#1d4ed8', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>
                          View PDF
                        </a>
                      </div>
                    ))}
                  </div>

                  {/* Info note */}
                  <p style={{ fontSize: '0.8rem', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: 6, color: '#1e40af', marginBottom: '0.85rem', margin: '0 0 0.85rem' }}>
                    <i className="ti ti-info-circle" style={{ marginRight: 5 }} />
                    Approving will send an email to the applicant with a link to create their student account.
                  </p>

                  {/* Remarks */}
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#374151', marginBottom: '0.35rem' }}>
                    Remarks <span style={{ fontWeight: 400, color: '#9ca3af' }}>(required when rejecting)</span>
                  </label>
                  <textarea
                    value={pendingRemarks}
                    onChange={e => setPendingRemarks(e.target.value)}
                    rows={3}
                    placeholder="Enter remarks…"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  {pendingReviewError && (
                    <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '0.35rem 0 0' }}>{pendingReviewError}</p>
                  )}

                  {/* Follow-up email section */}
                  {!followupOpen ? (
                    <div style={{ marginTop: '0.75rem' }}>
                      <button
                        onClick={() => { setFollowupOpen(true); setFollowupMsg(`Dear ${selectedPending.full_name},\n\nWe have reviewed your pre-enrollment application (Ref: ${selectedPending.reference_number}) and found that you still have missing or incomplete requirements.\n\nPlease submit the following at the earliest convenience:\n\n[List missing requirements here]\n\nThank you.`); }}
                        style={{ fontSize: '0.82rem', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        <i className="ti ti-mail" style={{ marginRight: 5 }} />Send Follow-up Email
                      </button>
                      {followupSuccess && <span style={{ marginLeft: 10, fontSize: '0.8rem', color: '#16a34a' }}>{followupSuccess}</span>}
                    </div>
                  ) : (
                    <div style={{ marginTop: '0.75rem', background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#6d28d9', marginBottom: '0.4rem' }}>
                        <i className="ti ti-mail" style={{ marginRight: 5 }} />Follow-up email to {selectedPending.email}
                      </div>
                      <textarea
                        value={followupMsg}
                        onChange={e => setFollowupMsg(e.target.value)}
                        rows={5}
                        style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #ddd6fe', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                      {followupError && <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>{followupError}</p>}
                      <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
                        <button onClick={() => setFollowupOpen(false)} style={{ fontSize: '0.8rem', padding: '5px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleFollowupEmail} disabled={followupSending} style={{ fontSize: '0.8rem', padding: '5px 14px', borderRadius: 6, border: 'none', background: followupSending ? '#a78bfa' : '#7c3aed', color: '#fff', fontWeight: 600, cursor: followupSending ? 'not-allowed' : 'pointer' }}>
                          {followupSending ? 'Sending…' : 'Send Email'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                    <button onClick={() => setSelectedPending(null)} style={styles.btnCancel}>Cancel</button>
                    <button onClick={() => handlePendingReview('rejected')} disabled={pendingReviewing} style={styles.btnReject(pendingReviewing)}>Reject</button>
                    <button onClick={() => handlePendingReview('approved')} disabled={pendingReviewing} style={styles.btnApprove(pendingReviewing)}>Approve & Send Email</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Enrollment Requests tab ── */}
        {tab !== 'pending' && tab !== 'settings' && (
        <>

        {/* ── Pre-enrollment applications from landing page ── */}
        {(() => {
          const preEnrollPending = pendingInline;
          if (preEnrollPending.length === 0) return null;
          return (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ ...styles.yearHeader, borderLeftColor: '#7c3aed', color: '#7c3aed', marginBottom: '0.75rem' }}>
                <i className="ti ti-user-plus" style={{ fontSize: 15 }} />
                <span>Pre-Enrollment Applications (Landing Page)</span>
                <span style={{ ...styles.yearCount, background: '#ede9fe', color: '#6d28d9' }}>
                  {preEnrollPending.length} pending
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 0.75rem' }}>
                Freshmen and transferees who enrolled via the public landing page. Approving will send them an account creation email.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {preEnrollPending.map(app => (
                  <div key={app.id} style={{ ...styles.card, borderLeft: '3px solid #7c3aed' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1f2937' }}>
                          {app.full_name}
                          <span style={{ marginLeft: 8, background: '#ede9fe', color: '#6d28d9', fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>
                            {app.student_type_display}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                          {app.email}{app.contact_number && <> &middot; {app.contact_number}</>}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#374151', marginTop: 2 }}>
                          {app.program_name || 'No program specified'}
                          {app.term_display && <> &middot; {app.term_display}</>}
                          <span style={{ color: '#9ca3af', marginLeft: 6 }}>Ref: {app.reference_number}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <PendingStatusBadge status={app.status} />
                        <button onClick={() => openPendingReview(app)} style={styles.btnReview}>Review</button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.4rem' }}>
                      Submitted: {new Date(app.created_at).toLocaleString('en-PH')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Filters ── */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ ...styles.yearHeader, borderLeftColor: '#1e3a5f', flex: '0 0 auto', margin: 0, paddingRight: '1rem' }}>
            <i className="ti ti-list-check" style={{ fontSize: 15 }} />
            <span>Student Enrollment Requests</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <label style={styles.filterLabel}>Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label style={styles.filterLabel}>Term</label>
            <select
              value={filterTerm}
              onChange={e => setFilterTerm(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Terms</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {t.semester_display} {t.year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div style={styles.alertError}>{error}</div>}

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading requests...</p>
        ) : requests.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            No enrollment requests match the selected filters.
          </p>
        ) : (() => {
          const YEAR_LABELS = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
          const grouped = {};
          requests.forEach(req => {
            const yr = req.year_level ?? 0;
            if (!grouped[yr]) grouped[yr] = [];
            grouped[yr].push(req);
          });
          const sortedYears = Object.keys(grouped).map(Number).sort((a, b) => {
            if (a === 0) return 1;
            if (b === 0) return -1;
            return a - b;
          });
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {sortedYears.map(yr => (
                <div key={yr}>
                  <div style={styles.yearHeader}>
                    <span>{yr === 0 ? 'Unknown Year Level' : YEAR_LABELS[yr] || `Year ${yr}`}</span>
                    <span style={styles.yearCount}>{grouped[yr].length} request{grouped[yr].length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {grouped[yr].map(req => (
                      <div key={req.id} style={styles.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between',
                          alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1f2937' }}>
                              {req.student_name}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                              {req.student_id} &middot; {req.student_email}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#374151', marginTop: '0.2rem' }}>
                              {req.academic_term.semester_display} {req.academic_term.year}
                              &nbsp;&middot;&nbsp;{req.total_units} units
                              {req.program_code && <>&nbsp;&middot;&nbsp;{req.program_code}</>}
                              {req.block_name && (
                                <span style={{ background: '#dbeafe', color: '#1e40af',
                                  borderRadius: 4, padding: '1px 7px', marginLeft: 6,
                                  fontSize: '0.78rem', fontWeight: 700 }}>
                                  {req.block_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <StatusBadge status={req.status} />
                            {req.status === 'pending' && (
                              <button onClick={() => openReview(req)} style={styles.btnReview}>
                                Review
                              </button>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.6rem' }}>
                          {req.subjects.map(s => (
                            <span key={s.id} style={styles.subjectChip}>
                              {s.code}  -  {s.name} ({s.units}u)
                            </span>
                          ))}
                        </div>

                        {req.remarks && (
                          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem',
                            color: '#374151', fontStyle: 'italic' }}>
                            Remarks: {req.remarks}
                          </p>
                        )}

                        <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.4rem' }}>
                          Submitted: {new Date(req.submitted_at).toLocaleString('en-PH')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* â”€â”€ Review Modal â”€â”€ */}
        {selected && (
          <div style={styles.modalBackdrop}>
            <div style={styles.modal}>
              <h3 style={{ margin: '0 0 0.25rem', color: '#1e3a5f', fontSize: '1.05rem' }}>
                Review Enrollment Request
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1rem' }}>
                Student: <strong>{selected.student_name}</strong> ({selected.student_id})<br />
                Term: {selected.academic_term.semester_display} {selected.academic_term.year}
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ fontSize: '0.85rem', color: '#374151' }}>Subjects:</strong>
                <ul style={{ marginTop: '0.35rem', paddingLeft: '1.25rem',
                  fontSize: '0.85rem', color: '#374151' }}>
                  {selected.subjects.map(s => (
                    <li key={s.id}>{s.code}  -  {s.name} ({s.units} units)</li>
                  ))}
                </ul>
              </div>

              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem',
                color: '#374151', marginBottom: '0.35rem' }}>
                Remarks <span style={{ fontWeight: 400, color: '#9ca3af' }}>(required when rejecting)</span>
              </label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
                placeholder="Enter remarks..."
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6,
                  border: '1px solid #d1d5db', fontSize: '0.9rem', resize: 'vertical',
                  boxSizing: 'border-box' }}
              />

              {reviewError && (
                <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '0.35rem 0 0' }}>
                  {reviewError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem',
                justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setSelected(null)}
                  style={styles.btnCancel}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReview('rejected')}
                  disabled={reviewing}
                  style={styles.btnReject(reviewing)}
                >
                  Reject
                </button>
                <button
                  onClick={() => handleReview('approved')}
                  disabled={reviewing}
                  style={styles.btnApprove(reviewing)}
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}

function PendingStatusBadge({ status }) {
  const map = {
    pending:   { label: 'Pending',   bg: '#fef3c7', color: '#92400e' },
    approved:  { label: 'Approved',  bg: '#d1fae5', color: '#065f46' },
    rejected:  { label: 'Rejected',  bg: '#fee2e2', color: '#991b1b' },
    activated: { label: 'Activated', bg: '#dbeafe', color: '#1e40af' },
  };
  const { label, bg, color } = map[status] ?? { label: status, bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ background: bg, color, padding: '2px 10px', borderRadius: 4, fontWeight: 600, fontSize: '0.8rem' }}>
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:  { label: 'Pending',  bg: '#fef3c7', color: '#92400e' },
    approved: { label: 'Approved', bg: '#d1fae5', color: '#065f46' },
    rejected: { label: 'Rejected', bg: '#fee2e2', color: '#991b1b' },
  };
  const { label, bg, color } = map[status] ?? { label: status, bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ background: bg, color, padding: '2px 10px', borderRadius: 4,
      fontWeight: 600, fontSize: '0.8rem' }}>
      {label}
    </span>
  );
}

const styles = {
  termPanel: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '1rem 1.25rem', marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  termPanelHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap',
    marginBottom: '0.75rem',
  },
  panelTitle: {
    margin: 0, fontSize: '0.98rem', color: '#1e3a5f', fontWeight: 700,
  },
  panelSubtitle: {
    margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.84rem',
  },
  filterLabel: {
    display: 'block', fontSize: '0.8rem', fontWeight: 600,
    color: '#6b7280', marginBottom: '0.25rem',
  },
  filterSelect: {
    padding: '0.4rem 0.75rem', borderRadius: 6,
    border: '1px solid #d1d5db', fontSize: '0.9rem',
  },
  alertError: {
    background: '#fee2e2', color: '#991b1b', padding: '0.75rem',
    borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem',
  },
  card: {
    background: '#fff', border: '1px solid #e5e7eb',
    borderRadius: 8, padding: '1rem 1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  yearHeader: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    fontWeight: 700, fontSize: '0.95rem', color: '#1e3a5f',
    borderLeft: '3px solid #1e3a5f', paddingLeft: '0.65rem',
    marginBottom: '0.75rem',
  },
  yearCount: {
    background: '#e0e7ff', color: '#3730a3', borderRadius: 20,
    padding: '0.1rem 0.55rem', fontSize: '0.75rem', fontWeight: 700,
  },
  subjectChip: {
    background: '#e0e7ff', color: '#3730a3',
    padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 500,
  },
  btnReview: {
    background: '#1e3a5f', color: '#fff', border: 'none',
    padding: '0.35rem 0.9rem', borderRadius: 6, cursor: 'pointer',
    fontSize: '0.85rem', fontWeight: 600,
  },
  modalBackdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: 10, padding: '1.5rem 2rem',
    width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  },
  btnCancel: {
    padding: '0.5rem 1.1rem', borderRadius: 6, border: '1px solid #d1d5db',
    background: '#fff', cursor: 'pointer', fontSize: '0.9rem', color: '#374151',
  },
  btnReject: (disabled) => ({
    padding: '0.5rem 1.1rem', borderRadius: 6, border: 'none',
    background: '#dc2626', color: '#fff', fontWeight: 600, fontSize: '0.9rem',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1,
  }),
  btnApprove: (disabled) => ({
    padding: '0.5rem 1.1rem', borderRadius: 6, border: 'none',
    background: '#059669', color: '#fff', fontWeight: 600, fontSize: '0.9rem',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1,
  }),
};

