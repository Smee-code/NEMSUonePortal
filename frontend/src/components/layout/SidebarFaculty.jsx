import { Link } from 'react-router-dom';
import { IcoDashboard, IcoPencil, IcoBriefcase, IcoBell, IcoUser, IcoMapPin } from './Icons';

function SidebarLink({ to, icon, label, active }) {
  return (
    <Link className={`sidebar-link${active ? ' active' : ''}`} to={to}>
      <span className="sidebar-link-icon">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function SidebarFaculty({ active }) {
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
        <SidebarLink to="/faculty/dashboard"     icon={<IcoDashboard/>}  label="Dashboard"      active={active === 'dashboard'} />
        <SidebarLink to="/faculty/grades"        icon={<IcoPencil/>}     label="Grade Encoding" active={active === 'grades'} />
        <SidebarLink to="/faculty/schedule"      icon={<IcoBriefcase/>}  label="Teaching Load"  active={active === 'schedule'} />
        <SidebarLink to="/faculty/announcements" icon={<IcoBell/>}       label="Announcements"  active={active === 'announcements'} />
        <SidebarLink to="/faculty/profile"       icon={<IcoUser/>}       label="My Profile"     active={active === 'profile'} />
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
