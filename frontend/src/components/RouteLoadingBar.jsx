import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/* A thin top progress bar that animates briefly on every route change,
   giving navigation a sense of responsiveness. */
export default function RouteLoadingBar() {
  const { pathname } = useLocation();
  const [pct, setPct] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef([]);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisible(true);
    setPct(12);
    timers.current.push(setTimeout(() => setPct(70), 60));
    timers.current.push(setTimeout(() => setPct(100), 320));
    timers.current.push(setTimeout(() => setVisible(false), 520));
    timers.current.push(setTimeout(() => setPct(0), 640));
    return () => timers.current.forEach(clearTimeout);
  }, [pathname]);

  return (
    <div className="routebar" aria-hidden="true">
      <style>{`.routebar{position:fixed;top:0;left:0;right:0;height:3px;z-index:1600;pointer-events:none;}
        .routebar>span{display:block;height:100%;background:linear-gradient(90deg,#C79A3B,#e9d08a);
          box-shadow:0 0 8px rgba(199,154,59,.7);transition:width .25s ease,opacity .2s ease;}`}</style>
      <span style={{ width: `${pct}%`, opacity: visible ? 1 : 0 }} />
    </div>
  );
}
