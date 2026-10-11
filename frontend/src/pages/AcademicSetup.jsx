import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

/*
  First-login gate for a returnee / old student whose account was just
  activated. They must set their department, program, and year level before
  reaching the dashboard. Clearing needs_academic_setup happens server-side
  once all three are set; we mirror it in memory so the gate lifts immediately.
*/
export default function AcademicSetup() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();

  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms]       = useState([]);
  const [form, setForm]   = useState({ department: '', program: '', year_level: '' });
  const [loading, setLoad] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/auth/departments/'),
      api.get('/enrollment/programs/'),
    ]).then(([deptRes, progRes]) => {
      setDepartments(deptRes.data || []);
      setPrograms(progRes.data || []);
    }).catch(() => setError('We couldn’t load the program list. Please refresh and try again.'))
      .finally(() => setLoad(false));
  }, []);

  const programsForDept = form.department
    ? programs.filter(p => String(p.department) === String(form.department))
    : [];

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.department)  { setError('Select your department.'); return; }
    if (!form.program)     { setError('Select your program.'); return; }
    if (!form.year_level)  { setError('Select your year level.'); return; }
    setSaving(true);
    try {
      await api.patch('/auth/academic-profile/', {
        department: Number(form.department),
        program:    Number(form.program),
        year_level: Number(form.year_level),
      });
      updateUser({ needs_academic_setup: false });
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      const msg = (data && typeof data === 'object')
        ? Object.values(data).flat().join(' ')
        : 'Couldn’t save your academic profile. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img src="/logo.png" alt="NEMSU" style={{ width: 56, height: 56, borderRadius: '50%', marginBottom: '.75rem', border: '2px solid #e0e7ff' }} />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0a1628', margin: 0 }}>Set up your academic profile</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, lineHeight: 1.6 }}>
            Welcome back{user?.full_name ? `, ${user.full_name}` : ''}. Before you continue, tell us your
            department, program, and year level. These drive the courses offered to you during enrollment.
          </p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Loading…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <Field label="Department">
              <select style={inp} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value, program: '' }))} autoFocus>
                <option value="">Select your department…</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
              </select>
            </Field>

            <Field label="Program">
              <select style={inp} value={form.program} onChange={e => set('program', e.target.value)} disabled={!form.department}>
                <option value="">{form.department ? 'Select your program…' : 'Choose a department first'}</option>
                {programsForDept.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </Field>

            <Field label="Year level">
              <select style={inp} value={form.year_level} onChange={e => set('year_level', e.target.value)}>
                <option value="">Select your year level…</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </Field>

            {error && (
              <p style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: 12, padding: '8px 12px', borderRadius: 6, margin: '0 0 .75rem' }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={saving} style={primBtn(saving)}>
              {saving ? 'Saving…' : 'Continue to dashboard'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: 12, color: '#6b7280' }}>
          Not you?{' '}
          <button type="button" onClick={() => { logout(); navigate('/login'); }} style={linkBtn}>Sign out</button>
        </p>
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

const wrap = { minHeight: '100vh', background: '#f4f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" };
const card = { background: '#fff', borderRadius: 16, boxShadow: '0 4px 32px rgba(10,58,110,.1)', padding: '2.5rem 2rem', width: '100%', maxWidth: 440, boxSizing: 'border-box' };
const inp  = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none', background: '#fff', color: '#0a1628' };
const linkBtn = { background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 12 };

function primBtn(disabled) {
  return {
    width: '100%', padding: '11px', background: disabled ? '#93c5fd' : '#0a3a6e', border: 'none',
    borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer', marginTop: 4,
  };
}
