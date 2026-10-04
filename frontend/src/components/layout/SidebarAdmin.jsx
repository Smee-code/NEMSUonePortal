import { Link } from 'react-router-dom';
import {
  IcoDashboard, IcoUsers, IcoBook, IcoCalendar, IcoBriefcase,
  IcoBarChart, IcoClock, IcoBell, IcoSettings, IcoMapPin,
  IcoClipboardCheck,
} from './Icons';

function SidebarLink({ to, icon, label, active }) {
  return (
    <Link className={`sidebar-link${active ? ' active' : ''}`} to={to}>
      <span className="sidebar-link-icon">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function SidebarAdmin({ active }) {
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
        <SidebarLink to="/admin/dashboard"    icon={<IcoDashboard/>}  label="Dashboard"            active={active === 'dashboard'} />
        <SidebarLink to="/admin/users"        icon={<IcoUsers/>}      label="User Management"      active={active === 'users'} />
        <SidebarLink to="/admin/programs"     icon={<IcoBook/>}       label="Programs & Curriculum" active={active === 'programs'} />
        <SidebarLink to="/admin/terms"        icon={<IcoCalendar/>}   label="Academic Terms"       active={active === 'terms'} />
        <SidebarLink to="/admin/faculty-load" icon={<IcoBriefcase/>}  label="Faculty Load"         active={active === 'faculty-load'} />
        <SidebarLink to="/admin/midterm-reopen" icon={<IcoClipboardCheck/>} label="Reopen Requests"    active={active === 'midterm-reopen'} />
        <SidebarLink to="/admin/reports"      icon={<IcoBarChart/>}   label="Reports & Export"     active={active === 'reports'} />
        <SidebarLink to="/admin/audit-log"    icon={<IcoClock/>}      label="Audit Log"            active={active === 'audit-log'} />
        <SidebarLink to="/admin/announcements" icon={<IcoBell/>}      label="Announcements"        active={active === 'announcements'} />
        <SidebarLink to="/admin/settings"     icon={<IcoSettings/>}   label="System Settings"      active={active === 'settings'} />
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
