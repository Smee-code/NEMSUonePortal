import { useEffect, useState } from 'react';

// Live countdown to a lockout's end. Pass the Date the lock lifts (or null).
// Returns the whole seconds remaining, re-rendering every second, reaching 0
// exactly when the lock expires.
export function useLockCountdown(lockUntil) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!lockUntil) return undefined;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lockUntil]);
  if (!lockUntil) return 0;
  return Math.max(0, Math.ceil((lockUntil.getTime() - now) / 1000));
}

// Rounded, human-friendly wait text, e.g. "about 32 minutes" / "about 2 hours".
export function formatLockWait(seconds) {
  if (seconds <= 0) return '';
  if (seconds < 60) return 'less than a minute';
  if (seconds < 3600) {
    const m = Math.ceil(seconds / 60);
    return `about ${m} minute${m !== 1 ? 's' : ''}`;
  }
  const h = Math.ceil(seconds / 3600);
  return `about ${h} hour${h !== 1 ? 's' : ''}`;
}
