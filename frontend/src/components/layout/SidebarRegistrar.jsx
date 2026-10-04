import { Link } from 'react-router-dom';
import {
  IcoDashboard, IcoClipboardCheck, IcoUsers, IcoUser,
  IcoCalendar, IcoFileText, IcoDatabase, IcoBell, IcoMapPin,
} from './Icons';

function SidebarLink({ to, icon, label, active }) {
  return (
    <Link className={`sidebar-link${active ? ' active' : ''}`} to={to}>
      <span className="sidebar-link-icon">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function SidebarRegistrar({ active }) {
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
        <SidebarLink to="/registrar/dashboard"     icon={<IcoDashboard/>}        label="Dashboard"          active={active === 'dashboard'} />
        <SidebarLink to="/registrar/enrollment"    icon={<IcoClipboardCheck/>}   label="Enrollment Requests" active={active === 'enrollment'} />
        <SidebarLink to="/registrar/grades"        icon={<IcoUsers/>}            label="List of Students"   active={active === 'grades'} />
        <SidebarLink to="/registrar/faculty"       icon={<IcoUser/>}             label="Faculty"            active={active === 'faculty'} />
        <SidebarLink to="/registrar/schedule"      icon={<IcoCalendar/>}         label="Class Schedules"    active={active === 'schedule'} />
        <SidebarLink to="/registrar/documents"     icon={<IcoFileText/>}         label="Document Requests"  active={active === 'documents'} />
        <SidebarLink to="/registrar/academic-data" icon={<IcoDatabase/>}         label="Academic Data"      active={active === 'academic-data'} />
        <SidebarLink to="/registrar/announcements" icon={<IcoBell/>}             label="Announcements"      active={active === 'announcements'} />
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
