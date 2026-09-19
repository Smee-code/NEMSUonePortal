import { useEffect, useState } from 'react';

/* Floating "scroll back to top" button; appears once the user scrolls down. */
export default function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <>
      <style>{`
        .backtop{position:fixed;right:20px;bottom:20px;z-index:1400;width:46px;height:46px;border:none;cursor:pointer;
          background:#0B1B2E;color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;
          clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);
          box-shadow:0 8px 24px -8px rgba(11,27,46,.5);opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .2s,transform .2s;}
        .backtop.on{opacity:1;transform:translateY(0);pointer-events:auto;}
        .backtop:hover{background:#13263d;}
        @media(max-width:560px){.backtop{right:14px;bottom:14px;width:42px;height:42px;}}
      `}</style>
      <button
        type="button"
        className={`backtop${show ? ' on' : ''}`}
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <i className="ti ti-arrow-up" />
      </button>
    </>
  );
}
