import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/*
 * ScrollMemory — remembers and restores the scroll position of the shell's
 * scrolling container per history entry.
 *
 * The role shells scroll an inner container (e.g. `.fac-body`), not the window,
 * so neither the browser nor React Router restores the position on Back/Forward.
 * This component saves each history entry's scroll offset and, when you navigate
 * BACK to it (POP), restores it — retrying until the page's data has finished
 * loading so it lands in the right place even while a spinner is showing. New
 * navigations (PUSH/REPLACE) scroll to the top as usual.
 *
 * Drop one instance next to <Outlet/> inside each shell's scroll container.
 */

// history entry key -> scrollTop. Module-level so it survives page unmounts.
const positions = new Map();
const MAX_ENTRIES = 60;

function remember(key, top) {
  positions.set(key, top);
  if (positions.size > MAX_ENTRIES) {
    // Drop the oldest entry (Map preserves insertion order).
    positions.delete(positions.keys().next().value);
  }
}

function findScroller(node) {
  let el = node?.parentElement;
  while (el && el !== document.body) {
    const oy = getComputedStyle(el).overflowY;
    if (oy === 'auto' || oy === 'scroll') return el;
    el = el.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

export default function ScrollMemory() {
  const markerRef = useRef(null);
  const location  = useLocation();
  const navType   = useNavigationType();          // 'POP' | 'PUSH' | 'REPLACE'

  useLayoutEffect(() => {
    const scroller = findScroller(markerRef.current);
    if (!scroller) return;

    const isWindow = scroller === document.scrollingElement || scroller === document.documentElement;
    const target   = isWindow ? window : scroller;
    const key      = location.key;

    let restoring = false;
    let raf = 0;

    const onScroll = () => {
      if (restoring) return;                       // don't overwrite the goal mid-restore
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => remember(key, scroller.scrollTop));
    };
    target.addEventListener('scroll', onScroll, { passive: true });

    if (navType === 'POP' && positions.has(key)) {
      // Returning to a page: restore its saved offset, retrying while the content
      // (which may still be fetching) grows tall enough to reach it.
      const wanted = positions.get(key);
      restoring = true;
      let tries = 0;
      const apply = () => {
        scroller.scrollTop = wanted;
        if (Math.abs(scroller.scrollTop - wanted) > 2 && tries++ < 40) {
          requestAnimationFrame(apply);           // ~0.6s of retries for slow loads
        } else {
          restoring = false;
        }
      };
      requestAnimationFrame(apply);
    } else {
      // Fresh navigation: start at the top.
      scroller.scrollTop = 0;
    }

    return () => {
      if (!restoring) remember(key, scroller.scrollTop);
      target.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [location.key, navType]);

  return <div ref={markerRef} aria-hidden="true" style={{ display: 'none' }} />;
}
