import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import AnnouncementCard, { AnnouncementOverview, AnnouncementStyles, CATEGORY_META, CATEGORY_ORDER } from '../../components/AnnouncementCard';

const EMPTY_FORM = {
  title: '', body: '', target_audience: 'all', is_pinned: false,
  category: 'general', event_date: '', event_time: '', location: '',
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  // Faculty may read announcements but not post or manage them (registrar / admin only).
  const canPost   = ['registrar', 'admin'].includes(user?.role);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);

  const [category, setCategory]     = useState('');   // overview filter ('' = all)
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [editId, setEditId]         = useState(null);
  const [saving, setSaving]         = useState(false);
  // Poster image: a newly chosen file (with a local preview), the image already
  // on the announcement being edited, and whether that one should be removed.
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [currentImage, setCurrentImage] = useState('');
  const [removeImage, setRemoveImage]   = useState(false);
  const [imageError, setImageError]     = useState('');

  function resetImage(existing = '') {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null); setImagePreview(''); setCurrentImage(existing); setRemoveImage(false); setImageError('');
  }

  function pickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { setImageError('Only JPG, PNG, or WEBP images are allowed.'); return; }
    if (file.size > MAX_IMAGE_BYTES) { setImageError('The image must be 5 MB or smaller.'); return; }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  }

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
    resetImage();
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
      category: ann.category || 'general',
      event_date: ann.event_date || '',
      event_time: (ann.event_time || '').slice(0, 5),   // "09:30:00" -> "09:30"
      location: ann.location || '',
    });
    resetImage(ann.image || '');
    setEditId(ann.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    resetImage();
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
    if (form.event_time && !form.event_date) {
      toast('Set a date as well, or clear the time.', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      // Sent as a form (not JSON) so the poster image can travel with it.
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, typeof v === 'boolean' ? String(v) : v));
      if (imageFile) fd.append('image', imageFile);
      else if (removeImage) fd.append('remove_image', 'true');
      const opts = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editId) {
        await api.patch(`/announcements/${editId}/`, fd, opts);
        toast('Announcement updated.', { type: 'success' });
      } else {
        await api.post('/announcements/', fd, opts);
        toast('Announcement posted. Email notifications sent to relevant users.', { type: 'success' });
      }
      closeForm();
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

  const shown = category ? announcements.filter(a => (a.category || 'general') === category) : announcements;

  // Shell-native content — renders cleanly inside ANY role shell (no own
  // sidebar/header). Non-admin shells are wrapped in `.ann-scope` below, which
  // supplies the --adm-* tokens the announcement styles use.
  const content = (
      <>
        <style>{ADMIN_CSS}</style>
        <AnnouncementStyles />

        <div className="page-head">
          <div className="page-head-l">
            <div className="eyebrow">Content · {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</div>
            <h2><em>Announcements</em></h2>
            <div className="sub">{canPost ? 'Broadcast messages to students, faculty, or all users. Pinned items appear first.' : 'Campus announcements. Pinned items appear first.'}</div>
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
              <button className="btn-ghost" onClick={closeForm} aria-label="Close the form">
                <i className="ti ti-x" aria-hidden="true" />
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
                  <label className="an-form-label" htmlFor="an-category">Category</label>
                  <select
                    id="an-category"
                    className="an-form-input"
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  >
                    {CATEGORY_ORDER.map(k => <option key={k} value={k}>{CATEGORY_META[k].label}</option>)}
                  </select>
                </div>
                <div className="an-form-field" style={{ flex: 1, minWidth: 180 }}>
                  <label className="an-form-label" htmlFor="an-audience">Target audience</label>
                  <select
                    id="an-audience"
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

              <fieldset className="an-form-set">
                <legend>When and where <small>(optional; shown as a date badge on the card)</small></legend>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div className="an-form-field" style={{ minWidth: 160 }}>
                    <label className="an-form-label" htmlFor="an-date">Date</label>
                    <input id="an-date" className="an-form-input" type="date" value={form.event_date}
                      onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} />
                  </div>
                  <div className="an-form-field" style={{ minWidth: 140 }}>
                    <label className="an-form-label" htmlFor="an-time">Time</label>
                    <input id="an-time" className="an-form-input" type="time" value={form.event_time}
                      onChange={e => setForm(p => ({ ...p, event_time: e.target.value }))} />
                  </div>
                  <div className="an-form-field" style={{ flex: 1, minWidth: 200 }}>
                    <label className="an-form-label" htmlFor="an-location">Place</label>
                    <input id="an-location" className="an-form-input" type="text" maxLength={150} value={form.location}
                      onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Campus gymnasium" />
                  </div>
                </div>
              </fieldset>

              <fieldset className="an-form-set">
                <legend>Poster or infographic <small>(optional; JPG, PNG, or WEBP, up to 5 MB)</small></legend>
                <div className="an-img-row">
                  {(imagePreview || (currentImage && !removeImage)) ? (
                    <img className="an-img-thumb" src={imagePreview || currentImage} alt="Preview of the selected image" />
                  ) : (
                    <div className="an-img-thumb an-img-empty" aria-hidden="true"><i className="ti ti-photo" /></div>
                  )}
                  <div className="an-img-ctrl">
                    <label className="btn-sec an-img-pick">
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickImage} style={{ display: 'none' }} aria-label="Choose a poster image" />
                      <i className="ti ti-upload" aria-hidden="true" /> {imagePreview || (currentImage && !removeImage) ? 'Replace image' : 'Choose image'}
                    </label>
                    {(imagePreview || (currentImage && !removeImage)) && (
                      <button type="button" className="btn-ghost" onClick={() => { if (imagePreview) { URL.revokeObjectURL(imagePreview); setImageFile(null); setImagePreview(''); } else { setRemoveImage(true); } }}>
                        <i className="ti ti-trash" aria-hidden="true" /> Remove image
                      </button>
                    )}
                    <p className="an-img-help">
                      {imageFile ? imageFile.name : 'Without an image, the card shows the category’s icon and color.'}
                    </p>
                    {imageError && <p className="an-img-err" role="alert">{imageError}</p>}
                  </div>
                </div>
              </fieldset>

              <div className="an-form-actions">
                <button type="button" className="btn-sec" onClick={closeForm}>Cancel</button>
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
          <>
            <AnnouncementOverview items={announcements} active={category} onChange={setCategory} />
            {shown.length === 0 ? (
              <div className="empty-state">
                <i className="ti ti-filter-off" />
                <div className="t">No {(CATEGORY_META[category]?.label || '').toLowerCase()} announcements right now</div>
              </div>
            ) : (
              <div className="anc-grid">
                {shown.map(ann => {
                  const canEdit = canPost && (ann.is_mine || user?.role === 'admin');
                  return (
                    <AnnouncementCard
                      key={ann.id} ann={ann}
                      actions={canEdit ? (
                        <>
                          <button className="btn-ghost" onClick={() => openEdit(ann)}>
                            <i className="ti ti-pencil" aria-hidden="true" /> Edit
                          </button>
                          <button className="an-btn-del" onClick={() => handleDelete(ann.id, ann.title)}>
                            <i className="ti ti-trash" aria-hidden="true" /> Delete
                          </button>
                        </>
                      ) : null}
                    />
                  );
                })}
              </div>
            )}
          </>
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
    --adm-gold:#b89043;--adm-green:#0a6b48;--adm-green-tint:#e6f4ec;--adm-red:#b91c1c;--adm-red-tint:#fde8e8;
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
  .an-btn-del{background:var(--adm-red-tint);color:var(--adm-red);border:1px solid #fca5a5;padding:6px 10px;font:600 11.5px/1 'Inter',sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
  .an-form-set{border:1px solid var(--adm-line-soft);padding:.75rem .9rem .9rem;margin:0;min-width:0}
  .an-form-set legend{font-size:12.5px;font-weight:600;color:var(--adm-ink);padding:0 .35rem}
  .an-form-set legend small{font-weight:400;color:var(--adm-muted)}
  .an-img-row{display:flex;gap:.9rem;align-items:flex-start;flex-wrap:wrap}
  .an-img-thumb{width:160px;aspect-ratio:16/9;object-fit:cover;border:1px solid var(--adm-line);background:#eef1f7;display:block}
  .an-img-empty{display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--adm-faint)}
  .an-img-ctrl{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;flex:1;min-width:200px}
  .an-img-pick{cursor:pointer}
  .an-img-pick:focus-within{outline:2px solid var(--adm-ink);outline-offset:2px}
  .an-img-help{flex-basis:100%;font-size:12px;color:var(--adm-muted);margin:0;overflow-wrap:anywhere}
  .an-img-err{flex-basis:100%;font-size:12px;color:var(--adm-red);font-weight:500;margin:0}
`;

