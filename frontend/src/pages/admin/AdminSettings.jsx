import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAdminShell } from '../../context/AdminShellContext';

export default function AdminSettings() {
  const { toast } = useAdminShell();

  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  const [maint, setMaint]       = useState({ enabled: false, message: '' });
  const [maintSaving, setMaintSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/admin/stats/')
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    api.get('/auth/maintenance/').then(r => setMaint(r.data)).catch(() => {});
  }, []);

  async function saveMaintenance(nextEnabled) {
    const enabled = typeof nextEnabled === 'boolean' ? nextEnabled : maint.enabled;
    setMaintSaving(true);
    try {
      const res = await api.post('/auth/maintenance/', { enabled, message: maint.message });
      setMaint(res.data);
      toast?.(enabled ? 'Maintenance mode is ON — only admins can access the system.' : 'Maintenance mode is OFF.',
        { type: enabled ? 'success' : 'success' });
    } catch (e) {
      toast?.(e.response?.data?.error || 'Couldn’t update maintenance mode.', { type: 'error' });
    } finally {
      setMaintSaving(false);
    }
  }

  const generatedAt = stats?.generated_at ? new Date(stats.generated_at) : null;

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">System · Configuration</div>
          <h2>System <em>settings</em></h2>
          <div className="sub">Application configuration, live system state, and security parameters.</div>
        </div>
      </div>

      <div className={`ss-maint${maint.enabled ? ' on' : ''}`}>
        <div className="ss-maint-top">
          <div className="ss-maint-ic"><i className="ti ti-tool" /></div>
          <div className="ss-maint-txt">
            <h4>Maintenance mode {maint.enabled && <span className="ss-maint-pill">ON</span>}</h4>
            <p>When on, students, faculty, and the registrar see a &ldquo;We&rsquo;ll be right back&rdquo; notice and cannot use the system. Administrators keep full access, so you can fix issues and switch it back off.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={maint.enabled}
            className={`ss-switch${maint.enabled ? ' on' : ''}`}
            disabled={maintSaving}
            onClick={() => saveMaintenance(!maint.enabled)}
            title={maint.enabled ? 'Turn maintenance mode off' : 'Turn maintenance mode on'}
          >
            <span className="ss-switch-knob" />
          </button>
        </div>
        <label className="ss-maint-label" htmlFor="ss-maint-msg">Message shown to users <span className="ss-opt">(optional)</span></label>
        <textarea
          id="ss-maint-msg"
          className="ss-maint-msg"
          rows={2}
          placeholder="e.g. We’re upgrading the grading module and will be back by 5:00 PM. Thank you for your patience."
          value={maint.message}
          onChange={e => setMaint(m => ({ ...m, message: e.target.value }))}
        />
        <div className="ss-maint-actions">
          <button className="btn-sec" disabled={maintSaving} onClick={() => saveMaintenance(maint.enabled)}>
            {maintSaving ? 'Saving…' : 'Save message'}
          </button>
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
  .ss-maint{background:#fff;border:1px solid var(--adm-line,#e2e8f0);border-radius:12px;padding:1.2rem 1.4rem;margin-bottom:1.4rem;}
  .ss-maint.on{border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.12);}
  .ss-maint-top{display:flex;align-items:flex-start;gap:14px;}
  .ss-maint-ic{flex-shrink:0;width:42px;height:42px;border-radius:10px;background:var(--adm-amber-tint,#fef3c7);color:#b45309;display:flex;align-items:center;justify-content:center;font-size:21px;}
  .ss-maint.on .ss-maint-ic{background:#b45309;color:#fff;}
  .ss-maint-txt{flex:1;min-width:0;}
  .ss-maint-txt h4{margin:0 0 .25rem;font:700 15px 'Inter',sans-serif;color:var(--adm-ink,#0a1628);display:flex;align-items:center;gap:8px;}
  .ss-maint-txt p{margin:0;font-size:12.5px;line-height:1.55;color:var(--adm-muted,#64748b);}
  .ss-maint-pill{font-size:10px;font-weight:800;letter-spacing:.06em;background:#b45309;color:#fff;padding:2px 8px;border-radius:999px;}
  .ss-switch{flex-shrink:0;width:50px;height:28px;border-radius:999px;border:none;background:#cbd5e1;position:relative;cursor:pointer;transition:background .18s;padding:0;}
  .ss-switch.on{background:#16a34a;}
  .ss-switch:disabled{opacity:.6;cursor:default;}
  .ss-switch-knob{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .18s;}
  .ss-switch.on .ss-switch-knob{left:25px;}
  .ss-maint-label{display:block;font-size:12px;font-weight:600;color:var(--adm-ink,#0a1628);margin:1.1rem 0 5px;}
  .ss-opt{font-weight:400;color:var(--adm-faint,#94a3b8);}
  .ss-maint-msg{width:100%;box-sizing:border-box;border:1px solid var(--adm-line,#e2e8f0);border-radius:8px;padding:.6rem .8rem;font:13px/1.5 'Inter',sans-serif;color:var(--adm-ink,#0a1628);outline:none;resize:vertical;}
  .ss-maint-msg:focus{border-color:var(--adm-ink,#0a1628);}
  .ss-maint-actions{display:flex;justify-content:flex-end;margin-top:.7rem;}
  .ss-loading{padding:1rem 1.5rem;font-size:13px;color:var(--adm-muted)}
  .ss-help{margin:0 0 .75rem;color:var(--adm-muted);font-size:13px;padding:0 1.5rem;padding-top:1rem}
  .ss-link{display:inline-flex;align-items:center;gap:6px;color:var(--adm-ink-2);font-weight:600;font-size:13px;text-decoration:none;padding:0 1.5rem 1rem}
  .ss-link:hover{color:var(--adm-ink);text-decoration:underline}
  .ss-link i{font-size:13px}
  .ss-notice{background:var(--adm-amber-tint);border:1px solid #fde68a;padding:.9rem 1.1rem;font-size:13px;color:#78350f;line-height:1.6;margin-bottom:1.5rem}
  .ss-notice code{font-family:'Courier New',monospace;background:rgba(160,107,22,.12);padding:1px 5px}
`;
