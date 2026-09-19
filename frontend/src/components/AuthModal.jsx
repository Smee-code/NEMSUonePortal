import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PasswordInput from './PasswordInput';

const ROLE_HOME = {
  student: '/student/dashboard',
  faculty: '/faculty/dashboard',
  registrar: '/registrar/dashboard',
  department_encoder: '/encoder/applications',
  admin: '/admin/dashboard',
};

/*
  Landing-page auth modal. Opened in 'login' or 'signup' mode; the two forms
  can switch to each other in place. The standalone /login and /signup pages
  still exist for redirects and deep links.
*/
export default function AuthModal({ mode = 'login', onClose }) {
  const [tab, setTab] = useState(mode);

  useEffect(() => { setTab(mode); }, [mode]);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return createPortal(
    <div className="authm-back" onClick={onClose}>
      <style>{CSS}</style>
      <div className="authm" role="dialog" aria-modal="true" aria-label={tab === 'login' ? 'Log in' : 'Sign up'} onClick={e => e.stopPropagation()}>
        <button className="authm-x" onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>
        {tab === 'login'
          ? <LoginForm onClose={onClose} toSignup={() => setTab('signup')} />
          : <SignupForm onClose={onClose} toLogin={() => setTab('login')} />}
      </div>
    </div>,
    document.body
  );
}

function LoginForm({ onClose, toSignup }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ institutional_email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await login(form);
      onClose();
      navigate(ROLE_HOME[data.user.role] ?? '/');
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Login failed. Please check your credentials and try again.'
      );
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="authm-body">
      <div className="authm-head">
        <img src="/logo.png" alt="" className="authm-logo" />
        <h2>Welcome back</h2>
        <p>Sign in to your NEMSUonePortal account.</p>
      </div>

      <label className="authm-label">Institutional email</label>
      <input
        className="authm-input" type="email" autoComplete="username" required autoFocus
        value={form.institutional_email}
        onChange={e => setForm(f => ({ ...f, institutional_email: e.target.value }))}
        placeholder="you@nemsu.edu.ph"
      />

      <label className="authm-label">Password</label>
      <PasswordInput
        className="authm-input" autoComplete="current-password" required
        value={form.password}
        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        placeholder="Your password"
      />

      {error && <div className="authm-err">{error}</div>}

      <button type="submit" className="authm-submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="authm-forgot">
        <Link to="/forgot-password" onClick={onClose}>Forgot password?</Link>
      </div>
      <div className="authm-switch">
        Don't have an account?{' '}
        <button type="button" onClick={toSignup}>Sign up</button>
      </div>
    </form>
  );
}

function SignupForm({ onClose, toLogin }) {
  const [form, setForm] = useState({
    last_name: '', first_name: '', middle_name: '',
    student_id: '', institutional_email: '', password: '', confirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/register/', {
        last_name: form.last_name.trim(),
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim(),
        student_id: form.student_id.trim(),
        institutional_email: form.institutional_email.trim(),
        password: form.password,
      });
      setDone(true);
    } catch (err) {
      const data = err.response?.data;
      let m = data?.detail || data?.message;
      if (!m && data && typeof data === 'object') {
        const first = Object.values(data)[0];
        m = Array.isArray(first) ? first[0] : first;
      }
      setError(m || 'Registration failed. Please check your details and try again.');
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="authm-body authm-done">
        <div className="authm-done-ic"><i className="ti ti-clock-check" /></div>
        <h2>Registration submitted</h2>
        <p>
          Thanks, {form.first_name || 'student'}. The Registrar's Office will verify your student
          record and review your account. You'll receive an email once it's approved, and you can log
          in after that.
        </p>
        <button type="button" className="authm-submit" onClick={toLogin}>Back to sign in</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="authm-body">
      <div className="authm-head">
        <img src="/logo.png" alt="" className="authm-logo" />
        <h2>Create your account</h2>
        <p>For students already enrolled at NEMSU-Cantilan with a Student ID.</p>
      </div>

      <div className="authm-grid">
        <div>
          <label className="authm-label">Last name</label>
          <input className="authm-input" required autoFocus value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Dela Cruz" />
        </div>
        <div>
          <label className="authm-label">First name</label>
          <input className="authm-input" required value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Juan" />
        </div>
      </div>

      <label className="authm-label">Middle name (optional)</label>
      <input className="authm-input" value={form.middle_name} onChange={e => set('middle_name', e.target.value)} placeholder="Reyes" />

      <label className="authm-label">Student ID</label>
      <input className="authm-input" required value={form.student_id} onChange={e => set('student_id', e.target.value)} placeholder="2024-00001" autoComplete="off" style={{ textTransform: 'uppercase' }} />

      <label className="authm-label">Institutional email</label>
      <input className="authm-input" type="email" required value={form.institutional_email} onChange={e => set('institutional_email', e.target.value)} placeholder="jdelacruz@nemsu.edu.ph" />

      <div className="authm-grid">
        <div>
          <label className="authm-label">Password</label>
          <PasswordInput className="authm-input" required value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" />
        </div>
        <div>
          <label className="authm-label">Confirm</label>
          <PasswordInput className="authm-input" required value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="Re-enter" />
        </div>
      </div>

      {error && <div className="authm-err">{error}</div>}

      <button type="submit" className="authm-submit" disabled={loading}>
        {loading ? 'Submitting…' : 'Submit registration'}
      </button>

      <div className="authm-switch">
        Already have an account?{' '}
        <button type="button" onClick={toLogin}>Log in</button>
      </div>
    </form>
  );
}

const CSS = `
  .authm-back{position:fixed;inset:0;z-index:1900;background:rgba(8,14,24,.6);display:flex;align-items:flex-start;justify-content:center;padding:5vh 1rem 2rem;overflow-y:auto;animation:authm-fade .18s ease;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
  @keyframes authm-fade{from{opacity:0}to{opacity:1}}
  .authm{position:relative;background:#fff;width:100%;max-width:440px;padding:2.25rem 2rem;box-shadow:0 30px 70px -24px rgba(8,14,24,.5);animation:authm-pop .2s ease;clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px);}
  @keyframes authm-pop{from{transform:translateY(10px);opacity:.5}to{transform:none;opacity:1}}
  .authm-x{position:absolute;top:14px;right:14px;width:36px;height:36px;border:none;background:#f4f6fa;color:#5a6478;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;}
  .authm-x:hover{background:#e9edf3;color:#0a1628;}
  .authm-body{display:flex;flex-direction:column;}
  .authm-head{text-align:center;margin-bottom:1.5rem;}
  .authm-logo{width:52px;height:52px;border-radius:50%;object-fit:contain;background:#f4f6fa;padding:3px;margin-bottom:.75rem;}
  .authm-head h2{font-size:20px;font-weight:700;color:#0a1628;margin:0 0 .25rem;}
  .authm-head p{font-size:13px;color:#5a6478;margin:0;line-height:1.5;}
  .authm-label{font-size:12px;font-weight:600;color:#374151;margin:.75rem 0 .35rem;display:block;}
  .authm-input{width:100%;padding:10px 12px;border:1px solid #d1d5db;font:14px 'Inter',sans-serif;box-sizing:border-box;outline:none;color:#0a1628;background:#fff;}
  .authm-input:focus{border-color:#b89043;box-shadow:0 0 0 3px rgba(184,144,67,.15);}
  .authm-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;}
  .authm-err{background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;font-size:12.5px;padding:9px 12px;margin-top:.9rem;}
  .authm-submit{margin-top:1.25rem;width:100%;padding:12px;background:#0B1B2E;color:#fff;border:none;font:700 14px 'Inter',sans-serif;cursor:pointer;letter-spacing:.02em;clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px);}
  .authm-submit:hover:not(:disabled){background:#13263d;}
  .authm-submit:disabled{opacity:.6;cursor:not-allowed;}
  .authm-forgot{text-align:center;margin-top:1rem;}
  .authm-forgot a{font-size:13px;color:#5a6478;text-decoration:none;}
  .authm-forgot a:hover{color:#0a1628;}
  .authm-switch{text-align:center;margin-top:1rem;padding-top:1rem;border-top:1px solid #eef0f4;font-size:13px;color:#5a6478;}
  .authm-switch button{background:none;border:none;color:#b17f1e;font:600 13px 'Inter',sans-serif;cursor:pointer;padding:0;}
  .authm-switch button:hover{text-decoration:underline;}
  .authm-done{text-align:center;align-items:center;}
  .authm-done-ic{width:60px;height:60px;border-radius:50%;background:#dcfce7;color:#15803d;display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 1rem;}
  .authm-done h2{font-size:19px;font-weight:700;color:#0a1628;margin:0 0 .5rem;}
  .authm-done p{font-size:13.5px;color:#5a6478;line-height:1.7;margin:0;}
  @media(max-width:480px){.authm{padding:2rem 1.25rem;}.authm-grid{grid-template-columns:1fr;}}
`;
