import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/*
  Promise-based confirmation dialog for destructive actions.

  Usage:
    const confirm = useConfirm();
    const ok = await confirm({
      title: 'Delete user?',
      message: 'This permanently removes the account.',
      confirmText: 'Delete',
      tone: 'danger',           // 'danger' (default) | 'primary'
    });
    if (!ok) return;
*/

const ConfirmContext = createContext(() => Promise.resolve(false));
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { opts }
  const resolver = useRef(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setState({ opts });
    });
  }, []);

  const close = useCallback((result) => {
    setState(null);
    if (resolver.current) { resolver.current(result); resolver.current = null; }
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      else if (e.key === 'Enter') close(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [state, close]);

  const o = state?.opts || {};
  const tone = o.tone || 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="cfm-back" onClick={() => close(false)}>
          <style>{CSS}</style>
          <div className="cfm" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className={`cfm-ic cfm-${tone}`}>
              <i className={`ti ${tone === 'danger' ? 'ti-alert-triangle' : 'ti-help-circle'}`} />
            </div>
            <h3 className="cfm-title">{o.title || 'Are you sure?'}</h3>
            {o.message && <p className="cfm-msg">{o.message}</p>}
            <div className="cfm-actions">
              <button type="button" className="cfm-btn cfm-cancel" onClick={() => close(false)}>
                {o.cancelText || 'Cancel'}
              </button>
              <button type="button" className={`cfm-btn cfm-confirm cfm-confirm-${tone}`} onClick={() => close(true)} autoFocus>
                {o.confirmText || (tone === 'danger' ? 'Delete' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

const CSS = `
  .cfm-back{position:fixed;inset:0;z-index:2100;background:rgba(8,14,24,.55);display:flex;align-items:center;justify-content:center;padding:1rem;animation:cfm-fade .15s ease;}
  @keyframes cfm-fade{from{opacity:0}to{opacity:1}}
  .cfm{background:#fff;max-width:420px;width:100%;padding:1.75rem;text-align:center;font-family:'Inter',sans-serif;
    box-shadow:0 24px 60px -20px rgba(0,0,0,.4);
    clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px);
    animation:cfm-pop .16s ease;}
  @keyframes cfm-pop{from{transform:translateY(8px) scale(.98);opacity:.6}to{transform:none;opacity:1}}
  .cfm-ic{width:52px;height:52px;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:26px;border-radius:50%;}
  .cfm-danger{background:#fbe9e6;color:#b8331e;}
  .cfm-primary{background:#e9f0f6;color:#0B1B2E;}
  .cfm-title{margin:0 0 .5rem;font-size:18px;font-weight:600;color:#0B1B2E;}
  .cfm-msg{margin:0 0 1.5rem;font-size:14px;line-height:1.6;color:#5a6478;}
  .cfm-actions{display:flex;gap:10px;justify-content:center;}
  .cfm-btn{cursor:pointer;font:600 14px 'Inter',sans-serif;padding:11px 22px;border:1px solid transparent;
    clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);}
  .cfm-cancel{background:#fff;color:#0a1628;border-color:#d5dae3;}
  .cfm-cancel:hover{border-color:#0B1B2E;}
  .cfm-confirm{color:#fff;}
  .cfm-confirm-danger{background:#b8331e;}
  .cfm-confirm-danger:hover{background:#9c2a17;}
  .cfm-confirm-primary{background:#0B1B2E;}
  .cfm-confirm-primary:hover{background:#13263d;}
  @media(max-width:480px){.cfm-actions{flex-direction:column-reverse;}.cfm-btn{width:100%;}}
`;
