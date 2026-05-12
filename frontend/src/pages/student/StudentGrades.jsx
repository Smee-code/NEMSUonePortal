import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function StudentGrades() {
  const { user, logout } = useAuth();
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/grades/my/')
      .then(res => setGrades(res.data))
      .catch(() => setError('Failed to load grades. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  // Group grades by term
  const byTerm = grades.reduce((acc, g) => {
    const key = g.term_display;
    if (!acc[key]) acc[key] = { display: g.term_display, year: g.term_year, semester: g.term_semester, records: [] };
    acc[key].records.push(g);
    return acc;
  }, {});

  const terms = Object.values(byTerm).sort((a, b) =>
    b.year.localeCompare(a.year) || a.semester.localeCompare(b.semester)
  );

  function gpa(records) {
    const numeric = records.filter(r => !isNaN(parseFloat(r.grade)));
    if (numeric.length === 0) return null;
    const totalUnits = numeric.reduce((s, r) => s + parseFloat(r.subject_units || 0), 0);
    const weighted = numeric.reduce((s, r) => s + parseFloat(r.grade) * parseFloat(r.subject_units || 0), 0);
    return totalUnits > 0 ? (weighted / totalUnits).toFixed(2) : null;
  }

  function gradeColor(grade) {
    if (!grade) return '#6b7280';
    const n = parseFloat(grade);
    if (isNaN(n)) return grade === 'INC' ? '#92400e' : '#991b1b';
    if (n <= 3.00) return '#065f46';
    return '#991b1b';
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link" to="/student/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/student/enrollment">Enrollment</Link>
        <Link className="sidebar-link" to="/student/courses">My Courses</Link>
        <Link className="sidebar-link active" to="/student/grades">My Grades</Link>
        <Link className="sidebar-link" to="/student/schedule">Schedule</Link>
        <Link className="sidebar-link" to="/student/documents">Document Requests</Link>
        <Link className="sidebar-link" to="/student/announcements">Announcements</Link>
        <Link className="sidebar-link" to="/student/profile">My Profile</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>My Grades</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {error && <div style={styles.alertError}>{error}</div>}

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading grades…</p>
        ) : terms.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            No grades available yet. Grades appear here once your faculty submits them.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {terms.map(term => {
              const termGpa = gpa(term.records);
              return (
                <div key={term.display} style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1rem', color: '#1e3a5f' }}>
                      {term.display}
                    </h2>
                    {termGpa && (
                      <span style={{ fontSize: '0.85rem', color: '#374151' }}>
                        Term GWA:&nbsp;
                        <strong style={{ color: parseFloat(termGpa) <= 3.0 ? '#065f46' : '#991b1b' }}>
                          {termGpa}
                        </strong>
                      </span>
                    )}
                  </div>

                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['Subject Code', 'Subject Name', 'Units', 'Grade', 'Remarks'].map(h => (
                          <th key={h} style={styles.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {term.records.map(r => (
                        <tr key={r.id}>
                          <td style={styles.td}><strong>{r.subject_code}</strong></td>
                          <td style={styles.td}>{r.subject_name}</td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>{formatUnits(r.subject_units)}</td>
                          <td style={{ ...styles.td, textAlign: 'center',
                            fontWeight: 700, color: gradeColor(r.grade) }}>
                            {r.grade || '—'}
                          </td>
                          <td style={{ ...styles.td, color: '#6b7280', fontSize: '0.85rem' }}>
                            {r.remarks || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function formatUnits(val) {
  const n = parseFloat(val);
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

const styles = {
  alertError: {
    background: '#fee2e2', color: '#991b1b', padding: '0.75rem',
    borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem',
  },
  card: {
    background: '#fff', border: '1px solid #e5e7eb',
    borderRadius: 8, padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem',
  },
  th: {
    textAlign: 'left', padding: '0.5rem 0.75rem',
    background: '#f9fafb', borderBottom: '2px solid #e5e7eb',
    fontWeight: 600, color: '#374151', fontSize: '0.82rem',
  },
  td: {
    padding: '0.55rem 0.75rem', borderBottom: '1px solid #f3f4f6', color: '#1f2937',
  },
};
