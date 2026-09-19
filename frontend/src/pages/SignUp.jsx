import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import PasswordInput from '../components/PasswordInput';

const EMPTY = {
  last_name: '', first_name: '', middle_name: '',
  student_id: '', institutional_email: '',
  password: '', confirm: '',
};

export default function SignUp() {
  const navigate = useNavigate();

  const [form,    setForm]    = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [done,    setDone]    = useState(false);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8)       { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      await api.post('/auth/register/', {
        last_name:           form.last_name.trim(),
        first_name:          form.first_name.trim(),
        middle_name:         form.middle_name.trim(),
        student_id:          form.student_id.trim(),
        institutional_email: form.institutional_email.trim(),
        password:            form.password,
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="NEMSU" style={{ width: 56, height: 56, borderRadius: '50%', marginBottom: '.75rem', border: '2px solid #e0e7ff' }} />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0a1628', margin: 0 }}>Create your student account</h1>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>NEMSU Cantilan Campus - NEMSUonePortal</p>
        </div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={iconCircle('#dcfce7')}>
              <i className="ti ti-clock-check" style={{ fontSize: 32, color: '#15803d' }} />
            </div>
            <h2 style={hStyle}>Registration submitted</h2>
            <p style={pStyle}>
              Thanks, {form.first_name || 'student'}. The Registrar's Office will verify your
              student record and review your account. You'll receive an email once it's approved, and
              you can log in after that.
            </p>
            <button type="button" onClick={() => navigate('/login')} style={primBtn(false)}>
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={iconCircle('#e0e7ff')}>
                <i className="ti ti-user-plus" style={{ fontSize: 28, color: '#3730a3' }} />
              </div>
              <p style={pStyle}>
                For students already enrolled at NEMSU-Cantilan with a university-issued
                Student ID. Your account is activated once the Registrar verifies it.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
              <Field label="Last name">
                <input style={inp} value={form.last_name} onChange={e => set('last_name', e.target.value)} required placeholder="Dela Cruz" autoFocus />
              </Field>
              <Field label="First name">
                <input style={inp} value={form.first_name} onChange={e => set('first_name', e.target.value)} required placeholder="Juan" />
              </Field>
            </div>

            <Field label="Middle name (optional)">
              <input style={inp} value={form.middle_name} onChange={e => set('middle_name', e.target.value)} placeholder="Reyes" />
            </Field>

            <Field label="Student ID">
              <input style={{ ...inp, textTransform: 'uppercase', letterSpacing: '.03em' }} value={form.student_id} onChange={e => set('student_id', e.target.value)} required placeholder="2024-00001" autoComplete="off" />
            </Field>

            <Field label="Institutional email">
              <input style={inp} type="email" value={form.institutional_email} onChange={e => set('institutional_email', e.target.value)} required placeholder="jdelacruz@nemsu.edu.ph" />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
              <Field label="Password">
                <PasswordInput style={inp} value={form.password} onChange={e => set('password', e.target.value)} required placeholder="Min. 8 characters" />
              </Field>
              <Field label="Confirm password">
                <PasswordInput style={inp} value={form.confirm} onChange={e => set('confirm', e.target.value)} required placeholder="Re-enter" />
              </Field>
            </div>

            {error && <ErrMsg>{error}</ErrMsg>}

            <button type="submit" disabled={loading} style={primBtn(loading)}>
              {loading ? 'Submitting…' : 'Submit registration'}
            </button>

            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: 12, color: '#6b7280' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
            </p>
          </form>
        )}
      </div>
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

const wrap    = { minHeight: '100vh', background: '#f4f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" };
const card    = { background: '#fff', borderRadius: 16, boxShadow: '0 4px 32px rgba(10,58,110,.1)', padding: '2.5rem 2rem', width: '100%', maxWidth: 440, boxSizing: 'border-box' };
const hStyle  = { fontSize: 17, fontWeight: 700, color: '#0a1628', margin: '0 0 .35rem' };
const pStyle  = { fontSize: 13, color: '#6b7280', lineHeight: 1.7, margin: 0 };
const inp     = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' };

function primBtn(disabled) {
  return {
    width: '100%', padding: '11px', background: disabled ? '#93c5fd' : '#0a3a6e', border: 'none',
    borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer', marginTop: 4,
  };
}
