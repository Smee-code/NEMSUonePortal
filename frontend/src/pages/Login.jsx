import { useEffect, useRef, useState } from 'react';
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

  // OTP (second) step
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [otp, setOtp] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [resent, setResent] = useState(false);
  const otpRef = useRef(null);

  const { login, verifyLoginOtp, resendLoginOtp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  function goToDashboard(data) {
    if (data.user.needs_academic_setup) navigate('/setup-academic');
    else navigate(ROLE_HOME[data.user.role] ?? '/login');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form);
      if (data.otp_required) {
        setOtpEmail(data.email || form.institutional_email);
        setStep('otp');
        setResendIn(30);
      } else {
        goToDashboard(data); // 2FA somehow disabled — proceed as before
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Login failed. Please check your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await verifyLoginOtp({ institutional_email: form.institutional_email, otp: otp.trim() });
      goToDashboard(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'That code is incorrect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  async function handleResend() {
    if (resendIn > 0) return;
    setError(''); setResent(false);
    try {
      await resendLoginOtp(form.institutional_email);
      setResent(true);
      setResendIn(30);
    } catch {
      setError('Couldn’t resend the code. Please try again.');
    }
  }

  function backToCredentials() {
    setStep('credentials');
    setOtp(''); setError(''); setResent(false);
  }

  // Resend cooldown + autofocus the code box.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);
  useEffect(() => { if (step === 'otp') otpRef.current?.focus(); }, [step]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-back">
          <span aria-hidden="true">←</span> Back to home
        </Link>
        <h1>NEMSUonePortal</h1>
        <h2>{step === 'otp' ? 'Enter your code' : 'Sign In'}</h2>

        {step === 'credentials' ? (
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

            {error && <p className="error-message" role="alert">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} noValidate>
            <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55, margin: '0 0 1rem' }}>
              For your security, we sent a 6-digit code to <strong>{otpEmail}</strong>. Enter it below to finish signing in.
            </p>
            <div className="form-group">
              <label htmlFor="otp">Verification code</label>
              <input
                id="otp"
                name="otp"
                ref={otpRef}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="------"
                maxLength={6}
                style={{ letterSpacing: '.5em', textAlign: 'center', fontSize: 20, fontWeight: 600 }}
                required
              />
            </div>

            {resent && <p style={{ fontSize: 12.5, color: '#15803d', margin: '0 0 .6rem' }}>A new code has been sent.</p>}
            {error && <p className="error-message" role="alert">{error}</p>}

            <button type="submit" disabled={loading || otp.length < 6} className="btn-primary">
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.9rem', fontSize: 13 }}>
              <button type="button" onClick={backToCredentials} style={linkBtn}>← Use a different account</button>
              <button type="button" onClick={handleResend} disabled={resendIn > 0} style={{ ...linkBtn, opacity: resendIn > 0 ? 0.5 : 1 }}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        {step === 'credentials' && (
          <>
            <p className="auth-links">
              <Link to="/forgot-password">Forgot password?</Link>
            </p>
            <p className="auth-links">
              Don&apos;t have an account? <Link to="/signup">Sign Up</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const linkBtn = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  color: '#0a3a6e', fontWeight: 600, fontFamily: 'inherit', fontSize: 13,
};
