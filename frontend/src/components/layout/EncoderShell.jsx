import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const SB_ITEMS = [
  { key: 'applications', icon: 'ti-file-check', label: 'Freshman Applications', to: '/encoder/applications' },
  { key: 'curriculum',   icon: 'ti-list-tree',  label: 'Curriculum',            to: '/encoder/curriculum' },
];

const PAGE_LABELS = {
  applications: 'Freshman Applications',
  curriculum:   'Curriculum',
};

function initials(name) {
  const p = (name || '').replace(',', '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
function activeKey(pathname) {
  const seg = pathname.replace('/encoder/', '').split('/')[0];
  return seg || 'applications';
}

export default function EncoderShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dept, setDept] = useState(null);
  const menuRef = useRef(null);

  const active = activeKey(location.pathname);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  // Fetch the encoder's own department label from their profile.
  useEffect(() => {
    api.get('/auth/profile/').then(r => setDept(r.data.department_name)).catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function handleLogout() { setMenuOpen(false); await logout(); navigate('/login'); }

  return (
    <div className="enc-shell">
      <style>{CSS}</style>

      {navOpen && <div className="enc-navback" onClick={() => setNavOpen(false)} />}

      <aside className={`enc-sb${navOpen ? ' is-open' : ''}`}>
        <div className="enc-sb-brand">
          <img src="/logo.png" alt="NEMSU" />
          <div>
            <div className="enc-sb-brand-name">NEMSUonePortal</div>
            <div className="enc-sb-brand-sub">Encoder · Cantilan</div>
          </div>
        </div>
        <nav className="enc-sb-nav">
          <div className="enc-sb-group-label">Admissions</div>
          {SB_ITEMS.map(l => (
            <Link key={l.key} to={l.to} className={`enc-sb-link${active === l.key ? ' active' : ''}`} onClick={() => setNavOpen(false)}>
              <i className={`ti ${l.icon}`} />
              <span>{l.label}</span>
            </Link>
          ))}
        </nav>
        <div className="enc-sb-foot">
          <i className="ti ti-building-bank" />
          <div>
            <div className="enc-sb-foot-campus">{dept || 'Department'}</div>
            <div className="enc-sb-foot-loc">Cantilan Campus</div>
          </div>
        </div>
      </aside>

      <div className="enc-main">
        <div className="enc-topbar">
          <button className="enc-navtoggle" onClick={() => setNavOpen(true)} aria-label="Open navigation"><i className="ti ti-menu-2" /></button>
          <div className="enc-crumbs">
            <i className="ti ti-home" />
            <span>Encoder</span>
            <i className="ti ti-chevron-right" />
            <span className="here">{PAGE_LABELS[active] || 'Encoder'}</span>
          </div>

          <div className="enc-topbar-actions">
            <div className="enc-user-wrap" ref={menuRef}>
              <div className="enc-user-chip" onClick={() => setMenuOpen(o => !o)}>
                <div className="enc-user-avatar">{initials(user?.full_name)}</div>
                <div className="enc-user-meta">
                  <div className="enc-user-name">{user?.full_name || 'Encoder'}</div>
                  <div className="enc-user-role">Department Encoder</div>
                </div>
                <i className="ti ti-chevron-down" />
              </div>
              {menuOpen && (
                <div className="enc-menu">
                  <button className="enc-menu-item danger" onClick={handleLogout}>
                    <i className="ti ti-logout" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="enc-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

const CSS = `
  :root{
    --enc-ink:#0a1628;--enc-gold:#b89043;--enc-gold-soft:#d9b96b;
    --enc-muted:#5a6478;--enc-faint:#8a93a3;--enc-line:#e5e7eb;--enc-line-soft:#eef0f4;
    --enc-warm:#f8f7f3;--enc-cool:#f4f6fa;--enc-green:#0a7c52;--enc-green-tint:#e6f1ec;
    --enc-red:#a8331e;--enc-red-tint:#f6e8e4;--enc-gold-tint:#f5edd9;
    --reg-ink:#0a1628;--reg-ink-2:#1e3a5f;--reg-muted:#5a6478;--reg-faint:#8a93a3;
    --reg-line:#e5e7eb;--reg-line-soft:#eef0f4;--reg-warm:#f8f7f3;--reg-cool:#f4f6fa;
    --reg-gold:#b89043;--reg-gold-soft:#d9b96b;--reg-gold-tint:#f5edd9;
    --reg-green:#0a7c52;--reg-green-tint:#e6f1ec;--reg-red:#a8331e;--reg-red-tint:#f6e8e4;
    --reg-amber:#a06b16;--reg-amber-tint:#f7eed8;
  }
  .enc-shell{display:flex;height:100vh;overflow:hidden;background:var(--enc-warm);font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  .enc-sb{width:248px;flex-shrink:0;background:var(--enc-ink);color:#fff;display:flex;flex-direction:column;height:100%;overflow:hidden}
  .enc-sb-brand{padding:1.5rem 1.25rem 1.25rem;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:.875rem;flex-shrink:0}
  .enc-sb-brand img{width:38px;height:38px;border-radius:50%;object-fit:contain;background:rgba(255,255,255,.06);padding:2px}
  .enc-sb-brand-name{font-size:16px;font-weight:600;color:#fff;letter-spacing:-.01em;line-height:1.2}
  .enc-sb-brand-sub{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--enc-gold-soft);margin-top:3px;font-weight:600}
  .enc-sb-nav{flex:1;padding:.75rem 0;overflow-y:auto}
  .enc-sb-group-label{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.38);font-weight:600;padding:1.25rem 1.25rem .4rem}
  .enc-sb-link{display:flex;align-items:center;gap:10px;padding:9px 1.25rem;font-size:13px;color:rgba(255,255,255,.62);cursor:pointer;border-left:2px solid transparent;text-decoration:none;transition:background .15s,color .15s,border-color .15s;font-weight:500}
  .enc-sb-link:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.88)}
  .enc-sb-link.active{background:rgba(184,144,67,.12);color:#fff;border-left-color:var(--enc-gold);font-weight:600}
  .enc-sb-link i{font-size:16px;flex-shrink:0}
  .enc-sb-foot{padding:1rem 1.25rem;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:8px;font-size:11px;flex-shrink:0}
  .enc-sb-foot i{color:var(--enc-gold-soft);font-size:15px}
  .enc-sb-foot-campus{color:#fff;font-weight:500}
  .enc-sb-foot-loc{font-size:10px;color:rgba(255,255,255,.38)}
  .enc-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;background:var(--enc-warm)}
  .enc-topbar{height:54px;background:#fff;border-bottom:1px solid var(--enc-line);display:flex;align-items:center;padding:0 2rem;gap:1rem;flex-shrink:0}
  .enc-crumbs{font-size:12px;color:var(--enc-muted);display:flex;align-items:center;gap:8px}
  .enc-crumbs i{font-size:10px}
  .enc-crumbs .here{color:var(--enc-ink);font-weight:500}
  .enc-topbar-actions{display:flex;align-items:center;gap:.75rem;margin-left:auto}
  .enc-user-wrap{position:relative}
  .enc-user-chip{display:flex;align-items:center;gap:9px;padding:4px 12px 4px 4px;border:1px solid var(--enc-line);background:#fff;cursor:pointer;transition:border-color .15s}
  .enc-user-chip:hover{border-color:var(--enc-ink)}
  .enc-user-avatar{width:28px;height:28px;background:var(--enc-ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;letter-spacing:.04em;flex-shrink:0}
  .enc-user-name{font-size:12px;font-weight:600;color:var(--enc-ink);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .enc-user-role{font-size:10px;color:var(--enc-muted);letter-spacing:.04em}
  .enc-user-chip > i{font-size:12px;color:var(--enc-faint)}
  .enc-menu{position:absolute;top:100%;right:0;margin-top:4px;z-index:50;background:#fff;border:1px solid var(--enc-line);min-width:170px;box-shadow:0 8px 24px -8px rgba(10,22,40,.18)}
  .enc-menu-item{display:flex;align-items:center;gap:10px;padding:10px 14px;font-size:13px;color:var(--enc-ink);background:none;border:none;width:100%;text-align:left;cursor:pointer;font-family:inherit}
  .enc-menu-item:hover{background:var(--enc-warm)}
  .enc-menu-item.danger{color:var(--enc-red)}
  .enc-menu-item i{font-size:15px}
  .enc-body{flex:1;overflow-y:auto;padding:1.75rem 2rem 2.5rem}
  .enc-navtoggle{display:none;align-items:center;justify-content:center;width:38px;height:38px;flex-shrink:0;border:1px solid var(--enc-line);background:#fff;border-radius:10px;color:inherit;font-size:19px;cursor:pointer}
  .enc-navback{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:60}
  /* Page-head shared styles used by encoder pages */
  .page-head{margin-bottom:1.5rem}
  .page-head .eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--enc-gold);font-weight:600;margin-bottom:6px}
  .page-head h2{font-size:26px;font-weight:600;color:var(--enc-ink);letter-spacing:-.02em}
  .page-head h2 em{font-style:normal;color:var(--enc-gold)}
  .page-head .sub{font-size:14px;color:var(--enc-muted);margin-top:6px;max-width:600px;line-height:1.55}
  /* Buttons (shared across encoder pages) */
  .btn-pri{padding:9px 16px;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);background:var(--enc-ink);color:#fff;border:1px solid var(--enc-ink);font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-family:inherit;transition:background .15s,border-color .15s}
  .btn-pri:hover:not(:disabled){background:var(--enc-gold);border-color:var(--enc-gold)}
  .btn-pri:disabled{opacity:.55;cursor:not-allowed}
  .btn-pri i{font-size:15px}
  .btn-sec{padding:9px 14px;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);background:#fff;color:var(--enc-ink);border:1px solid var(--enc-line);font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-family:inherit;transition:border-color .15s,color .15s}
  .btn-sec:hover:not(:disabled){border-color:var(--enc-ink);color:var(--enc-ink)}
  .btn-sec:disabled{opacity:.55;cursor:not-allowed}
  .btn-sec i{font-size:15px}
  .btn-ghost{padding:6px 8px;background:transparent;color:var(--enc-muted);border:none;cursor:pointer;font-family:inherit;font-size:12px;display:inline-flex;align-items:center;gap:4px}
  .btn-ghost:hover{color:var(--enc-ink)}
  @media(max-width:980px){
    .enc-sb{position:fixed;top:0;left:0;bottom:0;z-index:70;width:248px;height:100dvh;transform:translateX(-100%);transition:transform .22s ease}
    .enc-sb.is-open{transform:none}
    .enc-navtoggle{display:inline-flex}
    .enc-body{padding:1.25rem 1rem 2.5rem}
    .enc-topbar{padding:0 1rem;gap:.75rem}
  }
  @media(max-width:700px){
    .enc-user-name,.enc-user-role{display:none}
    .enc-user-chip{padding:4px;gap:0}
    .enc-user-chip > i{display:none}
  }
  @media(max-width:560px){
    .enc-body{padding:1rem .85rem 2rem}
    .enc-crumbs{font-size:11px;min-width:0;overflow:hidden}
    .page-head h2{font-size:22px}
  }
`;
