import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const DOC_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'certificate_of_enrollment', label: 'Certificate of Enrollment' },
  { value: 'transcript_of_records',     label: 'Transcript of Records' },
  { value: 'certificate_of_grades',     label: 'Certificate of Grades' },
];

const STATUS_OPTIONS = [
  { value: '',           label: 'All Statuses' },
  { value: 'submitted',  label: 'Submitted' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready',      label: 'Ready for Release' },
  { value: 'released',   label: 'Released' },
  { value: 'rejected',   label: 'Rejected' },
];

const STATUS_META = {
  submitted:  { bg: '#f3f4f6', color: '#374151' },
  processing: { bg: '#dbeafe', color: '#1e40af' },
  ready:      { bg: '#d1fae5', color: '#065f46' },
  released:   { bg: '#ecfdf5', color: '#047857' },
  rejected:   { bg: '#fee2e2', color: '#991b1b' },
};

const STATUS_LABELS = {
  submitted:  'Submitted',
  processing: 'Processing',
  ready:      'Ready for Release',
  released:   'Released',
  rejected:   'Rejected',
};

const PAGE_LIMIT = 20;

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.submitted;
  return (
    <span style={{ background: m.bg, color: m.color, borderRadius: 12,
      padding: '0.2rem 0.65rem', fontSize: '0.78rem', fontWeight: 700 }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function RegistrarDocuments() {
  const { user, logout } = useAuth();

  const [requests, setRequests]       = useState([]);
  const [total, setTotal]             = useState(0);
  const [offset, setOffset]           = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [successMsg, setSuccessMsg]   = useState('');

  const [filterStatus, setFilterStatus]     = useState('');
  const [filterDocType, setFilterDocType]   = useState('');
  const [searchInput, setSearchInput]       = useState('');
  const [searchQuery, setSearchQuery]       = useState('');

  const [expandedId, setExpandedId]   = useState(null);
  const [updateForm, setUpdateForm]   = useState({});  // { [id]: { status, remarks } }
  const [saving, setSaving]           = useState(null); // id being saved

  const fetchRequests = useCallback((newOffset = offset) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ limit: PAGE_LIMIT, offset: newOffset });
    if (filterStatus)  params.append('status', filterStatus);
    if (filterDocType) params.append('document_type', filterDocType);
    if (searchQuery)   params.append('student', searchQuery);
    api.get(`/documents/all/?${params.toString()}`)
      .then(res => {
        setRequests(res.data.results ?? res.data);
        setTotal(res.data.count ?? (res.data.results ?? res.data).length);
      })
      .catch(() => setError('Failed to load document requests.'))
      .finally(() => setLoading(false));
  }, [filterStatus, filterDocType, searchQuery, offset]);

  useEffect(() => {
    setOffset(0);
    fetchRequests(0);
  }, [filterStatus, filterDocType, searchQuery]); // eslint-disable-line

  useEffect(() => {
    fetchRequests(offset);
  }, [offset]); // eslint-disable-line

  function handleSearch(e) {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput('');
    setSearchQuery('');
  }

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
    setUpdateForm(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function handleUpdate(req) {
    const form = updateForm[req.id];
    if (!form?.status) { setError('Please select a new status.'); return; }
    if (form.status === 'rejected' && !form.remarks?.trim()) {
      setError('A reason is required when rejecting a request.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setSaving(req.id);
    try {
      await api.patch(`/documents/all/${req.id}/status/`, {
        status: form.status,
        remarks: form.remarks?.trim() || '',
      });
      setSuccessMsg(`Status updated to "${STATUS_LABELS[form.status]}" for ${req.student_name}.`);
      setExpandedId(null);
      fetchRequests(offset);
    } catch (err) {
      const data = err.response?.data;
      if (data?.status) {
        setError(Array.isArray(data.status) ? data.status.join(' ') : data.status);
      } else if (data?.remarks) {
        setError(Array.isArray(data.remarks) ? data.remarks.join(' ') : data.remarks);
      } else if (data?.non_field_errors) {
        setError(data.non_field_errors.join(' '));
      } else {
        setError('Failed to update status. Please try again.');
      }
    } finally {
      setSaving(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT);
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link" to="/registrar/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/registrar/enrollment">Enrollment Requests</Link>
        <Link className="sidebar-link" to="/registrar/grades">List of Students</Link>
        <Link className="sidebar-link" to="/registrar/faculty">Faculty</Link>
        <Link className="sidebar-link" to="/registrar/schedule">Class Schedules</Link>
        <Link className="sidebar-link active" to="/registrar/documents">Document Requests</Link>
        <Link className="sidebar-link" to="/registrar/academic-data">Academic Data</Link>
        <Link className="sidebar-link" to="/registrar/announcements">Announcements</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Document Requests</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {/* â”€â”€ Filters â”€â”€ */}
        <div style={styles.filterBar}>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={styles.filterSelect}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={filterDocType}
            onChange={e => setFilterDocType(e.target.value)}
            style={styles.filterSelect}
          >
            {DOC_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.4rem', flex: 1 }}>
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ ...styles.filterInput, flex: 1 }}
            />
            <button type="submit" style={styles.btnSearch}>Search</button>
            {searchQuery && (
              <button type="button" onClick={clearSearch} style={styles.btnClear}>Clear</button>
            )}
          </form>
        </div>

        {error      && <div style={styles.alertError}>{error}</div>}
        {successMsg && <div style={styles.alertSuccess}>{successMsg}</div>}

        {/* â”€â”€ Count â”€â”€ */}
        {!loading && (
          <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            {total === 0
              ? 'No requests found.'
              : `Showing ${offset + 1} - ${Math.min(offset + PAGE_LIMIT, total)} of ${total} request${total !== 1 ? 's' : ''}`}
          </p>
        )}

        {/* â”€â”€ List â”€â”€ */}
        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading...</p>
        ) : requests.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ fontWeight: 600 }}>No document requests match your filters.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {requests.map(req => {
              const expanded = expandedId === req.id;
              const form = updateForm[req.id] || {};
              const isSaving = saving === req.id;
              const hasNextStatuses = req.next_statuses && req.next_statuses.length > 0;

              return (
                <div key={req.id} style={styles.card}>
                  {/* Card header  -  click to expand */}
                  <div
                    style={styles.cardHeader}
                    onClick={() => openExpand(req)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && openExpand(req)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={styles.studentName}>{req.student_name}</span>
                        <span style={styles.studentId}>{req.student_id_no}</span>
                        <StatusBadge status={req.status} />
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        <span style={styles.meta}>{req.document_type_display}</span>
                        <span style={styles.meta}>{req.copies} cop{req.copies !== 1 ? 'ies' : 'y'}</span>
                        <span style={styles.meta}>
                          Submitted {new Date(req.submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem', userSelect: 'none' }}>
                      {expanded ? '^' : 'v'}
                    </span>
                  </div>

                  {expanded && (
                    <div style={styles.cardBody}>
                      {/* Details row */}
                      <div style={styles.detailGrid}>
                        <div style={styles.detailCell}>
                          <span style={styles.detailLabel}>Email</span>
                          <span style={styles.detailValue}>{req.student_email}</span>
                        </div>
                        {req.purpose && (
                          <div style={styles.detailCell}>
                            <span style={styles.detailLabel}>Purpose</span>
                            <span style={styles.detailValue}>{req.purpose}</span>
                          </div>
                        )}
                        {req.processed_by_name && (
                          <div style={styles.detailCell}>
                            <span style={styles.detailLabel}>Last processed by</span>
                            <span style={styles.detailValue}>
                              {req.processed_by_name}
                              {req.processed_at && <> &middot; {new Date(req.processed_at).toLocaleString('en-PH')}</>}
                            </span>
                          </div>
                        )}
                        {req.remarks && (
                          <div style={{ ...styles.detailCell, gridColumn: '1 / -1' }}>
                            <span style={styles.detailLabel}>Current remarks</span>
                            <span style={{
                              ...styles.detailValue,
                              color: req.status === 'rejected' ? '#991b1b' : '#065f46',
                            }}>
                              {req.remarks}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Update status panel */}
                      {hasNextStatuses ? (
                        <div style={styles.updatePanel}>
                          <p style={styles.updateTitle}>Update Status</p>
                          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            <div>
                              <label style={styles.updateLabel}>New Status</label>
                              <select
                                value={form.status || ''}
                                onChange={e => setField(req.id, 'status', e.target.value)}
                                style={styles.updateSelect}
                              >
                                <option value=""> -  select  - </option>
                                {req.next_statuses.map(s => (
                                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <label style={styles.updateLabel}>
                                Remarks
                                {form.status === 'rejected'
                                  ? <span style={{ color: '#991b1b' }}> (required for rejection)</span>
                                  : <span style={{ color: '#9ca3af' }}> (optional)</span>}
                              </label>
                              <textarea
                                value={form.remarks || ''}
                                onChange={e => setField(req.id, 'remarks', e.target.value)}
                                rows={2}
                                maxLength={1000}
                                placeholder="Add remarks for the student..."
                                style={{ ...styles.updateInput, resize: 'vertical' }}
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => handleUpdate(req)}
                            disabled={isSaving || !form.status}
                            style={styles.btnUpdate(isSaving || !form.status)}
                          >
                            {isSaving ? 'Saving...' : 'Save Status'}
                          </button>
                        </div>
                      ) : (
                        <p style={styles.terminalNote}>
                          {req.status === 'released'
                            ? 'This request has been released. No further action needed.'
                            : 'This request has been rejected. No further status changes allowed.'}
                        </p>
                      )}

                      <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.75rem' }}>
                        Last updated: {new Date(req.updated_at).toLocaleString('en-PH')}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* â”€â”€ Pagination â”€â”€ */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_LIMIT))}
              disabled={offset === 0}
              style={styles.pageBtn(offset === 0)}
            >
              â† Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: '#374151' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + PAGE_LIMIT)}
              disabled={offset + PAGE_LIMIT >= total}
              style={styles.pageBtn(offset + PAGE_LIMIT >= total)}
            >
              Next â†’
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  filterBar:     { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' },
  filterSelect:  { padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.875rem', background: '#fff', minWidth: 160 },
  filterInput:   { padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.875rem' },
  btnSearch:     { background: '#1e3a5f', color: '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' },
  btnClear:      { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '0.45rem 0.75rem', borderRadius: 6, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' },
  alertError:    { background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' },
  alertSuccess:  { background: '#d1fae5', color: '#065f46', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' },
  emptyState:    { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.5rem', textAlign: 'center', color: '#6b7280' },
  card:          { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.1rem', cursor: 'pointer', userSelect: 'none' },
  cardBody:      { padding: '0.75rem 1.1rem 1rem', borderTop: '1px solid #f3f4f6' },
  studentName:   { fontWeight: 700, color: '#1e3a5f', fontSize: '0.95rem' },
  studentId:     { fontSize: '0.78rem', color: '#6b7280', background: '#f3f4f6', borderRadius: 10, padding: '0.1rem 0.5rem' },
  meta:          { fontSize: '0.78rem', color: '#9ca3af' },
  detailGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem 1.5rem', marginBottom: '1rem' },
  detailCell:    { display: 'flex', flexDirection: 'column', gap: '0.1rem' },
  detailLabel:   { fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' },
  detailValue:   { fontSize: '0.85rem', color: '#374151' },
  updatePanel:   { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.9rem 1rem', marginTop: '0.5rem' },
  updateTitle:   { fontWeight: 700, color: '#1e3a5f', fontSize: '0.88rem', marginBottom: '0.6rem' },
  updateLabel:   { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' },
  updateSelect:  { padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.875rem', background: '#fff', minWidth: 180 },
  updateInput:   { width: '100%', padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.875rem', boxSizing: 'border-box' },
  btnUpdate:     (d) => ({ marginTop: '0.6rem', background: '#059669', color: '#fff', border: 'none', padding: '0.45rem 1.1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.875rem', cursor: d ? 'not-allowed' : 'pointer', opacity: d ? 0.65 : 1 }),
  terminalNote:  { fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.5rem' },
  pagination:    { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' },
  pageBtn:       (d) => ({ background: d ? '#f3f4f6' : '#1e3a5f', color: d ? '#9ca3af' : '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.875rem', cursor: d ? 'default' : 'pointer' }),
};

