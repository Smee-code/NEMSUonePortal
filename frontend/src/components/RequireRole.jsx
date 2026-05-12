import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * UI-layer route guard.
 *
 * IMPORTANT: This component is NOT a security boundary.
 * It is a UX convenience only — it prevents the wrong dashboard
 * from rendering in the browser. All real authorization is enforced
 * server-side via @require_role / IsRole permission classes on every API call.
 *
 * OWASP A01 — Broken Access Control (client-side checks are insufficient alone)
 */
export default function RequireRole({ roles, children, redirectTo = '/login' }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
