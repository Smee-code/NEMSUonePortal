/* Renders the announcements feed inside each shell's notification drawer.
   `unreadCount` newest items are marked unread (highlighted dot). Each item
   whose body is too long to fit can be expanded to read the full detail. */

import { useLayoutEffect, useRef, useState } from 'react';

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function NotificationItem({ item, unread }) {
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  const snipRef = useRef(null);
  const hasBody = !!item.body;

  // Detect whether the body is truncated so the toggle only shows when there's
  // actually more to read. Measured while collapsed (line-clamp active).
  useLayoutEffect(() => {
    const el = snipRef.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [item.body]);

  const showToggle = hasBody && (clamped || open);

  return (
    <div className={`ntf-item${unread ? ' unread' : ''}`}>
      <span className="ntf-dot" />
      <div className="ntf-body">
        <div className="ntf-title">{item.title}</div>
        {hasBody && (
          <div ref={snipRef} className={`ntf-snippet${open ? ' full' : ''}`}>
            {item.body}
          </div>
        )}
        <div className="ntf-meta">
          {item.target_display ? <span>{item.target_display}</span> : null}
          {item.target_display && item.created_at ? <span className="ntf-sep">·</span> : null}
          {item.created_at ? <span>{timeAgo(item.created_at)}</span> : null}
        </div>
        {showToggle && (
          <button
            type="button"
            className="ntf-more"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
          >
            {open ? 'Show less' : 'Show more'}
            <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function NotificationList({ items = [], unreadCount = 0 }) {
  if (!items.length) {
    return (
      <div className="ntf-empty">
        <i className="ti ti-bell-off" />
        <span>You're all caught up. No notifications yet.</span>
      </div>
    );
  }
  return (
    <div className="ntf-list">
      <style>{CSS}</style>
      {items.map((a, i) => (
        <NotificationItem key={a.id ?? i} item={a} unread={i < unreadCount} />
      ))}
    </div>
  );
}

const CSS = `
  .ntf-list{display:flex;flex-direction:column;}
  .ntf-item{display:flex;gap:11px;padding:13px 2px;border-bottom:1px solid #eef0f4;}
  .ntf-item:last-child{border-bottom:none;}
  .ntf-dot{width:8px;height:8px;border-radius:50%;background:#d5dae3;margin-top:6px;flex-shrink:0;}
  .ntf-item.unread .ntf-dot{background:#b89043;}
  .ntf-body{min-width:0;flex:1;}
  .ntf-title{font-size:13px;font-weight:600;color:#0a1628;line-height:1.4;}
  .ntf-item.unread .ntf-title{color:#0a1628;}
  .ntf-snippet{font-size:12.5px;color:#5a6478;line-height:1.5;margin-top:2px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;}
  .ntf-snippet.full{display:block;-webkit-line-clamp:none;overflow:visible;}
  .ntf-meta{font-size:11px;color:#8a93a3;margin-top:4px;display:flex;gap:5px;align-items:center;}
  .ntf-more{margin-top:6px;display:inline-flex;align-items:center;gap:3px;background:none;border:none;padding:0;
    font-family:inherit;font-size:11.5px;font-weight:600;color:#b89043;cursor:pointer;}
  .ntf-more:hover{color:#8a6a12;text-decoration:underline;}
  .ntf-more i{font-size:14px;}
  .ntf-more:focus-visible{outline:2px solid #b89043;outline-offset:2px;border-radius:3px;}
  .ntf-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:2.5rem 1rem;color:#8a93a3;font-size:13px;text-align:center;}
  .ntf-empty i{font-size:26px;}
`;
