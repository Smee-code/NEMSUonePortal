import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';

/* Schema describing each editable section and its fields. */
const SECTIONS = [
  { key: 'hero', label: 'Hero (top banner)', fields: [
    { name: 'imageUrl', type: 'image', label: 'Background image (optional — leave empty for the gradient)' },
  ] },
  { key: 'in_focus', label: 'In Focus (Spotlight)', fields: [
    { name: 'tag', type: 'text', label: 'Tag' },
    { name: 'title', type: 'text', label: 'Title' },
    { name: 'body', type: 'textarea', label: 'Body' },
    { name: 'category', type: 'text', label: 'Category' },
    { name: 'byline', type: 'text', label: 'Byline' },
    { name: 'date', type: 'text', label: 'Date label' },
    { name: 'imageUrl', type: 'image', label: 'Image' },
  ] },
  { key: 'about', label: 'About the Campus', fields: [
    { name: 'eyebrow', type: 'text', label: 'Eyebrow' },
    { name: 'heading', type: 'text', label: 'Heading' },
    { name: 'paragraphs', type: 'stringlist', label: 'Paragraphs' },
    { name: 'badge_label', type: 'text', label: 'Badge label' },
    { name: 'badge_value', type: 'text', label: 'Badge value' },
    { name: 'imageUrl', type: 'image', label: 'Image' },
    { name: 'pillars', type: 'objlist', label: 'Pillars',
      item: [{ name: 'num', label: 'No.' }, { name: 'title', label: 'Title' }, { name: 'desc', label: 'Description' }] },
  ] },
  { key: 'stats', label: 'By the Numbers', fields: [
    { name: 'eyebrow', type: 'text', label: 'Eyebrow' },
    { name: 'heading', type: 'text', label: 'Heading' },
    { name: 'items', type: 'objlist', label: 'Stats',
      item: [{ name: 'num', label: 'Number' }, { name: 'suffix', label: 'Suffix' }, { name: 'lbl', label: 'Label' }, { name: 'desc', label: 'Description' }] },
  ] },
  { key: 'purpose', label: 'Our Purpose · Vision · Mission', fields: [
    { name: 'eyebrow', type: 'text', label: 'Eyebrow' },
    { name: 'heading', type: 'text', label: 'Section heading' },
    { name: 'vision_title', type: 'text', label: 'Vision title' },
    { name: 'vision_text', type: 'textarea', label: 'Vision text' },
    { name: 'mission_title', type: 'text', label: 'Mission title' },
    { name: 'mission_text', type: 'textarea', label: 'Mission text' },
  ] },
  { key: 'programs_intro', label: 'Academic Programs (heading only)', fields: [
    { name: 'eyebrow', type: 'text', label: 'Eyebrow' },
    { name: 'heading', type: 'text', label: 'Heading' },
  ] },
  { key: 'campus_life', label: 'Campus Life', fields: [
    { name: 'eyebrow', type: 'text', label: 'Eyebrow' },
    { name: 'heading', type: 'text', label: 'Heading' },
    { name: 'items', type: 'objlist', label: 'Items',
      item: [{ name: 'tag', label: 'Tag' }, { name: 'title', label: 'Title' }, { name: 'images', label: 'Images', type: 'images' }] },
  ] },
  { key: 'facilities', label: 'Campus Facilities', fields: [
    { name: 'eyebrow', type: 'text', label: 'Eyebrow' },
    { name: 'heading', type: 'text', label: 'Heading' },
    { name: 'items', type: 'objlist', label: 'Facilities',
      item: [{ name: 'icon', label: 'Icon (tabler, e.g. ti-books)' }, { name: 'name', label: 'Name' }, { name: 'desc', label: 'Description' }] },
  ] },
  { key: 'news', label: 'News & Updates', fields: [
    { name: 'eyebrow', type: 'text', label: 'Eyebrow' },
    { name: 'heading', type: 'text', label: 'Heading' },
    { name: 'items', type: 'objlist', label: 'Articles',
      item: [{ name: 'day', label: 'Day' }, { name: 'my', label: 'Month/Year' }, { name: 'tag', label: 'Tag' }, { name: 'title', label: 'Title' }, { name: 'body', label: 'Body', type: 'textarea' }, { name: 'imageUrl', label: 'Image', type: 'image' }] },
  ] },
];

async function uploadImage(file) {
  const form = new FormData();
  form.append('file', file);
  const r = await api.post('/enrollment/admin/site-content/upload-image/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return r.data.url;
}

function ImageField({ value, onChange }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function pick(e) {
    const f = e.target.files?.[0]; if (e.target) e.target.value = '';
    if (!f) return;
    setBusy(true); setErr('');
    try { onChange(await uploadImage(f)); }
    catch (er) { setErr(er.response?.data?.error || 'Upload failed.'); }
    finally { setBusy(false); }
  }
  return (
    <div className="sc-img">
      {value ? <img src={value} alt="" className="sc-img-prev" /> : <div className="sc-img-none">No image</div>}
      <div className="sc-img-actions">
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick} />
        <button type="button" className="btn-sec" onClick={() => ref.current?.click()} disabled={busy}>
          <i className="ti ti-upload" /> {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
        </button>
        {value && <button type="button" className="btn-ghost" onClick={() => onChange('')}>Remove</button>}
      </div>
      <input className="sc-input" placeholder="…or paste an image URL" value={value || ''} onChange={e => onChange(e.target.value)} />
      {err && <div className="sc-err">{err}</div>}
    </div>
  );
}

function MultiImageField({ value, onChange }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const arr = Array.isArray(value) ? value : (value ? [value] : []);
  async function pick(e) {
    const files = Array.from(e.target.files || []); if (e.target) e.target.value = '';
    if (!files.length) return;
    setBusy(true); setErr('');
    try {
      const urls = [];
      for (const f of files) urls.push(await uploadImage(f));
      onChange([...arr, ...urls]);
    } catch (er) { setErr(er.response?.data?.error || 'Upload failed.'); }
    finally { setBusy(false); }
  }
  const removeAt = i => onChange(arr.filter((_, j) => j !== i));
  const makeCover = i => { const n = [...arr]; const [m] = n.splice(i, 1); onChange([m, ...n]); };
  return (
    <div className="sc-mimg">
      {arr.length > 0 ? (
        <div className="sc-mimg-grid">
          {arr.map((url, i) => (
            <div key={i} className="sc-mimg-cell">
              <img src={url} alt="" className="sc-mimg-thumb" />
              {i === 0 && <span className="sc-mimg-cover">Cover</span>}
              <div className="sc-mimg-cellactions">
                {i !== 0 && <button type="button" className="sc-mimg-btn" title="Make cover" onClick={() => makeCover(i)}><i className="ti ti-star" /></button>}
                <button type="button" className="sc-mimg-btn sc-mimg-del" title="Remove" onClick={() => removeAt(i)}><i className="ti ti-x" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="sc-img-none">No images yet</div>}
      <div className="sc-img-actions">
        <input ref={ref} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={pick} />
        <button type="button" className="btn-sec" onClick={() => ref.current?.click()} disabled={busy}>
          <i className="ti ti-upload" /> {busy ? 'Uploading…' : 'Add images'}
        </button>
        <span className="sc-mimg-hint">First image is the tile cover · you can add several at once</span>
      </div>
      {err && <div className="sc-err">{err}</div>}
    </div>
  );
}

function Field({ def, value, onChange }) {
  if (def.type === 'textarea') {
    return <textarea className="sc-input" rows={3} value={value || ''} onChange={e => onChange(e.target.value)} />;
  }
  if (def.type === 'image') {
    return <ImageField value={value} onChange={onChange} />;
  }
  if (def.type === 'images') {
    return <MultiImageField value={value} onChange={onChange} />;
  }
  if (def.type === 'stringlist') {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className="sc-list">
        {arr.map((v, i) => (
          <div key={i} className="sc-list-row">
            <textarea className="sc-input" rows={2} value={v} onChange={e => { const n = [...arr]; n[i] = e.target.value; onChange(n); }} />
            <button type="button" className="sc-x" onClick={() => onChange(arr.filter((_, j) => j !== i))}><i className="ti ti-x" /></button>
          </div>
        ))}
        <button type="button" className="btn-sec sc-add" onClick={() => onChange([...arr, ''])}><i className="ti ti-plus" /> Add</button>
      </div>
    );
  }
  if (def.type === 'objlist') {
    const arr = Array.isArray(value) ? value : [];
    const upd = (i, k, v) => { const n = arr.map((o, j) => j === i ? { ...o, [k]: v } : o); onChange(n); };
    return (
      <div className="sc-list">
        {arr.map((o, i) => (
          <div key={i} className="sc-objcard">
            <div className="sc-objcard-head">Item {i + 1}<button type="button" className="sc-x" onClick={() => onChange(arr.filter((_, j) => j !== i))}><i className="ti ti-trash" /></button></div>
            {def.item.map(sub => (
              <div key={sub.name} className="sc-subfield">
                <label className="sc-sublabel">{sub.label}</label>
                {sub.type === 'images'
                  ? <MultiImageField value={o[sub.name]} onChange={v => upd(i, sub.name, v)} />
                  : sub.type === 'image'
                  ? <ImageField value={o[sub.name]} onChange={v => upd(i, sub.name, v)} />
                  : sub.type === 'textarea'
                    ? <textarea className="sc-input" rows={2} value={o[sub.name] || ''} onChange={e => upd(i, sub.name, e.target.value)} />
                    : <input className="sc-input" value={o[sub.name] ?? ''} onChange={e => upd(i, sub.name, e.target.value)} />}
              </div>
            ))}
          </div>
        ))}
        <button type="button" className="btn-sec sc-add" onClick={() => onChange([...arr, Object.fromEntries(def.item.map(s => [s.name, s.type === 'images' ? [] : '']))])}><i className="ti ti-plus" /> Add item</button>
      </div>
    );
  }
  return <input className="sc-input" value={value ?? ''} onChange={e => onChange(e.target.value)} />;
}

export default function AdminSiteContent() {
  const toast = useToast();
  const [content, setContent] = useState(null);
  const [open, setOpen] = useState('hero');
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    api.get('/enrollment/admin/site-content/').then(r => setContent(r.data)).catch(() => toast('Failed to load content.', { type: 'error' }));
  }, []);

  function setField(key, field, val) {
    setContent(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
  }

  async function save(key) {
    setSaving(key);
    try {
      await api.patch(`/enrollment/admin/site-content/${key}/`, { data: content[key] });
      toast(`${SECTIONS.find(s => s.key === key)?.label} saved.`, { type: 'success' });
    } catch {
      toast('Failed to save. Please try again.', { type: 'error' });
    } finally { setSaving(null); }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">System · Landing page</div>
          <h2>Landing <em>content</em></h2>
          <div className="sub">Edit the content of each section on the public landing page. Changes go live for all visitors once you save that section.</div>
        </div>
      </div>

      {!content ? (
        <div className="sc-loading">Loading…</div>
      ) : (
        <div className="sc-sections">
          {SECTIONS.map(sec => {
            const isOpen = open === sec.key;
            return (
              <div key={sec.key} className="sc-section">
                <button className="sc-section-head" onClick={() => setOpen(isOpen ? '' : sec.key)}>
                  <span>{sec.label}</span>
                  <i className={`ti ti-chevron-${isOpen ? 'up' : 'down'}`} />
                </button>
                {isOpen && (
                  <div className="sc-section-body">
                    {sec.fields.map(f => (
                      <div key={f.name} className="sc-field">
                        <label className="sc-label">{f.label}</label>
                        <Field def={f} value={content[sec.key]?.[f.name]} onChange={v => setField(sec.key, f.name, v)} />
                      </div>
                    ))}
                    <div className="sc-save-row">
                      <button className="btn-pri" onClick={() => save(sec.key)} disabled={saving === sec.key}>
                        {saving === sec.key ? 'Saving…' : <><i className="ti ti-check" /> Save {sec.label}</>}
                      </button>
                    </div>
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
  .sc-flash{padding:10px 16px;margin-bottom:1rem;font-size:13px;display:flex;justify-content:space-between;align-items:center;gap:12px}
  .sc-ok{background:var(--adm-green-tint,#e6f1ec);color:var(--adm-green,#0a7c52)}
  .sc-bad{background:var(--adm-red-tint,#f6e8e4);color:var(--adm-red,#a8331e)}
  .sc-flash button{background:none;border:none;cursor:pointer;color:inherit}
  .sc-loading{padding:2rem;color:var(--adm-muted);font-size:13px}
  .sc-sections{display:flex;flex-direction:column;gap:.75rem}
  .sc-section{background:#fff;border:1px solid var(--adm-line)}
  .sc-section-head{width:100%;display:flex;justify-content:space-between;align-items:center;padding:1rem 1.25rem;background:none;border:none;cursor:pointer;font:600 14px 'Inter',sans-serif;color:var(--adm-ink);font-family:inherit}
  .sc-section-head:hover{background:var(--adm-warm)}
  .sc-section-body{padding:1.25rem;border-top:1px solid var(--adm-line-soft);display:flex;flex-direction:column;gap:1rem}
  .sc-field{display:flex;flex-direction:column;gap:5px}
  .sc-label{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--adm-faint);font-weight:600}
  .sc-input{width:100%;border:1px solid var(--adm-line);padding:8px 11px;font:13px 'Inter',sans-serif;box-sizing:border-box;outline:none;color:var(--adm-ink)}
  .sc-input:focus{border-color:var(--adm-gold,#b89043)}
  .sc-list{display:flex;flex-direction:column;gap:8px}
  .sc-list-row{display:flex;gap:8px;align-items:flex-start}
  .sc-objcard{border:1px solid var(--adm-line);padding:12px;display:flex;flex-direction:column;gap:8px;background:var(--adm-warm)}
  .sc-objcard-head{display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:var(--adm-muted);text-transform:uppercase;letter-spacing:.08em}
  .sc-subfield{display:flex;flex-direction:column;gap:3px}
  .sc-sublabel{font-size:10px;color:var(--adm-faint);text-transform:uppercase;letter-spacing:.06em}
  .sc-x{background:none;border:none;cursor:pointer;color:var(--adm-faint);flex-shrink:0}
  .sc-x:hover{color:var(--adm-red,#a8331e)}
  .sc-add{align-self:flex-start}
  .sc-save-row{display:flex;justify-content:flex-end;padding-top:.5rem;border-top:1px solid var(--adm-line-soft)}
  .sc-img{display:flex;flex-direction:column;gap:8px}
  .sc-img-prev{max-width:220px;max-height:120px;object-fit:cover;border:1px solid var(--adm-line)}
  .sc-img-none{width:220px;height:70px;display:flex;align-items:center;justify-content:center;background:var(--adm-cool,#f4f6fa);color:var(--adm-faint);font-size:12px;border:1px dashed var(--adm-line)}
  .sc-img-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .sc-err{color:var(--adm-red,#a8331e);font-size:12px}
  .sc-mimg{display:flex;flex-direction:column;gap:10px}
  .sc-mimg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}
  .sc-mimg-cell{position:relative;border:1px solid var(--adm-line);overflow:hidden;aspect-ratio:4/3;background:var(--adm-cool,#f4f6fa)}
  .sc-mimg-thumb{width:100%;height:100%;object-fit:cover;display:block}
  .sc-mimg-cover{position:absolute;left:5px;top:5px;background:var(--adm-gold,#b89043);color:#fff;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 6px}
  .sc-mimg-cellactions{position:absolute;right:4px;top:4px;display:flex;gap:4px}
  .sc-mimg-btn{width:24px;height:24px;border:none;background:rgba(15,20,30,.62);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;padding:0}
  .sc-mimg-btn:hover{background:rgba(15,20,30,.85)}
  .sc-mimg-del:hover{background:var(--adm-red,#a8331e)}
  .sc-mimg-hint{font-size:11px;color:var(--adm-faint)}
`;
