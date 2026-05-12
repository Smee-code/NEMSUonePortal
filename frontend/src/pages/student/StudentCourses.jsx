import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const TYPE_COLORS = {
  lecture: { bg: '#eff6ff', color: '#1d4ed8', label: 'Lecture' },
  lab:     { bg: '#f0fdf4', color: '#15803d', label: 'Lab' },
  pe:      { bg: '#fdf4ff', color: '#7e22ce', label: 'PE' },
  nstp:    { bg: '#fff7ed', color: '#c2410c', label: 'NSTP' },
};

export default function StudentCourses() {
  const { user, logout } = useAuth();

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/enrollment/my/')
      .then(res => setEnrollments(res.data))
      .catch(() => setError('Failed to load courses. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  // Most recent approved enrollment = current courses
  const current = enrollments
    .filter(e => e.status === 'approved')
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0] || null;

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link" to="/student/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/student/enrollment">Enrollment</Link>
        <Link className="sidebar-link active" to="/student/courses">My Courses</Link>
        <Link className="sidebar-link" to="/student/grades">My Grades</Link>
        <Link className="sidebar-link" to="/student/schedule">Schedule</Link>
        <Link className="sidebar-link" to="/student/documents">Document Requests</Link>
        <Link className="sidebar-link" to="/student/announcements">Announcements</Link>
        <Link className="sidebar-link" to="/student/profile">My Profile</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>My Courses</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {loading && (
          <div style={{ padding: '2rem', color: '#6b7280', textAlign: 'center' }}>Loading courses…</div>
        )}

        {!loading && error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '1rem 1.25rem', borderRadius: 8 }}>{error}</div>
        )}

        {!loading && !error && !current && (
          <EmptyState />
        )}

        {!loading && !error && current && (
          <div>
            {/* Term badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.5rem 1rem' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Academic Term</span>
                <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 15 }}>
                  {current.academic_term?.semester_display} {current.academic_term?.year}
                </div>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.5rem 1rem' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Program</span>
                <div style={{ fontWeight: 700, color: '#065f46', fontSize: 15 }}>{current.program_code} — {current.program_name}</div>
              </div>
              <div style={{ background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '0.5rem 1rem' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Year Level</span>
                <div style={{ fontWeight: 700, color: '#6b21a8', fontSize: 15 }}>{current.year_level_display}</div>
              </div>
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '0.5rem 1rem' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Student Type</span>
                <div style={{ fontWeight: 700, color: '#9a3412', fontSize: 15 }}>{current.student_type_display}</div>
              </div>
            </div>

            {/* Subjects table */}
            {current.subjects.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                No subjects were assigned to this enrollment. Please contact the registrar.
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={th}>#</th>
                      <th style={th}>Code</th>
                      <th style={{ ...th, textAlign: 'left' }}>Course Title</th>
                      <th style={th}>Units</th>
                      <th style={th}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.subjects.map((s, i) => {
                      const t = TYPE_COLORS[s.subject_type] || { bg: '#f3f4f6', color: '#374151', label: s.subject_type_display };
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ ...td, color: '#9ca3af', fontWeight: 600 }}>{i + 1}</td>
                          <td style={{ ...td, fontWeight: 700, color: '#1e3a5f', fontFamily: 'monospace', fontSize: 13 }}>{s.code}</td>
                          <td style={{ ...td, textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{s.name}</div>
                            {s.description && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{s.description}</div>}
                          </td>
                          <td style={{ ...td, fontWeight: 700, color: '#374151' }}>{s.units}</td>
                          <td style={td}>
                            <span style={{ background: t.bg, color: t.color, border: `1px solid ${t.bg}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                              {t.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #e5e7eb' }}>
                      <td colSpan={3} style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#374151' }}>Total Units</td>
                      <td style={{ ...td, fontWeight: 800, color: '#1e3a5f', fontSize: 16 }}>{current.total_units}</td>
                      <td style={td} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Past enrollments */}
            {enrollments.filter(e => e.id !== current.id).length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#6b7280', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enrollment History</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {enrollments
                    .filter(e => e.id !== current.id)
                    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                    .map(e => (
                      <div key={e.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <span style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>
                            {e.academic_term?.semester_display} {e.academic_term?.year}
                          </span>
                          <span style={{ marginLeft: 12, fontSize: 13, color: '#6b7280' }}>
                            {e.program_code} · {e.year_level_display} · {e.total_units} units
                          </span>
                        </div>
                        <StatusBadge status={e.status} />
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 48, marginBottom: '1rem' }}>📚</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>No enrolled courses yet</h2>
      <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 400, margin: '0 auto 1.5rem' }}>
        If you are a returning student, go to the <strong>Enrollment</strong> page to submit your enrollment for the current term.
        Your courses will appear here once the registrar approves your request.
      </p>
      <Link to="/student/enrollment" style={{ display: 'inline-block', background: '#0a3a6e', color: '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
        Go to Enrollment
      </Link>
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = {
    approved: { bg: '#d1fae5', color: '#065f46', label: 'Approved' },
    pending:  { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
  }[status] || { bg: '#f3f4f6', color: '#374151', label: status };
  return (
    <span style={{ background: meta.bg, color: meta.color, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
      {meta.label}
    </span>
  );
}

const th = { padding: '10px 14px', fontWeight: 700, fontSize: 12, color: '#6b7280', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' };
const td = { padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' };
