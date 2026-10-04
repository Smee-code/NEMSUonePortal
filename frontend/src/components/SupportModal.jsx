import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';

/* Ask the backend to email the signed-in user a password-reset link. Returns
 * { ok, email? , error? } so each caller can surface it with its own toast. */
export async function requestSelfPasswordReset() {
  try {
    const res = await api.post('/auth/password-reset/self/');
    return { ok: true, email: res.data?.email };
  } catch (err) {
    return { ok: false, error: err.response?.data?.error || 'Could not send the reset link. Please try again.' };
  }
}

/* Global provider so any shell can open the support dialog with useSupport(). */
const SupportCtx = createContext(() => {});
export function useSupport() { return useContext(SupportCtx); }
export function SupportProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openSupport = useCallback(() => setOpen(true), []);
  return (
    <SupportCtx.Provider value={openSupport}>
      {children}
      {open && <SupportModal onClose={() => setOpen(false)} />}
    </SupportCtx.Provider>
  );
}

/*
 * SupportModal — a small, self-contained "Help & support" dialog with the
 * campus contact details. Rendered via a portal so any shell can drop it in.
 */
const CONTACTS = [
  { icon: 'ti-mail',      label: 'Email',        value: 'cantilan@nemsu.edu.ph', href: 'mailto:cantilan@nemsu.edu.ph' },
  { icon: 'ti-phone',     label: 'Phone',        value: '(086) 211-3000',        href: 'tel:+63862113000' },
  { icon: 'ti-map-pin',   label: 'Campus',       value: 'Cantilan, Surigao del Sur, Philippines' },
  { icon: 'ti-clock',     label: 'Office hours', value: 'Monday – Friday, 8:00 AM – 5:00 PM' },
];

export default function SupportModal({ onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="sup-overlay" onClick={onClose}>
      <style>{CSS}</style>
      <div className="sup-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Help and support">
        <div className="sup-head">
          <div>
            <div className="sup-eyebrow">Help &amp; support</div>
            <h3 className="sup-title">We're here to help</h3>
          </div>
          <button className="sup-x" onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>
        </div>

        <p className="sup-lead">
          For account issues (login, password, records) contact the Registrar's Office.
          For anything about your grades, schedule, or class, reach out to your instructor.
        </p>

        <div className="sup-list">
          {CONTACTS.map(c => (
            <div className="sup-row" key={c.label}>
              <div className="sup-ico"><i className={`ti ${c.icon}`} /></div>
              <div className="sup-meta">
                <div className="sup-lbl">{c.label}</div>
                {c.href
                  ? <a className="sup-val sup-link" href={c.href}>{c.value}</a>
                  : <div className="sup-val">{c.value}</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="sup-foot">
          <button className="sup-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const CSS = `
  .sup-overlay{position:fixed;inset:0;background:rgba(10,22,40,.5);display:flex;align-items:center;
    justify-content:center;padding:1rem;z-index:3000;}
  .sup-modal{background:#fff;width:100%;max-width:440px;border:1px solid #e5e7eb;
    box-shadow:0 24px 60px rgba(0,0,0,.25);font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a1628;}
  .sup-head{display:flex;justify-content:space-between;align-items:flex-start;padding:1.25rem 1.5rem;border-bottom:1px solid #eef1f5;}
  .sup-eyebrow{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#b89043;font-weight:700;}
  .sup-title{font-size:19px;font-weight:600;margin:.25rem 0 0;letter-spacing:-.01em;}
  .sup-x{background:none;border:none;cursor:pointer;color:#5a6478;font-size:18px;line-height:1;padding:4px;}
  .sup-x:hover{color:#0a1628;}
  .sup-lead{font-size:13px;color:#5a6478;line-height:1.55;margin:0;padding:1rem 1.5rem 0;}
  .sup-list{padding:1rem 1.5rem;display:flex;flex-direction:column;gap:.85rem;}
  .sup-row{display:flex;gap:12px;align-items:center;}
  .sup-ico{width:38px;height:38px;flex-shrink:0;background:#f4f6fb;display:flex;align-items:center;justify-content:center;color:#1e3a5f;font-size:18px;}
  .sup-lbl{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8a93a3;font-weight:600;}
  .sup-val{font-size:14px;color:#0a1628;font-weight:500;margin-top:2px;}
  .sup-link{color:#1e3a5f;text-decoration:none;}
  .sup-link:hover{text-decoration:underline;}
  .sup-foot{padding:1rem 1.5rem;border-top:1px solid #eef1f5;display:flex;justify-content:flex-end;}
  .sup-btn{background:#0a1628;color:#fff;border:none;padding:9px 20px;font:600 13px 'Inter',sans-serif;cursor:pointer;}
  .sup-btn:hover{background:#1e3a5f;}
`;
