import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ new_password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }
    if (form.new_password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.new_password.length < 12) {
      setError('Password must be at least 12 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/password-reset/confirm/', {
        token,
        new_password: form.new_password,
      });
      setSuccess(res.data.message);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Password reset failed. The link may have expired.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>NEMSUonePortal</h1>
        <h2>Reset Password</h2>

        {success ? (
          <>
            <p className="success-message">{success}</p>
            <Link
              to="/login"
              className="btn-primary"
              style={{ display: 'block', textDecoration: 'none', textAlign: 'center', marginTop: '.5rem' }}
            >
              Sign In
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="new_password">
                New Password <small style={{ color: '#6b7280' }}>(min. 12 characters)</small>
              </label>
              <input
                id="new_password"
                name="new_password"
                type="password"
                value={form.new_password}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm">Confirm New Password</label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                value={form.confirm}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="auth-links">
          <Link to="/login">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
