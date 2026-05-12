import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function FacultyProfile() {
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ department: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/auth/academic-profile/'),
      api.get('/auth/departments/'),
    ]).then(([profileRes, deptRes]) => {
      const p = profileRes.data;
      setProfile(p);
      setDepartments(deptRes.data);
      setForm({ department: p.department_id ?? '' });
    }).catch(() => setError('Failed to load profile data.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.patch('/auth/academic-profile/', {
        department: form.department || null,
      });
      setProfile(res.data);
      setSuccess('Department updated successfully.');
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const msgs = Object.values(data).flat().join(' ');
        setError(msgs);
      } else {
        setError('Failed to save changes.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link" to="/faculty/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/faculty/grades">Grade Encoding</Link>
        <Link className="sidebar-link" to="/faculty/schedule">Teaching Load</Link>
        <Link className="sidebar-link" to="/faculty/announcements">Announcements</Link>
        <Link className="sidebar-link active" to="/faculty/profile">My Profile</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>My Profile</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {loading ? (
          <p style={s.muted}>Loading profile…</p>
        ) : (
          <div style={s.grid}>
            {/* ── Account Info (read-only) ── */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>Account Information</h2>
              <div style={s.infoGrid}>
                <InfoRow label="Full Name" value={profile?.full_name} />
                <InfoRow label="Faculty ID" value={profile?.student_id} />
                <InfoRow label="Email" value={profile?.institutional_email} />
                <InfoRow label="Role" value="Faculty" />
                <InfoRow label="Email Verified" value={profile?.is_verified ? 'Yes' : 'No'} />
              </div>
            </div>

            {/* ── Academic Info (editable) ── */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>Academic Information</h2>

              <div style={s.currentSection}>
                <p style={s.currentLabel}>Current Department</p>
                <p style={s.currentValue}>
                  {profile?.department_name || <span style={s.none}>Not set</span>}
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={s.fieldGroup}>
                  <label style={s.label} htmlFor="department">Department</label>
                  <select
                    id="department"
                    style={s.select}
                    value={form.department}
                    onChange={e => setForm({ department: e.target.value })}
                  >
                    <option value="">— Not Set —</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                    ))}
                  </select>
                </div>

                {error && <p style={s.errorMsg}>{error}</p>}
                {success && <p style={s.successMsg}>{success}</p>}

                <button type="submit" style={s.btnSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'contents' }}>
      <span style={{ fontWeight: 600, color: '#6b7280', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ color: '#1f2937', fontSize: '0.9rem', wordBreak: 'break-all' }}>{value ?? '—'}</span>
    </div>
  );
}

const s = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardTitle: { margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: '#1e3a5f' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.6rem 1.25rem', alignItems: 'baseline' },
  currentSection: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem' },
  currentLabel: { margin: '0 0 0.2rem', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' },
  currentValue: { margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1e3a5f' },
  none: { color: '#9ca3af', fontStyle: 'italic', fontWeight: 400 },
  fieldGroup: { marginBottom: '1rem' },
  label: { display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#374151', marginBottom: '0.35rem' },
  select: { width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' },
  btnSave: { background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.55rem 1.25rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.25rem' },
  errorMsg: { color: '#b91c1c', fontSize: '0.85rem', marginBottom: '0.5rem' },
  successMsg: { color: '#065f46', background: '#d1fae5', borderRadius: 6, padding: '0.5rem 0.75rem', fontSize: '0.85rem', marginBottom: '0.5rem' },
  muted: { color: '#9ca3af', fontSize: '0.9rem' },
};
