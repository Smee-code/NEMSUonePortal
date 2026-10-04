import { Link } from 'react-router-dom';
import {
  IcoDashboard, IcoClipboard, IcoBook, IcoBarChart,
  IcoCalendar, IcoFileText, IcoBell, IcoUser, IcoMapPin,
} from './Icons';

function SidebarLink({ to, icon, label, active }) {
  return (
    <Link className={`sidebar-link${active ? ' active' : ''}`} to={to}>
      <span className="sidebar-link-icon">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function SidebarStudent({ active }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.png" alt="NEMSU" className="sidebar-logo" />
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">NEMSUonePortal</span>
          <span className="sidebar-brand-campus">Cantilan Campus</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <SidebarLink to="/student/dashboard"     icon={<IcoDashboard/>}  label="Dashboard"         active={active === 'dashboard'} />
        <SidebarLink to="/student/enrollment"    icon={<IcoClipboard/>}  label="Enrollment"        active={active === 'enrollment'} />
        <SidebarLink to="/student/courses"       icon={<IcoBook/>}       label="My Courses"        active={active === 'courses'} />
        <SidebarLink to="/student/grades"        icon={<IcoBarChart/>}   label="My Grades"         active={active === 'grades'} />
        <SidebarLink to="/student/schedule"      icon={<IcoCalendar/>}   label="Schedule"          active={active === 'schedule'} />
        <SidebarLink to="/student/documents"     icon={<IcoFileText/>}   label="Document Requests" active={active === 'documents'} />
        <SidebarLink to="/student/announcements" icon={<IcoBell/>}       label="Announcements"     active={active === 'announcements'} />
        <SidebarLink to="/student/profile"       icon={<IcoUser/>}       label="My Profile"        active={active === 'profile'} />
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-icon"><IcoMapPin /></span>
        <div>
          <div className="sidebar-footer-campus">Cantilan Campus</div>
          <div className="sidebar-footer-loc">Cantilan, Surigao del Sur</div>
        </div>
      </div>
    </aside>
  );
}
