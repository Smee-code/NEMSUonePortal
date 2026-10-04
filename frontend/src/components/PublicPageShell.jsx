import { Link, useNavigate, useLocation } from 'react-router-dom';
import ScrollMemory from './ScrollMemory';

/* Shared chrome for public sub-pages (News, Programs, Campus Life, In Focus). */
export default function PublicPageShell({ eyebrow, title, subtitle, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // "Back to home" should return you to where you were on the landing page.
  // A real back navigation (POP) lets ScrollMemory restore the scroll position;
  // if there's no in-app history to go back to, fall through to a fresh home load.
  const goHome = () => {
    if (location.key && location.key !== 'default') navigate(-1);
    else navigate('/');
  };

  return (
    <div className="pp">
      <ScrollMemory />
      <style>{CSS}</style>
      <header className="pp-top">
        <Link to="/" className="pp-brand">
          <img src="/logo.png" alt="NEMSU" />
          <span>NEMSUonePortal</span>
        </Link>
        <button type="button" className="pp-back" onClick={goHome}>
          <i className="ti ti-arrow-left" /> Back to home
        </button>
      </header>

      <div className="pp-wrap">
        <div className="pp-head">
          {eyebrow && <div className="pp-eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

const CSS = `
  .pp{min-height:100vh;background:#f4f6fb;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a1628;}
  .pp-top{display:flex;justify-content:space-between;align-items:center;padding:1rem 2rem;background:#fff;border-bottom:1px solid #e5e7eb;position:sticky;top:0;z-index:10;}
  .pp-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#0a1628;font-weight:600;font-size:15px;}
  .pp-brand img{width:34px;height:34px;border-radius:50%;object-fit:contain;}
  .pp-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#5a6478;text-decoration:none;font-weight:500;background:none;border:none;cursor:pointer;font-family:inherit;padding:0;}
  .pp-back:hover{color:#0a1628;}
  .pp-wrap{max-width:1100px;margin:0 auto;padding:2.5rem 2rem 4rem;}
  .pp-head{margin-bottom:2rem;}
  .pp-eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#b89043;font-weight:600;}
  .pp-head h1{font-size:38px;font-weight:600;letter-spacing:-.02em;margin:.5rem 0;line-height:1.1;}
  .pp-head h1 em{font-style:italic;font-family:'Instrument Serif',Georgia,serif;color:#b89043;font-weight:400;}
  .pp-head p{color:#5a6478;font-size:15px;max-width:640px;line-height:1.6;}
  .pp-empty{padding:3rem;text-align:center;color:#5a6478;background:#fff;border:1px solid #e5e7eb;}
  @media(max-width:560px){.pp-top{padding:1rem;}.pp-wrap{padding:1.5rem 1rem 3rem;}.pp-head h1{font-size:28px;}}
`;
