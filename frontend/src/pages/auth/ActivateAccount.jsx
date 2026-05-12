import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const STEP_VERIFY   = 'verify';   // validating token
const STEP_WELCOME  = 'welcome';  // show applicant name, ask for email
const STEP_OTP      = 'otp';      // enter OTP code
const STEP_PASSWORD = 'password'; // set password
const STEP_DONE     = 'done';     // success

export default function ActivateAccount() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const { loginWithToken } = useAuth();

  const [step,       setStep]       = useState(STEP_VERIFY);
  const [info,       setInfo]       = useState(null);   // { full_name, email, student_type, program }
  const [email,      setEmail]      = useState('');
  const [otp,        setOtp]        = useState('');
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  // Step 1: validate token on mount
  useEffect(() => {
    api.get(`/auth/activate/${token}/`)
      .then(res => {
        setInfo(res.data);
        setEmail(res.data.email);
        setStep(STEP_WELCOME);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Invalid or expired activation link.');
        setStep(STEP_WELCOME);
      });
  }, [token]);

  async function handleRequestOTP(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post(`/auth/activate/${token}/request-otp/`, { email });
      setStep(STEP_OTP);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(e) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/auth/activate/${token}/complete/`, { otp, password });
      loginWithToken(res.data.access);
      setStep(STEP_DONE);
      setTimeout(() => navigate('/student/dashboard', { replace: true }), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 32px rgba(10,58,110,.1)', padding: '2.5rem 2rem', width: '100%', maxWidth: 420 }}>

        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="NEMSU" style={{ width: 56, height: 56, borderRadius: '50%', marginBottom: '.75rem', border: '2px solid #e0e7ff' }} />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0a1628', margin: 0 }}>Create your student account</h1>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>NEMSU Cantilan Campus — NEMSUonePortal</p>
        </div>

        {/* Step indicator */}
        {step !== STEP_VERIFY && step !== STEP_DONE && (
          <StepDots current={[STEP_WELCOME, STEP_OTP, STEP_PASSWORD].indexOf(step)} />
        )}

        {/* Validating */}
        {step === STEP_VERIFY && !error && (
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Validating your link…</p>
        )}

        {/* Error screen (invalid token) */}
        {step === STEP_WELCOME && !info && error && (
          <div style={{ textAlign: 'center' }}>
            <div style={iconCircle('#fee2e2')}>
              <i className="ti ti-x" style={{ fontSize: 28, color: '#dc2626' }} />
            </div>
            <h2 style={hStyle}>Link invalid</h2>
            <p style={pStyle}>{error}</p>
            <a href="/" style={btnLink}>← Return to home</a>
          </div>
        )}

        {/* Step 1 — Welcome + confirm email */}
        {step === STEP_WELCOME && info && (
          <form onSubmit={handleRequestOTP}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={iconCircle('#e0e7ff')}>
                <i className="ti ti-user-check" style={{ fontSize: 28, color: '#3730a3' }} />
              </div>
              <h2 style={hStyle}>Welcome, {info.full_name.split(' ')[0]}!</h2>
              <p style={pStyle}>
                Your <strong>{info.student_type}</strong> application has been approved.
                {info.program && <> Program: <strong>{info.program}</strong>.</>}
              </p>
              <p style={{ ...pStyle, marginTop: '.25rem' }}>Confirm your email address to receive your verification code.</p>
            </div>
            <Field label="Email address">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inp}
                placeholder="your@email.com"
              />
            </Field>
            {error && <ErrMsg>{error}</ErrMsg>}
            <button type="submit" disabled={loading} style={primBtn(loading)}>
              {loading ? 'Sending…' : 'Send verification code'}
            </button>
          </form>
        )}

        {/* Step 2 — OTP entry */}
        {step === STEP_OTP && (
          <form onSubmit={e => { e.preventDefault(); setStep(STEP_PASSWORD); }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={iconCircle('#fef3c7')}>
                <i className="ti ti-mail" style={{ fontSize: 28, color: '#b45309' }} />
              </div>
              <h2 style={hStyle}>Check your email</h2>
              <p style={pStyle}>We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.</p>
            </div>
            <Field label="Verification code">
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                style={{ ...inp, fontSize: 22, letterSpacing: '0.35em', textAlign: 'center', fontWeight: 700 }}
                placeholder="000000"
                inputMode="numeric"
              />
            </Field>
            {error && <ErrMsg>{error}</ErrMsg>}
            <button type="submit" disabled={otp.length !== 6} style={primBtn(otp.length !== 6)}>
              Continue
            </button>
            <button
              type="button"
              onClick={() => { setStep(STEP_WELCOME); setOtp(''); setError(''); }}
              style={ghostBtn}
            >
              ← Resend code
            </button>
          </form>
        )}

        {/* Step 3 — Set password */}
        {step === STEP_PASSWORD && (
          <form onSubmit={handleComplete}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={iconCircle('#dcfce7')}>
                <i className="ti ti-lock" style={{ fontSize: 28, color: '#15803d' }} />
              </div>
              <h2 style={hStyle}>Set your password</h2>
              <p style={pStyle}>Choose a strong password for your new student account.</p>
            </div>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={inp}
                placeholder="Minimum 8 characters"
              />
            </Field>
            <Field label="Confirm password">
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                style={inp}
                placeholder="Re-enter your password"
              />
            </Field>
            {error && <ErrMsg>{error}</ErrMsg>}
            <button type="submit" disabled={loading} style={primBtn(loading)}>
              {loading ? 'Creating account…' : 'Create my account'}
            </button>
          </form>
        )}

        {/* Step 4 — Success */}
        {step === STEP_DONE && (
          <div style={{ textAlign: 'center' }}>
            <div style={iconCircle('#d1fae5')}>
              <i className="ti ti-circle-check" style={{ fontSize: 32, color: '#059669' }} />
            </div>
            <h2 style={hStyle}>Account created!</h2>
            <p style={pStyle}>Welcome to NEMSUonePortal. Redirecting you to your dashboard…</p>
          </div>
        )}

      </div>
    </div>
  );
}

function StepDots({ current }) {
  const labels = ['Confirm email', 'Verify code', 'Set password'];
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: '1.5rem' }}>
      {labels.map((l, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
            background: i < current ? '#3730a3' : i === current ? '#0a3a6e' : '#e5e7eb',
            color: i <= current ? '#fff' : '#9ca3af',
          }}>
            {i < current ? <i className="ti ti-check" style={{ fontSize: 12 }} /> : i + 1}
          </div>
          <span style={{ fontSize: 9, color: i === current ? '#0a3a6e' : '#9ca3af', fontWeight: i === current ? 600 : 400, whiteSpace: 'nowrap' }}>{l}</span>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>{label}</label>
      {children}
    </div>
  );
}

function ErrMsg({ children }) {
  return (
    <p style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: '.75rem' }}>
      {children}
    </p>
  );
}

function iconCircle(bg) {
  return { width: 60, height: 60, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' };
}

const hStyle   = { fontSize: 17, fontWeight: 700, color: '#0a1628', margin: '0 0 .35rem' };
const pStyle   = { fontSize: 13, color: '#6b7280', lineHeight: 1.7, margin: 0 };
const inp      = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' };
const btnLink  = { display: 'inline-block', marginTop: '1.25rem', fontSize: 13, color: '#1d4ed8', textDecoration: 'none' };
const ghostBtn = { width: '100%', marginTop: 8, padding: '9px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', cursor: 'pointer' };

function primBtn(disabled) {
  return {
    width: '100%', padding: '11px', background: disabled ? '#93c5fd' : '#0a3a6e', border: 'none',
    borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer', marginTop: 4,
  };
}
