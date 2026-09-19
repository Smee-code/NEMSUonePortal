import { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RegistrarShellCtx } from '../../context/RegistrarShellContext';
import api from '../../api/axios';

/* ── Sidebar nav items ─────────────────────────────────────────────────────── */
const SB_ITEMS = [
  { key:'dashboard',    icon:'ti-layout-dashboard', label:'Dashboard',           section:'overview', to:'/registrar/dashboard' },
  { key:'registrations',icon:'ti-user-check',       label:'Registration Requests', section:'workflow', to:'/registrar/registrations' },
  { key:'enrollment',   icon:'ti-clipboard-check',  label:'Enrollment Requests', section:'workflow',  to:'/registrar/enrollment', badgeKey:'enrollment' },
  { key:'documents',    icon:'ti-file-text',        label:'Document Requests',   section:'workflow',  to:'/registrar/documents',  badgeKey:'documents' },
  { key:'students',     icon:'ti-users',            label:'List of Students',    section:'records',   to:'/registrar/students' },
  { key:'faculty',      icon:'ti-user-edit',        label:'Faculty',             section:'records',   to:'/registrar/faculty' },
  { key:'schedule',     icon:'ti-calendar-event',   label:'Class Schedules',     section:'records',   to:'/registrar/schedule' },
  { key:'blocks',       icon:'ti-grid-dots',        label:'Block Management',    section:'records',   to:'/registrar/blocks' },
  { key:'academic-data',icon:'ti-database',         label:'Academic Data',       section:'records',   to:'/registrar/academic-data' },
  { key:'announcements',icon:'ti-bell',             label:'Announcements',       section:'records',   to:'/registrar/announcements' },
];
const SB_GROUPS = [
  { id:'overview', label:'Overview' },
  { id:'workflow', label:'Workflow' },
  { id:'records',  label:'Records'  },
];

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

/* ── Sidebar ───────────────────────────────────────────────────────────────── */
function RegSidebar({ badges, navOpen, closeNav }) {
  const location = useLocation();
  const seg = location.pathname.split('/')[2] || 'dashboard';
  return (
    <aside className={`reg-sb${navOpen ? ' is-open' : ''}`} onClick={closeNav}>
      <div className="reg-sb-brand">
        <img src="/assets/logo.png" alt="NEMSU" onError={e => { e.currentTarget.style.display = 'none'; }} />
        <div>
          <div className="reg-sb-brand-name">NEMSUonePortal</div>
          <div className="reg-sb-brand-sub">Registrar · Cantilan</div>
        </div>
      </div>
      <nav className="reg-sb-nav">
        {SB_GROUPS.map(g => (
          <div key={g.id}>
            <div className="reg-sb-group">{g.label}</div>
            {SB_ITEMS.filter(l => l.section === g.id).map(l => (
              <Link
                key={l.key}
                to={l.to}
                className={`reg-sb-link${seg === l.key ? ' active' : ''}`}
              >
                <i className={`ti ${l.icon}`} />
                <span>{l.label}</span>
                {l.badgeKey && badges[l.badgeKey] > 0 && (
                  <span className="reg-sb-badge">{badges[l.badgeKey]}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="reg-sb-foot">
        <i className="ti ti-map-pin" />
        <div>
          <div className="reg-sb-foot-campus">Cantilan Campus</div>
          <div className="reg-sb-foot-loc">Cantilan, Surigao del Sur</div>
        </div>
      </div>
    </aside>
  );
}

/* ── Topbar ────────────────────────────────────────────────────────────────── */
function RegTopbar({ currentTerm, toast, badges, openNav }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const seg = location.pathname.split('/')[2] || 'dashboard';
  const label = SB_ITEMS.find(s => s.key === seg)?.label || 'Dashboard';

  const [notifOpen, setNotifOpen] = useState(false);
  const [acctOpen,  setAcctOpen]  = useState(false);

  const totalUnread = (badges.enrollment || 0) + (badges.documents || 0);

  useEffect(() => {
    if (!notifOpen && !acctOpen) return;
    const fn = () => { setNotifOpen(false); setAcctOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [notifOpen, acctOpen]);

  return (
    <header className="reg-topbar">
      <button className="reg-navtoggle" onClick={openNav} aria-label="Open navigation"><i className="ti ti-menu-2" /></button>
      <div className="reg-crumbs">
        <i className="ti ti-home" />
        <span>Registrar</span>
        <i className="ti ti-chevron-right" />
        <span className="here">{label}</span>
      </div>
      <div className="reg-topbar-search">
        <i className="ti ti-search" />
        <input placeholder="Search students, requests, schedules…" />
        <span className="reg-kbd">⌘K</span>
      </div>
      <div className="reg-topbar-actions">
        {currentTerm && (
          <div className="reg-term-chip">
            <i className="ti ti-calendar" />
            {currentTerm.semester_display} · {currentTerm.year}
          </div>
        )}
        <button
          className="reg-icon-btn"
          aria-label="Notifications"
          onClick={e => { e.stopPropagation(); setNotifOpen(o => !o); setAcctOpen(false); }}
        >
          <i className="ti ti-bell" />
          {totalUnread > 0 && <span className="reg-icon-dot" />}
        </button>
        <div
          className="reg-user-chip"
          onClick={e => { e.stopPropagation(); setAcctOpen(o => !o); setNotifOpen(false); }}
        >
          <div className="reg-user-avatar">{initials(user?.full_name)}</div>
          <div className="reg-user-meta">
            <div className="reg-user-name">{user?.full_name || 'Registrar'}</div>
            <div className="reg-user-role">Registrar</div>
          </div>
          <i className="ti ti-chevron-down" style={{ fontSize: 13, color: 'var(--reg-faint)' }} />
        </div>
      </div>

      {/* Notifications drawer */}
      {notifOpen && (
        <div className="reg-topbar-drawer" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          <div className="reg-drawer-head-sm">
            <span>Notifications</span>
            <button className="reg-icon-btn" onClick={() => setNotifOpen(false)}><i className="ti ti-x" /></button>
          </div>
          <div className="reg-drawer-notif-list">
            {badges.enrollment > 0 && (
              <div className="reg-drawer-notif-row">
                <span className="reg-notif-dot" />
                <div>
                  <div className="reg-notif-msg">{badges.enrollment} enrollment request{badges.enrollment !== 1 ? 's' : ''} pending review</div>
                  <div className="reg-notif-sub">Registrar · Workflow</div>
                </div>
                <span className="reg-notif-time">now</span>
              </div>
            )}
            {badges.documents > 0 && (
              <div className="reg-drawer-notif-row">
                <span className="reg-notif-dot" />
                <div>
                  <div className="reg-notif-msg">{badges.documents} document request{badges.documents !== 1 ? 's' : ''} submitted</div>
                  <div className="reg-notif-sub">Registrar · Workflow</div>
                </div>
                <span className="reg-notif-time">now</span>
              </div>
            )}
            {badges.enrollment === 0 && badges.documents === 0 && (
              <div style={{ padding: '1.5rem', fontSize: 13, color: 'var(--reg-muted)', textAlign: 'center' }}>
                No pending notifications
              </div>
            )}
          </div>
          <div className="reg-drawer-foot-sm">
            <button className="btn-sec" onClick={() => setNotifOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Account drawer */}
      {acctOpen && (
        <div className="reg-topbar-drawer" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          <div className="reg-drawer-head-sm">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="reg-acct-avatar">{initials(user?.full_name)}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--reg-ink)' }}>{user?.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--reg-muted)' }}>Campus registrar · NEMSU Cantilan</div>
              </div>
            </div>
            <button className="reg-icon-btn" onClick={() => setAcctOpen(false)}><i className="ti ti-x" /></button>
          </div>
          <div className="reg-drawer-menu">
            {[
              { icon: 'ti-user',    label: 'My profile',      act: () => toast('Profile settings coming soon') },
              { icon: 'ti-key',     label: 'Change password', act: () => toast('Password reset email sent', 'success') },
              { icon: 'ti-help',    label: 'Help & support',  act: () => toast('Opening help center…') },
            ].map(it => (
              <button key={it.label} className="reg-menu-item" onClick={() => { it.act(); setAcctOpen(false); }}>
                <i className={`ti ${it.icon}`} />{it.label}
                <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', color: 'var(--reg-faint)' }} />
              </button>
            ))}
            <button className="reg-menu-item danger" onClick={() => { logout(); navigate('/login'); }}>
              <i className="ti ti-logout" />Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

/* ── Toast host ────────────────────────────────────────────────────────────── */
function ToastHost({ items }) {
  return (
    <div className="reg-toast-host">
      {items.map(t => {
        const icon = t.type === 'success' ? 'ti-check' : t.type === 'error' ? 'ti-alert-triangle' : t.type === 'warn' ? 'ti-alert-circle' : 'ti-info-circle';
        return (
          <div key={t.id} className={`reg-toast ${t.type || ''}`}>
            <div className="reg-toast-icon"><i className={`ti ${icon}`} /></div>
            <div className="reg-toast-body">
              <div className="reg-toast-msg">{t.msg}</div>
              {t.sub && <div className="reg-toast-sub">{t.sub}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Shell ─────────────────────────────────────────────────────────────────── */
export default function RegistrarShell() {
  const [currentTerm, setCurrentTerm] = useState(null);
  const [badges, setBadges]           = useState({ enrollment: 0, documents: 0 });
  const [toasts, setToasts]           = useState([]);
  const [navOpen, setNavOpen]         = useState(false);
  const location                      = useLocation();

  // Close the mobile nav whenever the route changes
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  useEffect(() => {
    api.get('/enrollment/current-term/').then(r => setCurrentTerm(r.data)).catch(() => {});
    Promise.allSettled([
      api.get('/enrollment/requests/?status=pending&page_size=1'),
      api.get('/documents/requests/?status=submitted&page_size=1'),
    ]).then(([enrRes, docRes]) => {
      setBadges({
        enrollment: enrRes.status === 'fulfilled' ? (enrRes.value.data?.count ?? 0) : 0,
        documents:  docRes.status === 'fulfilled' ? (docRes.value.data?.count ?? 0) : 0,
      });
    });
  }, []);

  const toast = useCallback((msg, type = '', sub = '') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type, sub }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  return (
    <RegistrarShellCtx.Provider value={{ toast, currentTerm }}>
      <style>{CSS}</style>
      <div className="reg-shell">
        <RegSidebar badges={badges} navOpen={navOpen} closeNav={() => setNavOpen(false)} />
        {navOpen && <div className="reg-navback" onClick={() => setNavOpen(false)} />}
        <div className="reg-main">
          <RegTopbar currentTerm={currentTerm} toast={toast} badges={badges} openNav={() => setNavOpen(true)} />
          <div className="reg-body">
            <Outlet />
          </div>
        </div>
      </div>
      <ToastHost items={toasts} />
    </RegistrarShellCtx.Provider>
  );
}

/* ── CSS ───────────────────────────────────────────────────────────────────── */
const CSS = `
  /* ── Registrar design tokens ── */
  :root{
    --reg-ink:#0a1628; --reg-ink-2:#1e3a5f; --reg-ink-3:#0f1f3a;
    --reg-muted:#5a6478; --reg-faint:#8a93a3;
    --reg-paper:#ffffff; --reg-warm:#f8f7f3; --reg-cool:#f4f6fa; --reg-cool-2:#eef1f7;
    --reg-line:#e5e7eb; --reg-line-soft:#eef0f4;
    --reg-line-dark:rgba(255,255,255,.08); --reg-line-dark-2:rgba(255,255,255,.16);
    --reg-gold:#b89043; --reg-gold-soft:#d9b96b; --reg-gold-tint:#f5edd9;
    --reg-green:#0a7c52; --reg-green-tint:#e6f1ec;
    --reg-red:#a8331e; --reg-red-tint:#f6e8e4;
    --reg-amber:#a06b16; --reg-amber-tint:#f7eed8;
    --reg-on-dark:#e8ecf2;
    --reg-on-dark-mute:rgba(232,236,242,.62);
    --reg-on-dark-faint:rgba(232,236,242,.40);

    /* base-name aliases — used by page-level CSS */
    --ink:var(--reg-ink); --ink-2:var(--reg-ink-2); --ink-3:var(--reg-ink-3);
    --muted:var(--reg-muted); --faint:var(--reg-faint);
    --paper:var(--reg-paper); --warm:var(--reg-warm); --cool:var(--reg-cool); --cool-2:var(--reg-cool-2);
    --line:var(--reg-line); --line-soft:var(--reg-line-soft);
    --gold:var(--reg-gold); --gold-soft:var(--reg-gold-soft); --gold-tint:var(--reg-gold-tint);
    --green:var(--reg-green); --green-tint:var(--reg-green-tint);
    --red:var(--reg-red); --red-tint:var(--reg-red-tint);
    --amber:var(--reg-amber); --amber-tint:var(--reg-amber-tint);

    /* adm-* aliases so shared AnnouncementsPage CSS resolves */
    --adm-ink:#0a1628; --adm-ink-2:#1e3a5f;
    --adm-gold:#b89043; --adm-gold-soft:#d9b96b; --adm-gold-tint:#f5edd9;
    --adm-muted:#5a6478; --adm-faint:#8a93a3;
    --adm-line:#e5e7eb; --adm-line-soft:#eef0f4;
    --adm-warm:#f8f7f3; --adm-cool:#f4f6fa; --adm-cool-2:#eef1f7; --adm-paper:#ffffff;
    --adm-green:#0a7c52; --adm-green-tint:#e6f1ec;
    --adm-red:#a8331e; --adm-red-tint:#f6e8e4;
    --adm-amber:#a06b16; --adm-amber-tint:#f7eed8;
  }

  /* ── Shell ── */
  *,*::before,*::after{box-sizing:border-box}
  .reg-shell{
    display:flex;height:100vh;overflow:hidden;background:var(--reg-cool);
    font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    font-size:14px; -webkit-font-smoothing:antialiased;
  }

  /* ── Sidebar ── */
  .reg-sb{
    flex:0 0 260px; background:var(--reg-ink); color:var(--reg-on-dark);
    display:flex; flex-direction:column; height:100%; overflow:hidden;
  }
  .reg-sb-brand{
    display:flex; align-items:center; gap:12px;
    padding:1.5rem 1.5rem 1.25rem;
    border-bottom:1px solid var(--reg-line-dark);
    flex-shrink:0;
  }
  .reg-sb-brand img{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.04);padding:2px}
  .reg-sb-brand-name{font-size:20px;color:#fff;letter-spacing:-.01em;font-weight:500;white-space:nowrap}
  .reg-sb-brand-sub{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--reg-gold-soft);margin-top:3px;font-weight:600}
  .reg-sb-nav{flex:1;overflow-y:auto;padding:0 .75rem .5rem}
  .reg-sb-nav::-webkit-scrollbar{width:4px}
  .reg-sb-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px}
  .reg-sb-group{
    font-size:10px;letter-spacing:.16em;text-transform:uppercase;
    color:var(--reg-on-dark-faint);font-weight:600;
    padding:1.5rem 1.5rem .75rem;
  }
  .reg-sb-link{
    display:flex;align-items:center;gap:12px;padding:10px 14px;
    color:var(--reg-on-dark-mute);font-size:13px;font-weight:500;
    text-decoration:none;border-left:2px solid transparent;
    transition:background .15s,color .15s,border-color .15s;
  }
  .reg-sb-link i{font-size:17px;flex-shrink:0}
  .reg-sb-link:hover{color:#fff;background:rgba(255,255,255,.03)}
  .reg-sb-link.active{color:#fff;background:rgba(184,144,67,.10);border-left-color:var(--reg-gold);font-weight:600}
  .reg-sb-badge{
    margin-left:auto;font-size:10px;background:var(--reg-gold);
    color:#fff;padding:2px 7px;letter-spacing:.06em;font-weight:700;
  }
  .reg-sb-foot{
    padding:1rem 1.5rem;border-top:1px solid var(--reg-line-dark);
    display:flex;align-items:center;gap:10px;font-size:12px;flex-shrink:0;
  }
  .reg-sb-foot i{color:var(--reg-gold-soft);font-size:14px}
  .reg-sb-foot-campus{color:#fff;font-weight:500}
  .reg-sb-foot-loc{font-size:11px;color:var(--reg-on-dark-faint)}

  /* ── Main ── */
  .reg-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;background:var(--reg-cool)}

  /* ── Topbar ── */
  .reg-topbar{
    background:#fff;border-bottom:1px solid var(--reg-line);
    padding:0 2rem;height:72px;display:flex;align-items:center;gap:1.5rem;
    flex-shrink:0;position:relative;
  }
  .reg-crumbs{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--reg-muted);letter-spacing:.04em}
  .reg-crumbs i{font-size:11px;color:var(--reg-faint)}
  .reg-crumbs .here{color:var(--reg-ink);font-weight:500}
  .reg-topbar-search{
    flex:1;max-width:380px;margin-left:1rem;position:relative;display:flex;align-items:center;
  }
  .reg-topbar-search i{position:absolute;left:12px;font-size:16px;color:var(--reg-faint);pointer-events:none}
  .reg-topbar-search input{
    width:100%;padding:9px 40px 9px 36px;font:14px/1.4 'Inter',sans-serif;color:var(--reg-ink);
    background:var(--reg-cool);border:1px solid transparent;outline:none;
    transition:border-color .15s,background .15s;
  }
  .reg-topbar-search input:focus{background:#fff;border-color:var(--reg-line)}
  .reg-topbar-search input::placeholder{color:var(--reg-faint)}
  .reg-kbd{
    position:absolute;right:10px;font-size:10px;letter-spacing:.04em;
    padding:2px 6px;border:1px solid var(--reg-line);color:var(--reg-faint);background:#fff;font-weight:500;
  }
  .reg-topbar-actions{display:flex;align-items:center;gap:.75rem;margin-left:auto}
  .reg-term-chip{
    display:inline-flex;align-items:center;gap:8px;padding:7px 12px;
    font-size:12px;color:var(--reg-ink);border:1px solid var(--reg-line);background:#fff;font-weight:500;
  }
  .reg-term-chip i{font-size:14px;color:var(--reg-gold)}
  .reg-icon-btn{
    width:38px;height:38px;display:flex;align-items:center;justify-content:center;
    border:1px solid var(--reg-line);background:#fff;cursor:pointer;
    color:var(--reg-ink);position:relative;transition:border-color .15s;
  }
  .reg-icon-btn i{font-size:18px}
  .reg-icon-btn:hover{border-color:var(--reg-ink)}
  .reg-icon-dot{
    position:absolute;top:7px;right:7px;width:6px;height:6px;
    border-radius:50%;background:var(--reg-red);
  }
  .reg-user-chip{
    display:flex;align-items:center;gap:10px;padding:5px 14px 5px 5px;
    border:1px solid var(--reg-line);background:#fff;cursor:pointer;
    transition:border-color .15s;
  }
  .reg-user-chip:hover{border-color:var(--reg-ink)}
  .reg-user-avatar{
    width:30px;height:30px;background:var(--reg-ink);color:#fff;
    display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:600;letter-spacing:.05em;
  }
  .reg-user-meta{line-height:1.2;text-align:left}
  .reg-user-name{font-size:12px;font-weight:600;color:var(--reg-ink);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .reg-user-role{font-size:10px;color:var(--reg-muted);text-transform:capitalize;letter-spacing:.04em}

  /* Topbar dropdown drawers */
  .reg-topbar-drawer{
    position:absolute;top:calc(100% + 4px);right:1.5rem;
    background:#fff;border:1px solid var(--reg-line);min-width:320px;max-width:400px;
    box-shadow:0 8px 32px -8px rgba(10,22,40,.18);z-index:200;
  }
  .reg-drawer-head-sm{
    padding:1rem 1.25rem;border-bottom:1px solid var(--reg-line);
    display:flex;justify-content:space-between;align-items:center;
    font-size:13px;font-weight:600;color:var(--reg-ink);
  }
  .reg-drawer-notif-list{max-height:280px;overflow-y:auto}
  .reg-drawer-notif-row{
    display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:flex-start;
    padding:12px 1.25rem;border-bottom:1px solid var(--reg-line-soft);
  }
  .reg-drawer-notif-row:last-child{border-bottom:none}
  .reg-notif-dot{width:7px;height:7px;background:var(--reg-gold);border-radius:50%;margin-top:5px;flex-shrink:0}
  .reg-notif-msg{font-size:13px;color:var(--reg-ink);line-height:1.4}
  .reg-notif-sub{font-size:11px;color:var(--reg-muted);margin-top:2px}
  .reg-notif-time{font-size:11px;color:var(--reg-faint);white-space:nowrap}
  .reg-drawer-foot-sm{
    padding:.75rem 1.25rem;border-top:1px solid var(--reg-line);
    display:flex;justify-content:flex-end;gap:8px;
  }
  .reg-drawer-menu{display:flex;flex-direction:column}
  .reg-menu-item{
    display:flex;align-items:center;gap:12px;padding:12px 1.25rem;
    font-size:13px;color:var(--reg-ink);text-decoration:none;cursor:pointer;
    border:none;border-bottom:1px solid var(--reg-line-soft);
    background:none;font-family:inherit;text-align:left;width:100%;
    transition:padding-left .15s;
  }
  .reg-menu-item:hover{padding-left:20px;color:var(--reg-ink-2)}
  .reg-menu-item:last-child{border-bottom:none}
  .reg-menu-item i{font-size:16px;color:var(--reg-muted);width:18px;text-align:center}
  .reg-menu-item.danger{color:var(--reg-red)}
  .reg-menu-item.danger i{color:var(--reg-red)}
  .reg-acct-avatar{
    width:40px;height:40px;background:var(--reg-gold);color:#fff;
    display:flex;align-items:center;justify-content:center;
    font-size:14px;font-weight:700;letter-spacing:.04em;flex-shrink:0;
  }

  /* ── Body / Outlet ── */
  .reg-body{flex:1;min-height:0;overflow-y:auto;padding:2rem 2.5rem 3rem;}

  /* ── Toast ── */
  .reg-toast-host{
    position:fixed;bottom:1.5rem;right:1.5rem;z-index:1100;
    display:flex;flex-direction:column;gap:8px;pointer-events:none;
  }
  .reg-toast{
    pointer-events:auto;background:var(--reg-ink);color:#fff;
    padding:12px 16px 12px 12px;min-width:280px;max-width:380px;
    display:flex;align-items:flex-start;gap:12px;
    animation:regToastIn .25s cubic-bezier(.4,0,.2,1);
    border-left:3px solid var(--reg-gold);
  }
  .reg-toast.success{border-left-color:var(--reg-green)}
  .reg-toast.warn{border-left-color:var(--reg-amber)}
  .reg-toast.error{border-left-color:var(--reg-red)}
  .reg-toast-icon{
    width:28px;height:28px;display:flex;align-items:center;justify-content:center;
    background:rgba(255,255,255,.08);flex-shrink:0;color:var(--reg-gold-soft);
  }
  .reg-toast.success .reg-toast-icon{color:#5dd6a1}
  .reg-toast.warn .reg-toast-icon{color:#f0c878}
  .reg-toast.error .reg-toast-icon{color:#e88b78}
  .reg-toast-icon i{font-size:14px}
  .reg-toast-body{flex:1;min-width:0;line-height:1.45}
  .reg-toast-msg{font-size:13px;font-weight:500}
  .reg-toast-sub{font-size:11px;color:rgba(255,255,255,.6);margin-top:2px}
  @keyframes regToastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}

  /* ── PAGE PRIMITIVES (used by all registrar pages) ── */

  /* Page head */
  .page-head{
    display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;
    padding-bottom:1.5rem;border-bottom:1px solid var(--reg-line);
    margin-bottom:1.5rem;flex-wrap:wrap;
  }
  .eyebrow{
    font-size:10px;letter-spacing:.16em;text-transform:uppercase;
    color:var(--reg-gold);font-weight:600;margin-bottom:.5rem;
    display:inline-flex;align-items:center;gap:10px;
  }
  .eyebrow::before{content:"";width:24px;height:1px;background:var(--reg-gold)}
  .page-head h2{
    font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    font-weight:500;font-size:38px;letter-spacing:-.02em;line-height:1.05;color:var(--reg-ink);
  }
  .page-head h2 em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--reg-ink-2);font-weight:400}
  .page-head .sub{font-size:14px;color:var(--reg-muted);margin-top:6px;max-width:540px;line-height:1.55}
  .page-head .actions{display:flex;gap:8px;flex-shrink:0}

  /* Section head */
  .sec-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:1rem}
  .sec-head h3{
    font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    font-weight:500;font-size:22px;color:var(--reg-ink);letter-spacing:-.008em;line-height:1.1;
  }
  .sec-head h3 em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--reg-ink-2);font-weight:400}
  .sec-head .sub{font-size:12px;color:var(--reg-muted);margin-top:3px}
  .sec-head .actions{display:flex;gap:8px}
  .sec-action{
    font-size:11px;letter-spacing:.08em;text-transform:uppercase;
    color:var(--reg-muted);font-weight:600;text-decoration:none;
    padding:6px 10px;border:1px solid var(--reg-line);background:#fff;
    cursor:pointer;font-family:inherit;transition:border-color .15s,color .15s;
    display:inline-flex;align-items:center;gap:5px;
  }
  .sec-action:hover{border-color:var(--reg-ink);color:var(--reg-ink)}
  .sec-action.is-active{background:var(--reg-ink);color:#fff;border-color:var(--reg-ink)}

  /* Buttons */
  .btn-pri{
    padding:9px 16px;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);background:var(--reg-ink);color:#fff;border:1px solid var(--reg-ink);
    font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;
    cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit;
    transition:background .15s;
  }
  .btn-pri:hover:not(:disabled){background:#000}
  .btn-pri:disabled{opacity:.55;cursor:not-allowed}
  .btn-pri i{font-size:14px}
  .btn-sec{
    padding:9px 14px;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);background:#fff;color:var(--reg-ink);border:1px solid var(--reg-line);
    font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;
    cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit;
    transition:border-color .15s;
  }
  .btn-sec:hover:not(:disabled){border-color:var(--reg-ink)}
  .btn-sec:disabled{opacity:.55;cursor:not-allowed}
  .btn-sec i{font-size:14px}
  .btn-ghost{
    padding:5px 8px;background:transparent;color:var(--reg-muted);border:none;
    cursor:pointer;font-family:inherit;font-size:12px;
    display:inline-flex;align-items:center;gap:4px;
  }
  .btn-ghost:hover{color:var(--reg-ink)}

  /* Toolbar */
  .toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:1.25rem}
  .toolbar-search{flex:1;max-width:380px;min-width:220px;position:relative;display:flex;align-items:center}
  .toolbar-search i{position:absolute;left:12px;color:var(--reg-faint);font-size:15px;pointer-events:none}
  .toolbar-search input{
    width:100%;padding:9px 14px 9px 34px;background:#fff;border:1px solid var(--reg-line);
    outline:none;font:13px/1.4 'Inter',sans-serif;color:var(--reg-ink);
  }
  .toolbar-search input:focus{border-color:var(--reg-ink)}
  .toolbar select,.toolbar input[type="date"]{
    padding:9px 12px;background:#fff;border:1px solid var(--reg-line);
    outline:none;font:13px/1.4 'Inter',sans-serif;color:var(--reg-ink);font-family:inherit;
  }
  .toolbar .label{font-size:11px;color:var(--reg-muted);font-weight:500;letter-spacing:.04em;margin-right:4px}
  .toolbar-spacer{flex:1}

  /* Table */
  .table-wrap{background:#fff;border:1px solid var(--reg-line);overflow-x:auto;-webkit-overflow-scrolling:touch}
  .table{width:100%;border-collapse:collapse}
  .table thead th{
    font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--reg-muted);
    font-weight:600;text-align:left;padding:14px 18px;
    border-bottom:1px solid var(--reg-line);background:var(--reg-warm);
  }
  .table tbody td{
    padding:14px 18px;font-size:13px;color:var(--reg-ink);
    border-bottom:1px solid var(--reg-line-soft);vertical-align:middle;
  }
  .table tbody tr:last-child td{border-bottom:none}
  .table tbody tr:hover{background:var(--reg-warm)}
  .table .num,.table td.num{font-variant-numeric:tabular-nums}
  .table td.muted{color:var(--reg-muted);font-size:12px}

  /* Tags */
  .tag{
    display:inline-flex;align-items:center;gap:5px;font-size:10px;
    letter-spacing:.1em;text-transform:uppercase;font-weight:600;padding:3px 8px;
  }
  .tag.role-student{background:#eef2fa;color:#1e3a5f}
  .tag.role-faculty{background:#f5edd9;color:#83662a}
  .tag.role-registrar{background:var(--reg-green-tint);color:var(--reg-green)}
  .tag.role-admin{background:var(--reg-red-tint);color:var(--reg-red)}
  .tag.role-system{background:#eef2fa;color:var(--reg-muted)}
  .tag.status-active{background:var(--reg-green-tint);color:var(--reg-green)}
  .tag.status-inactive{background:#f3f4f6;color:var(--reg-muted)}
  .tag.status-locked{background:var(--reg-amber-tint);color:var(--reg-amber)}
  .tag.status-unverified{background:#f3f4f6;color:var(--reg-muted)}
  .tag.outline{background:transparent;border:1px solid var(--reg-line);color:var(--reg-muted)}
  .tag.success{background:var(--reg-green-tint);color:var(--reg-green)}
  .tag.failure{background:var(--reg-red-tint);color:var(--reg-red)}
  .tag.pending{background:var(--reg-amber-tint);color:var(--reg-amber)}
  .tag.approved{background:var(--reg-green-tint);color:var(--reg-green)}
  .tag.rejected{background:var(--reg-red-tint);color:var(--reg-red)}

  /* Avatar */
  .avatar{
    display:inline-flex;align-items:center;justify-content:center;
    width:32px;height:32px;background:var(--reg-ink);color:#fff;
    font-size:11px;font-weight:600;flex-shrink:0;letter-spacing:.04em;
  }
  .avatar.sm{width:26px;height:26px;font-size:10px}
  .avatar.gold{background:var(--reg-gold)}
  .row-user{display:flex;align-items:center;gap:12px}
  .row-user .meta{min-width:0}
  .row-user .name{font-size:13px;font-weight:500;color:var(--reg-ink);line-height:1.3}
  .row-user .email{font-size:11px;color:var(--reg-muted);margin-top:2px}

  /* Pagination */
  .pagination{
    display:flex;justify-content:space-between;align-items:center;
    padding:14px 18px;background:var(--reg-warm);border-top:1px solid var(--reg-line);
  }
  .pagination .count{font-size:12px;color:var(--reg-muted)}
  .pagination .controls{display:flex;gap:6px}
  .pagination button{
    padding:6px 10px;font-size:12px;border:1px solid var(--reg-line);background:#fff;
    cursor:pointer;color:var(--reg-ink);font-family:inherit;transition:border-color .15s;
  }
  .pagination button:hover:not(:disabled){border-color:var(--reg-ink)}
  .pagination button:disabled{opacity:.4;cursor:not-allowed}
  .pagination button.active{background:var(--reg-ink);color:#fff;border-color:var(--reg-ink)}

  /* Subtabs */
  .subtabs{display:flex;gap:0;border-bottom:1px solid var(--reg-line);margin-bottom:1.5rem}
  .subtab{
    padding:12px 18px;font-size:13px;font-weight:500;color:var(--reg-muted);cursor:pointer;
    background:none;border:none;border-bottom:2px solid transparent;
    font-family:inherit;transition:color .15s,border-color .15s;
  }
  .subtab:hover{color:var(--reg-ink)}
  .subtab.active{color:var(--reg-ink);border-bottom-color:var(--reg-ink);font-weight:600}

  /* Card */
  .card{
    background:#fff;border:1px solid var(--reg-line);
    padding:1.5rem 1.5rem 1.25rem;display:flex;flex-direction:column;
  }
  .card-head{
    display:flex;justify-content:space-between;align-items:flex-start;
    margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--reg-line-soft);
  }
  .card-head h4{
    font-size:11px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--reg-muted);font-weight:600;line-height:1.3;
  }
  .card-head h4 span{
    display:block;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    font-weight:400;font-size:20px;color:var(--reg-ink);text-transform:none;
    letter-spacing:-.01em;margin-top:4px;font-style:normal;
  }
  .card-head-aside{font-size:11px;color:var(--reg-faint);text-align:right;line-height:1.4}

  /* Grid layouts */
  .row-2{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem}
  .row-3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
  .row-21{display:grid;grid-template-columns:2fr 1fr;gap:1.5rem}

  /* Stat row */
  .stat-row{
    display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0;
    background:#fff;border:1px solid var(--reg-line);margin-bottom:1.5rem;
  }
  .stat-row .stat{padding:1.25rem 1.5rem;border-right:1px solid var(--reg-line)}
  .stat-row .stat:last-child{border-right:none}
  .stat-row .stat .num{
    font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    font-weight:500;font-size:32px;line-height:1;color:var(--reg-ink);letter-spacing:-.02em;
  }
  .stat-row .stat .num.green{color:var(--reg-green)}
  .stat-row .stat .num.amber{color:var(--reg-amber)}
  .stat-row .stat .num.red{color:var(--reg-red)}
  .stat-row .stat .lbl{
    font-size:11px;letter-spacing:.12em;text-transform:uppercase;
    color:var(--reg-muted);font-weight:600;margin-top:8px;
  }
  .stat-row .stat .delta{font-size:11px;color:var(--reg-faint);margin-top:4px}

  /* Grid cards */
  .grid-cards{
    display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));
    gap:0;border:1px solid var(--reg-line);background:var(--reg-line);
  }
  .grid-cards > *{background:#fff;padding:1.5rem;display:flex;flex-direction:column;gap:.75rem;cursor:pointer;transition:background .15s}
  .grid-cards > *:hover{background:var(--reg-warm)}

  /* Info section */
  .info-section{background:#fff;border:1px solid var(--reg-line);margin-bottom:1.5rem}
  .info-section-head{
    padding:1rem 1.5rem;border-bottom:1px solid var(--reg-line);background:var(--reg-warm);
    display:flex;justify-content:space-between;align-items:center;
  }
  .info-section-head h4{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--reg-ink);font-weight:600}
  .info-row{
    display:grid;grid-template-columns:260px 1fr;gap:1rem;padding:14px 1.5rem;
    border-bottom:1px solid var(--reg-line-soft);font-size:13px;
  }
  .info-row:last-child{border-bottom:none}
  .info-row .lbl{color:var(--reg-muted)}
  .info-row .val{color:var(--reg-ink);font-weight:500;font-variant-numeric:tabular-nums}
  .info-row .val.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}

  /* Empty */
  .empty{padding:3rem;text-align:center;background:#fff;border:1px solid var(--reg-line)}
  .empty i{font-size:32px;color:var(--reg-faint);margin-bottom:.75rem;display:block}
  .empty .t{
    font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    font-weight:500;font-size:22px;color:var(--reg-ink);margin-bottom:6px;letter-spacing:-.01em;
  }
  .empty .d{font-size:13px;color:var(--reg-muted);max-width:380px;margin:0 auto;line-height:1.6}

  /* Dropdown */
  .dropdown{position:relative;display:inline-block}
  .dropdown-menu{
    position:absolute;top:100%;right:0;margin-top:4px;z-index:50;
    background:#fff;border:1px solid var(--reg-line);min-width:180px;
    box-shadow:0 8px 24px -8px rgba(10,22,40,.18);
    animation:regFadeIn .12s ease;
  }
  .dropdown-item{
    display:flex;align-items:center;gap:10px;padding:10px 14px;font-size:13px;
    color:var(--reg-ink);background:none;border:none;width:100%;text-align:left;
    cursor:pointer;font-family:inherit;
  }
  .dropdown-item:hover{background:var(--reg-warm)}
  .dropdown-item.danger{color:var(--reg-red)}
  .dropdown-item i{font-size:14px;color:var(--reg-muted)}
  .dropdown-item.danger i{color:var(--reg-red)}
  .dropdown-sep{height:1px;background:var(--reg-line-soft);margin:4px 0}

  /* Health bar */
  .health-bar{height:6px;background:var(--reg-line-soft);position:relative;overflow:hidden}
  .health-bar-fill{height:100%;transition:width .8s cubic-bezier(.4,0,.2,1)}

  /* Pipeline bars */
  .pipe{display:flex;flex-direction:column;gap:14px;padding:.25rem 0}
  .pipe-row{display:grid;grid-template-columns:130px 1fr 60px;gap:14px;align-items:center}
  .pipe-label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--reg-ink)}
  .pipe-dot{width:8px;height:8px;flex-shrink:0}
  .pipe-bar{height:24px;background:var(--reg-cool);position:relative;overflow:hidden}
  .pipe-bar-fill{
    height:100%;transition:width .8s cubic-bezier(.4,0,.2,1);
    display:flex;align-items:center;padding:0 8px;
    font-size:10px;color:#fff;font-weight:600;letter-spacing:.04em;
  }
  .pipe-num{
    text-align:right;font-family:'Inter',sans-serif;
    font-size:20px;color:var(--reg-ink);letter-spacing:-.01em;
  }

  /* KPIs */
  .kpis{
    display:grid;grid-template-columns:repeat(5,1fr);gap:0;
    background:#fff;border:1px solid var(--reg-line);
  }
  .kpi{
    padding:1.5rem 1.5rem 1.25rem;border-right:1px solid var(--reg-line);
    display:flex;flex-direction:column;justify-content:space-between;
    min-height:140px;position:relative;transition:background .2s;
  }
  .kpi:last-child{border-right:none}
  .kpi:hover{background:var(--reg-warm)}
  .kpi-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem}
  .kpi-label{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--reg-muted);font-weight:600;line-height:1.4}
  .kpi-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid var(--reg-line);color:var(--reg-ink)}
  .kpi-icon i{font-size:16px}
  .kpi-value{
    font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    font-weight:500;font-size:48px;line-height:1;color:var(--reg-ink);letter-spacing:-.02em;
  }
  .kpi-sub{font-size:12px;color:var(--reg-muted);margin-top:8px;display:flex;align-items:center;gap:6px}
  .kpi-trend{display:inline-flex;align-items:center;gap:3px;font-weight:600}
  .kpi-trend.up{color:var(--reg-green)}
  .kpi-trend.down{color:var(--reg-red)}
  .kpi-trend i{font-size:12px}

  /* Welcome */
  .welcome{
    display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;
    padding-bottom:1.5rem;border-bottom:1px solid var(--reg-line);
  }
  .welcome-eyebrow{
    font-size:10px;letter-spacing:.16em;text-transform:uppercase;
    color:var(--reg-gold);font-weight:600;margin-bottom:.5rem;
    display:inline-flex;align-items:center;gap:10px;
  }
  .welcome-eyebrow::before{content:"";width:24px;height:1px;background:var(--reg-gold)}
  .welcome h1{
    font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    font-weight:500;font-size:42px;color:var(--reg-ink);line-height:1.05;letter-spacing:-.018em;margin-bottom:.5rem;
  }
  .welcome h1 em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--reg-ink-2);font-weight:400}
  .welcome p{font-size:14px;color:var(--reg-muted);max-width:560px;line-height:1.65}
  .welcome-side{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
  .live-indicator{
    display:inline-flex;align-items:center;gap:8px;
    font-size:11px;letter-spacing:.1em;text-transform:uppercase;
    color:var(--reg-muted);font-weight:600;
  }
  .live-indicator .dot{
    width:7px;height:7px;border-radius:50%;background:var(--reg-green);
    box-shadow:0 0 0 4px rgba(10,124,82,.16);
  }
  .welcome-side .stamp{font-size:12px;color:var(--reg-faint)}

  /* Quick actions */
  .quick{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--reg-line);background:#fff}
  .quick-item{
    padding:1.25rem 1.25rem 1.1rem;border-right:1px solid var(--reg-line);
    display:flex;flex-direction:column;gap:.5rem;
    cursor:pointer;text-decoration:none;color:var(--reg-ink);
    transition:background .15s,padding-left .15s;
  }
  .quick-item:last-child{border-right:none}
  .quick-item:hover{background:var(--reg-warm);padding-left:1.5rem}
  .quick-icon{
    width:36px;height:36px;display:flex;align-items:center;justify-content:center;
    color:var(--reg-ink);border:1px solid var(--reg-line);background:#fff;margin-bottom:.5rem;
  }
  .quick-icon i{font-size:16px}
  .quick-title{font-size:13px;font-weight:600;color:var(--reg-ink);line-height:1.3}
  .quick-desc{font-size:11px;color:var(--reg-muted);line-height:1.5}

  /* Donut */
  .donut-wrap{display:flex;align-items:center;gap:1.5rem;padding:.5rem 0}
  .donut{position:relative;width:180px;height:180px;flex-shrink:0}
  .donut-center{
    position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;text-align:center;pointer-events:none;
  }
  .donut-center .num{
    font-family:'Inter',sans-serif;font-size:36px;color:var(--reg-ink);
    line-height:1;letter-spacing:-.02em;
  }
  .donut-center .lbl{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--reg-muted);font-weight:600;margin-top:4px}
  .donut-legend{flex:1;display:flex;flex-direction:column;gap:14px;min-width:0}
  .legend-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;padding-bottom:12px;border-bottom:1px solid var(--reg-line-soft)}
  .legend-row:last-child{border-bottom:none;padding-bottom:0}
  .legend-mark{width:8px;height:24px;flex-shrink:0}
  .legend-meta{min-width:0}
  .legend-meta .n{font-size:13px;color:var(--reg-ink);font-weight:500;line-height:1.3}
  .legend-meta .s{font-size:11px;color:var(--reg-muted);margin-top:2px}
  .legend-num{
    font-family:'Inter',sans-serif;font-size:24px;color:var(--reg-ink);
    line-height:1;letter-spacing:-.02em;
  }

  /* Activity */
  .activity{display:flex;flex-direction:column}
  .activity-row{
    display:grid;grid-template-columns:auto 1fr auto auto;gap:14px;align-items:center;
    padding:12px 0;border-bottom:1px solid var(--reg-line-soft);
  }
  .activity-row:last-child{border-bottom:none}
  .act-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:var(--reg-cool);color:var(--reg-ink)}
  .act-icon i{font-size:14px}
  .act-meta{min-width:0}
  .act-text{font-size:13px;color:var(--reg-ink);line-height:1.4}
  .act-text strong{font-weight:500;color:var(--reg-ink)}
  .act-sub{font-size:11px;color:var(--reg-muted);margin-top:2px}
  .act-tag{font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;padding:3px 8px}
  .act-tag.created{background:var(--reg-green-tint);color:var(--reg-green)}
  .act-tag.updated{background:var(--reg-cool);color:var(--reg-ink-2)}
  .act-tag.deleted{background:var(--reg-red-tint);color:var(--reg-red)}
  .act-tag.approved{background:var(--reg-green-tint);color:var(--reg-green)}
  .act-tag.rejected{background:var(--reg-red-tint);color:var(--reg-red)}
  .act-tag.locked{background:var(--reg-amber-tint);color:var(--reg-amber)}
  .act-time{font-size:11px;color:var(--reg-faint);font-variant-numeric:tabular-nums}

  /* Grade inset */
  .grade-inset{margin-top:1.25rem;padding:1.25rem;background:var(--reg-warm);border:1px solid var(--reg-line)}
  .grade-inset-head{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--reg-gold);font-weight:600;margin-bottom:1rem}
  .grade-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
  .grade-stat .num{
    font-family:'Inter',sans-serif;font-size:32px;line-height:1;
    color:var(--reg-ink);letter-spacing:-.02em;
  }
  .grade-stat .lbl{font-size:11px;color:var(--reg-muted);margin-top:6px;letter-spacing:.05em}

  /* Treemap */
  .treemap{width:100%;height:340px;background:var(--reg-cool-2);display:grid;gap:2px;padding:2px}
  .treemap-cell{
    position:relative;overflow:hidden;display:flex;flex-direction:column;
    justify-content:flex-end;padding:12px 14px;color:#fff;cursor:pointer;transition:filter .15s;
  }
  .treemap-cell:hover{filter:brightness(1.05)}
  .treemap-cell .code{
    font-family:'Inter',sans-serif;font-size:24px;line-height:1;letter-spacing:-.015em;font-weight:400;
  }
  .treemap-cell .v{font-size:11px;letter-spacing:.06em;margin-top:6px;opacity:.85}
  .treemap-cell.small .code{font-size:18px}
  .treemap-cell.tiny .code{font-size:14px}
  .treemap-cell.tiny .v{display:none}

  /* Trends chart */
  .trends{background:#fff;border:1px solid var(--reg-line);display:grid;grid-template-columns:280px 1fr}
  .trends-side{padding:1.75rem;border-right:1px solid var(--reg-line);background:var(--reg-warm)}
  .trends-side .label{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--reg-gold);font-weight:600;margin-bottom:.75rem}
  .trends-side .big{
    font-family:'Inter',sans-serif;font-weight:500;font-size:54px;
    color:var(--reg-ink);line-height:1;letter-spacing:-.025em;
  }
  .trends-side .ctx{font-size:12px;color:var(--reg-muted);margin-top:8px}
  .trends-side .delta{
    display:inline-flex;align-items:center;gap:5px;
    margin-top:1rem;padding:5px 10px;background:#fff;
    border:1px solid var(--reg-line);font-size:12px;font-weight:500;color:var(--reg-green);
  }
  .trends-side .delta i{font-size:13px}
  .trends-side .delta.down{color:var(--reg-red)}
  .trends-legend{display:flex;flex-direction:column;gap:10px;margin-top:1.75rem;padding-top:1.5rem;border-top:1px solid var(--reg-line)}
  .trends-legend-row{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--reg-ink)}
  .trends-legend-mark{width:14px;height:14px;flex-shrink:0}
  .trends-legend-num{margin-left:auto;font-family:'Inter',sans-serif;font-weight:500;color:var(--reg-ink);letter-spacing:-.01em;font-size:14px}
  .trends-main{padding:1.75rem 1.75rem 1.5rem;display:flex;flex-direction:column}
  .trends-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--reg-line-soft)}
  .trends-head h4{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--reg-muted);font-weight:600}
  .trends-head h4 span{display:block;font-family:'Inter',sans-serif;font-weight:500;font-size:20px;color:var(--reg-ink);text-transform:none;letter-spacing:-.01em;margin-top:4px}
  .trends-tabs{display:flex;gap:0;background:var(--reg-cool);padding:2px}
  .trends-tab{padding:5px 12px;font-size:11px;font-weight:500;color:var(--reg-muted);cursor:pointer;background:none;border:none;font-family:inherit;letter-spacing:.04em}
  .trends-tab.active{background:#fff;color:var(--reg-ink);font-weight:600;box-shadow:0 1px 2px rgba(10,22,40,.06)}
  .trends-chart{flex:1;position:relative;padding-top:1rem}
  .trends-yaxis-label,.trends-xaxis-label{font-size:11px;fill:var(--reg-muted);font-family:inherit}
  .trends-xaxis-label{font-weight:500;fill:var(--reg-ink)}
  .trends-grid-line{stroke:var(--reg-line-soft);stroke-width:1}

  /* Form */
  .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}
  .form-field{display:flex;flex-direction:column;gap:6px}
  .form-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--reg-muted);font-weight:600}
  .form-input,.form-select,.form-textarea{
    padding:10px 12px;font-size:13px;background:#fff;border:1px solid var(--reg-line);
    outline:none;color:var(--reg-ink);font-family:inherit;
  }
  .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--reg-ink)}
  .form-textarea{min-height:120px;resize:vertical;line-height:1.55}

  /* Footer */
  .foot-note{
    font-size:11px;color:var(--reg-faint);letter-spacing:.04em;
    padding-top:.5rem;border-top:1px solid var(--reg-line-soft);
    display:flex;justify-content:space-between;
  }
  .foot-note .live{display:inline-flex;align-items:center;gap:6px}
  .foot-note .live .dot{width:5px;height:5px;border-radius:50%;background:var(--reg-green)}

  /* Responsive */
  @media(max-width:1280px){
    .kpis{grid-template-columns:repeat(3,1fr)}
    .kpi:nth-child(3){border-right:none}
  }
  @media(max-width:980px){
    .row-2,.row-21{grid-template-columns:1fr}
    .kpis{grid-template-columns:repeat(2,1fr)}
    .quick{grid-template-columns:1fr 1fr}
  }

  @keyframes regFadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pageIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .page{animation:pageIn .25s cubic-bezier(.4,0,.2,1)}
  /* ── Responsive: mobile navigation + layout collapse ───────────────────── */
  .reg-navtoggle{display:none;align-items:center;justify-content:center;width:38px;height:38px;flex-shrink:0;border:1px solid var(--line,#e5e7eb);background:#fff;border-radius:10px;color:inherit;font-size:19px;cursor:pointer;}
  .reg-navback{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:60;}

  @media(max-width:980px){
    .reg-sb{position:fixed;top:0;left:0;bottom:0;z-index:70;width:262px;height:100dvh;transform:translateX(-100%);transition:transform .22s ease;}
    .reg-sb.is-open{transform:none;}
    .reg-navtoggle{display:inline-flex;}
    .reg-body{padding:1.25rem 1rem 2.5rem;}
    .reg-topbar{padding:0 1rem;gap:.75rem;}
    .reg-topbar-search,.reg-search{display:none;}
    .row-2,.row-21{grid-template-columns:1fr;}
    .kpis{grid-template-columns:repeat(2,1fr);}
  }

  @media(max-width:560px){
    .reg-body{padding:1rem .85rem 2rem;}
    .reg-crumbs{font-size:11px;min-width:0;overflow:hidden;}
    .reg-crumbs .here{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .reg-toast-host{left:.75rem;right:.75rem;bottom:.75rem;}
  }

  @media(max-width:700px){
    .reg-user-meta,.reg-user-name,.reg-user-role{display:none;}
    .reg-user-chip{padding:4px;gap:0;}
    .reg-user-chip .ti-chevron-down{display:none;}
    .reg-term-chip,.reg-topbar-term{display:none;}
    .reg-topbar-actions,.reg-ta{gap:.4rem;min-width:0;}
  }

  @media(max-width:620px){
    /* Stat tiles: let content shrink and wrap instead of forcing the page wide */
    .stat-row{grid-template-columns:repeat(auto-fit,minmax(140px,1fr));}
    .stat-row .stat{padding:1rem .9rem;min-width:0;}
    .stat-row .stat .num{font-size:24px;min-width:0;overflow-wrap:anywhere;}
    .stat-row .stat .lbl{min-width:0;overflow-wrap:anywhere;}
    .tag{white-space:normal;overflow-wrap:anywhere;letter-spacing:.05em;max-width:100%;}
  }

  /* Narrow laptops/tablets: the docked sidebar leaves the main column tight,
     so compact the topbar and let wide tables scroll inside their own box. */
  @media(max-width:1100px){
    .reg-topbar{gap:.6rem;}
    .reg-topbar-actions,.reg-ta{min-width:0;gap:.45rem;}
    .reg-user-chip,.stu-uc{min-width:0;}
    .reg-user-name,.reg-user-role,.reg-user-meta,.stu-um{display:none;}
    .reg-term-chip,.reg-topbar-term,.term-chip{display:none;}
    .reg-topbar-search,.reg-search,.stu-ts{display:none;}
    .reg-body table{display:block;width:100%;max-width:100%;overflow-x:auto;}
    .reg-body .page,.reg-body .db-card{min-width:0;max-width:100%;}
  }

`;
