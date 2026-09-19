import { Link, useNavigate } from 'react-router-dom';

/* Branded 404 that offers a way forward instead of a dead end. */
export default function NotFound() {
  const nav = useNavigate();
  return (
    <div className="nf">
      <style>{CSS}</style>
      <header className="nf-top">
        <Link to="/" className="nf-brand">
          <img src="/logo.png" alt="NEMSU" />
          <span>NEMSUonePortal</span>
        </Link>
      </header>

      <main className="nf-main">
        <div className="nf-code">404</div>
        <h1>This page took an unexpected leave.</h1>
        <p>
          The page you are looking for may have been moved, renamed, or never existed.
          Let's get you back to familiar ground.
        </p>
        <div className="nf-actions">
          <Link to="/" className="nf-btn nf-btn-primary"><i className="ti ti-home" /> Back to home</Link>
          <button type="button" className="nf-btn nf-btn-ghost" onClick={() => nav(-1)}>
            <i className="ti ti-arrow-left" /> Go back
          </button>
        </div>
        <div className="nf-links">
          <span>Popular destinations:</span>
          <Link to="/programs">Programs</Link>
          <Link to="/news">News</Link>
          <Link to="/campus-life">Campus Life</Link>
          <Link to="/login">Log in</Link>
        </div>
      </main>
    </div>
  );
}

const CSS = `
  .nf{min-height:100vh;background:#f4f6fb;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a1628;display:flex;flex-direction:column;}
  .nf-top{padding:1rem 2rem;background:#fff;border-bottom:1px solid #e5e7eb;}
  .nf-brand{display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:#0a1628;font-weight:600;font-size:15px;}
  .nf-brand img{width:34px;height:34px;border-radius:50%;object-fit:contain;}
  .nf-main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:3rem 1.5rem 5rem;max-width:620px;margin:0 auto;}
  .nf-code{font-family:'Instrument Serif',Georgia,serif;font-size:120px;line-height:1;color:#0B1B2E;letter-spacing:-.03em;}
  .nf-code::after{content:"";display:block;width:64px;height:4px;background:#C79A3B;margin:1.25rem auto 0;}
  .nf-main h1{font-size:28px;font-weight:600;letter-spacing:-.02em;margin:1.75rem 0 .75rem;line-height:1.2;}
  .nf-main p{color:#5a6478;font-size:15px;line-height:1.65;margin:0 0 2rem;}
  .nf-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;}
  .nf-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 22px;font:600 14px 'Inter',sans-serif;cursor:pointer;text-decoration:none;border:1px solid transparent;clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px);}
  .nf-btn-primary{background:#0B1B2E;color:#fff;}
  .nf-btn-primary:hover{background:#13263d;}
  .nf-btn-ghost{background:#fff;color:#0a1628;border-color:#d5dae3;}
  .nf-btn-ghost:hover{border-color:#0B1B2E;}
  .nf-links{margin-top:2.5rem;display:flex;gap:14px;flex-wrap:wrap;justify-content:center;align-items:center;font-size:13px;}
  .nf-links span{color:#8a92a3;}
  .nf-links a{color:#5a6478;text-decoration:none;font-weight:500;}
  .nf-links a:hover{color:#C79A3B;}
  @media(max-width:560px){.nf-code{font-size:88px;}.nf-main h1{font-size:23px;}}
`;
