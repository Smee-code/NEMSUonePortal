import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useAdminShell } from '../../context/AdminShellContext';
import { useConfirm } from '../../components/ConfirmDialog';

const EMPTY_FORM = { title: '', body: '', target_audience: 'public', is_pinned: false };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default function AdminSpotlight() {
  const { user } = useAuth();
  const { toast } = useAdminShell();
  const confirm = useConfirm();

  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');

  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  function fetchItems() {
    setLoading(true);
    setError('');
    api.get('/announcements/')
      .then(res => {
        const all = res.data.results ?? res.data;
        setItems(all.filter(a => a.target_audience === 'public'));
      })
      .catch(() => setError('Failed to load spotlight items.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchItems(); }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(item) {
    setForm({
      title: item.title,
      body: item.body,
      target_audience: 'public',
      is_pinned: item.is_pinned,
    });
    setEditId(item.id);
    setFormError('');
    setShowForm(true);
    setExpandedId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editId) {
        await api.patch(`/announcements/${editId}/`, form);
        toast('Spotlight item updated.', { type: 'success' });
      } else {
        await api.post('/announcements/', form);
        toast('Spotlight item posted.', { type: 'success' });
      }
      setShowForm(false);
      setEditId(null);
      fetchItems();
    } catch (err) {
      const data = err.response?.data;
      setFormError(
        data && typeof data === 'object'
          ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
          : 'Failed to save spotlight item.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, title) {
    if (!await confirm({ title: 'Delete spotlight item?', message: `"${title}" will be permanently removed.`, confirmText: 'Delete' })) return;
    setDeletingId(id);
    try {
      await api.delete(`/announcements/${id}/`);
      toast('Spotlight item deleted.', { type: 'success' });
      fetchItems();
    } catch {
      setError('Failed to delete spotlight item.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">Content · {items.length} items</div>
          <h2>Campus <em>spotlight</em></h2>
          <div className="sub">Manage public-facing posts that appear on the landing page for prospective students and visitors.</div>
        </div>
        <div className="actions">
          <button className="btn-pri" onClick={openCreate}>
            <i className="ti ti-plus" /> New spotlight
          </button>
        </div>
      </div>

      {error && <div className="sp-flash sp-flash-err" onClick={() => setError('')}>{error}</div>}

      {showForm && (
        <div className="sp-form-wrap">
          <div className="sp-form-head">
            <div>
              <div className="sp-form-eyebrow">{editId ? 'Edit item' : 'New item'}</div>
              <div className="sp-form-title">{editId ? 'Edit spotlight item' : 'Create spotlight item'}</div>
            </div>
            <button className="btn-ghost" onClick={() => { setShowForm(false); setEditId(null); }}>
              <i className="ti ti-x" />
            </button>
          </div>
          {formError && <div className="sp-flash sp-flash-err" style={{ margin: '0 1.5rem .75rem' }}>{formError}</div>}
          <form onSubmit={handleSubmit} className="sp-form-body">
            <div className="sp-form-field">
              <label className="sp-form-label">Title <small style={{ fontWeight: 400, color: 'var(--adm-faint)' }}>(max 200 chars)</small></label>
              <input
                className="sp-form-input"
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                maxLength={200}
                required
                placeholder="Spotlight title"
              />
            </div>
            <div className="sp-form-field">
              <label className="sp-form-label">Body</label>
              <textarea
                className="sp-form-input"
                style={{ minHeight: 120, resize: 'vertical' }}
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                required
                placeholder="Write the spotlight content here…"
              />
            </div>
            <div className="sp-form-toggle-row">
              <label className="sp-form-toggle-label">
                <input
                  type="checkbox"
                  checked={form.is_pinned}
                  onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))}
                />
                Pin to top
              </label>
              <span style={{ fontSize: 11, color: 'var(--adm-faint)' }}>Pinned items appear first on the landing page.</span>
            </div>
            <div className="sp-form-actions">
              <button type="button" className="btn-sec" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
              <button type="submit" className="btn-pri" disabled={saving}>
                {saving ? 'Saving…' : editId ? <><i className="ti ti-check" /> Save changes</> : <><i className="ti ti-plus" /> Post spotlight</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="sp-loading">Loading spotlight items…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-news" />
          <div className="t">No spotlight items yet</div>
          <div className="d">Create your first item to feature campus news and events on the landing page.</div>
        </div>
      ) : (
        <div className="sp-list">
          {items.map(item => {
            const expanded = expandedId === item.id;
            return (
              <div key={item.id} className={`sp-card${item.is_pinned ? ' pinned' : ''}`}>
                <div
                  className="sp-card-head"
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setExpandedId(expanded ? null : item.id)}
                >
                  <div className="sp-card-avatar">
                    {item.is_pinned
                      ? <i className="ti ti-pin" style={{ fontSize: 14 }} />
                      : <span>{initials(item.posted_by_name)}</span>
                    }
                  </div>
                  <div className="sp-card-meta">
                    <div className="sp-card-title">{item.title}</div>
                    <div className="sp-card-sub">
                      <strong>{item.posted_by_name}</strong>
                      <span style={{ color: 'var(--adm-line)' }}>·</span>
                      {formatDate(item.created_at)}
                      {item.is_pinned && <span className="tag success" style={{ fontSize: 9 }}>Pinned</span>}
                    </div>
                  </div>
                  <div className="sp-card-actions">
                    <button
                      className="btn-sec"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={e => { e.stopPropagation(); openEdit(item); }}
                    >
                      <i className="ti ti-pencil" /> Edit
                    </button>
                    <button
                      className="sp-btn-delete"
                      disabled={deletingId === item.id}
                      onClick={e => { e.stopPropagation(); handleDelete(item.id, item.title); }}
                    >
                      <i className="ti ti-trash" /> {deletingId === item.id ? '…' : 'Delete'}
                    </button>
                    <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'} sp-chevron`} />
                  </div>
                </div>

                {expanded && (
                  <div className="sp-card-body">
                    <p style={{ whiteSpace: 'pre-wrap', color: 'var(--adm-ink)', lineHeight: 1.7, fontSize: 13 }}>
                      {item.body}
                    </p>
                    {item.updated_at !== item.created_at && (
                      <p style={{ fontSize: 11, color: 'var(--adm-faint)', marginTop: '.75rem' }}>
                        Last updated: {new Date(item.updated_at).toLocaleString('en-PH')}
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

const CSS = `
  .sp-flash{padding:10px 16px;margin-bottom:1rem;font-size:13px;cursor:pointer}
  .sp-flash-err{background:#f6e8e4;color:var(--adm-red)}
  .sp-loading{color:var(--adm-muted);padding:2rem 0;font-size:13px}
  .sp-form-wrap{background:#fff;border:1px solid var(--adm-line);margin-bottom:1.5rem}
  .sp-form-head{display:flex;justify-content:space-between;align-items:flex-start;padding:1.25rem 1.5rem;border-bottom:1px solid var(--adm-line);background:var(--adm-warm)}
  .sp-form-eyebrow{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--adm-gold);font-weight:600;margin-bottom:4px}
  .sp-form-title{font-size:16px;font-weight:500;color:var(--adm-ink)}
  .sp-form-body{padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:.85rem}
  .sp-form-field{display:flex;flex-direction:column;gap:5px}
  .sp-form-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--adm-muted);font-weight:600}
  .sp-form-input{padding:9px 12px;border:1px solid var(--adm-line);background:#fff;font:13px/1.4 'Inter',sans-serif;color:var(--adm-ink);outline:none;width:100%;box-sizing:border-box}
  .sp-form-input:focus{border-color:var(--adm-ink)}
  .sp-form-toggle-row{display:flex;align-items:center;gap:.75rem;padding:.25rem 0}
  .sp-form-toggle-label{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--adm-ink);cursor:pointer;font-weight:500}
  .sp-form-actions{display:flex;justify-content:flex-end;gap:.5rem;padding-top:.25rem;border-top:1px solid var(--adm-line-soft)}
  .sp-list{display:flex;flex-direction:column;gap:0;border:1px solid var(--adm-line)}
  .sp-card{background:#fff;border-bottom:1px solid var(--adm-line);transition:background .15s}
  .sp-card:last-child{border-bottom:none}
  .sp-card.pinned{border-left:3px solid var(--adm-gold)}
  .sp-card-head{display:flex;align-items:center;gap:12px;padding:1rem 1.25rem;cursor:pointer;user-select:none}
  .sp-card-head:hover{background:var(--adm-warm)}
  .sp-card-avatar{width:36px;height:36px;background:var(--adm-ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0;letter-spacing:.04em}
  .sp-card.pinned .sp-card-avatar{background:var(--adm-gold)}
  .sp-card-meta{flex:1;min-width:0}
  .sp-card-title{font-size:14px;font-weight:600;color:var(--adm-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sp-card-sub{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--adm-muted);margin-top:2px;flex-wrap:wrap}
  .sp-card-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
  .sp-btn-delete{background:var(--adm-red-tint);color:var(--adm-red);border:1px solid #fca5a5;padding:4px 10px;font:600 11px/1 'Inter',sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
  .sp-btn-delete:disabled{opacity:.5;cursor:not-allowed}
  .sp-chevron{font-size:14px;color:var(--adm-faint)}
  .sp-card-body{padding:.75rem 1.25rem 1rem;border-top:1px solid var(--adm-line-soft)}
`;
