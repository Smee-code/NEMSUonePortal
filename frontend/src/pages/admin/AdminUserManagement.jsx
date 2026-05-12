import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'student',   label: 'Student' },
  { value: 'faculty',   label: 'Faculty' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'admin',     label: 'Admin' },
];

const ROLE_META = {
  student:   { bg: '#dbeafe', color: '#1e40af' },
  faculty:   { bg: '#ede9fe', color: '#5b21b6' },
  registrar: { bg: '#fef3c7', color: '#92400e' },
  admin:     { bg: '#fee2e2', color: '#991b1b' },
};

const PAGE_LIMIT = 20;

function RoleBadge({ role }) {
  const m = ROLE_META[role] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ background: m.bg, color: m.color, borderRadius: 12,
      padding: '0.15rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>
      {role}
    </span>
  );
}

export default function AdminUserManagement() {
  const { user, logout } = useAuth();

  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [offset, setOffset]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [filterRole,       setFilterRole]       = useState('');
  const [filterActive,     setFilterActive]     = useState('');
  const [filterVerified,   setFilterVerified]   = useState('');
  const [searchInput,      setSearchInput]      = useState('');
  const [searchQuery,      setSearchQuery]      = useState('');

  const [expandedId, setExpandedId] = useState(null);
  const [editForm,   setEditForm]   = useState({});  // { [id]: { role, is_active, unlock } }
  const [saving,     setSaving]     = useState(null);

  const fetchUsers = useCallback((newOffset = 0) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ limit: PAGE_LIMIT, offset: newOffset });
    if (filterRole)     params.append('role', filterRole);
    if (filterActive)   params.append('is_active', filterActive);
    if (filterVerified) params.append('is_verified', filterVerified);
    if (searchQuery)    params.append('search', searchQuery);
    api.get(`/auth/admin/users/?${params.toString()}`)
      .then(res => {
        setUsers(res.data.results ?? res.data);
        setTotal(res.data.count ?? (res.data.results ?? res.data).length);
      })
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, [filterRole, filterActive, filterVerified, searchQuery]);

  useEffect(() => {
    setOffset(0);
    fetchUsers(0);
  }, [filterRole, filterActive, filterVerified, searchQuery]); // eslint-disable-line

  useEffect(() => {
    fetchUsers(offset);
  }, [offset]); // eslint-disable-line

  function handleSearch(e) {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  function openExpand(u) {
    const id = u.id;
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!editForm[id]) {
      setEditForm(prev => ({ ...prev, [id]: { role: u.role, is_active: u.is_active, unlock: false } }));
    }
  }

  function setField(id, field, value) {
    setEditForm(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleSave(u) {
    const form = editForm[u.id];
    setSaving(u.id);
    setError('');
    setSuccessMsg('');
    try {
      const payload = {};
      if (form.role !== u.role)           payload.role      = form.role;
      if (form.is_active !== u.is_active) payload.is_active = form.is_active;
      if (form.unlock)                    payload.unlock    = true;

      if (Object.keys(payload).length === 0) {
        setSaving(null);
        return;
      }
      await api.patch(`/auth/admin/users/${u.id}/`, payload);
      setSuccessMsg(`Account for ${u.full_name} updated successfully.`);
      setExpandedId(null);
      fetchUsers(offset);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error || data?.detail || 'Failed to save changes.');
    } finally {
      setSaving(null);
    }
  }

  const totalPages  = Math.ceil(total / PAGE_LIMIT);
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link" to="/admin/dashboard">Dashboard</Link>
        <Link className="sidebar-link active" to="/admin/users">User Management</Link>
        <Link className="sidebar-link" to="/admin/programs">Programs &amp; Curriculum</Link>
        <Link className="sidebar-link" to="/admin/audit-log">Audit Log</Link>
        <Link className="sidebar-link" to="/admin/announcements">Announcements</Link>
        <Link className="sidebar-link" to="/admin/settings">System Settings</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>User Management</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {/* Filters */}
        <div style={styles.filterBar}>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={styles.filterSelect}>
            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filterActive} onChange={e => setFilterActive(e.target.value)} style={styles.filterSelect}>
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <select value={filterVerified} onChange={e => setFilterVerified(e.target.value)} style={styles.filterSelect}>
            <option value="">All Verified</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.4rem', flex: 1 }}>
            <input
              type="text"
              placeholder="Search name, ID, or email…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ ...styles.filterInput, flex: 1 }}
            />
            <button type="submit" style={styles.btnSearch}>Search</button>
            {searchQuery && (
              <button type="button" onClick={() => { setSearchInput(''); setSearchQuery(''); }} style={styles.btnClear}>
                Clear
              </button>
            )}
          </form>
        </div>

        {error      && <div style={styles.alertError}>{error}</div>}
        {successMsg && <div style={styles.alertSuccess}>{successMsg}</div>}

        {!loading && (
          <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            {total === 0
              ? 'No users found.'
              : `Showing ${offset + 1}–${Math.min(offset + PAGE_LIMIT, total)} of ${total} user${total !== 1 ? 's' : ''}`}
          </p>
        )}

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading…</p>
        ) : users.length === 0 ? (
          <div style={styles.emptyState}>No users match your filters.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {users.map(u => {
              const expanded = expandedId === u.id;
              const form     = editForm[u.id] || {};
              const isSelf   = u.id === user?.id;
              const isSaving = saving === u.id;

              return (
                <div key={u.id} style={styles.card}>
                  <div
                    style={styles.cardHeader}
                    onClick={() => openExpand(u)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && openExpand(u)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={styles.userName}>{u.full_name}</span>
                        <RoleBadge role={u.role} />
                        {!u.is_active && (
                          <span style={styles.inactivePill}>Inactive</span>
                        )}
                        {!u.is_verified && (
                          <span style={styles.unverifiedPill}>Unverified</span>
                        )}
                        {u.is_locked && (
                          <span style={styles.lockedPill}>Locked</span>
                        )}
                        {isSelf && (
                          <span style={styles.selfPill}>You</span>
                        )}
                      </div>
                      <div style={styles.userMeta}>
                        {u.student_id} · {u.institutional_email}
                      </div>
                    </div>
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem', userSelect: 'none' }}>
                      {expanded ? '▲' : '▼'}
                    </span>
                  </div>

                  {expanded && (
                    <div style={styles.cardBody}>
                      <div style={styles.detailGrid}>
                        <div style={styles.detailCell}>
                          <span style={styles.detailLabel}>Student ID</span>
                          <span style={styles.detailValue}>{u.student_id}</span>
                        </div>
                        <div style={styles.detailCell}>
                          <span style={styles.detailLabel}>Contact</span>
                          <span style={styles.detailValue}>{u.contact_number || '—'}</span>
                        </div>
                        <div style={styles.detailCell}>
                          <span style={styles.detailLabel}>Date Joined</span>
                          <span style={styles.detailValue}>
                            {new Date(u.date_joined).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div style={styles.detailCell}>
                          <span style={styles.detailLabel}>Failed Logins</span>
                          <span style={styles.detailValue}>{u.failed_login_attempts}</span>
                        </div>
                        {u.locked_until && (
                          <div style={styles.detailCell}>
                            <span style={styles.detailLabel}>Locked Until</span>
                            <span style={{ ...styles.detailValue, color: '#991b1b' }}>
                              {new Date(u.locked_until).toLocaleString('en-PH')}
                            </span>
                          </div>
                        )}
                      </div>

                      {isSelf ? (
                        <p style={{ fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.5rem' }}>
                          You cannot modify your own account through this interface.
                        </p>
                      ) : (
                        <div style={styles.editPanel}>
                          <p style={styles.editTitle}>Edit Account</p>
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div>
                              <label style={styles.editLabel}>Role</label>
                              <select
                                value={form.role || u.role}
                                onChange={e => setField(u.id, 'role', e.target.value)}
                                style={styles.editSelect}
                              >
                                {ROLE_OPTIONS.filter(o => o.value).map(o => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={styles.editLabel}>Status</label>
                              <select
                                value={form.is_active !== undefined ? String(form.is_active) : String(u.is_active)}
                                onChange={e => setField(u.id, 'is_active', e.target.value === 'true')}
                                style={styles.editSelect}
                              >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            </div>
                            {u.is_locked && (
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem',
                                fontSize: '0.85rem', color: '#374151', cursor: 'pointer', marginBottom: '2px' }}>
                                <input
                                  type="checkbox"
                                  checked={form.unlock || false}
                                  onChange={e => setField(u.id, 'unlock', e.target.checked)}
                                />
                                Unlock account
                              </label>
                            )}
                            <button
                              onClick={() => handleSave(u)}
                              disabled={isSaving}
                              style={styles.btnSave(isSaving)}
                            >
                              {isSaving ? 'Saving…' : 'Save Changes'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_LIMIT))}
              disabled={offset === 0}
              style={styles.pageBtn(offset === 0)}
            >
              ← Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: '#374151' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + PAGE_LIMIT)}
              disabled={offset + PAGE_LIMIT >= total}
              style={styles.pageBtn(offset + PAGE_LIMIT >= total)}
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  filterBar:      { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' },
  filterSelect:   { padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.875rem', background: '#fff', minWidth: 130 },
  filterInput:    { padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.875rem' },
  btnSearch:      { background: '#1e3a5f', color: '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' },
  btnClear:       { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '0.45rem 0.75rem', borderRadius: 6, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' },
  alertError:     { background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' },
  alertSuccess:   { background: '#d1fae5', color: '#065f46', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' },
  emptyState:     { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.5rem', textAlign: 'center', color: '#6b7280' },
  card:           { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.1rem', cursor: 'pointer', userSelect: 'none' },
  cardBody:       { padding: '0.75rem 1.1rem 1rem', borderTop: '1px solid #f3f4f6' },
  userName:       { fontWeight: 700, color: '#1e3a5f', fontSize: '0.93rem' },
  userMeta:       { fontSize: '0.76rem', color: '#9ca3af', marginTop: '0.15rem' },
  inactivePill:   { fontSize: '0.72rem', background: '#f3f4f6', color: '#6b7280', borderRadius: 10, padding: '0.1rem 0.5rem', fontWeight: 700 },
  unverifiedPill: { fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', borderRadius: 10, padding: '0.1rem 0.5rem', fontWeight: 700 },
  lockedPill:     { fontSize: '0.72rem', background: '#fee2e2', color: '#991b1b', borderRadius: 10, padding: '0.1rem 0.5rem', fontWeight: 700 },
  selfPill:       { fontSize: '0.72rem', background: '#d1fae5', color: '#065f46', borderRadius: 10, padding: '0.1rem 0.5rem', fontWeight: 700 },
  detailGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem 1.5rem', marginBottom: '0.75rem' },
  detailCell:     { display: 'flex', flexDirection: 'column', gap: '0.1rem' },
  detailLabel:    { fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' },
  detailValue:    { fontSize: '0.85rem', color: '#374151' },
  editPanel:      { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.85rem 1rem', marginTop: '0.5rem' },
  editTitle:      { fontWeight: 700, color: '#1e3a5f', fontSize: '0.88rem', marginBottom: '0.6rem' },
  editLabel:      { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' },
  editSelect:     { padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.875rem', background: '#fff' },
  btnSave:        (d) => ({ background: '#059669', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.875rem', cursor: d ? 'not-allowed' : 'pointer', opacity: d ? 0.65 : 1 }),
  pagination:     { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' },
  pageBtn:        (d) => ({ background: d ? '#f3f4f6' : '#1e3a5f', color: d ? '#9ca3af' : '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.875rem', cursor: d ? 'default' : 'pointer' }),
};
