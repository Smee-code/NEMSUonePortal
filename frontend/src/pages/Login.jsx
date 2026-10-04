import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';

const ROLE_HOME = {
  student:            '/student/dashboard',
  faculty:            '/faculty/dashboard',
  registrar:          '/registrar/dashboard',
  admin:              '/admin/dashboard',
};

export default function Login() {
  const [form, setForm] = useState({ institutional_email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form);
      navigate(ROLE_HOME[data.user.role] ?? '/login');
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Login failed. Please check your credentials and try again.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-back">
          <span aria-hidden="true">←</span> Back to home
        </Link>
        <h1>NEMSUonePortal</h1>
        <h2>Sign In</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="institutional_email">Institutional Email</label>
            <input
              id="institutional_email"
              name="institutional_email"
              type="email"
              value={form.institutional_email}
              onChange={handleChange}
              required
              autoComplete="username"
              placeholder="student@nemsu.edu.ph"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <PasswordInput
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <p className="auth-links">
          Don&apos;t have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
