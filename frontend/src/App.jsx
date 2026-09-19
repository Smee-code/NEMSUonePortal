import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import RequireRole from './components/RequireRole';
import { AuthProvider } from './context/AuthContext';
import { ConfirmProvider } from './components/ConfirmDialog';
import { ToastProvider } from './components/Toast';
import SiteChrome from './components/SiteChrome';

import LandingPage from './pages/LandingPage';
import NewsPage from './pages/NewsPage';
import ProgramsPage from './pages/ProgramsPage';
import CampusLifePage from './pages/CampusLifePage';
import StoryPage from './pages/StoryPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import CookiePolicy from './pages/CookiePolicy';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Unauthorized from './pages/Unauthorized';
import ActivateAccount from './pages/auth/ActivateAccount';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';

import AdminShell from './components/layout/AdminShell';
import AnnouncementsPage from './pages/announcements/AnnouncementsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import AdminPrograms from './pages/admin/AdminPrograms';
import AdminCurriculum from './pages/admin/AdminCurriculum';
import AdminSiteContent from './pages/admin/AdminSiteContent';
import AdminTerms from './pages/admin/AdminTerms';
import AdminReports from './pages/admin/AdminReports';
import AdminBlocks from './pages/admin/AdminBlocks';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminSettings from './pages/admin/AdminSettings';
import AdminSpotlight from './pages/admin/AdminSpotlight';
import FacultyShell from './components/layout/FacultyShell';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import FacultyGradeEncoding from './pages/faculty/FacultyGradeEncoding';
import FacultyProfile from './pages/faculty/FacultyProfile';
import FacultyRoster from './pages/faculty/FacultyRoster';
import FacultySchedule from './pages/faculty/FacultySchedule';
import RegistrarShell from './components/layout/RegistrarShell';
import EncoderShell from './components/layout/EncoderShell';
import EncoderApplications from './pages/encoder/EncoderApplications';
import EncoderCurriculum from './pages/encoder/EncoderCurriculum';
import RegistrarDashboard from './pages/registrar/RegistrarDashboard';
import RegistrarEnrollmentRequests from './pages/registrar/RegistrarEnrollmentRequests';
import RegistrarRegistrations from './pages/registrar/RegistrarRegistrations';
import RegistrarFaculty from './pages/registrar/RegistrarFaculty';
import RegistrarGrades from './pages/registrar/RegistrarGrades';
import RegistrarStudentGradeHistory from './pages/registrar/RegistrarStudentGradeHistory';
import RegistrarStudents from './pages/registrar/RegistrarStudents';
import RegistrarBlocks from './pages/registrar/RegistrarBlocks';
import RegistrarDocuments from './pages/registrar/RegistrarDocuments';
import RegistrarSchedule from './pages/registrar/RegistrarSchedule';
import StudentShell from './components/layout/StudentShell';
import StudentDashboard    from './pages/student/StudentDashboard';
import StudentGrades       from './pages/student/StudentGrades';
import StudentSchedule     from './pages/student/StudentSchedule';
import StudentDocuments    from './pages/student/StudentDocuments';
import StudentProfile      from './pages/student/StudentProfile';
import StudentAnnouncements from './pages/student/StudentAnnouncements';
import StudentCurriculum   from './pages/student/StudentCurriculum';
import StudentSpotlight    from './pages/student/StudentSpotlight';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastProvider>
        <ConfirmProvider>
        <SiteChrome />
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
          <Route path="/student" element={<RequireRole roles={['student']}><StudentShell /></RequireRole>}>
            <Route index                element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"     element={<StudentDashboard />} />
            <Route path="grades"        element={<StudentGrades />} />
            <Route path="schedule"      element={<StudentSchedule />} />
            <Route path="curriculum"    element={<StudentCurriculum />} />
            <Route path="documents"     element={<StudentDocuments />} />
            <Route path="announcements" element={<StudentAnnouncements />} />
            <Route path="spotlight"     element={<StudentSpotlight />} />
            <Route path="profile"       element={<StudentProfile />} />
            <Route path="*"             element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* ── Faculty routes ────────────────────────────────────── */}
          <Route path="/faculty" element={<RequireRole roles={['faculty']}><FacultyShell /></RequireRole>}>
            <Route index             element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"  element={<FacultyDashboard />} />
            <Route path="grades"     element={<FacultyGradeEncoding />} />
            <Route path="schedule"   element={<FacultySchedule />} />
            <Route path="roster"     element={<FacultyRoster />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="profile"    element={<FacultyProfile />} />
            <Route path="*"          element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* ── Registrar routes ──────────────────────────────────── */}
          <Route path="/registrar" element={<RequireRole roles={['registrar']}><RegistrarShell /></RequireRole>}>
            <Route index                element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"     element={<RegistrarDashboard />} />
            <Route path="registrations" element={<RegistrarRegistrations />} />
            <Route path="enrollment"    element={<RegistrarEnrollmentRequests />} />
            <Route path="grades"        element={<RegistrarGrades />} />
            <Route path="grades/student/:studentId" element={<RegistrarStudentGradeHistory />} />
            <Route path="students"      element={<RegistrarStudents />} />
            <Route path="faculty"       element={<RegistrarFaculty />} />
            <Route path="schedule"      element={<RegistrarSchedule />} />
            <Route path="blocks"        element={<RegistrarBlocks />} />
            <Route path="documents"     element={<RegistrarDocuments />} />
            <Route path="academic-data" element={<AdminPrograms />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="*"             element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* ── Department Encoder routes ─────────────────────────── */}
          <Route path="/encoder" element={<RequireRole roles={['department_encoder']}><EncoderShell /></RequireRole>}>
            <Route index               element={<Navigate to="applications" replace />} />
            <Route path="applications" element={<EncoderApplications />} />
            <Route path="curriculum"   element={<EncoderCurriculum />} />
            <Route path="*"            element={<Navigate to="applications" replace />} />
          </Route>

          {/* ── Admin routes ──────────────────────────────────────── */}
          <Route path="/admin" element={<RequireRole roles={['admin']}><AdminShell /></RequireRole>}>
            <Route index             element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"    element={<AdminDashboard />} />
            <Route path="users"        element={<AdminUserManagement />} />
            <Route path="programs"     element={<AdminPrograms />} />
            <Route path="curriculum"   element={<AdminCurriculum />} />
            <Route path="landing"      element={<AdminSiteContent />} />
            <Route path="terms"        element={<AdminTerms />} />
            <Route path="reports"      element={<AdminReports />} />
            <Route path="blocks"       element={<AdminBlocks />} />
            <Route path="audit-log"    element={<AdminAuditLog />} />
            <Route path="settings"     element={<AdminSettings />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="spotlight"    element={<AdminSpotlight />} />
            <Route path="*"            element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* ── Landing & fallback ────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/campus-life" element={<CampusLifePage />} />
          <Route path="/in-focus" element={<StoryPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
