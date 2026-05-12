import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import RequireRole from './components/RequireRole';
import { AuthProvider } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Unauthorized from './pages/Unauthorized';
import ActivateAccount from './pages/auth/ActivateAccount';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';

import AnnouncementsPage from './pages/announcements/AnnouncementsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import AdminPrograms from './pages/admin/AdminPrograms';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminSettings from './pages/admin/AdminSettings';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import FacultyGradeEncoding from './pages/faculty/FacultyGradeEncoding';
import FacultyProfile from './pages/faculty/FacultyProfile';
import FacultySchedule from './pages/faculty/FacultySchedule';
import RegistrarDashboard from './pages/registrar/RegistrarDashboard';
import RegistrarEnrollmentRequests from './pages/registrar/RegistrarEnrollmentRequests';
import RegistrarFaculty from './pages/registrar/RegistrarFaculty';
import RegistrarGrades from './pages/registrar/RegistrarGrades';
import RegistrarStudentGradeHistory from './pages/registrar/RegistrarStudentGradeHistory';
import RegistrarDocuments from './pages/registrar/RegistrarDocuments';
import RegistrarSchedule from './pages/registrar/RegistrarSchedule';
import StudentCourses from './pages/student/StudentCourses';
import StudentDocuments from './pages/student/StudentDocuments';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentEnrollment from './pages/student/StudentEnrollment';
import StudentGrades from './pages/student/StudentGrades';
import StudentProfile from './pages/student/StudentProfile';
import StudentSchedule from './pages/student/StudentSchedule';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public routes ─────────────────────────────────────── */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/activate/:token" element={<ActivateAccount />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* ── Student routes ────────────────────────────────────── */}
          <Route
            path="/student/*"
            element={
              <RequireRole roles={['student']}>
                <Routes>
                  <Route path="dashboard" element={<StudentDashboard />} />
                  <Route path="enrollment" element={<StudentEnrollment />} />
                  <Route path="courses" element={<StudentCourses />} />
                  <Route path="grades" element={<StudentGrades />} />
                  <Route path="schedule" element={<StudentSchedule />} />
                  <Route path="documents" element={<StudentDocuments />} />
                  <Route path="announcements" element={<AnnouncementsPage />} />
                  <Route path="profile" element={<StudentProfile />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </RequireRole>
            }
          />

          {/* ── Faculty routes ────────────────────────────────────── */}
          <Route
            path="/faculty/*"
            element={
              <RequireRole roles={['faculty']}>
                <Routes>
                  <Route path="dashboard" element={<FacultyDashboard />} />
                  <Route path="grades" element={<FacultyGradeEncoding />} />
                  <Route path="schedule" element={<FacultySchedule />} />
                  <Route path="announcements" element={<AnnouncementsPage />} />
                  <Route path="profile" element={<FacultyProfile />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </RequireRole>
            }
          />

          {/* ── Registrar routes ──────────────────────────────────── */}
          <Route
            path="/registrar/*"
            element={
              <RequireRole roles={['registrar']}>
                <Routes>
                  <Route path="dashboard" element={<RegistrarDashboard />} />
                  <Route path="enrollment" element={<RegistrarEnrollmentRequests />} />
                  <Route path="grades" element={<RegistrarGrades />} />
                  <Route path="grades/student/:studentId" element={<RegistrarStudentGradeHistory />} />
                  <Route path="faculty" element={<RegistrarFaculty />} />
                  <Route path="schedule" element={<RegistrarSchedule />} />
                  <Route path="documents" element={<RegistrarDocuments />} />
                  <Route path="academic-data" element={<AdminPrograms />} />
                  <Route path="announcements" element={<AnnouncementsPage />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </RequireRole>
            }
          />

          {/* ── Admin routes ──────────────────────────────────────── */}
          <Route
            path="/admin/*"
            element={
              <RequireRole roles={['admin']}>
                <Routes>
                  <Route path="dashboard"  element={<AdminDashboard />} />
                  <Route path="users"       element={<AdminUserManagement />} />
                  <Route path="programs"    element={<AdminPrograms />} />
                  <Route path="audit-log"   element={<AdminAuditLog />} />
                  <Route path="settings"    element={<AdminSettings />} />
                  <Route path="announcements" element={<AnnouncementsPage />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </RequireRole>
            }
          />

          {/* ── Landing & fallback ────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
