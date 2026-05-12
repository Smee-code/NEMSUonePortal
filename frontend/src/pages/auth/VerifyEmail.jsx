import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState(''); // '' | 'sending' | 'sent' | 'error'

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please use the link from your email, or request a new one below.');
      return;
    }

    api
      .post('/auth/verify-email/', { token })
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err.response?.data?.error ||
          'Verification failed. The link may have expired or already been used.',
        );
      });
  }, [searchParams]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendStatus('sending');
    try {
      await api.post('/auth/resend-verification/', {
        institutional_email: resendEmail.trim().toLowerCase(),
      });
      setResendStatus('sent');
    } catch {
      setResendStatus('error');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1>NEMSUonePortal</h1>
        <h2>Email Verification</h2>

        {status === 'verifying' && (
          <p style={{ color: '#6b7280', margin: '1.5rem 0' }}>Verifying your email…</p>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '2.5rem', margin: '1rem 0' }}>✅</div>
            <p className="success-message">{message}</p>
            <Link
              to="/login"
              className="btn-primary"
              style={{ display: 'block', textDecoration: 'none', marginTop: '1rem' }}
            >
              Sign In
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '2.5rem', margin: '1rem 0' }}>❌</div>
            <p className="error-message" role="alert">{message}</p>

            <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '1.5rem', paddingTop: '1.25rem' }}>
              <p style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '0.75rem', fontWeight: 600 }}>
                Request a new verification link
              </p>

              {resendStatus === 'sent' ? (
                <p className="success-message" style={{ fontSize: '0.88rem' }}>
                  A new verification link has been sent. Check your inbox (and spam folder).
                </p>
              ) : (
                <form onSubmit={handleResend} style={{ textAlign: 'left' }}>
                  <div className="form-group">
                    <label htmlFor="resend-email" style={{ fontSize: '0.85rem' }}>
                      Your institutional email
                    </label>
                    <input
                      id="resend-email"
                      type="email"
                      value={resendEmail}
                      onChange={e => setResendEmail(e.target.value)}
                      placeholder="student@nemsu.edu.ph"
                      required
                      autoComplete="email"
                    />
                  </div>

                  {resendStatus === 'error' && (
                    <p className="error-message" style={{ fontSize: '0.85rem' }}>
                      Failed to resend. Please try again.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={resendStatus === 'sending'}
                    className="btn-primary"
                  >
                    {resendStatus === 'sending' ? 'Sending…' : 'Resend Verification Email'}
                  </button>
                </form>
              )}
            </div>

            <p className="auth-links" style={{ marginTop: '1rem' }}>
              <Link to="/login">Back to Sign In</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
