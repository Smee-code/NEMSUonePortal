import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const DOC_TYPES = [
  { value: 'certificate_of_enrollment', label: 'Certificate of Enrollment' },
  { value: 'transcript_of_records',     label: 'Transcript of Records' },
  { value: 'certificate_of_grades',     label: 'Certificate of Grades' },
];

const STATUS_META = {
  submitted:  { label: 'Submitted',          bg: '#f3f4f6', color: '#374151' },
  processing: { label: 'Processing',         bg: '#dbeafe', color: '#1e40af' },
  ready:      { label: 'Ready for Release',  bg: '#d1fae5', color: '#065f46' },
  released:   { label: 'Released',           bg: '#ecfdf5', color: '#047857' },
  rejected:   { label: 'Rejected',           bg: '#fee2e2', color: '#991b1b' },
};

const STEPS = ['submitted', 'processing', 'ready', 'released'];

const EMPTY_FORM = { document_type: '', purpose: '', copies: 1 };

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.submitted;
  return (
    <span style={{ background: m.bg, color: m.color, borderRadius: 12,
      padding: '0.2rem 0.65rem', fontSize: '0.78rem', fontWeight: 700 }}>
      {m.label}
    </span>
  );
}

function StatusTracker({ status }) {
  if (status === 'rejected') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
        <span style={{ color: '#991b1b', fontWeight: 700 }}>✕ Rejected</span>
      </div>
    );
  }
  const current = STEPS.indexOf(status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: '0.5rem' }}>
      {STEPS.map((step, i) => {
        const done   = i <= current;
        const active = i === current;
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: done ? '#059669' : '#e5e7eb',
              color: done ? '#fff' : '#9ca3af',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700,
              border: active ? '2px solid #047857' : '2px solid transparent',
            }}>
              {done ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: '0.65rem', color: done ? '#047857' : '#9ca3af',
              textAlign: 'center', marginLeft: 3, marginRight: 3, whiteSpace: 'nowrap' }}>
              {STATUS_META[step]?.label.split(' ')[0]}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: 24, height: 2, background: i < current ? '#059669' : '#e5e7eb' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function StudentDocuments() {
  const { user, logout } = useAuth();
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  function fetchRequests() {
    setLoading(true);
    api.get('/documents/my/')
      .then(res => setRequests(res.data))
      .catch(() => setError('Failed to load document requests.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchRequests(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.document_type) { setError('Please select a document type.'); return; }
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      await api.post('/documents/request/', {
        document_type: form.document_type,
        purpose: form.purpose.trim(),
        copies: Number(form.copies),
      });
      setSuccessMsg('Your request has been submitted. The registrar will process it soon.');
      setShowForm(false);
      setForm(EMPTY_FORM);
      fetchRequests();
    } catch (err) {
      const data = err.response?.data;
      if (data?.error) {
        setError(data.error);
      } else if (data && typeof data === 'object') {
        setError(Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '));
      } else {
        setError('Failed to submit request. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link" to="/student/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/student/enrollment">Enrollment</Link>
        <Link className="sidebar-link" to="/student/courses">My Courses</Link>
        <Link className="sidebar-link" to="/student/grades">My Grades</Link>
        <Link className="sidebar-link" to="/student/schedule">Schedule</Link>
        <Link className="sidebar-link active" to="/student/documents">Document Requests</Link>
        <Link className="sidebar-link" to="/student/announcements">Announcements</Link>
        <Link className="sidebar-link" to="/student/profile">My Profile</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Document Requests</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {/* Request button */}
        {!showForm && (
          <button onClick={() => { setShowForm(true); setError(''); setSuccessMsg(''); }} style={styles.btnNew}>
            + New Document Request
          </button>
        )}

        {error     && <div style={styles.alertError}>{error}</div>}
        {successMsg && <div style={styles.alertSuccess}>{successMsg}</div>}

        {/* Submit form */}
        {showForm && (
          <div style={styles.formCard}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#1e3a5f' }}>
              Request a Document
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label style={styles.label}>Document Type</label>
                <select
                  value={form.document_type}
                  onChange={e => setForm(p => ({ ...p, document_type: e.target.value }))}
                  style={styles.input}
                  required
                >
                  <option value="">— Select document —</option>
                  {DOC_TYPES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={styles.label}>
                  Purpose <small style={{ color: '#6b7280' }}>(optional)</small>
                </label>
                <textarea
                  value={form.purpose}
                  onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. For scholarship application, employment requirements…"
                  style={{ ...styles.input, resize: 'vertical' }}
                />
              </div>

              <div className="form-group" style={{ maxWidth: 160 }}>
                <label style={styles.label}>Number of Copies</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={form.copies}
                  onChange={e => setForm(p => ({ ...p, copies: e.target.value }))}
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" disabled={submitting} style={styles.btnSubmit(submitting)}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(''); }}
                  style={styles.btnCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Request list */}
        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading requests…</p>
        ) : requests.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ fontWeight: 600 }}>No document requests yet.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Click "New Document Request" to request a certificate or transcript.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {requests.map(req => {
              const expanded = expandedId === req.id;
              return (
                <div key={req.id} style={styles.card}>
                  <div
                    style={styles.cardHeader}
                    onClick={() => setExpandedId(expanded ? null : req.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setExpandedId(expanded ? null : req.id)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={styles.docType}>{req.document_type_display}</span>
                        <StatusBadge status={req.status} />
                        <span style={styles.copies}>{req.copies} copy{req.copies !== 1 ? 'ies' : ''}</span>
                      </div>
                      <div style={styles.submittedDate}>
                        Submitted {new Date(req.submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem', userSelect: 'none' }}>
                      {expanded ? '▲' : '▼'}
                    </span>
                  </div>

                  {expanded && (
                    <div style={styles.cardBody}>
                      <StatusTracker status={req.status} />

                      {req.purpose && (
                        <div style={styles.detailRow}>
                          <span style={styles.detailLabel}>Purpose:</span>
                          <span>{req.purpose}</span>
                        </div>
                      )}
                      {req.remarks && (
                        <div style={{ ...styles.detailRow, marginTop: '0.5rem',
                          background: req.status === 'rejected' ? '#fee2e2' : '#f0fdf4',
                          borderRadius: 6, padding: '0.5rem 0.75rem' }}>
                          <span style={styles.detailLabel}>Registrar's Remarks:</span>
                          <span style={{ color: req.status === 'rejected' ? '#991b1b' : '#065f46' }}>
                            {req.remarks}
                          </span>
                        </div>
                      )}
                      {req.status === 'ready' && (
                        <p style={{ marginTop: '0.75rem', color: '#065f46', fontWeight: 600, fontSize: '0.88rem' }}>
                          Your document is ready. Please visit the Registrar's Office to claim it.
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
      </main>
    </div>
  );
}

const styles = {
  btnNew:     { background: '#1e3a5f', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: 6, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', marginBottom: '1.25rem', display: 'inline-block' },
  label:      { display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#374151', marginBottom: '0.3rem' },
  input:      { width: '100%', padding: '0.5rem 0.65rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' },
  alertError: { background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' },
  alertSuccess:{ background: '#d1fae5', color: '#065f46', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' },
  emptyState: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.5rem', textAlign: 'center', color: '#6b7280' },
  formCard:   { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem' },
  btnSubmit:  (d) => ({ background: '#059669', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: 6, fontWeight: 600, fontSize: '0.9rem', cursor: d ? 'not-allowed' : 'pointer', opacity: d ? 0.7 : 1 }),
  btnCancel:  { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },
  card:       { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.1rem', cursor: 'pointer', userSelect: 'none' },
  cardBody:   { padding: '0.75rem 1.1rem 1rem', borderTop: '1px solid #f3f4f6' },
  docType:    { fontWeight: 700, color: '#1e3a5f', fontSize: '0.95rem' },
  copies:     { fontSize: '0.78rem', color: '#6b7280', background: '#f3f4f6', borderRadius: 10, padding: '0.1rem 0.5rem' },
  submittedDate: { fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.2rem' },
  detailRow:  { display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: '#374151', marginTop: '0.5rem', flexWrap: 'wrap' },
  detailLabel:{ fontWeight: 600, color: '#374151' },
};
