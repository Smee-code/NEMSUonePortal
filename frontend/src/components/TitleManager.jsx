import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BASE = 'NEMSUonePortal';
const HOME = 'NEMSUonePortal · NEMSU Cantilan Student Portal';

/* Exact path → page name. Dynamic routes resolve by stripping the last
   segment until a match is found (see resolve() below). */
const TITLES = {
  '/': HOME,
  '/login': 'Log in',
  '/signup': 'Create your account',
  '/verify-email': 'Verify your email',
  '/forgot-password': 'Forgot password',
  '/reset-password': 'Reset password',
  '/activate': 'Activate account',
  '/unauthorized': 'Access denied',
  '/news': 'News & Updates',
  '/programs': 'Academic Programs',
  '/campus-life': 'Campus Life',
  '/in-focus': 'In Focus',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms & Conditions',
  '/cookies': 'Cookie Policy',

  '/student/dashboard': 'Student Dashboard',
  '/student/grades': 'My Grades',
  '/student/schedule': 'My Schedule',
  '/student/curriculum': 'My Curriculum',
  '/student/documents': 'Document Requests',
  '/student/announcements': 'Announcements',
  '/student/spotlight': 'Campus Spotlight',
  '/student/profile': 'My Profile',

  '/faculty/dashboard': 'Faculty Dashboard',
  '/faculty/grades': 'Grade Encoding',
  '/faculty/schedule': 'Teaching Schedule',
  '/faculty/roster': 'Class Roster',
  '/faculty/announcements': 'Announcements',
  '/faculty/profile': 'My Profile',

  '/registrar/dashboard': 'Registrar Dashboard',
  '/registrar/registrations': 'Registration Requests',
  '/registrar/enrollment': 'Enrollment Requests',
  '/registrar/grades': 'Grades',
  '/registrar/grades/student': 'Student Grade History',
  '/registrar/students': 'Students',
  '/registrar/faculty': 'Faculty',
  '/registrar/schedule': 'Schedules',
  '/registrar/blocks': 'Blocks',
  '/registrar/documents': 'Document Requests',
  '/registrar/academic-data': 'Academic Data',
  '/registrar/announcements': 'Announcements',

  '/encoder/applications': 'Applications',
  '/encoder/curriculum': 'Curriculum',

  '/admin/dashboard': 'Admin Dashboard',
  '/admin/users': 'User Management',
  '/admin/programs': 'Programs',
  '/admin/curriculum': 'Curriculum',
  '/admin/landing': 'Landing Content',
  '/admin/terms': 'Academic Terms',
  '/admin/reports': 'Reports',
  '/admin/blocks': 'Blocks',
  '/admin/audit-log': 'Audit Log',
  '/admin/settings': 'System Settings',
  '/admin/announcements': 'Announcements',
  '/admin/spotlight': 'Campus Spotlight',
};

function resolve(pathname) {
  let path = pathname.replace(/\/+$/, '') || '/';
  while (path) {
    if (TITLES[path] !== undefined) return TITLES[path];
    const i = path.lastIndexOf('/');
    if (i <= 0) break;
    path = path.slice(0, i);
  }
  return null; // unmatched → 404/fallback
}

export default function TitleManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    const name = resolve(pathname);
    document.title = !name ? `Page not found · ${BASE}` : name === HOME ? HOME : `${name} · ${BASE}`;
  }, [pathname]);
  return null;
}
