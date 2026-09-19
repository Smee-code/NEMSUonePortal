import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const KEY = 'nemsu.cookieConsent.v1';
const COOKIE = 'nemsu_cookie_consent';

/* Remember the dismissal in BOTH a first-party cookie and localStorage, and
   treat it as accepted if either is present. A cookie persists reliably even
   when localStorage is cleared, partitioned, or blocked (private windows,
   strict-privacy modes), so the notice stays dismissed across visits. */
function hasConsent() {
  try {
    if (document.cookie.split('; ').some(c => c === `${COOKIE}=accepted`)) return true;
  } catch { /* ignore */ }
  try {
    if (localStorage.getItem(KEY) === 'accepted') return true;
  } catch { /* ignore */ }
  return false;
}

/* Clear, honest cookie notice. The portal uses only one essential auth
   cookie, so this informs rather than asks to track. Dismissal is
   remembered per browser. */
export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!hasConsent()) setShow(true);
  }, []);

  function accept() {
    try {
      // ~1 year, sent on every path; Lax is fine for a same-site preference flag.
      document.cookie = `${COOKIE}=accepted; max-age=31536000; path=/; SameSite=Lax`;
    } catch { /* ignore */ }
    try { localStorage.setItem(KEY, 'accepted'); } catch { /* ignore */ }
    setShow(false);
  }

  if (!show) return null;
  return (
    <div className="cc" role="dialog" aria-label="Cookie notice">
      <style>{CSS}</style>
      <div className="cc-body">
        <i className="ti ti-cookie cc-ic" />
        <p className="cc-text">
          We use a single <strong>essential cookie</strong> to keep you securely signed in. We do not
          use tracking or advertising cookies. Read our <Link to="/cookies">Cookie Policy</Link> and{' '}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </div>
      <div className="cc-actions">
        <button type="button" className="cc-btn cc-primary" onClick={accept}>Got it</button>
      </div>
    </div>
  );
}

const CSS = `
  .cc{position:fixed;left:16px;right:16px;bottom:16px;z-index:1700;max-width:760px;margin:0 auto;
    background:#0B1B2E;color:#e7ecf3;border:1px solid #24344a;
    display:flex;align-items:center;gap:16px;padding:14px 18px;flex-wrap:wrap;
    box-shadow:0 16px 40px -12px rgba(0,0,0,.5);
    clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px);}
  .cc-body{display:flex;align-items:flex-start;gap:12px;flex:1;min-width:230px;}
  .cc-ic{font-size:22px;color:#C79A3B;flex-shrink:0;margin-top:1px;}
  .cc-text{margin:0;font-size:13px;line-height:1.55;}
  .cc-text a{color:#e3c477;text-decoration:underline;}
  .cc-text strong{color:#fff;}
  .cc-actions{display:flex;gap:10px;flex-shrink:0;}
  .cc-btn{cursor:pointer;font:600 13px 'Inter',sans-serif;padding:10px 22px;border:none;
    clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);}
  .cc-primary{background:#C79A3B;color:#0B1B2E;}
  .cc-primary:hover{background:#d8ab4c;}
  @media(max-width:560px){.cc{padding:14px;}.cc-actions{width:100%;}.cc-btn{width:100%;}}
`;
