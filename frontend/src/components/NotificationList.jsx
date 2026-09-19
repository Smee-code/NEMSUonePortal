/* Renders the announcements feed inside each shell's notification drawer.
   `unreadCount` newest items are marked unread (highlighted dot). */

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

export default function NotificationList({ items = [], unreadCount = 0 }) {
  if (!items.length) {
    return (
      <div className="ntf-empty">
        <i className="ti ti-bell-off" />
        <span>You're all caught up. No announcements yet.</span>
      </div>
    );
  }
  return (
    <div className="ntf-list">
      <style>{CSS}</style>
      {items.map((a, i) => (
        <div key={a.id ?? i} className={`ntf-item${i < unreadCount ? ' unread' : ''}`}>
          <span className="ntf-dot" />
          <div className="ntf-body">
            <div className="ntf-title">{a.title}</div>
            {a.body && <div className="ntf-snippet">{a.body}</div>}
            <div className="ntf-meta">
              {a.target_display ? <span>{a.target_display}</span> : null}
              {a.target_display && a.created_at ? <span className="ntf-sep">·</span> : null}
              {a.created_at ? <span>{timeAgo(a.created_at)}</span> : null}
            </div>
          </div>
        </div>
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
  .ntf-body{min-width:0;}
  .ntf-title{font-size:13px;font-weight:600;color:#0a1628;line-height:1.4;}
  .ntf-item.unread .ntf-title{color:#0a1628;}
  .ntf-snippet{font-size:12.5px;color:#5a6478;line-height:1.5;margin-top:2px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
  .ntf-meta{font-size:11px;color:#8a93a3;margin-top:4px;display:flex;gap:5px;align-items:center;}
  .ntf-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:2.5rem 1rem;color:#8a93a3;font-size:13px;text-align:center;}
  .ntf-empty i{font-size:26px;}
`;
