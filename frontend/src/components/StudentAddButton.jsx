import { useState } from 'react';
import api from '../api/axios';

/* Button + modal to add ONE student (admin or registrar). Gathers name, email
   and student ID; the server generates the temporary password and emails it.
   Used by the admin Students page and the registrar List of Students page. */
export default function StudentAddButton({ onCreated, buttonClassName = 'btn-pri' }) {
  const EMPTY = { full_name: '', institutional_email: '', student_id: '' };
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [created, setCreated] = useState(null);
  const [copied, setCopied]   = useState(false);

  function openModal() { setForm(EMPTY); setError(''); setCreated(null); setCopied(false); setOpen(true); }
  function close() { if (!busy) { setOpen(false); setCreated(null); } }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await api.post('/auth/students/create/', {
        full_name: form.full_name.trim(),
        institutional_email: form.institutional_email.trim(),
        student_id: form.student_id.trim(),
      });
      setCreated(res.data);
      onCreated?.();
    } catch (err) {
      const d = err.response?.data;
      let m = d?.error || d?.detail;
      if (!m && d && typeof d === 'object') {
        const first = Object.entries(d)[0];
        if (first) m = `${first[0]}: ${Array.isArray(first[1]) ? first[1][0] : first[1]}`;
      }
      setError(m || 'Failed to create the student.');
    } finally { setBusy(false); }
  }

  function copyDetails() {
    if (!created) return;
    const text =
      `NEMSUonePortal student account\n` +
      `Name: ${created.full_name}\n` +
      `Student ID: ${created.student_id_value || created.student_id}\n` +
      `Login email: ${created.institutional_email}\n` +
      `Temporary password: ${created.temporary_password}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <>
      <style>{CSS}</style>
      <button type="button" className={buttonClassName} onClick={openModal}>
        <i className="ti ti-user-plus" /> Add student
      </button>

      {open && (
        <div className="sab-overlay" onMouseDown={close}>
          <div className="sab-modal" onMouseDown={e => e.stopPropagation()}>
            <div className="sab-head">
              <div>
                <h3>{created ? 'Student account created' : 'Add student'}</h3>
                <p>{created
                  ? (created.email_sent
                      ? 'The login details below were emailed to the student.'
                      : 'The account was created, but the email could not be sent — share these details directly.')
                  : 'Enter the student’s details. A temporary password is generated and emailed to them.'}</p>
              </div>
              <button className="sab-x" onClick={close} disabled={busy}><i className="ti ti-x" /></button>
            </div>

            {created ? (
              <div className="sab-body">
                <div className={`sab-banner${created.email_sent ? '' : ' warn'}`}>
                  <i className={`ti ${created.email_sent ? 'ti-mail-check' : 'ti-mail-exclamation'}`} />
                  <span>{created.email_sent
                    ? `A login email was sent to ${created.institutional_email}.`
                    : `Email to ${created.institutional_email} failed — copy the details below.`}</span>
                </div>
                <div className="sab-cred">
                  <div className="sab-cred-row"><span>Name</span><b>{created.full_name}</b></div>
                  <div className="sab-cred-row"><span>Student ID</span><b>{created.student_id_value || created.student_id}</b></div>
                  <div className="sab-cred-row"><span>Login email</span><b>{created.institutional_email}</b></div>
                  <div className="sab-cred-row"><span>Temporary password</span><b className="sab-pw">{created.temporary_password}</b></div>
                </div>
                <div className="sab-hint">The student can change this password from their profile after logging in.</div>
                <div className="sab-foot">
                  <button type="button" className="btn-sec" onClick={copyDetails}>
                    <i className="ti ti-copy" /> {copied ? 'Copied' : 'Copy details'}
                  </button>
                  <button type="button" className="btn-pri" onClick={openModal}>Add another</button>
                  <button type="button" className="btn-pri" onClick={close}>Done</button>
                </div>
              </div>
            ) : (
              <form className="sab-body" onSubmit={submit}>
                {error && <div className="sab-err">{error}</div>}
                <div className="sab-field">
                  <label>Full name</label>
                  <input required placeholder="Dela Cruz, Juan A."
                    value={form.full_name} onChange={e => set('full_name', e.target.value)} />
                </div>
                <div className="sab-field">
                  <label>Institutional email</label>
                  <input type="email" required placeholder="jdelacruz@nemsu.edu.ph"
                    value={form.institutional_email} onChange={e => set('institutional_email', e.target.value)} />
                </div>
                <div className="sab-field">
                  <label>Student ID</label>
                  <input required placeholder="e.g. 2026-00123"
                    value={form.student_id} onChange={e => set('student_id', e.target.value)} />
                </div>
                <div className="sab-note">
                  <i className="ti ti-mail" />
                  <span>The Student ID stays as entered. A temporary password is generated and emailed automatically.</span>
                </div>
                <div className="sab-foot">
                  <button type="button" className="btn-sec" onClick={close} disabled={busy}>Cancel</button>
                  <button type="submit" className="btn-pri" disabled={busy}>{busy ? 'Creating…' : 'Add student'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const CSS = `
  .sab-overlay{position:fixed;inset:0;background:rgba(10,22,40,.5);z-index:1100;display:flex;align-items:flex-start;justify-content:center;padding:3rem 1rem;overflow-y:auto;}
  .sab-modal{background:#fff;width:100%;max-width:460px;border:1px solid #e4e7ec;box-shadow:0 24px 60px -20px rgba(10,22,40,.45);animation:sabIn .18s ease;}
  @keyframes sabIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
  .sab-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding:1.2rem 1.4rem;border-bottom:1px solid #eef0f4;}
  .sab-head h3{font-size:16px;font-weight:700;color:#0b1b2e;}
  .sab-head p{font-size:12.5px;color:#64748b;margin-top:3px;line-height:1.45;}
  .sab-x{background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;line-height:1;}
  .sab-x:hover{color:#0b1b2e;}
  .sab-body{padding:1.2rem 1.4rem;}
  .sab-err{background:#fee2e2;color:#991b1b;padding:.6rem .85rem;font-size:12.5px;margin-bottom:1rem;}
  .sab-field{display:flex;flex-direction:column;gap:5px;margin-bottom:1rem;}
  .sab-field label{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#64748b;font-weight:600;}
  .sab-field input{padding:9px 12px;border:1px solid #e4e7ec;background:#fff;font:13.5px/1.4 'Inter',sans-serif;color:#0b1b2e;outline:none;}
  .sab-field input:focus{border-color:#0b1b2e;}
  .sab-note{display:flex;gap:8px;align-items:flex-start;background:#fbf5e6;border:1px solid #e7d3a1;border-left:3px solid #b8860b;color:#7a5c16;padding:9px 12px;font-size:11.5px;line-height:1.5;margin-bottom:.4rem;}
  .sab-note i{font-size:15px;flex-shrink:0;color:#b8860b;margin-top:1px;}
  .sab-banner{display:flex;align-items:center;gap:9px;padding:.7rem .9rem;margin-bottom:1rem;font-size:12.5px;background:#e6f4ec;color:#0a6b48;}
  .sab-banner.warn{background:#fdf3e2;color:#8a6a12;}
  .sab-banner i{font-size:17px;flex-shrink:0;}
  .sab-cred{border:1px solid #e4e7ec;background:#faf7f0;}
  .sab-cred-row{display:flex;justify-content:space-between;gap:1rem;padding:.6rem .9rem;border-bottom:1px solid #eef0f4;font-size:13px;}
  .sab-cred-row:last-child{border-bottom:none;}
  .sab-cred-row span{color:#64748b;font-size:11px;letter-spacing:.05em;text-transform:uppercase;font-weight:600;}
  .sab-cred-row b{color:#0b1b2e;font-weight:600;text-align:right;word-break:break-all;}
  .sab-pw{font-family:'Courier New',monospace;font-size:14px;}
  .sab-hint{font-size:11.5px;color:#94a3b8;margin-top:.7rem;line-height:1.4;}
  .sab-foot{display:flex;justify-content:flex-end;gap:.6rem;margin-top:1.2rem;flex-wrap:wrap;}
`;
