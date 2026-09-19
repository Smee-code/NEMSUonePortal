import { useState } from 'react';

/*
  Password field with a show/hide toggle. Drop-in for a plain
  <input type="password">; forwards className and any other input props so
  it inherits each page's existing field styling.
*/
export default function PasswordInput({ className = '', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <span className="pwd-wrap">
      <style>{`
        .pwd-wrap{position:relative;display:block;}
        .pwd-wrap>input{width:100%;padding-right:42px !important;box-sizing:border-box;}
        .pwd-toggle{position:absolute;top:0;right:0;height:100%;width:40px;border:none;background:none;cursor:pointer;
          color:#8a92a3;display:flex;align-items:center;justify-content:center;font-size:17px;}
        .pwd-toggle:hover{color:#0B1B2E;}
      `}</style>
      <input {...props} type={show ? 'text' : 'password'} className={className} />
      <button
        type="button"
        className="pwd-toggle"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        <i className={`ti ${show ? 'ti-eye-off' : 'ti-eye'}`} />
      </button>
    </span>
  );
}
