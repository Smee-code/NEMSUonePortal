import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { PageLoader } from '../components/Spinner';
import ScrollMemory from '../components/ScrollMemory';

function fmtDate(n) {
  if (!n?.my) return '';
  const [mon, yr] = n.my.split(' ');
  return `${mon} ${n.day}, ${yr}`;
}

export default function NewsPage() {
  const [items, setItems] = useState(null);
  const [heading, setHeading] = useState('News & updates');
  const [active, setActive] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Return to the previous scroll position on the landing page (a real back
  // navigation lets ScrollMemory restore it); fall back to a fresh home load.
  const goHome = () => {
    if (location.key && location.key !== 'default') navigate(-1);
    else navigate('/');
  };

  useEffect(() => {
    document.title = 'News · NEMSUonePortal';
    api.get('/enrollment/public/site-content/')
      .then(r => {
        setItems(r.data?.news?.items ?? []);
        if (r.data?.news?.eyebrow) setHeading(r.data.news.eyebrow);
      })
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setActive(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="np">
      <ScrollMemory />
      <style>{CSS}</style>

      <header className="np-top">
        <Link to="/" className="np-brand">
          <img src="/logo.png" alt="NEMSU" />
          <span>NEMSUonePortal</span>
        </Link>
        <button type="button" className="np-back" onClick={goHome}>
          <i className="ti ti-arrow-left" /> Back to home
        </button>
      </header>

      <div className="np-wrap">
        <div className="np-head">
          <div className="np-eyebrow">{heading}</div>
          <h1>All news &amp; updates</h1>
          <p>Announcements, bulletins, and stories from NEMSU Cantilan Campus.</p>
        </div>

        {items === null ? (
          <PageLoader label="Loading news…" />
        ) : items.length === 0 ? (
          <div className="np-empty">No news posted yet.</div>
        ) : (
          <div className="np-grid">
            {items.map((n, i) => (
              <button key={i} type="button" className="np-card" onClick={() => setActive(n)}>
                {(n.imageUrl) && <div className="np-card-img"><img src={n.imageUrl} alt={n.title} /></div>}
                <div className="np-card-body">
                  <div className="np-card-tag">{n.tag}</div>
                  <div className="np-card-date">{fmtDate(n)}</div>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                  <span className="np-read">Read more <i className="ti ti-arrow-right" /></span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {active && (
        <div className="np-modal-back" onClick={() => setActive(null)}>
          <div className="np-modal" onClick={e => e.stopPropagation()}>
            <button className="np-modal-x" onClick={() => setActive(null)} aria-label="Close"><i className="ti ti-x" /></button>
            {active.imageUrl && <div className="np-modal-img"><img src={active.imageUrl} alt={active.title} /></div>}
            <div className="np-modal-body">
              <div className="np-card-tag">{active.tag} · {fmtDate(active)}</div>
              <h2>{active.title}</h2>
              <p>{active.body}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
  .np{min-height:100vh;background:#f4f6fb;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a1628;}
  .np-top{display:flex;justify-content:space-between;align-items:center;padding:1rem 2rem;background:#fff;border-bottom:1px solid #e5e7eb;position:sticky;top:0;z-index:10;}
  .np-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#0a1628;font-weight:600;font-size:15px;}
  .np-brand img{width:34px;height:34px;border-radius:50%;object-fit:contain;}
  .np-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#5a6478;text-decoration:none;font-weight:500;background:none;border:none;cursor:pointer;font-family:inherit;padding:0;}
  .np-back:hover{color:#0a1628;}
  .np-wrap{max-width:1100px;margin:0 auto;padding:2.5rem 2rem 4rem;}
  .np-head{margin-bottom:2rem;}
  .np-eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#b89043;font-weight:600;}
  .np-head h1{font-size:38px;font-weight:600;letter-spacing:-.02em;margin:.5rem 0;}
  .np-head p{color:#5a6478;font-size:15px;}
  .np-empty{padding:3rem;text-align:center;color:#5a6478;background:#fff;border:1px solid #e5e7eb;}
  .np-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));gap:1.25rem;}
  .np-card{background:#fff;border:1px solid #e5e7eb;text-align:left;font-family:inherit;cursor:pointer;padding:0;display:flex;flex-direction:column;width:100%;transition:border-color .15s,box-shadow .15s;}
  .np-card:hover{border-color:#b89043;box-shadow:0 8px 24px -14px rgba(10,22,40,.3);}
  .np-card-img{aspect-ratio:16/9;overflow:hidden;background:#eef1f7;}
  .np-card-img img{width:100%;height:100%;object-fit:cover;display:block;}
  .np-card-body{padding:1.25rem;display:flex;flex-direction:column;gap:6px;}
  .np-card-tag{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#b89043;font-weight:600;}
  .np-card-date{font-size:12px;color:#8a93a3;}
  .np-card-body h3{font-size:17px;font-weight:600;line-height:1.3;color:#0a1628;}
  .np-card-body p{font-size:13px;color:#5a6478;line-height:1.6;}
  .np-read{font-size:12px;font-weight:600;color:#0a1628;display:inline-flex;align-items:center;gap:6px;margin-top:4px;}
  .np-modal-back{position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(6px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1.5rem;overflow-y:auto;}
  .np-modal{background:#fff;max-width:640px;width:100%;position:relative;max-height:calc(100vh - 3rem);overflow-y:auto;}
  .np-modal-x{position:absolute;top:12px;right:12px;width:36px;height:36px;border:none;background:rgba(255,255,255,.9);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;}
  .np-modal-img{aspect-ratio:16/9;overflow:hidden;background:#eef1f7;}
  .np-modal-img img{width:100%;height:100%;object-fit:cover;display:block;}
  .np-modal-body{padding:1.75rem 2rem 2rem;}
  .np-modal-body h2{font-size:26px;font-weight:600;line-height:1.2;margin:.5rem 0 1rem;letter-spacing:-.01em;}
  .np-modal-body p{font-size:15px;line-height:1.75;color:#5a6478;}
  @media(max-width:560px){.np-top{padding:1rem;}.np-wrap{padding:1.5rem 1rem 3rem;}.np-head h1{font-size:28px;}}
`;
