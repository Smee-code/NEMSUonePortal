import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BASE = 'NEMSUOne';
const HOME = 'NEMSUOne · NEMSU Cantilan Student Portal';

/* Exact path → page name. Dynamic routes resolve by stripping the last
   segment until a match is found (see resolve() below). */
const TITLES = {
  '/': HOME,
  '/login': 'Sign in',
  '/admin-maintenance-mode-login': 'Administrator sign-in',
  '/signup': 'Create your account',
  '/verify-email': 'Verify your email',
  '/forgot-password': 'Forgot password',
  '/reset-password': 'Reset password',
  '/activate': 'Activate account',
  '/admission/upload': 'Upload your documents',
  '/faculty-setup': 'Set up your account',
  '/setup-academic': 'Set up your academic profile',
  '/unauthorized': 'Access denied',
  '/news': 'News & updates',
  '/programs': 'Academic programs',
  '/campus-life': 'Campus life',
  '/in-focus': 'In focus',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms & Conditions',
  '/cookies': 'Cookie Policy',

  // Signed-in pages use the same names as the sidebar, so the browser tab, the
  // menu and the page always agree. Every routed page needs an entry here:
  // a page without one is titled "Page not found".
  '/student/dashboard': 'Student dashboard',
  '/student/enrollment': 'My enrollment',
  '/student/grades': 'My grades',
  '/student/schedule': 'My schedule',
  '/student/curriculum': 'Curriculum',
  '/student/documents': 'Document requests',
  '/student/announcements': 'Announcements',
  '/student/profile': 'My profile',

  '/faculty/dashboard': 'Faculty dashboard',
  '/faculty/grades': 'Grade encoding',
  '/faculty/schedule': 'Teaching load',
  '/faculty/timetable': 'My schedule',
  '/faculty/roster': 'Class roster',
  '/faculty/announcements': 'Announcements',
  '/faculty/profile': 'My profile',

  '/registrar/dashboard': 'Registrar dashboard',
  '/registrar/registrations': 'Registration requests',
  '/registrar/admissions': 'Admissions',
  '/registrar/enrollment': 'Enrollment requests',
  '/registrar/blocks': 'Block management',
  '/registrar/grades': 'Grades',
  '/registrar/grades/student': 'Student grade history',
  '/registrar/students': 'List of students',
  '/registrar/faculty': 'Faculty',
  '/registrar/schedule': 'Room management',
  '/registrar/facilities': 'Rooms & buildings',
  '/registrar/documents': 'Document requests',
  '/registrar/academic-data': 'Academic data',
  '/registrar/announcements': 'Announcements',

  '/admin/dashboard': 'Admin dashboard',
  '/admin/users': 'User management',
  '/admin/students': 'Students',
  '/admin/grades/student': 'Student grade history',
  '/admin/faculty': 'Faculty',
  '/admin/programs': 'Programs & curriculum',
  '/admin/blocks': 'Block management',
  '/admin/schedule': 'Room management',
  '/admin/facilities': 'Rooms & buildings',
  '/admin/document-types': 'Document catalog',
  '/admin/landing': 'Landing content',
  '/admin/terms': 'Academic terms',
  '/admin/reports': 'Reports & export',
  '/admin/midterm-reopen': 'Reopen requests',
  '/admin/audit-log': 'Audit log',
  '/admin/settings': 'System settings',
  '/admin/announcements': 'Announcements',
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
