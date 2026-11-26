import { useState } from 'react';
import Lightbox from './Lightbox';

/*
  Graphic presentation of announcements, shared by the student page and the
  staff page (faculty / registrar / admin).

  - AnnouncementOverview: a strip of tiles, one per category, each with its icon
    and a count. The tiles are also the category filter.
  - AnnouncementCard: one announcement as a card. A poster image if one was
    uploaded, otherwise a colored band with the category icon; a calendar-style
    date badge and "when / where" facts for events and deadlines; the text below.

  Category is always shown as icon + word, never by color alone. The styles carry
  their own colors, so the cards look the same inside every role's layout.
*/
export const CATEGORY_META = {
  general:  { label: 'General',  icon: 'ti-speakerphone',   fg: '#0b1b2e', bg: '#e8edf5' },
  academic: { label: 'Academic', icon: 'ti-school',         fg: '#1e40af', bg: '#dbeafe' },
  event:    { label: 'Event',    icon: 'ti-calendar-event', fg: '#065f46', bg: '#d1fae5' },
  deadline: { label: 'Deadline', icon: 'ti-hourglass',      fg: '#92400e', bg: '#fef3c7' },
  advisory: { label: 'Advisory', icon: 'ti-alert-triangle', fg: '#991b1b', bg: '#fee2e2' },
};
export const CATEGORY_ORDER = ['general', 'academic', 'event', 'deadline', 'advisory'];

const AUDIENCE_LABEL = { all: 'All users', student: 'Students only', faculty: 'Faculty only', public: 'Public / landing page' };

// Dates with no time ("2026-12-03") are built from their parts so they never
// shift a day through timezone conversion.
const dayFromISO = iso => { const [y, m, d] = (iso || '').split('-').map(Number); return y ? new Date(y, m - 1, d) : null; };

function formatTime(hms) {
  const [h, m] = (hms || '').split(':').map(Number);
  if (Number.isNaN(h)) return '';
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/* "Today", "Tomorrow", "In 5 days", or "Ended" for a past date. */
function countdown(day) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const n = Math.round((day - today) / 86400000);
  if (n < 0) return { text: 'Ended', past: true };
  if (n === 0) return { text: 'Today', soon: true };
  if (n === 1) return { text: 'Tomorrow', soon: true };
  return { text: `In ${n} days`, soon: n <= 3 };
}

/* The styles for the overview, the grid (.anc-grid) and the cards. A page
   renders this once, however many cards it shows. */
export function AnnouncementStyles() {
  return <style>{CSS}</style>;
}

export function AnnouncementOverview({ items, active, onChange }) {
  const counts = items.reduce((acc, a) => { const k = CATEGORY_META[a.category] ? a.category : 'general'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const tiles = [{ key: '', label: 'All', icon: 'ti-layout-grid', fg: '#0b1b2e', bg: '#f1f5f9', n: items.length },
    ...CATEGORY_ORDER.map(k => ({ key: k, ...CATEGORY_META[k], n: counts[k] || 0 }))];
  return (
    <div className="anc-over" role="group" aria-label="Filter announcements by category">
      {tiles.map(t => (
        <button key={t.key || 'all'} type="button" className={`anc-tile${active === t.key ? ' is-on' : ''}`}
          aria-pressed={active === t.key} disabled={t.key !== '' && t.n === 0} onClick={() => onChange(t.key)}>
          <span className="anc-tile-ic" style={{ background: t.bg, color: t.fg }}><i className={`ti ${t.icon}`} aria-hidden="true" /></span>
          <span className="anc-tile-txt">
            <span className="anc-tile-n">{t.n}</span>
            <span className="anc-tile-l">{t.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export default function AnnouncementCard({ ann, showAudience = true, actions = null }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const cat = CATEGORY_META[ann.category] || CATEGORY_META.general;
  const day = dayFromISO(ann.event_date);
  const left = day ? countdown(day) : null;
  const long = (ann.body || '').length > 200 || (ann.body || '').split('\n').length > 3;
  const posted = new Date(ann.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  const bodyId = `anc-body-${ann.id}`;

  return (
    <article className={`anc${ann.is_pinned ? ' is-pinned' : ''}`}>
      {ann.image ? (
        <button type="button" className="anc-media" onClick={() => setZoom(true)} aria-label={`View the image for “${ann.title}” full size`}>
          <img src={ann.image} alt="" loading="lazy" />
          <span className="anc-media-hint"><i className="ti ti-arrows-maximize" aria-hidden="true" /> View</span>
        </button>
      ) : (
        <div className="anc-band" style={{ background: cat.bg, color: cat.fg }} aria-hidden="true">
          <i className={`ti ${cat.icon}`} />
        </div>
      )}

      <div className="anc-main">
        <div className="anc-tags">
          <span className="anc-chip" style={{ background: cat.bg, color: cat.fg }}>
            <i className={`ti ${cat.icon}`} aria-hidden="true" /> {cat.label}
          </span>
          {ann.is_pinned && <span className="anc-chip anc-chip--pin"><i className="ti ti-pin" aria-hidden="true" /> Pinned</span>}
          {ann.is_new && <span className="anc-chip anc-chip--new">New</span>}
        </div>

        <div className="anc-head">
          {day && (
            <div className={`anc-date${left.past ? ' is-past' : ''}`} aria-hidden="true">
              <span className="anc-date-m">{day.toLocaleDateString('en-PH', { month: 'short' })}</span>
              <span className="anc-date-d">{day.getDate()}</span>
              <span className="anc-date-w">{day.toLocaleDateString('en-PH', { weekday: 'short' })}</span>
            </div>
          )}
          <div className="anc-head-txt">
            <h3 className="anc-title">{ann.title}</h3>
            <p className="anc-by">{ann.posted_by_name || 'Administration'} · posted {posted}</p>
          </div>
        </div>

        {(day || ann.location || showAudience) && (
          <dl className="anc-facts">
            {day && (
              <div className="anc-fact">
                <dt><i className="ti ti-calendar" aria-hidden="true" /> When</dt>
                <dd>
                  {day.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  {ann.event_time ? `, ${formatTime(ann.event_time)}` : ''}
                  <span className={`anc-left${left.past ? ' is-past' : left.soon ? ' is-soon' : ''}`}>{left.text}</span>
                </dd>
              </div>
            )}
            {ann.location && (
              <div className="anc-fact">
                <dt><i className="ti ti-map-pin" aria-hidden="true" /> Where</dt>
                <dd>{ann.location}</dd>
              </div>
            )}
            {showAudience && (
              <div className="anc-fact">
                <dt><i className="ti ti-users" aria-hidden="true" /> For</dt>
                <dd>{AUDIENCE_LABEL[ann.target_audience] || ann.target_display}</dd>
              </div>
            )}
          </dl>
        )}

        <p id={bodyId} className={`anc-body${long && !open ? ' is-clamped' : ''}`}>{ann.body}</p>

        {(long || actions) && (
          <div className="anc-foot">
            {long ? (
              <button type="button" className="anc-more" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(o => !o)}>
                {open ? 'Show less' : 'Read more'} <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} aria-hidden="true" />
              </button>
            ) : <span />}
            {actions && <div className="anc-actions">{actions}</div>}
          </div>
        )}
      </div>

      {zoom && <Lightbox images={[ann.image]} title={ann.title} onClose={() => setZoom(false)} />}
    </article>
  );
}

const CSS = `
  .anc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem;align-items:start;}
  @media(min-width:980px){ .anc-grid .anc.is-pinned{grid-column:span 2;} }

  /* overview tiles (also the category filter) */
  .anc-over{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:.6rem;margin-bottom:1.25rem;}
  .anc-tile{display:flex;align-items:center;gap:.65rem;padding:.7rem .8rem;background:#fff;border:1px solid #e4e7ec;
    cursor:pointer;text-align:left;font-family:inherit;min-height:60px;transition:border-color .15s,box-shadow .15s;}
  .anc-tile:hover:not(:disabled){border-color:#0b1b2e;}
  .anc-tile:focus-visible{outline:2px solid #0b1b2e;outline-offset:2px;}
  .anc-tile.is-on{border-color:#0b1b2e;box-shadow:inset 0 -3px 0 #b89043;}
  .anc-tile:disabled{opacity:.5;cursor:default;}
  .anc-tile-ic{width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
  .anc-tile-txt{display:flex;flex-direction:column;line-height:1.15;min-width:0;}
  .anc-tile-n{font-size:20px;font-weight:700;color:#0b1b2e;font-variant-numeric:tabular-nums;}
  .anc-tile-l{font-size:12px;color:#64748b;font-weight:600;}

  /* card */
  .anc{background:#fff;border:1px solid #e4e7ec;display:flex;flex-direction:column;min-width:0;}
  .anc.is-pinned{border-top:3px solid #b89043;}
  .anc-media{position:relative;display:block;width:100%;padding:0;border:none;background:#eef1f7;cursor:zoom-in;aspect-ratio:16/9;overflow:hidden;}
  .anc-media img{width:100%;height:100%;object-fit:cover;display:block;}
  .anc-media:focus-visible{outline:3px solid #0b1b2e;outline-offset:-3px;}
  .anc-media-hint{position:absolute;right:8px;bottom:8px;background:rgba(11,27,46,.82);color:#fff;font:600 11.5px/1 'Inter',sans-serif;
    padding:6px 8px;display:inline-flex;align-items:center;gap:5px;}
  .anc-band{height:64px;display:flex;align-items:center;padding:0 1.1rem;font-size:34px;}
  .anc-main{padding:1rem 1.1rem 1.1rem;display:flex;flex-direction:column;gap:.7rem;min-width:0;}
  .anc-tags{display:flex;flex-wrap:wrap;gap:6px;}
  .anc-chip{display:inline-flex;align-items:center;gap:5px;font:600 11.5px/1 'Inter',sans-serif;padding:5px 8px;}
  .anc-chip i{font-size:13px;}
  .anc-chip--pin{background:#fef9ec;color:#7c4a03;}
  .anc-chip--new{background:#0b1b2e;color:#fff;}

  .anc-head{display:flex;gap:.85rem;align-items:flex-start;min-width:0;}
  .anc-date{flex-shrink:0;width:58px;border:1px solid #0b1b2e;text-align:center;line-height:1.1;background:#fff;}
  .anc-date-m{display:block;background:#0b1b2e;color:#fff;font-size:11.5px;font-weight:700;padding:3px 0;}
  .anc-date-d{display:block;font-size:24px;font-weight:700;color:#0b1b2e;padding-top:3px;font-variant-numeric:tabular-nums;}
  .anc-date-w{display:block;font-size:11px;color:#64748b;font-weight:600;padding-bottom:4px;}
  .anc-date.is-past{border-color:#94a3b8;}
  .anc-date.is-past .anc-date-m{background:#94a3b8;}
  .anc-date.is-past .anc-date-d{color:#64748b;}
  .anc-head-txt{min-width:0;}
  .anc-title{font-size:16.5px;font-weight:600;color:#0b1b2e;line-height:1.3;margin:0;overflow-wrap:anywhere;}
  .anc-by{font-size:12px;color:#64748b;margin:4px 0 0;}

  .anc-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.5rem .9rem;margin:0;
    padding:.65rem .75rem;background:#f8fafc;border:1px solid #eef0f4;}
  .anc-fact{min-width:0;}
  .anc-fact dt{font-size:11.5px;font-weight:600;color:#64748b;display:flex;align-items:center;gap:4px;}
  .anc-fact dt i{font-size:14px;color:#b89043;}
  .anc-fact dd{margin:2px 0 0;font-size:13px;color:#0b1b2e;font-weight:500;line-height:1.4;overflow-wrap:anywhere;}
  .anc-left{display:inline-block;margin-left:6px;font-size:11.5px;font-weight:700;padding:2px 6px;background:#e8edf5;color:#0b1b2e;white-space:nowrap;}
  .anc-left.is-soon{background:#fef3c7;color:#92400e;}
  .anc-left.is-past{background:#f1f5f9;color:#64748b;}

  .anc-body{font-size:13.5px;line-height:1.65;color:#334155;margin:0;white-space:pre-wrap;overflow-wrap:anywhere;}
  .anc-body.is-clamped{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
  .anc-foot{display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex-wrap:wrap;}
  .anc-more{background:none;border:none;padding:6px 0;font:600 12.5px 'Inter',sans-serif;color:#0b1b2e;cursor:pointer;
    display:inline-flex;align-items:center;gap:4px;text-decoration:underline;min-height:32px;}
  .anc-more:focus-visible{outline:2px solid #0b1b2e;outline-offset:2px;}
  .anc-actions{display:flex;gap:6px;flex-wrap:wrap;}
  @media(max-width:520px){
    .anc-grid{grid-template-columns:1fr;}
    .anc-over{grid-template-columns:repeat(2,1fr);}
  }
`;
