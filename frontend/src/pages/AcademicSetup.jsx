import { useEffect, useRef, useState } from 'react';
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

  const deptRef = useRef(null);
  const progRef = useRef(null);
  const yearRef = useRef(null);

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

  const deptOfProgram = (progId) => {
    const prog = programs.find(p => String(p.id) === String(progId));
    return prog ? String(prog.department) : '';
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.program)    { setError('Select your program.');    progRef.current?.focus(); return; }
    if (!form.department) { setError('Select your department.'); deptRef.current?.focus(); return; }
    if (!form.year_level) { setError('Select your year level.'); yearRef.current?.focus(); return; }
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
      <style>{CSS}</style>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img src="/logo.png" alt="" width={56} height={56} style={{ width: 56, height: 56, borderRadius: '50%', marginBottom: '.75rem', border: '2px solid #e0e7ff' }} />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0a1628', margin: 0, textWrap: 'balance' }}>Set up your academic profile</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, lineHeight: 1.6 }}>
            Welcome back{user?.full_name ? `, ${user.full_name}` : ''}. Before you continue, tell us your
            department, program, and year level. These drive the courses offered to you during enrollment.
          </p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Loading…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <Field label="Program" htmlFor="as-program">
              <select id="as-program" name="program" className="as-input" ref={progRef}
                value={form.program}
                onChange={e => { const program = e.target.value; setForm(f => ({ ...f, program, department: program ? deptOfProgram(program) : '' })); }}>
                <option value="">Select your program…</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </Field>

            <Field label="Department" htmlFor="as-department">
              <select id="as-department" name="department" className="as-input" ref={deptRef}
                value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select your department…</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
              </select>
            </Field>

            <Field label="Year level" htmlFor="as-year">
              <select id="as-year" name="year_level" className="as-input" ref={yearRef}
                value={form.year_level} onChange={e => set('year_level', e.target.value)}>
                <option value="">Select your year level…</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </Field>

            <p role="alert" aria-live="polite" style={{
              minHeight: error ? undefined : 0,
              margin: error ? '0 0 .75rem' : 0,
              background: error ? '#fef2f2' : 'transparent',
              border: error ? '1px solid #fca5a5' : 'none',
              color: '#dc2626', fontSize: 12, padding: error ? '8px 12px' : 0, borderRadius: 6,
            }}>
              {error}
            </p>

            <button type="submit" disabled={saving} className="as-btn">
              {saving ? 'Saving…' : 'Continue to dashboard'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: 12, color: '#6b7280' }}>
          Not you?{' '}
          <button type="button" onClick={() => { logout(); navigate('/login'); }} className="as-link">Sign out</button>
        </p>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: '.35rem' }}>{label}</label>
      {children}
    </div>
  );
}

const wrap = { minHeight: '100vh', background: '#f4f6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" };
const card = { background: '#fff', borderRadius: 16, boxShadow: '0 4px 32px rgba(10,58,110,.1)', padding: '2.5rem 2rem', width: '100%', maxWidth: 440, boxSizing: 'border-box' };

const CSS = `
  .as-input{width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;background:#fff;color:#0a1628;outline:none;}
  .as-input:focus-visible{outline:2px solid #0a3a6e;outline-offset:1px;border-color:#0a3a6e;}
  .as-input:disabled{background:#f3f4f6;color:#9aa4b2;cursor:not-allowed;}
  .as-btn{width:100%;padding:11px;background:#0a3a6e;border:none;border-radius:8px;color:#fff;font-weight:600;font-size:14px;cursor:pointer;margin-top:4px;}
  .as-btn:hover:not(:disabled){background:#0c4a8a;}
  .as-btn:focus-visible{outline:2px solid #0a3a6e;outline-offset:2px;}
  .as-btn:disabled{background:#93c5fd;cursor:not-allowed;}
  .as-link{background:none;border:none;color:#1d4ed8;font-weight:600;cursor:pointer;padding:0;font-size:12px;}
  .as-link:hover{text-decoration:underline;}
  .as-link:focus-visible{outline:2px solid #1d4ed8;outline-offset:2px;border-radius:2px;}
  @media(max-width:768px){
    /* 16px avoids iOS zoom-on-focus; taller inputs hit the 44px touch target */
    .as-input{font-size:16px;padding-top:11px;padding-bottom:11px;}
    .as-btn{min-height:44px;}
  }
`;
