import { useEffect, useState } from 'react';

/* Slim reading-progress bar pinned to the top of the viewport. */
export default function ScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setPct(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return (
    <div className="scrollprog" aria-hidden="true">
      <style>{`.scrollprog{position:fixed;top:0;left:0;right:0;height:3px;z-index:1500;pointer-events:none;background:transparent;}
        .scrollprog>span{display:block;height:100%;background:linear-gradient(90deg,#C79A3B,#e3c477);transition:width .08s linear;}`}</style>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
