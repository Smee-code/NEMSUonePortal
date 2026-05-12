import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function FacultyDashboard() {
  const { user, logout } = useAuth();
  const [currentTerm, setCurrentTerm] = useState(null);

  useEffect(() => {
    api.get('/enrollment/current-term/')
      .then(res => setCurrentTerm(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link active" to="/faculty/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/faculty/grades">Grade Encoding</Link>
        <Link className="sidebar-link" to="/faculty/schedule">Teaching Load</Link>
        <Link className="sidebar-link" to="/faculty/announcements">Announcements</Link>
        <Link className="sidebar-link" to="/faculty/profile">My Profile</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Welcome, {user?.full_name}</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        <div style={styles.termCard}>
          <div style={styles.termLabel}>Current Term</div>
          <div style={styles.termValue}>{currentTerm?.semester_display || 'No regular term'}</div>
          <div style={styles.termSub}>{currentTerm?.year || 'July is not mapped to first or second semester'}</div>
        </div>

        <div className="coming-soon">
          <h2>Faculty Portal</h2>
          <p>Use the sidebar to access grade encoding, teaching load, and announcements.</p>
        </div>
      </main>
    </div>
  );
}

const styles = {
  termCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderLeft: '4px solid #10b981',
    borderRadius: 10,
    padding: '1rem 1.25rem',
    marginBottom: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    maxWidth: 360,
  },
  termLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '0.35rem',
  },
  termValue: { fontSize: '1.35rem', fontWeight: 800, color: '#1e3a5f' },
  termSub: { fontSize: '0.85rem', color: '#6b7280', marginTop: '0.2rem' },
};
