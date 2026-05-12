import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_HOME = {
  student:   '/student/dashboard',
  faculty:   '/faculty/dashboard',
  registrar: '/registrar/dashboard',
  admin:     '/admin/dashboard',
};

export default function Unauthorized() {
  const { user } = useAuth();
  const home = user ? ROLE_HOME[user.role] : '/login';

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1>NEMSUonePortal</h1>
        <h2 style={{ color: '#e02424', margin: '1rem 0' }}>Access Denied</h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          You don&apos;t have permission to view that page.
        </p>
        <Link to={home} className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
          Go to My Dashboard
        </Link>
      </div>
    </div>
  );
}
