import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';

/*
  Notification state for the topbar bell, shared by every role shell.

  "Notifications" are the announcements the current user can see (the server
  already filters `/announcements/` by their role/audience). An announcement is
  UNREAD when it was posted after the last time this user opened the bell. The
  last-opened time is remembered per user in the browser, so the red dot only
  shows when something new has arrived and clears once the user opens it.

  Returns:
    items       - the announcements (newest first), for rendering in the drawer
    unreadCount - how many are unread (drives the red dot)
    markSeen()  - call when the bell/drawer is opened to clear the dot
*/
export default function useNotifications(userId) {
  const key = userId != null ? `nemsu.notifSeen.${userId}` : null;
  const [items, setItems] = useState([]);
  const [seen, setSeen] = useState(0);

  // Load this user's last-opened timestamp.
  useEffect(() => {
    if (!key) { setSeen(0); return; }
    try { setSeen(Number(localStorage.getItem(key)) || 0); } catch { setSeen(0); }
  }, [key]);

  // Fetch the announcements the user can see.
  useEffect(() => {
    let alive = true;
    api.get('/announcements/')
      .then(r => {
        if (!alive) return;
        const list = Array.isArray(r.data) ? r.data : (r.data?.results || []);
        setItems(list);
      })
      .catch(() => { /* leave empty on failure */ });
    return () => { alive = false; };
  }, []);

  const unreadCount = items.reduce((n, a) => {
    const t = a.created_at ? new Date(a.created_at).getTime() : 0;
    return t > seen ? n + 1 : n;
  }, 0);

  const markSeen = useCallback(() => {
    const now = Date.now();
    if (key) { try { localStorage.setItem(key, String(now)); } catch { /* ignore */ } }
    setSeen(now);
  }, [key]);

  return { items, unreadCount, markSeen };
}
