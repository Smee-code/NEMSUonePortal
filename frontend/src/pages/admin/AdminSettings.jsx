import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAdminShell } from '../../context/AdminShellContext';

export default function AdminSettings() {
  useAdminShell(); // ensures admin context

  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/admin/stats/')
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generatedAt = stats?.generated_at ? new Date(stats.generated_at) : null;

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">System · Read-only overview</div>
          <h2>System <em>settings</em></h2>
          <div className="sub">Application configuration, live system state, and security parameters.</div>
        </div>
      </div>

      <SettingsSection title="Application">
        <SettingsRow label="System name"    value="NEMSUonePortal" />
        <SettingsRow label="Institution"    value="NEMSU – Cantilan Campus, Surigao del Sur" />
        <SettingsRow label="Version"        value="Sprint 8: System Administrator Panel" />
        <SettingsRow label="Framework"      value="Django 5 + React (Vite)" />
        <SettingsRow label="Database"       value="SQLite (WAL mode)" />
        <SettingsRow label="Auth method"    value="JWT (access in memory · refresh in HttpOnly cookie)" />
      </SettingsSection>

      <SettingsSection title="Live system state">
        {loading ? (
          <div className="ss-loading">Loading…</div>
        ) : (
          <>
            <SettingsRow label="Server time"           value={generatedAt ? generatedAt.toLocaleString('en-PH') : '-'} />
            <SettingsRow label="Total users"           value={stats?.users?.total} />
            <SettingsRow label="Locked accounts"       value={stats?.users?.locked} />
            <SettingsRow label="Unverified accounts"   value={stats?.users?.unverified} />
            <SettingsRow label="Inactive accounts"     value={stats?.users?.inactive} />
            <SettingsRow label="Pending enrollments"   value={stats?.enrollments?.pending} />
            <SettingsRow
              label="Open document requests"
              value={(stats?.documents?.submitted ?? 0) + (stats?.documents?.processing ?? 0) + (stats?.documents?.ready ?? 0)}
            />
          </>
        )}
      </SettingsSection>

      <SettingsSection title="Enrollment window">
        <p className="ss-help">
          Academic term management and enrollment window control have moved to the dedicated Academic Terms page.
        </p>
        <Link to="/admin/terms" className="ss-link">
          Manage Academic Terms <i className="ti ti-arrow-right" />
        </Link>
      </SettingsSection>

      <SettingsSection title="Security configuration">
        <SettingsRow label="Password hashing"         value="Argon2id (primary), PBKDF2, BCrypt (fallback)" />
        <SettingsRow label="Access token lifetime"    value="30 minutes" />
        <SettingsRow label="Refresh token lifetime"   value="7 days (HttpOnly, SameSite=Strict)" />
        <SettingsRow label="Login lockout threshold"  value="5 failed attempts (exponential backoff, max 24 h)" />
        <SettingsRow label="CORS policy"              value="Credentials allowed, origin-restricted" />
        <SettingsRow label="Security headers"         value="X-Frame-Options: DENY · X-Content-Type-Options · XSS Filter" />
        <SettingsRow label="Standard"                 value="OWASP Top 10:2025 · RA 10173 (Data Privacy Act)" />
      </SettingsSection>

      <div className="ss-notice">
        <strong>Note:</strong> Server-level configuration (environment variables, database credentials,
        email settings, allowed hosts) is managed via the <code>.env</code> file on the server and
        requires a server restart to take effect. Changes to those settings cannot be made through this interface.
      </div>
    </>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div className="info-section" style={{ marginBottom: '1rem' }}>
      <div className="info-section-head">
        <h4>{title}</h4>
      </div>
      <div>{children}</div>
    </div>
  );
}

function SettingsRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="lbl">{label}</span>
      <span className="val">{value ?? '-'}</span>
    </div>
  );
}

const CSS = `
  .ss-loading{padding:1rem 1.5rem;font-size:13px;color:var(--adm-muted)}
  .ss-help{margin:0 0 .75rem;color:var(--adm-muted);font-size:13px;padding:0 1.5rem;padding-top:1rem}
  .ss-link{display:inline-flex;align-items:center;gap:6px;color:var(--adm-ink-2);font-weight:600;font-size:13px;text-decoration:none;padding:0 1.5rem 1rem}
  .ss-link:hover{color:var(--adm-ink);text-decoration:underline}
  .ss-link i{font-size:13px}
  .ss-notice{background:var(--adm-amber-tint);border:1px solid #fde68a;padding:.9rem 1.1rem;font-size:13px;color:#78350f;line-height:1.6;margin-bottom:1.5rem}
  .ss-notice code{font-family:'Courier New',monospace;background:rgba(160,107,22,.12);padding:1px 5px}
`;
