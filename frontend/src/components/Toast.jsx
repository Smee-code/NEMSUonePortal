import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/*
  App-wide toast notifications.

  Usage:
    const toast = useToast();
    toast('Your request has been submitted.', { type: 'success' });
    toast('Failed to submit. Please try again.', { type: 'error' });
    toast('Saved', { type: 'success', sub: 'Changes are live', duration: 5000 });

  One provider is mounted at the app root, so every page (all roles, the
  shared pages, and the public/auth screens) can raise a toast the same way.
*/

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

const ICONS = {
  success: 'ti-circle-check',
  error: 'ti-circle-x',
  warn: 'ti-alert-triangle',
  info: 'ti-info-circle',
};

let seq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(list => list.filter(t => t.id !== id));
    if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id]; }
  }, []);

  const toast = useCallback((msg, opts = {}) => {
    if (!msg) return;
    const id = ++seq;
    const type = opts.type || 'info';
    const duration = opts.duration ?? (type === 'error' ? 6000 : 4000);
    setToasts(list => [...list, { id, msg, type, sub: opts.sub }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="nemsu-toast-host" role="region" aria-label="Notifications" aria-live="polite">
          <style>{CSS}</style>
          {toasts.map(t => (
            <div key={t.id} className={`nemsu-toast ${t.type}`}>
              <i className={`ti ${ICONS[t.type] || ICONS.info} nemsu-toast-ic`} />
              <div className="nemsu-toast-body">
                <div className="nemsu-toast-msg">{t.msg}</div>
                {t.sub && <div className="nemsu-toast-sub">{t.sub}</div>}
              </div>
              <button className="nemsu-toast-x" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <i className="ti ti-x" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

const CSS = `
  .nemsu-toast-host{position:fixed;top:18px;right:18px;z-index:2200;display:flex;flex-direction:column;gap:10px;
    max-width:min(380px,calc(100vw - 32px));pointer-events:none;}
  .nemsu-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:11px;background:#fff;color:#0a1628;
    padding:13px 14px 13px 15px;border:1px solid #e5e7eb;border-left:4px solid #5a6478;
    box-shadow:0 12px 32px -12px rgba(10,22,40,.35);font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    animation:nemsu-toast-in .22s cubic-bezier(.22,1,.36,1);}
  @keyframes nemsu-toast-in{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
  .nemsu-toast.success{border-left-color:#0a7c52;}
  .nemsu-toast.error{border-left-color:#a8331e;}
  .nemsu-toast.warn{border-left-color:#a06b16;}
  .nemsu-toast.info{border-left-color:#1e3a5f;}
  .nemsu-toast-ic{font-size:19px;flex-shrink:0;margin-top:1px;color:#5a6478;}
  .nemsu-toast.success .nemsu-toast-ic{color:#0a7c52;}
  .nemsu-toast.error .nemsu-toast-ic{color:#a8331e;}
  .nemsu-toast.warn .nemsu-toast-ic{color:#a06b16;}
  .nemsu-toast.info .nemsu-toast-ic{color:#1e3a5f;}
  .nemsu-toast-body{flex:1;min-width:0;}
  .nemsu-toast-msg{font-size:13.5px;font-weight:500;line-height:1.4;}
  .nemsu-toast-sub{font-size:12px;color:#5a6478;margin-top:2px;line-height:1.4;}
  .nemsu-toast-x{flex-shrink:0;background:none;border:none;cursor:pointer;color:#8a93a3;font-size:16px;padding:0 2px;line-height:1;}
  .nemsu-toast-x:hover{color:#0a1628;}
  @media(max-width:520px){
    .nemsu-toast-host{top:auto;bottom:14px;left:14px;right:14px;max-width:none;}
    .nemsu-toast{animation:nemsu-toast-up .22s ease;}
  }
  @keyframes nemsu-toast-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
`;
