import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import SidebarAdmin from '../../components/layout/SidebarAdmin';
import SidebarRegistrar from '../../components/layout/SidebarRegistrar';
import SidebarFaculty from '../../components/layout/SidebarFaculty';
import SidebarStudent from '../../components/layout/SidebarStudent';

const TARGET_META = {
  all:     { label: 'All users',          bg: '#dbeafe', color: '#1e40af' },
  student: { label: 'Students only',      bg: '#d1fae5', color: '#065f46' },
  faculty: { label: 'Faculty only',       bg: '#fef3c7', color: '#92400e' },
  public:  { label: 'Public / landing',   bg: '#f3e8ff', color: '#6b21a8' },
};

const EMPTY_FORM = { title: '', body: '', target_audience: 'all', is_pinned: false };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function AnnouncementsPage() {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  const isInShell = user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'registrar';
  const isAdmin   = isInShell; // kept for compatibility with existing references below
  // Faculty may read announcements but not post or manage them (registrar / admin only).
  const canPost   = ['registrar', 'admin'].includes(user?.role);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);

  const [expandedId, setExpandedId] = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [editId, setEditId]         = useState(null);
  const [saving, setSaving]         = useState(false);

  const [searchInput, setSearchInput]   = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  function fetchAnnouncements(q = '') {
    setLoading(true);
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    api.get(`/announcements/${params}`)
      .then(res => setAnnouncements(res.data.results ?? res.data))
      .catch(() => toast('Failed to load announcements.', { type: 'error' }))
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
    setShowForm(true);
    setExpandedId(null);
  }

  async function handleDelete(id, title) {
    if (!await confirm({ title: 'Delete announcement?', message: `"${title}" will be permanently removed.`, confirmText: 'Delete' })) return;
    try {
      await api.delete(`/announcements/${id}/`);
      toast('Announcement deleted.', { type: 'success' });
      fetchAnnouncements(activeSearch);
    } catch {
      toast('Failed to delete announcement.', { type: 'error' });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/announcements/${editId}/`, form);
        toast('Announcement updated.', { type: 'success' });
      } else {
        await api.post('/announcements/', form);
        toast('Announcement posted. Email notifications sent to relevant users.', { type: 'success' });
      }
      setShowForm(false);
      setEditId(null);
      fetchAnnouncements(activeSearch);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        toast(
          Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | '),
          { type: 'error' }
        );
      } else {
        toast('Failed to save announcement.', { type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Admin shell content (no own sidebar/wrapper) ───────────────────────
  if (isAdmin) {
    return (
      <>
        <style>{ADMIN_CSS}</style>

        <div className="page-head">
          <div className="page-head-l">
            <div className="eyebrow">Content · {announcements.length} announcements</div>
            <h2><em>Announcements</em></h2>
            <div className="sub">Broadcast messages to students, faculty, or all users. Pinned items appear first.</div>
          </div>
          <div className="actions">
            {canPost && (
              <button className="btn-pri" onClick={openCreate}>
                <i className="ti ti-plus" /> Post announcement
              </button>
            )}
          </div>
        </div>

        <div className="toolbar">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, flex: 1, maxWidth: 400 }}>
            <div className="toolbar-search">
              <i className="ti ti-search" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search announcements…"
              />
            </div>
            <button type="submit" className="btn-sec">Search</button>
            {activeSearch && (
              <button type="button" className="btn-ghost" onClick={clearSearch}>
                <i className="ti ti-x" /> Clear
              </button>
            )}
          </form>
        </div>

        {activeSearch && (
          <div className="an-search-hint">Results for "<strong>{activeSearch}</strong>"</div>
        )}

        {showForm && (
          <div className="an-form-wrap">
            <div className="an-form-head">
              <div>
                <div className="an-form-eyebrow">{editId ? 'Edit announcement' : 'New announcement'}</div>
                <div className="an-form-title">{editId ? 'Edit announcement' : 'Post new announcement'}</div>
              </div>
              <button className="btn-ghost" onClick={() => { setShowForm(false); setEditId(null); }}>
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="an-form-body">
              <div className="an-form-field">
                <label className="an-form-label">Title <small style={{ fontWeight: 400, color: 'var(--adm-faint)' }}>(max 200 chars)</small></label>
                <input
                  className="an-form-input"
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  maxLength={200}
                  required
                  placeholder="Announcement title"
                />
              </div>
              <div className="an-form-field">
                <label className="an-form-label">Body</label>
                <textarea
                  className="an-form-input"
                  style={{ minHeight: 120, resize: 'vertical' }}
                  value={form.body}
                  onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                  required
                  placeholder="Write the full announcement here…"
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="an-form-field" style={{ flex: 1, minWidth: 180 }}>
                  <label className="an-form-label">Target audience</label>
                  <select
                    className="an-form-input"
                    value={form.target_audience}
                    onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))}
                  >
                    <option value="all">All users</option>
                    <option value="student">Students only</option>
                    <option value="faculty">Faculty only</option>
                    <option value="public">Public / landing page</option>
                  </select>
                </div>
                <label className="an-form-toggle-label">
                  <input
                    type="checkbox"
                    checked={form.is_pinned}
                    onChange={e => setForm(p => ({ ...p, is_pinned: e.target.checked }))}
                  />
                  Pin to top
                </label>
              </div>
              <div className="an-form-actions">
                <button type="button" className="btn-sec" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
                <button type="submit" className="btn-pri" disabled={saving}>
                  {saving ? 'Saving…' : editId ? <><i className="ti ti-check" /> Update</> : <><i className="ti ti-send" /> Post</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="an-loading">Loading announcements…</div>
        ) : announcements.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-bell" />
            <div className="t">{activeSearch ? `No results for "${activeSearch}"` : 'No announcements yet'}</div>
            {canPost && !activeSearch && <div className="d">Post an announcement to reach students and faculty.</div>}
          </div>
        ) : (
          <div className="an-list">
            {announcements.map(ann => {
              const tm      = TARGET_META[ann.target_audience] || TARGET_META.all;
              const expanded = expandedId === ann.id;
              const canEdit  = canPost && (ann.is_mine || user?.role === 'admin');
              return (
                <div key={ann.id} className={`an-card${ann.is_pinned ? ' pinned' : ''}`}>
                  <div
                    className="an-card-head"
                    onClick={() => setExpandedId(expanded ? null : ann.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setExpandedId(expanded ? null : ann.id)}
                  >
                    <div className="an-card-info">
                      <div className="an-card-title-row">
                        {ann.is_pinned && <i className="ti ti-pin an-pin-icon" />}
                        {ann.is_new    && <span className="an-new-badge">NEW</span>}
                        <span className="an-card-title">{ann.title}</span>
                      </div>
                      <div className="an-card-meta">
                        <strong>{ann.posted_by_name}</strong>
                        <span className="an-sep">·</span>
                        {formatDate(ann.created_at)}
                        <span className="an-audience" style={{ background: tm.bg, color: tm.color }}>{tm.label}</span>
                      </div>
                    </div>
                    <div className="an-card-controls">
                      {canEdit && (
                        <>
                          <button className="btn-ghost" onClick={e => { e.stopPropagation(); openEdit(ann); }}>
                            <i className="ti ti-pencil" /> Edit
                          </button>
                          <button className="an-btn-del" onClick={e => { e.stopPropagation(); handleDelete(ann.id, ann.title); }}>
                            <i className="ti ti-trash" /> Delete
                          </button>
                        </>
                      )}
                      <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'} an-chevron`} />
                    </div>
                  </div>
                  {expanded && (
                    <div className="an-card-body">
                      <p style={{ whiteSpace: 'pre-wrap', color: 'var(--adm-ink)', lineHeight: 1.7, fontSize: 13 }}>
                        {ann.body}
                      </p>
                      {ann.updated_at !== ann.created_at && (
                        <p style={{ fontSize: 11, color: 'var(--adm-faint)', marginTop: '.75rem' }}>
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
      </>
    );
  }

  // ── Non-admin shell content (student / faculty / registrar) ────────────
  return (
    <div className="dashboard">
      {user?.role === 'admin'     && <SidebarAdmin     active="announcements" />}
      {user?.role === 'registrar' && <SidebarRegistrar active="announcements" />}
      {user?.role === 'faculty'   && <SidebarFaculty   active="announcements" />}
      {user?.role === 'student'   && <SidebarStudent   active="announcements" />}

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Announcements</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        <div style={legacyStyles.toolbar}>
          <form onSubmit={handleSearch} style={legacyStyles.searchForm}>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search announcements…"
              style={legacyStyles.searchInput}
            />
            <button type="submit" style={legacyStyles.btnSearch}>Search</button>
            {activeSearch && (
              <button type="button" onClick={clearSearch} style={legacyStyles.btnClear}>✕ Clear</button>
            )}
          </form>
          {canPost && (
            <button onClick={openCreate} style={legacyStyles.btnPost}>+ Post Announcement</button>
          )}
        </div>

        {activeSearch && (
          <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            Showing results for "<strong>{activeSearch}</strong>"
          </p>
        )}

        {showForm && (
          <div style={legacyStyles.formCard}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#1e3a5f' }}>
              {editId ? 'Edit Announcement' : 'Post New Announcement'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label style={legacyStyles.label}>Title <small style={{ color: '#6b7280' }}>(max 200 characters)</small></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  maxLength={200}
                  required
                  placeholder="Announcement title"
                  style={legacyStyles.input}
                />
              </div>
              <div className="form-group">
                <label style={legacyStyles.label}>Body</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                  required
                  rows={6}
                  placeholder="Write the full announcement here…"
                  style={{ ...legacyStyles.input, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
                  <label style={legacyStyles.label}>Target Audience</label>
                  <select
                    value={form.target_audience}
                    onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))}
                    style={{ ...legacyStyles.input, maxWidth: '100%' }}
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
                    id="is_pinned_legacy"
                    checked={form.is_pinned}
                    onChange={e => setForm(p => ({ ...p, is_pinned: e.target.checked }))}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="is_pinned_legacy" style={{ fontSize: '0.88rem', color: '#374151', cursor: 'pointer' }}>
                    Pin to top
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="submit" disabled={saving} style={legacyStyles.btnSave(saving)}>
                  {saving ? 'Saving…' : editId ? 'Update' : 'Post'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditId(null); }}
                  style={legacyStyles.btnCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading announcements…</p>
        ) : announcements.length === 0 ? (
          <div style={legacyStyles.emptyState}>
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
              const canEdit  = canPost && (ann.is_mine || user?.role === 'admin');
              return (
                <div
                  key={ann.id}
                  style={{
                    ...legacyStyles.card,
                    borderLeft: ann.is_pinned ? '4px solid #1e3a5f' : '4px solid #e5e7eb',
                  }}
                >
                  <div
                    style={legacyStyles.cardHeader}
                    onClick={() => setExpandedId(expanded ? null : ann.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setExpandedId(expanded ? null : ann.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        {ann.is_pinned && <span title="Pinned" style={{ fontSize: '0.9rem' }}>📌</span>}
                        {ann.is_new   && <span style={legacyStyles.newBadge}>NEW</span>}
                        <span style={legacyStyles.cardTitle}>{ann.title}</span>
                      </div>
                      <div style={legacyStyles.cardMeta}>
                        <strong>{ann.posted_by_name}</strong>
                        <span style={{ color: '#d1d5db' }}>·</span>
                        {formatDate(ann.created_at)}
                        <span style={{ ...legacyStyles.targetBadge, background: tm.bg, color: tm.color }}>
                          {tm.label}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      {canEdit && (
                        <>
                          <button onClick={e => { e.stopPropagation(); openEdit(ann); }} style={legacyStyles.btnEdit}>
                            Edit
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(ann.id, ann.title); }} style={legacyStyles.btnDelete}>
                            Delete
                          </button>
                        </>
                      )}
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem', userSelect: 'none' }}>
                        {expanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>
                  {expanded && (
                    <div style={legacyStyles.cardBody}>
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

/* ── Admin-context CSS ─────────────────────────────────────────────────── */
const ADMIN_CSS = `
  .an-search-hint{font-size:12px;color:var(--adm-muted);margin-bottom:.75rem}
  .an-flash{padding:10px 16px;margin-bottom:1rem;font-size:13px;cursor:pointer}
  .an-flash-ok{background:#e6f1ec;color:var(--adm-green)}
  .an-flash-err{background:#f6e8e4;color:var(--adm-red)}
  .an-loading{color:var(--adm-muted);padding:2rem 0;font-size:13px}
  .an-form-wrap{background:#fff;border:1px solid var(--adm-line);margin-bottom:1.5rem}
  .an-form-head{display:flex;justify-content:space-between;align-items:flex-start;padding:1.25rem 1.5rem;border-bottom:1px solid var(--adm-line);background:var(--adm-warm)}
  .an-form-eyebrow{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--adm-gold);font-weight:600;margin-bottom:4px}
  .an-form-title{font-size:16px;font-weight:500;color:var(--adm-ink)}
  .an-form-body{padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:.85rem}
  .an-form-field{display:flex;flex-direction:column;gap:5px}
  .an-form-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--adm-muted);font-weight:600}
  .an-form-input{padding:9px 12px;border:1px solid var(--adm-line);background:#fff;font:13px/1.4 'Inter',sans-serif;color:var(--adm-ink);outline:none;width:100%;box-sizing:border-box}
  .an-form-input:focus{border-color:var(--adm-ink)}
  .an-form-toggle-label{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--adm-ink);cursor:pointer;font-weight:500}
  .an-form-actions{display:flex;justify-content:flex-end;gap:.5rem;padding-top:.25rem;border-top:1px solid var(--adm-line-soft)}
  .an-list{display:flex;flex-direction:column;gap:0;border:1px solid var(--adm-line)}
  .an-card{background:#fff;border-bottom:1px solid var(--adm-line)}
  .an-card:last-child{border-bottom:none}
  .an-card.pinned{border-left:3px solid var(--adm-gold)}
  .an-card-head{display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;cursor:pointer;user-select:none}
  .an-card-head:hover{background:var(--adm-warm)}
  .an-card-info{flex:1;min-width:0}
  .an-card-title-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .an-pin-icon{font-size:13px;color:var(--adm-gold)}
  .an-new-badge{background:var(--adm-red);color:#fff;border-radius:3px;padding:1px 5px;font-size:9px;font-weight:700;letter-spacing:.05em}
  .an-card-title{font-size:14px;font-weight:600;color:var(--adm-ink)}
  .an-card-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--adm-muted);margin-top:3px}
  .an-sep{color:var(--adm-line)}
  .an-audience{border-radius:999px;padding:2px 8px;font-size:10px;font-weight:600}
  .an-card-controls{display:flex;align-items:center;gap:6px;flex-shrink:0}
  .an-btn-del{background:var(--adm-red-tint);color:var(--adm-red);border:1px solid #fca5a5;padding:4px 10px;font:600 11px/1 'Inter',sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
  .an-chevron{font-size:14px;color:var(--adm-faint)}
  .an-card-body{padding:.75rem 1.25rem 1rem;border-top:1px solid var(--adm-line-soft)}
`;

/* ── Legacy style-object for non-admin roles ───────────────────────────── */
const legacyStyles = {
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
