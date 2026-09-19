import { useEffect, useState } from 'react';
import api from '../api/axios';
import PublicPageShell from '../components/PublicPageShell';

export default function CampusLifePage() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    document.title = 'Campus Life · NEMSUonePortal';
    api.get('/enrollment/public/site-content/')
      .then(r => setItems(r.data?.campus_life?.items ?? []))
      .catch(() => setItems([]));
  }, []);

  return (
    <PublicPageShell
      eyebrow="Campus life"
      title={<>Life at <em>Cantilan</em></>}
      subtitle="A campus that grows with its community — academics, student life, research, and more."
    >
      <style>{CSS}</style>
      {items === null ? (
        <div className="pp-empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="pp-empty">No campus life items yet.</div>
      ) : (
        <div className="cl-grid">
          {items.map((l, i) => (
            <div key={i} className="cl-item">
              {l.imageUrl && <img src={l.imageUrl} alt={l.title || ''} />}
              <div className="cl-meta">
                {l.tag && <div className="cl-tag">{l.tag}</div>}
                <div className="cl-title">{l.title}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PublicPageShell>
  );
}

const CSS = `
  .cl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;}
  .cl-item{position:relative;aspect-ratio:4/3;overflow:hidden;background:#eef1f7;border:1px solid #e5e7eb;}
  .cl-item img{width:100%;height:100%;object-fit:cover;display:block;}
  .cl-meta{position:absolute;inset:auto 0 0 0;padding:1rem 1.1rem;background:linear-gradient(transparent,rgba(10,22,40,.85));color:#fff;}
  .cl-tag{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#d9b96b;font-weight:600;}
  .cl-title{font-size:15px;font-weight:500;margin-top:3px;line-height:1.3;}
`;
