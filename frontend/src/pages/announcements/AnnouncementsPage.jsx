import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const TARGET_META = {
  all:     { label: 'All Users',           bg: '#dbeafe', color: '#1e40af' },
  student: { label: 'Students Only',       bg: '#d1fae5', color: '#065f46' },
  faculty: { label: 'Faculty Only',        bg: '#fef3c7', color: '#92400e' },
  public:  { label: 'Public / Landing',    bg: '#f3e8ff', color: '#6b21a8' },
};

const SIDEBAR = {
  student: [
    { to: '/student/dashboard',     label: 'Dashboard' },
    { to: '/student/enrollment',    label: 'Enrollment' },
    { to: '/student/grades',        label: 'My Grades' },
    { to: '/student/schedule',      label: 'Schedule' },
    { to: '/student/documents',     label: 'Document Requests' },
    { to: '/student/announcements', label: 'Announcements', active: true },
    { to: '/student/profile',       label: 'My Profile' },
  ],
  faculty: [
    { to: '/faculty/dashboard',     label: 'Dashboard' },
    { to: '/faculty/grades',        label: 'Grade Encoding' },
    { to: '/faculty/schedule',      label: 'Teaching Load' },
    { to: '/faculty/announcements', label: 'Announcements', active: true },
    { to: '/faculty/profile',       label: 'My Profile' },
  ],
  registrar: [
    { to: '/registrar/dashboard',    label: 'Dashboard' },
    { to: '/registrar/enrollment',   label: 'Enrollment Requests' },
    { to: '/registrar/grades',       label: 'List of Students' },
    { to: '/registrar/faculty',      label: 'Faculty' },
    { to: '/registrar/schedule',     label: 'Class Schedules' },
    { to: '/registrar/documents',    label: 'Document Requests' },
    { to: '/registrar/academic-data',label: 'Academic Data' },
    { to: '/registrar/announcements',label: 'Announcements', active: true },
  ],
  admin: [
    { to: '/admin/dashboard',        label: 'Dashboard' },
    { to: '/admin/users',            label: 'User Management' },
    { to: '/admin/programs',         label: 'Programs & Curriculum' },
    { to: '/admin/audit-log',        label: 'Audit Log' },
    { to: '/admin/announcements',    label: 'Announcements', active: true },
    { to: '/admin/settings',         label: 'System Settings' },
  ],
};

const EMPTY_FORM = { title: '', body: '', target_audience: 'all', is_pinned: false };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function AnnouncementsPage() {
  const { user, logout } = useAuth();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [successMsg, setSuccessMsg]       = useState('');

  const [expandedId, setExpandedId] = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [editId, setEditId]         = useState(null);
  const [saving, setSaving]         = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const canPost = ['faculty', 'registrar', 'admin'].includes(user?.role);
  const isAdmin = user?.role === 'admin';
  const links   = SIDEBAR[user?.role] || [];

  function fetchAnnouncements(q = '') {
    setLoading(true);
    setError('');
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    api.get(`/announcements/${params}`)
      .then(res => setAnnouncements(res.data.results ?? res.data))
      .catch(() => setError('Failed to load announcements.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchAnnouncements(); }, []);

  function handleSearch(e) {
    e.preventDefault();
    const q = searchInput.trim();
    setActiveSearch(q);
    fetchAnnouncements(q);
  }

  function clearSearch() {
    setSearchInput('');
    setActiveSearch('');
    fetchAnnouncements('');
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setError('');
    setSuccessMsg('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openEdit(ann) {
    setForm({
      title: ann.title,
      body: ann.body,
      target_audience: ann.target_audience,
      is_pinned: ann.is_pinned,
    });
    setEditId(ann.id);
    setError('');
    setSuccessMsg('');
    setShowForm(true);
    setExpandedId(null);
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"?`)) return;
    setError('');
    setSuccessMsg('');
    try {
      await api.delete(`/announcements/${id}/`);
      setSuccessMsg('Announcement deleted.');
      fetchAnnouncements(activeSearch);
    } catch {
      setError('Failed to delete announcement.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/announcements/${editId}/`, form);
        setSuccessMsg('Announcement updated.');
      } else {
        await api.post('/announcements/', form);
        setSuccessMsg('Announcement posted. Email notifications sent to relevant users.');
      }
      setShowForm(false);
      setEditId(null);
      fetchAnnouncements(activeSearch);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        setError(
          Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
        );
      } else {
        setError('Failed to save announcement.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        {links.map(l => (
          <Link key={l.to} className={`sidebar-link${l.active ? ' active' : ''}`} to={l.to}>
            {l.label}
          </Link>
        ))}
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Announcements</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <form onSubmit={handleSearch} style={styles.searchForm}>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search announcements…"
              style={styles.searchInput}
            />
            <button type="submit" style={styles.btnSearch}>Search</button>
            {activeSearch && (
              <button type="button" onClick={clearSearch} style={styles.btnClear}>✕ Clear</button>
            )}
          </form>
          {canPost && (
            <button onClick={openCreate} style={styles.btnPost}>+ Post Announcement</button>
          )}
        </div>

        {activeSearch && (
          <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            Showing results for "<strong>{activeSearch}</strong>"
          </p>
        )}

        {error     && <div style={styles.alertError}>{error}</div>}
        {successMsg && <div style={styles.alertSuccess}>{successMsg}</div>}

        {/* Create / Edit form */}
        {showForm && (
          <div style={styles.formCard}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#1e3a5f' }}>
              {editId ? 'Edit Announcement' : 'Post New Announcement'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label style={styles.label}>Title <small style={{ color: '#6b7280' }}>(max 200 characters)</small></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  maxLength={200}
                  required
                  placeholder="Announcement title"
                  style={styles.input}
                />
              </div>

              <div className="form-group">
                <label style={styles.label}>Body</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                  required
                  rows={6}
                  placeholder="Write the full announcement here…"
                  style={{ ...styles.input, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
                  <label style={styles.label}>Target Audience</label>
                  <select
                    value={form.target_audience}
                    onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))}
                    style={{ ...styles.input, maxWidth: '100%' }}
                  >
                    <option value="all">All Users</option>
                    <option value="student">Students Only</option>
                    <option value="faculty">Faculty Only</option>
                    <option value="public">Public / Landing Page</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.6rem' }}>
                  <input
                    type="checkbox"
                    id="is_pinned"
                    checked={form.is_pinned}
                    onChange={e => setForm(p => ({ ...p, is_pinned: e.target.checked }))}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="is_pinned" style={{ fontSize: '0.88rem', color: '#374151', cursor: 'pointer' }}>
                    Pin to top
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="submit" disabled={saving} style={styles.btnSave(saving)}>
                  {saving ? 'Saving…' : editId ? 'Update' : 'Post'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditId(null); setError(''); }}
                  style={styles.btnCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Announcement list */}
        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading announcements…</p>
        ) : announcements.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ fontWeight: 600 }}>
              {activeSearch ? `No announcements found for "${activeSearch}".` : 'No announcements yet.'}
            </p>
            {canPost && !activeSearch && (
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Click "Post Announcement" to share information with users.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {announcements.map(ann => {
              const tm      = TARGET_META[ann.target_audience] || TARGET_META.all;
              const expanded = expandedId === ann.id;
              const canEdit  = canPost && (ann.is_mine || isAdmin);

              return (
                <div
                  key={ann.id}
                  style={{
                    ...styles.card,
                    borderLeft: ann.is_pinned ? '4px solid #1e3a5f' : '4px solid #e5e7eb',
                  }}
                >
                  {/* Card header — click to expand */}
                  <div
                    style={styles.cardHeader}
                    onClick={() => setExpandedId(expanded ? null : ann.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setExpandedId(expanded ? null : ann.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        {ann.is_pinned && <span title="Pinned" style={{ fontSize: '0.9rem' }}>📌</span>}
                        {ann.is_new   && <span style={styles.newBadge}>NEW</span>}
                        <span style={styles.cardTitle}>{ann.title}</span>
                      </div>
                      <div style={styles.cardMeta}>
                        <strong>{ann.posted_by_name}</strong>
                        <span style={{ color: '#d1d5db' }}>·</span>
                        {formatDate(ann.created_at)}
                        <span
                          style={{ ...styles.targetBadge, background: tm.bg, color: tm.color }}
                        >
                          {tm.label}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      {canEdit && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); openEdit(ann); }}
                            style={styles.btnEdit}
                          >
                            Edit
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(ann.id, ann.title); }}
                            style={styles.btnDelete}
                          >
                            Delete
                          </button>
                        </>
                      )}
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem', userSelect: 'none' }}>
                        {expanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded body */}
                  {expanded && (
                    <div style={styles.cardBody}>
                      <p style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.7 }}>
                        {ann.body}
                      </p>
                      {ann.updated_at !== ann.created_at && (
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem' }}>
                          Last updated: {new Date(ann.updated_at).toLocaleString('en-PH')}
                        </p>
                      )}
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
  toolbar:     { display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' },
  searchForm:  { display: 'flex', gap: '0.4rem', flex: 1, maxWidth: 380 },
  searchInput: { flex: 1, padding: '0.45rem 0.65rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.9rem' },
  btnSearch:   { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '0.45rem 0.9rem', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' },
  btnClear:    { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.45rem 0.75rem', borderRadius: 6, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' },
  btnPost:     { background: '#1e3a5f', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: 6, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  label:       { display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#374151', marginBottom: '0.3rem' },
  input:       { width: '100%', padding: '0.5rem 0.65rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' },
  alertError:  { background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' },
  alertSuccess:{ background: '#d1fae5', color: '#065f46', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' },
  emptyState:  { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.5rem', textAlign: 'center', color: '#6b7280' },
  formCard:    { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem' },
  card:        { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.1rem', cursor: 'pointer', gap: '0.5rem', userSelect: 'none' },
  cardTitle:   { fontWeight: 700, color: '#1e3a5f', fontSize: '0.95rem' },
  cardMeta:    { display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem' },
  cardBody:    { padding: '0.75rem 1.1rem 1rem', borderTop: '1px solid #f3f4f6' },
  newBadge:    { background: '#dc2626', color: '#fff', borderRadius: 4, padding: '0.1rem 0.4rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' },
  targetBadge: { borderRadius: 12, padding: '0.15rem 0.55rem', fontSize: '0.72rem', fontWeight: 600 },
  btnEdit:     { background: '#1e3a5f', color: '#fff', border: 'none', padding: '0.22rem 0.6rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' },
  btnDelete:   { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.22rem 0.6rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' },
  btnSave:     (d) => ({ background: '#059669', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: 6, fontWeight: 600, fontSize: '0.9rem', cursor: d ? 'not-allowed' : 'pointer', opacity: d ? 0.7 : 1 }),
  btnCancel:   { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },
};
