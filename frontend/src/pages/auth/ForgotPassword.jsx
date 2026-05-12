import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/password-reset/request/', {
        institutional_email: email,
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>NEMSUonePortal</h1>
        <h2>Forgot Password</h2>

        {submitted ? (
          <>
            <p className="success-message">
              If that email is registered, a password reset link has been sent.
              Please check your inbox.
            </p>
            <p className="auth-links">
              <Link to="/login">Back to Sign In</Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <p style={{ color: '#6b7280', fontSize: '.875rem', marginBottom: '1rem' }}>
              Enter your institutional email and we&apos;ll send you a reset link.
            </p>

            <div className="form-group">
              <label htmlFor="email">Institutional Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="student@nemsu.edu.ph"
                autoComplete="email"
              />
            </div>

            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Sending…' : 'Send Reset Link'}
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
