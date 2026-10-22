import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// The only path that stays reachable during maintenance — a hidden admin login
// URL. Everyone else (including the normal /login) sees the notice, so the admin
// entry point isn't advertised.
const ALLOW_PREFIXES = ['/admin-maintenance-mode-login'];

export default function MaintenanceGate({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [maint, setMaint] = useState(null); // { enabled, message } | null while unknown

  const check = useCallback(() => {
    api.get('/auth/maintenance/')
      .then(r => setMaint(r.data))
      .catch(() => setMaint(m => m || { enabled: false, message: '' }));
  }, []);

  useEffect(() => { check(); }, [check, user?.id]);

  // Re-check periodically so a non-admin already in the app is moved to the
  // notice shortly after an admin flips it on (and back).
  useEffect(() => {
    const t = setInterval(check, 20000);
    return () => clearInterval(t);
  }, [check]);

  const isAdmin = user?.role === 'admin';
  const onAllowed = ALLOW_PREFIXES.some(p => location.pathname.startsWith(p));

  if (maint?.enabled && !isAdmin && !onAllowed) {
    return <MaintenanceNotice message={maint.message} />;
  }

  return (
    <>
      {maint?.enabled && isAdmin && <MaintenanceBanner onOff={check} />}
      {children}
    </>
  );
}

function MaintenanceBanner() {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, padding: '8px 14px', background: '#b45309', color: '#fff',
      font: "600 12.5px 'Inter',sans-serif", textAlign: 'center',
    }}>
      <i className="ti ti-tool" style={{ fontSize: 15 }} />
      Maintenance mode is ON — only administrators can use the system.
      <Link to="/admin/settings" style={{ color: '#fff', textDecoration: 'underline', marginLeft: 4 }}>Manage</Link>
    </div>
  );
}

function MaintenanceNotice({ message }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: '#0a1628',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem',
      fontFamily: "'Inter',-apple-system,sans-serif",
    }}>
      <div style={{ maxWidth: 460, textAlign: 'center', color: '#e8edf5' }}>
        <div style={{
          width: 72, height: 72, margin: '0 auto 1.4rem', borderRadius: '50%',
          background: 'rgba(184,144,67,.16)', color: '#d9b96b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-tool" style={{ fontSize: 34 }} />
        </div>
        <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: '#b8860b', fontWeight: 700, marginBottom: 10 }}>
          NEMSUonePortal
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 .7rem', letterSpacing: '-.01em' }}>
          We&rsquo;ll be right back
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#aab6c8', margin: 0 }}>
          {message || 'The portal is temporarily down for maintenance. Please check back in a little while — thank you for your patience.'}
        </p>
      </div>
    </div>
  );
}
