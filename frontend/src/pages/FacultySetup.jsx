import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

/*
  Public page an invited faculty reaches from the "Set up my account" button in
  their email: /faculty-setup/<token>. They only create a password; on success
  they're signed in and sent to their dashboard.
*/
export default function FacultySetup() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const [state, setState]   = useState('loading'); // loading | ready | invalid
  const [info, setInfo]     = useState(null);
  const [fatal, setFatal]   = useState('');
  const [pw, setPw]         = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow]     = useState(false);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get(`/auth/faculty-setup/${token}/`)
      .then(r => { setInfo(r.data); setState('ready'); })
      .catch(err => { setFatal(err.response?.data?.error || 'This setup link is invalid.'); setState('invalid'); });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (pw.length < 12) { setError('Password must be at least 12 characters.'); return; }
    if (pw !== confirm) { setError('The two passwords do not match.'); return; }
    setSaving(true);
    try {
      const res = await api.post(`/auth/faculty-setup/${token}/complete/`, { password: pw, confirm });
      loginWithToken(res.data.access);
      navigate('/faculty/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Couldn’t set up your account. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="fs-wrap">
      <style>{CSS}</style>
      <div className="fs-card">
        <div className="fs-brand">
          <span className="fs-mark">NEMSU</span>
          <span className="fs-sub">Cantilan · Faculty</span>
        </div>

        {state === 'loading' && <p className="fs-muted">Checking your setup link…</p>}

        {state === 'invalid' && (
          <div className="fs-note fs-err">
            <i className="ti ti-alert-triangle" />
            <div>{fatal} If you need a new link, please contact the Registrar’s Office at <a href="mailto:cantilan@nemsu.edu.ph">cantilan@nemsu.edu.ph</a>.</div>
          </div>
        )}

        {state === 'ready' && info && (
          <>
            <h1 className="fs-title">Set up your account</h1>
            <p className="fs-lead">
              Welcome, <strong>{info.full_name}</strong>. Create a password to finish setting up your
              faculty account. You’ll be signed in right after.
            </p>
            <div className="fs-meta">
              <span><i className="ti ti-id-badge-2" /> {info.faculty_id}</span>
              <span><i className="ti ti-mail" /> {info.email}</span>
            </div>

            <form onSubmit={submit}>
              <label className="fs-label" htmlFor="fs-pw">Password</label>
              <div className="fs-pw">
                <input id="fs-pw" className="fs-input" type={show ? 'text' : 'password'} value={pw}
                  onChange={e => setPw(e.target.value)} placeholder="At least 12 characters"
                  autoComplete="new-password" autoFocus />
                <button type="button" className="fs-eye" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                  <i className={`ti ${show ? 'ti-eye-off' : 'ti-eye'}`} />
                </button>
              </div>

              <label className="fs-label" htmlFor="fs-cf">Confirm password</label>
              <input id="fs-cf" className="fs-input" type={show ? 'text' : 'password'} value={confirm}
                onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password"
                autoComplete="new-password" />

              {error && <p className="fs-formerr">{error}</p>}

              <button type="submit" className="fs-btn" disabled={saving}>
                {saving ? 'Setting up…' : 'Create password & sign in'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const CSS = `
  .fs-wrap{min-height:100vh;background:#eef2f7;display:flex;align-items:flex-start;justify-content:center;padding:clamp(1rem,5vh,4rem) 1rem;font-family:'Inter',-apple-system,sans-serif;box-sizing:border-box;}
  .fs-card{background:#fff;width:100%;max-width:440px;border-radius:14px;box-shadow:0 20px 50px -24px rgba(10,22,40,.4);padding:clamp(1.4rem,4vw,2.2rem);box-sizing:border-box;}
  .fs-brand{display:flex;align-items:baseline;gap:9px;margin-bottom:1.4rem;}
  .fs-mark{font-weight:800;letter-spacing:.06em;color:#0a3a6e;font-size:19px;}
  .fs-sub{font-size:12px;color:#94a3b8;font-weight:600;}
  .fs-title{font-size:clamp(1.3rem,4vw,1.55rem);font-weight:800;color:#0a1628;margin:0 0 .4rem;}
  .fs-lead{font-size:14px;color:#475569;line-height:1.55;margin:0 0 1rem;}
  .fs-meta{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;color:#64748b;margin-bottom:1.3rem;}
  .fs-meta i{margin-right:4px;color:#b8860b;}
  .fs-label{display:block;font-size:12.5px;font-weight:600;color:#0a1628;margin:0 0 5px;}
  .fs-input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d1d9e3;border-radius:8px;font:15px 'Inter',sans-serif;color:#0a1628;outline:none;margin-bottom:1rem;}
  .fs-input:focus{border-color:#0a3a6e;}
  .fs-pw{position:relative;}
  .fs-pw .fs-input{margin-bottom:1rem;padding-right:42px;}
  .fs-eye{position:absolute;top:11px;right:8px;background:none;border:none;color:#94a3b8;cursor:pointer;font-size:17px;padding:2px;line-height:1;}
  .fs-eye:hover{color:#0a1628;}
  .fs-formerr{color:#dc2626;font-size:12.5px;margin:-.4rem 0 .85rem;font-weight:500;}
  .fs-btn{width:100%;padding:12px;border:none;border-radius:8px;background:#0a3a6e;color:#fff;font:700 14px 'Inter',sans-serif;cursor:pointer;}
  .fs-btn:hover:not(:disabled){background:#09315d;}
  .fs-btn:disabled{opacity:.65;cursor:default;}
  .fs-muted{font-size:14px;color:#64748b;}
  .fs-note{display:flex;gap:11px;padding:13px 15px;border-radius:10px;font-size:13.5px;line-height:1.5;}
  .fs-note i{font-size:20px;flex-shrink:0;margin-top:1px;}
  .fs-note a{color:inherit;font-weight:600;}
  .fs-err{background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;}
`;
