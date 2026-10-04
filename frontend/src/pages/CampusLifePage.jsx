import { useEffect, useState } from 'react';
import api from '../api/axios';
import PublicPageShell from '../components/PublicPageShell';
import Lightbox from '../components/Lightbox';
import { PageLoader } from '../components/Spinner';

function itemImages(l) {
  if (Array.isArray(l.images) && l.images.length) return l.images.filter(Boolean);
  if (l.imageUrl) return [l.imageUrl];
  return [];
}

export default function CampusLifePage() {
  const [items, setItems] = useState(null);
  const [box, setBox] = useState(null); // { images, title }

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
      subtitle="A campus that grows with its community: academics, student life, research, and more."
    >
      <style>{CSS}</style>
      {items === null ? (
        <PageLoader label="Loading campus life…" />
      ) : items.length === 0 ? (
        <div className="pp-empty">No campus life items yet.</div>
      ) : (
        <div className="cl-grid">
          {items.map((l, i) => {
            const imgs = itemImages(l);
            const cover = imgs[0];
            return (
              <button
                key={i}
                type="button"
                className="cl-item"
                onClick={() => imgs.length ? setBox({ images: imgs, title: l.title }) : null}
              >
                {cover
                  ? <img src={cover} alt={l.title || ''} />
                  : <div className="cl-noimg"><i className="ti ti-photo-off" /></div>}
                {imgs.length > 1 && <span className="cl-count"><i className="ti ti-photo" /> {imgs.length}</span>}
                <div className="cl-meta">
                  {l.tag && <div className="cl-tag">{l.tag}</div>}
                  <div className="cl-title">{l.title}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {box && <Lightbox images={box.images} title={box.title} onClose={() => setBox(null)} />}
    </PublicPageShell>
  );
}

const CSS = `
  .cl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr));gap:1.25rem;}
  .cl-item{position:relative;aspect-ratio:4/3;overflow:hidden;background:#eef1f7;border:1px solid #e5e7eb;padding:0;cursor:pointer;text-align:left;font-family:inherit;color:#fff;display:block;width:100%;}
  .cl-item img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s ease;}
  .cl-item:hover img{transform:scale(1.04);}
  .cl-noimg{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#aeb6c4;font-size:28px;}
  .cl-count{position:absolute;top:.75rem;right:.75rem;z-index:2;display:inline-flex;align-items:center;gap:5px;background:rgba(10,22,40,.62);color:#fff;font-size:11px;font-weight:600;padding:4px 9px;border-radius:999px;backdrop-filter:blur(4px);}
  .cl-meta{position:absolute;inset:auto 0 0 0;padding:1rem 1.1rem;background:linear-gradient(transparent,rgba(10,22,40,.85));color:#fff;z-index:2;}
  .cl-tag{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#d9b96b;font-weight:600;}
  .cl-title{font-size:15px;font-weight:500;margin-top:3px;line-height:1.3;}
`;
