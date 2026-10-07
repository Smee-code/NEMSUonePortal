import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAdminShell } from '../../context/AdminShellContext';
import { useConfirm } from '../../components/ConfirmDialog';

const EMPTY = { name: '', description: '', fee: '', processing_days: '', sort_order: 0, is_active: true };

export default function AdminDocumentTypes() {
  const { toast } = useAdminShell();
  const confirm = useConfirm();

  const [types, setTypes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  function fetchTypes() {
    setLoading(true);
    api.get('/documents/admin/types/')
      .then(res => setTypes(res.data || []))
      .catch(() => toast('Failed to load the document catalog.', { type: 'error' }))
      .finally(() => setLoading(false));
  }
  useEffect(() => { fetchTypes(); }, []);

  function openAdd() { setEditId(null); setForm(EMPTY); setError(''); setShowForm(true); }
  function openEdit(t) {
    setEditId(t.id);
    setForm({ name: t.name, description: t.description || '', fee: String(t.fee ?? ''),
      processing_days: t.processing_days || '', sort_order: t.sort_order ?? 0, is_active: t.is_active });
    setError(''); setShowForm(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('A document name is required.'); return; }
    if (form.fee === '' || isNaN(Number(form.fee)) || Number(form.fee) < 0) { setError('Enter a valid fee (0 or more).'); return; }
    setSaving(true); setError('');
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      fee: Number(form.fee).toFixed(2),
      processing_days: form.processing_days.trim(),
      sort_order: Number(form.sort_order) || 0,
      is_active: !!form.is_active,
    };
    try {
      if (editId) await api.patch(`/documents/admin/types/${editId}/`, payload);
      else await api.post('/documents/admin/types/', payload);
      toast(editId ? 'Document updated.' : 'Document added to the catalog.', { type: 'success' });
      setShowForm(false);
      fetchTypes();
    } catch (err) {
      const d = err.response?.data;
      setError((d && typeof d === 'object') ? Object.values(d).flat().join(' ') : 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(t) {
    if (!await confirm({ title: `Remove “${t.name}”?`, message: 'Students will no longer be able to request this document. Existing requests are unaffected.', confirmText: 'Remove' })) return;
    try {
      await api.delete(`/documents/admin/types/${t.id}/`);
      toast('Document removed from the catalog.', { type: 'success' });
      fetchTypes();
    } catch {
      toast('Failed to remove the document.', { type: 'error' });
    }
  }

  async function toggleActive(t) {
    try {
      await api.patch(`/documents/admin/types/${t.id}/`, { is_active: !t.is_active });
      fetchTypes();
    } catch {
      toast('Failed to update availability.', { type: 'error' });
    }
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div>
          <div className="eyebrow">Services · Registrar</div>
          <h2>Document <em>catalog</em></h2>
          <div className="sub">The documents students can request from the registrar’s office. Add, edit, or hide any item here.</div>
        </div>
        <div className="actions">
          <button className="btn-pri" onClick={openAdd}><i className="ti ti-plus" /> Add document</button>
        </div>
      </div>

      {showForm && (
        <form className="dt-form" onSubmit={save}>
          <div className="dt-form-head">{editId ? 'Edit document' : 'New document'}</div>
          {error && <div className="dt-err">{error}</div>}
          <div className="dt-grid">
            <div className="dt-field" style={{ gridColumn: '1 / -1' }}>
              <label>Name</label>
              <input className="dt-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Certified True Copy" maxLength={120} />
            </div>
            <div className="dt-field" style={{ gridColumn: '1 / -1' }}>
              <label>Description <span className="dt-opt">(shown to students)</span></label>
              <input className="dt-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. A certified photocopy of a school record." maxLength={300} />
            </div>
            <div className="dt-field">
              <label>Fee (₱ per copy)</label>
              <input className="dt-input" type="text" inputMode="decimal" value={form.fee}
                onChange={e => setForm(f => ({ ...f, fee: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="e.g. 50" />
            </div>
            <div className="dt-field">
              <label>Processing time <span className="dt-opt">(working days)</span></label>
              <input className="dt-input" value={form.processing_days} onChange={e => setForm(f => ({ ...f, processing_days: e.target.value }))} placeholder="e.g. 1–2" maxLength={30} />
            </div>
            <div className="dt-field">
              <label>Sort order</label>
              <input className="dt-input" type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} min={0} />
            </div>
            <div className="dt-field dt-check">
              <label><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Available for request</label>
            </div>
          </div>
          <div className="dt-form-actions">
            <button type="button" className="btn-sec" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-pri" disabled={saving}>{saving ? 'Saving…' : editId ? 'Save changes' : 'Add document'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: 'var(--adm-muted)' }}>Loading catalog…</p>
      ) : types.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-file-text" />
          <div className="t">No documents in the catalog yet</div>
          <div className="d">Click “Add document” to create the first item students can request.</div>
        </div>
      ) : (
        <div className="dt-list">
          {types.map(t => (
            <div className={`dt-card${t.is_active ? '' : ' is-off'}`} key={t.id}>
              <div className="dt-card-main">
                <div className="dt-card-top">
                  <span className="dt-card-name">{t.name}</span>
                  {!t.is_active && <span className="dt-tag-off">Hidden</span>}
                </div>
                {t.description && <div className="dt-card-desc">{t.description}</div>}
                <div className="dt-card-meta">
                  <span><strong>₱{Number(t.fee).toFixed(2)}</strong> / copy</span>
                  {t.processing_days && <span className="dt-sep">·</span>}
                  {t.processing_days && <span>{t.processing_days} working days</span>}
                </div>
              </div>
              <div className="dt-card-actions">
                <button className="dt-ic" title={t.is_active ? 'Hide from students' : 'Make available'} onClick={() => toggleActive(t)}>
                  <i className={`ti ${t.is_active ? 'ti-eye' : 'ti-eye-off'}`} />
                </button>
                <button className="dt-ic" title="Edit" onClick={() => openEdit(t)}><i className="ti ti-pencil" /></button>
                <button className="dt-ic dt-ic--del" title="Remove" onClick={() => remove(t)}><i className="ti ti-trash" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const CSS = `
  .dt-form{background:#fff;border:1px solid var(--adm-line);border-top:3px solid var(--adm-gold,#b8860b);padding:1.25rem 1.4rem;margin-bottom:1.5rem;}
  .dt-form-head{font-size:13px;font-weight:700;color:var(--adm-ink);margin-bottom:1rem;letter-spacing:.01em;}
  .dt-err{background:#fee2e2;color:#991b1b;padding:.6rem .85rem;font-size:12.5px;margin-bottom:1rem;}
  .dt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;}
  .dt-field{display:flex;flex-direction:column;gap:5px;}
  .dt-field label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--adm-muted);font-weight:600;}
  .dt-opt{text-transform:none;letter-spacing:0;font-weight:400;color:var(--adm-faint);}
  .dt-input{padding:9px 12px;border:1px solid var(--adm-line);background:#fff;font:13px/1.4 'Inter',sans-serif;color:var(--adm-ink);outline:none;}
  .dt-input:focus{border-color:var(--adm-ink);}
  .dt-check{justify-content:flex-end;}
  .dt-check label{display:flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0;font-size:13px;color:var(--adm-ink);font-weight:500;}
  .dt-form-actions{display:flex;justify-content:flex-end;gap:.6rem;margin-top:1.1rem;}

  .dt-list{display:flex;flex-direction:column;gap:.7rem;}
  .dt-card{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;background:#fff;border:1px solid var(--adm-line);padding:1rem 1.25rem;}
  .dt-card.is-off{background:var(--adm-warm);opacity:.75;}
  .dt-card-top{display:flex;align-items:center;gap:9px;}
  .dt-card-name{font-size:15px;font-weight:600;color:var(--adm-ink);}
  .dt-tag-off{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--adm-muted);background:var(--adm-cool,#eef2f9);padding:2px 7px;}
  .dt-card-desc{font-size:12.5px;color:var(--adm-muted);margin-top:4px;line-height:1.45;max-width:640px;}
  .dt-card-meta{font-size:12.5px;color:var(--adm-ink-2);margin-top:7px;display:flex;align-items:center;gap:7px;}
  .dt-card-meta strong{color:var(--adm-ink);font-weight:600;}
  .dt-sep{color:var(--adm-faint);}
  .dt-card-actions{display:flex;gap:4px;flex-shrink:0;}
  .dt-ic{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:#fff;border:1px solid var(--adm-line);color:var(--adm-muted);cursor:pointer;font-size:15px;}
  .dt-ic:hover{border-color:var(--adm-ink);color:var(--adm-ink);}
  .dt-ic--del:hover{border-color:#e6b4b4;color:var(--adm-red,#b91c1c);}
`;
