import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

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
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

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

  // Shell-native content — renders cleanly inside ANY role shell (no own
  // sidebar/header). Non-admin shells are wrapped in `.ann-scope` below, which
  // supplies the --adm-* tokens the announcement styles use.
  const content = (
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

  // The admin shell already defines the --adm-* tokens; every other shell needs
  // the scope wrapper to supply them so the announcement styles render correctly.
  return user?.role === 'admin'
    ? content
    : <div className="ann-scope"><style>{SCOPE_CSS}</style>{content}</div>;
}

/* Non-admin shells don't define the --adm-* tokens the announcement styles use,
   so scope them here. Shared classes (.page-head, .btn-*) adopt the host shell. */
const SCOPE_CSS = `
  .ann-scope{
    --adm-ink:#0b1b2e;--adm-ink-2:#334155;--adm-muted:#64748b;--adm-faint:#94a3b8;
    --adm-line:#e4e7ec;--adm-line-soft:#eef0f4;--adm-warm:#faf7f0;
    --adm-gold:#b8860b;--adm-green:#0a6b48;--adm-green-tint:#e6f4ec;--adm-red:#b91c1c;--adm-red-tint:#fde8e8;
  }
  .ann-scope .empty-state{text-align:center;padding:3.5rem 2rem;background:#fff;border:1px solid var(--adm-line)}
  .ann-scope .empty-state i{font-size:42px;color:var(--adm-faint);display:block;margin-bottom:.9rem}
  .ann-scope .empty-state .t{font-size:15px;font-weight:600;color:var(--adm-ink);margin-bottom:.4rem}
  .ann-scope .empty-state .d{font-size:13px;color:var(--adm-muted);max-width:340px;margin:.3rem auto 0;line-height:1.5}
`;

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

