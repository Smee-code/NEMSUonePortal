import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link active" to="/student/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/student/enrollment">Enrollment</Link>
        <Link className="sidebar-link" to="/student/courses">My Courses</Link>
        <Link className="sidebar-link" to="/student/grades">My Grades</Link>
        <Link className="sidebar-link" to="/student/schedule">Schedule</Link>
        <Link className="sidebar-link" to="/student/documents">Document Requests</Link>
        <Link className="sidebar-link" to="/student/announcements">Announcements</Link>
        <Link className="sidebar-link" to="/student/profile">My Profile</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Welcome, {user?.full_name}</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        <div className="coming-soon">
          <h2>Student Portal</h2>
          <p>Use the sidebar to access enrollment, grades, schedules, document requests, and announcements.</p>
        </div>
      </main>
    </div>
  );
}
