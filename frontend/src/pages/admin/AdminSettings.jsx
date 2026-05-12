import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value ?? '—'}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

export default function AdminSettings() {
  const { user, logout } = useAuth();
  const [stats, setStats]     = useState(null);
  const [terms, setTerms]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [termError, setTermError] = useState('');
  const [updatingTerm, setUpdatingTerm] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/auth/admin/stats/'),
      api.get('/enrollment/terms/'),
    ])
      .then(([statsRes, termsRes]) => {
        setStats(statsRes.data);
        setTerms(termsRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleEnrollment(term, shouldOpen) {
    setUpdatingTerm(term.id);
    setTermError('');
    try {
      await api.patch(`/enrollment/terms/${term.id}/enrollment/`, {
        enrollment_open: shouldOpen,
      });
      const termsRes = await api.get('/enrollment/terms/');
      setTerms(termsRes.data);
    } catch (err) {
      setTermError(err.response?.data?.error || 'Failed to update enrollment status.');
    } finally {
      setUpdatingTerm(null);
    }
  }

  const generatedAt = stats?.generated_at ? new Date(stats.generated_at) : null;

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link" to="/admin/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/admin/users">User Management</Link>
        <Link className="sidebar-link" to="/admin/programs">Programs &amp; Curriculum</Link>
        <Link className="sidebar-link" to="/admin/audit-log">Audit Log</Link>
        <Link className="sidebar-link" to="/admin/announcements">Announcements</Link>
        <Link className="sidebar-link active" to="/admin/settings">System Settings</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>System Settings</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        <Section title="Application">
          <InfoRow label="System Name"    value="NEMSUonePortal" />
          <InfoRow label="Institution"    value="NEMSU – Cantilan Campus, Surigao del Sur" />
          <InfoRow label="Version"        value="Sprint 8 — System Administrator Panel" />
          <InfoRow label="Framework"      value="Django 5 + React (Vite)" />
          <InfoRow label="Database"       value="PostgreSQL" />
          <InfoRow label="Auth Method"    value="JWT (access in memory · refresh in HttpOnly cookie)" />
        </Section>

        <Section title="Live System State">
          {loading ? (
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading…</p>
          ) : (
            <>
              <InfoRow label="Server Time"         value={generatedAt ? generatedAt.toLocaleString('en-PH') : '—'} />
              <InfoRow label="Total Users"          value={stats?.users?.total} />
              <InfoRow label="Locked Accounts"      value={stats?.users?.locked} />
              <InfoRow label="Unverified Accounts"  value={stats?.users?.unverified} />
              <InfoRow label="Inactive Accounts"    value={stats?.users?.inactive} />
              <InfoRow label="Pending Enrollments"  value={stats?.enrollments?.pending} />
              <InfoRow label="Open Document Requests"
                value={(stats?.documents?.submitted ?? 0) + (stats?.documents?.processing ?? 0) + (stats?.documents?.ready ?? 0)} />
            </>
          )}
        </Section>

        <Section title="Enrollment Window">
          <p style={styles.sectionHelp}>
            Open one academic term for student enrollment. Opening a term closes the other enrollment windows.
          </p>
          {termError && <div style={styles.alertError}>{termError}</div>}
          {terms.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No active academic terms are available.</p>
          ) : terms.map(t => (
            <div key={t.id} style={styles.termRow}>
              <div>
                <span style={styles.termName}>{t.semester_display} {t.year}</span>
                <span style={t.enrollment_open ? styles.openPill : styles.closedPill}>
                  {t.enrollment_open ? 'Open' : 'Closed'}
                </span>
              </div>
              <button
                style={t.enrollment_open ? styles.btnClose : styles.btnOpen}
                disabled={updatingTerm === t.id}
                onClick={() => toggleEnrollment(t, !t.enrollment_open)}
              >
                {updatingTerm === t.id ? 'Saving...' : t.enrollment_open ? 'Close Enrollment' : 'Open Enrollment'}
              </button>
            </div>
          ))}
        </Section>

        <Section title="Security Configuration">
          <InfoRow label="Password Hashing"        value="Argon2id (primary), PBKDF2, BCrypt (fallback)" />
          <InfoRow label="Access Token Lifetime"   value="30 minutes" />
          <InfoRow label="Refresh Token Lifetime"  value="7 days (HttpOnly, SameSite=Strict)" />
          <InfoRow label="Login Lockout Threshold" value="5 failed attempts (exponential backoff, max 24 h)" />
          <InfoRow label="CORS Policy"             value="Credentials allowed, origin-restricted" />
          <InfoRow label="Security Headers"        value="X-Frame-Options: DENY · X-Content-Type-Options · XSS Filter" />
          <InfoRow label="Standard"                value="OWASP Top 10:2025 · RA 10173 (Data Privacy Act)" />
        </Section>

        <div style={styles.notice}>
          <strong>Note:</strong> Server-level configuration (environment variables, database credentials,
          email settings, allowed hosts) is managed via the <code>.env</code> file on the server and
          requires a server restart to take effect. Changes to those settings cannot be made through this interface.
        </div>
      </main>
    </div>
  );
}

const styles = {
  section:      { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.1rem 1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  sectionTitle: { fontSize: '0.82rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' },
  infoRow:      { display: 'flex', gap: '1rem', padding: '0.45rem 0', borderBottom: '1px solid #f3f4f6', alignItems: 'flex-start' },
  infoLabel:    { fontSize: '0.85rem', color: '#6b7280', fontWeight: 600, minWidth: 220, flexShrink: 0 },
  infoValue:    { fontSize: '0.85rem', color: '#1e3a5f' },
  sectionHelp:  { margin: '0 0 0.75rem', color: '#6b7280', fontSize: '0.85rem' },
  alertError:   { background: '#fee2e2', color: '#991b1b', padding: '0.65rem 0.85rem', borderRadius: 6, marginBottom: '0.75rem', fontSize: '0.85rem' },
  termRow:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '0.65rem 0', borderBottom: '1px solid #f3f4f6' },
  termName:     { color: '#1e3a5f', fontWeight: 700, fontSize: '0.9rem', marginRight: '0.5rem' },
  openPill:     { background: '#d1fae5', color: '#065f46', borderRadius: 999, padding: '0.15rem 0.55rem', fontWeight: 700, fontSize: '0.74rem' },
  closedPill:   { background: '#f3f4f6', color: '#4b5563', borderRadius: 999, padding: '0.15rem 0.55rem', fontWeight: 700, fontSize: '0.74rem' },
  btnOpen:      { background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '0.42rem 0.9rem', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' },
  btnClose:     { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 6, padding: '0.42rem 0.9rem', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' },
  notice:       { background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '0.9rem 1.1rem', fontSize: '0.85rem', color: '#78350f', lineHeight: 1.6 },
};
