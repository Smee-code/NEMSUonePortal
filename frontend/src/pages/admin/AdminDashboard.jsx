import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useAdminShell } from '../../context/AdminShellContext';

/* ── CSS ──────────────────────────────────────────────────────────────────── */
const CSS = `
  .db-page{animation:db-in .25s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;gap:1.75rem}
  @keyframes db-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

  /* Welcome */
  .db-welcome{display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;padding-bottom:1.5rem;border-bottom:1px solid var(--adm-line)}
  .db-w-eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--adm-gold);font-weight:600;margin-bottom:.5rem;display:inline-flex;align-items:center;gap:10px}
  .db-w-eyebrow::before{content:"";width:24px;height:1px;background:var(--adm-gold)}
  .db-w-title{font-family:'Inter',sans-serif;font-weight:500;font-size:42px;color:var(--adm-ink);line-height:1.05;letter-spacing:-.018em;margin-bottom:.5rem}
  .db-w-title em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--adm-ink-2);font-weight:400}
  .db-w-sub{font-size:14px;color:var(--adm-muted);max-width:560px;line-height:1.65}
  .db-w-side{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
  .db-live{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--adm-muted);font-weight:600}
  .db-live-dot{width:7px;height:7px;border-radius:50%;background:var(--adm-green);box-shadow:0 0 0 4px rgba(10,124,82,.16)}
  .db-stamp{font-size:12px;color:var(--adm-faint)}

  /* KPI strip */
  .db-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:0;background:#fff;border:1px solid var(--adm-line)}
  .db-kpi{padding:1.5rem 1.5rem 1.25rem;border-right:1px solid var(--adm-line);display:flex;flex-direction:column;justify-content:space-between;min-height:140px;transition:background .2s;cursor:default}
  .db-kpi:last-child{border-right:none}
  .db-kpi:hover{background:var(--adm-warm)}
  .db-kpi-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem}
  .db-kpi-label{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--adm-muted);font-weight:600;line-height:1.4}
  .db-kpi-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid var(--adm-line);color:var(--adm-ink)}
  .db-kpi-icon i{font-size:16px}
  .db-kpi-value{font-family:'Inter',sans-serif;font-weight:500;font-size:48px;line-height:1;color:var(--adm-ink);letter-spacing:-.02em}
  .db-kpi-sub{font-size:12px;color:var(--adm-muted);margin-top:8px;display:flex;align-items:center;gap:6px}
  .db-trend{display:inline-flex;align-items:center;gap:3px;font-weight:600}
  .db-trend.up{color:var(--adm-green)}.db-trend.down{color:var(--adm-red)}
  .db-trend i{font-size:12px}

  /* Section heading */
  .db-sec{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:1rem}
  .db-sec h3{font-family:'Inter',sans-serif;font-weight:500;font-size:22px;color:var(--adm-ink);letter-spacing:-.008em;line-height:1.1}
  .db-sec h3 em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--adm-ink-2);font-weight:400}
  .db-sec .sub{font-size:12px;color:var(--adm-muted);margin-top:3px}
  .db-sec .actions{display:flex;gap:8px}
  .db-sec-btn{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--adm-muted);font-weight:600;padding:6px 10px;border:1px solid var(--adm-line);background:#fff;cursor:pointer;font-family:inherit;transition:border-color .15s,color .15s}
  .db-sec-btn:hover{border-color:var(--adm-ink);color:var(--adm-ink)}
  .db-sec-btn.active{background:var(--adm-ink);color:#fff;border-color:var(--adm-ink)}

  /* Card */
  .db-card{background:#fff;border:1px solid var(--adm-line);padding:1.5rem 1.5rem 1.25rem;display:flex;flex-direction:column}
  .db-card-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--adm-line-soft)}
  .db-card-head h4{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--adm-muted);font-weight:600;line-height:1.3}
  .db-card-head h4 span{display:block;font-family:'Inter',sans-serif;font-weight:400;font-size:20px;color:var(--adm-ink);text-transform:none;letter-spacing:-.01em;margin-top:4px}
  .db-card-aside{font-size:11px;color:var(--adm-faint);text-align:right;line-height:1.4}
  .db-card-aside strong{font-family:'Inter',sans-serif;font-weight:400;font-size:18px;display:block;letter-spacing:-.01em}

  /* Grid rows */
  .db-row2{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem}
  .db-row21{display:grid;grid-template-columns:2fr 1fr;gap:1.5rem}

  /* Donut */
  .db-donut-wrap{display:flex;align-items:center;gap:1.5rem;padding:.5rem 0}
  .db-donut{position:relative;width:180px;height:180px;flex-shrink:0}
  .db-donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:none}
  .db-donut-center .num{font-family:'Inter',sans-serif;font-size:36px;color:var(--adm-ink);line-height:1;letter-spacing:-.02em}
  .db-donut-center .lbl{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--adm-muted);font-weight:600;margin-top:4px}
  .db-legend{flex:1;display:flex;flex-direction:column;gap:14px;min-width:0}
  .db-legend-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;padding-bottom:12px;border-bottom:1px solid var(--adm-line-soft)}
  .db-legend-row:last-child{border-bottom:none;padding-bottom:0}
  .db-legend-mark{width:8px;height:24px;flex-shrink:0}
  .db-legend-meta .n{font-size:13px;color:var(--adm-ink);font-weight:500;line-height:1.3}
  .db-legend-meta .s{font-size:11px;color:var(--adm-muted);margin-top:2px}
  .db-legend-num{font-family:'Inter',sans-serif;font-size:24px;color:var(--adm-ink);line-height:1;letter-spacing:-.02em}

  /* Pipeline */
  .db-pipe{display:flex;flex-direction:column;gap:14px;padding:.25rem 0}
  .db-pipe-row{display:grid;grid-template-columns:130px 1fr 60px;gap:14px;align-items:center}
  .db-pipe-label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--adm-ink)}
  .db-pipe-dot{width:8px;height:8px;flex-shrink:0}
  .db-pipe-bar{height:24px;background:var(--adm-cool);position:relative;overflow:hidden}
  .db-pipe-fill{height:100%;transition:width .8s cubic-bezier(.4,0,.2,1)}
  .db-pipe-num{text-align:right;font-family:'Inter',sans-serif;font-size:20px;color:var(--adm-ink);letter-spacing:-.01em}

  /* Health */
  .db-health{display:flex;flex-direction:column;gap:1.25rem;padding:.25rem 0}
  .db-health-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
  .db-health-name{font-size:13px;color:var(--adm-ink);font-weight:500}
  .db-health-val{font-size:12px;color:var(--adm-muted)}
  .db-health-val strong{font-family:'Inter',sans-serif;font-weight:500;font-size:18px;color:var(--adm-ink);letter-spacing:-.01em;margin-right:6px}
  .db-health-bar{height:6px;background:var(--adm-line-soft);position:relative;overflow:hidden}
  .db-health-fill{height:100%;transition:width .8s cubic-bezier(.4,0,.2,1)}
  .db-health-desc{font-size:11px;color:var(--adm-faint);margin-top:6px;letter-spacing:.02em}
  .db-grade-inset{margin-top:1.25rem;padding:1.25rem;background:var(--adm-warm);border:1px solid var(--adm-line)}
  .db-grade-head{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--adm-gold);font-weight:600;margin-bottom:1rem}
  .db-grade-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
  .db-grade-stat .num{font-family:'Inter',sans-serif;font-size:32px;line-height:1;color:var(--adm-ink);letter-spacing:-.02em}
  .db-grade-stat .lbl{font-size:11px;color:var(--adm-muted);margin-top:6px;letter-spacing:.05em}

  /* Treemap */
  .db-treemap{width:100%;height:340px;background:var(--adm-cool-2);display:grid;gap:2px;padding:2px}
  .db-cell{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:12px 14px;color:#fff;cursor:pointer;transition:filter .15s}
  .db-cell:hover{filter:brightness(1.07)}
  .db-cell .code{font-family:'Inter',sans-serif;font-size:24px;line-height:1;letter-spacing:-.015em}
  .db-cell .v{font-size:11px;letter-spacing:.06em;margin-top:6px;opacity:.85}
  .db-cell.small .code{font-size:18px}
  .db-cell.tiny .code{font-size:14px}
  .db-cell.tiny .v{display:none}

  /* Recent activity */
  .db-activity{display:flex;flex-direction:column}
  .db-act-row{display:grid;grid-template-columns:auto 1fr auto auto;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid var(--adm-line-soft)}
  .db-act-row:last-child{border-bottom:none}
  .db-act-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:var(--adm-cool);color:var(--adm-ink)}
  .db-act-icon i{font-size:14px}
  .db-act-text{font-size:13px;color:var(--adm-ink);line-height:1.4}
  .db-act-text strong{font-weight:500}
  .db-act-sub{font-size:11px;color:var(--adm-muted);margin-top:2px}
  .db-act-tag{font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;padding:3px 8px}
  .db-act-tag.approved{background:var(--adm-green-tint);color:var(--adm-green)}
  .db-act-tag.created{background:var(--adm-green-tint);color:var(--adm-green)}
  .db-act-tag.updated{background:var(--adm-cool);color:var(--adm-ink-2)}
  .db-act-tag.rejected{background:var(--adm-red-tint);color:var(--adm-red)}
  .db-act-tag.locked{background:var(--adm-amber-tint);color:var(--adm-amber)}
  .db-act-tag.success{background:var(--adm-green-tint);color:var(--adm-green)}
  .db-act-tag.failure{background:var(--adm-red-tint);color:var(--adm-red)}
  .db-act-time{font-size:11px;color:var(--adm-faint);font-variant-numeric:tabular-nums}

  /* Pending review */
  .db-pend-card{background:var(--adm-warm);border:1px solid var(--adm-line);padding:1.5rem 1.5rem 1.25rem;display:flex;flex-direction:column}
  .db-action-item{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid var(--adm-line-soft)}
  .db-action-item:last-child{border-bottom:none}
  .db-action-icon{width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid var(--adm-line);color:var(--adm-ink);flex-shrink:0}
  .db-action-icon i{font-size:16px}
  .db-action-label{font-size:13px;font-weight:500;color:var(--adm-ink);line-height:1.3}
  .db-action-sub{font-size:11px;color:var(--adm-muted);margin-top:2px}
  .db-action-n{font-family:'Inter',sans-serif;font-size:28px;font-weight:500;color:var(--adm-ink);letter-spacing:-.02em;line-height:1}

  /* Quick actions */
  .db-quick{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--adm-line);background:#fff}
  .db-quick-item{padding:1.25rem 1.25rem 1.1rem;border-right:1px solid var(--adm-line);display:flex;flex-direction:column;gap:.5rem;cursor:pointer;text-decoration:none;color:var(--adm-ink);transition:background .15s,padding-left .15s}
  .db-quick-item:last-child{border-right:none}
  .db-quick-item:hover{background:var(--adm-warm);padding-left:1.5rem}
  .db-quick-icon{width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:var(--adm-ink);border:1px solid var(--adm-line);background:#fff;margin-bottom:.5rem}
  .db-quick-icon i{font-size:16px}
  .db-quick-title{font-size:13px;font-weight:600;color:var(--adm-ink);line-height:1.3}
  .db-quick-desc{font-size:11px;color:var(--adm-muted);line-height:1.5}

  /* Trends */
  .db-trends{background:#fff;border:1px solid var(--adm-line);display:grid;grid-template-columns:280px 1fr}
  .db-trends-side{padding:1.75rem;border-right:1px solid var(--adm-line);background:var(--adm-warm)}
  .db-trends-side .lbl{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--adm-gold);font-weight:600;margin-bottom:.75rem}
  .db-trends-side .big{font-family:'Inter',sans-serif;font-weight:500;font-size:54px;color:var(--adm-ink);line-height:1;letter-spacing:-.025em}
  .db-trends-side .ctx{font-size:12px;color:var(--adm-muted);margin-top:8px}
  .db-trends-delta{display:inline-flex;align-items:center;gap:5px;margin-top:1rem;padding:5px 10px;background:#fff;border:1px solid var(--adm-line);font-size:12px;font-weight:500;color:var(--adm-green)}
  .db-trends-delta i{font-size:13px}
  .db-trends-delta.down{color:var(--adm-red)}
  .db-trends-legend{display:flex;flex-direction:column;gap:10px;margin-top:1.75rem;padding-top:1.5rem;border-top:1px solid var(--adm-line)}
  .db-trends-legend-row{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--adm-ink)}
  .db-trends-legend-mark{width:14px;height:14px;flex-shrink:0}
  .db-trends-legend-num{margin-left:auto;font-family:'Inter',sans-serif;font-weight:500;font-size:14px;color:var(--adm-ink);letter-spacing:-.01em}
  .db-trends-main{padding:1.75rem 1.75rem 1.5rem;display:flex;flex-direction:column}
  .db-trends-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--adm-line-soft)}
  .db-trends-head h4{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--adm-muted);font-weight:600}
  .db-trends-head h4 span{display:block;font-family:'Inter',sans-serif;font-weight:500;font-size:20px;color:var(--adm-ink);text-transform:none;letter-spacing:-.01em;margin-top:4px}
  .db-trends-tabs{display:flex;gap:0;background:var(--adm-cool);padding:2px}
  .db-trends-tab{padding:5px 12px;font-size:11px;font-weight:500;color:var(--adm-muted);cursor:pointer;background:none;border:none;font-family:inherit;letter-spacing:.04em}
  .db-trends-tab.active{background:#fff;color:var(--adm-ink);font-weight:600;box-shadow:0 1px 2px rgba(10,22,40,.06)}
  .db-trends-chart{flex:1;position:relative;padding-top:1rem}

  /* Foot note */
  .db-foot{font-size:11px;color:var(--adm-faint);letter-spacing:.04em;padding-top:.5rem;border-top:1px solid var(--adm-line-soft);display:flex;justify-content:space-between}
  .db-foot-live{display:inline-flex;align-items:center;gap:6px}
  .db-foot-live-dot{width:5px;height:5px;border-radius:50%;background:var(--adm-green)}

  /* View-all link */
  .db-view-all{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--adm-muted);font-weight:600;padding:6px 10px;border:1px solid var(--adm-line);background:#fff;cursor:pointer;font-family:inherit;transition:border-color .15s,color .15s;text-decoration:none;display:inline-flex;align-items:center;gap:4px}
  .db-view-all:hover{border-color:var(--adm-ink);color:var(--adm-ink)}

  /* Responsive */
  @media(max-width:1280px){.db-kpis{grid-template-columns:repeat(3,1fr)}.db-kpi:nth-child(-n+3){border-bottom:1px solid var(--adm-line)}.db-kpi:nth-child(3){border-right:none}}
  @media(max-width:980px){.db-row2,.db-row21{grid-template-columns:1fr}.db-quick{grid-template-columns:1fr 1fr}.db-trends{grid-template-columns:1fr}}
`;

/* ── Static data for Enrollment Trends (no historical API) ──────────────── */

const ROLE_ICON = {
  faculty: 'ti-user-edit', registrar: 'ti-clipboard-text',
  admin: 'ti-shield-lock', system: 'ti-server', student: 'ti-user',
};

const ACTION_MAP = {
  'grade.submit':        { what:'submitted grades for',          tag:'approved' },
  'enrollment.approve':  { what:'approved enrollment of',        tag:'approved' },
  'enrollment.reject':   { what:'rejected enrollment of',        tag:'rejected' },
  'account.lockout':     { what:'flagged lockout for',           tag:'locked'   },
  'user.create':         { what:'created user account',          tag:'created'  },
  'user.update':         { what:'updated account',               tag:'updated'  },
  'document.reject':     { what:'rejected document request for', tag:'rejected' },
  'document.approve':    { what:'processed document for',        tag:'approved' },
  'announcement.create': { what:'posted announcement',           tag:'created'  },
  'settings.update':     { what:'updated system setting',        tag:'updated'  },
  'system.backup':       { what:'completed backup',              tag:'approved' },
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function firstName(name) {
  return (name || '').trim().split(/\s+/)[0] || 'Admin';
}

function relTime(isoStr) {
  if (!isoStr) return '';
  const s = (Date.now() - new Date(isoStr)) / 1000;
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

function useCountUp(end, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!end) return;
    let start = null;
    const tick = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * end));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [end]);
  return val;
}

/* ── Donut SVG ────────────────────────────────────────────────────────────── */
function Donut({ data, size = 180, thickness = 20 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2, cy = size / 2;
  const r = (size - thickness) / 2;
  let cum = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef1f7" strokeWidth={thickness} />
      {data.map(d => {
        const frac = d.value / total;
        const startA = (cum / total) * 2 * Math.PI - Math.PI / 2;
        const endA   = ((cum + d.value) / total) * 2 * Math.PI - Math.PI / 2;
        cum += d.value;
        const sx = cx + r * Math.cos(startA), sy = cy + r * Math.sin(startA);
        const ex = cx + r * Math.cos(endA),   ey = cy + r * Math.sin(endA);
        return (
          <path key={d.name}
            d={`M ${sx} ${sy} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${ex} ${ey}`}
            fill="none" stroke={d.color} strokeWidth={thickness} strokeLinecap="butt" />
        );
      })}
    </svg>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */
function Kpi({ label, icon, value, sub, trend }) {
  const v = useCountUp(value ?? 0);
  return (
    <div className="db-kpi">
      <div className="db-kpi-head">
        <div className="db-kpi-label">{label}</div>
        <div className="db-kpi-icon"><i className={`ti ${icon}`} /></div>
      </div>
      <div>
        <div className="db-kpi-value">{v.toLocaleString()}</div>
        {sub && (
          <div className="db-kpi-sub">
            {trend && (
              <span className={`db-trend ${trend.dir}`}>
                <i className={`ti ti-trending-${trend.dir}`} />{trend.text}
              </span>
            )}
            <span>{sub}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function UserDist({ u }) {
  const data = [
    { name: 'Students',   value: u?.student   ?? 0, color: '#0a1628', s: 'enrolled & active' },
    { name: 'Faculty',    value: u?.faculty    ?? 0, color: '#b89043', s: 'teaching staff' },
    { name: 'Registrars', value: u?.registrar  ?? 0, color: '#5a6478', s: 'administrative' },
  ];
  const total = u?.total ?? 0;
  return (
    <div className="db-card">
      <div className="db-card-head">
        <h4>Distribution<span>Users by role</span></h4>
        <div className="db-card-aside">
          Total<br />
          <strong style={{ color: 'var(--adm-ink)' }}>{total.toLocaleString()}</strong>
        </div>
      </div>
      <div className="db-donut-wrap">
        <div className="db-donut">
          <Donut data={data} />
          <div className="db-donut-center">
            <div className="num">{total.toLocaleString()}</div>
            <div className="lbl">Accounts</div>
          </div>
        </div>
        <div className="db-legend">
          {data.map(d => (
            <div key={d.name} className="db-legend-row">
              <div className="db-legend-mark" style={{ background: d.color }} />
              <div className="db-legend-meta">
                <div className="n">{d.name}</div>
                <div className="s">{d.s} · {total ? Math.round((d.value / total) * 100) : 0}%</div>
              </div>
              <div className="db-legend-num">{d.value.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DocPipeline({ d }) {
  const rows = [
    { name: 'Submitted',  v: d?.submitted  ?? 0, color: '#5a6478' },
    { name: 'Processing', v: d?.processing ?? 0, color: '#1e3a5f' },
    { name: 'Ready',      v: d?.ready      ?? 0, color: '#b89043' },
    { name: 'Released',   v: d?.released   ?? 0, color: '#0a7c52' },
    { name: 'Rejected',   v: d?.rejected   ?? 0, color: '#a8331e' },
  ];
  const max = Math.max(...rows.map(r => r.v), 1);
  const total = rows.reduce((s, r) => s + r.v, 0);
  return (
    <div className="db-card">
      <div className="db-card-head">
        <h4>Document pipeline<span>Requests by stage</span></h4>
        <div className="db-card-aside">
          Total<br /><strong style={{ color: 'var(--adm-ink)' }}>{total}</strong>
        </div>
      </div>
      <div className="db-pipe">
        {rows.map(r => (
          <div key={r.name} className="db-pipe-row">
            <div className="db-pipe-label">
              <div className="db-pipe-dot" style={{ background: r.color }} />
              {r.name}
            </div>
            <div className="db-pipe-bar">
              <div className="db-pipe-fill" style={{ width: `${(r.v / max) * 100}%`, background: r.color }} />
            </div>
            <div className="db-pipe-num">{r.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountHealth({ u, g, term }) {
  const items = [
    { name: 'Unverified accounts', v: u?.unverified ?? 0, total: u?.total ?? 1, color: 'var(--adm-amber)', desc: 'Awaiting email verification' },
    { name: 'Locked accounts',     v: u?.locked     ?? 0, total: u?.total ?? 1, color: 'var(--adm-red)',   desc: 'Currently locked out by lockout policy' },
  ];
  const healthPct = u?.total ? Math.round(((u.total - (u.unverified ?? 0) - (u.locked ?? 0)) / u.total) * 100) : 0;
  return (
    <div className="db-card">
      <div className="db-card-head">
        <h4>Account health<span>System integrity</span></h4>
        <div className="db-card-aside">
          Healthy<br /><strong style={{ color: 'var(--adm-green)' }}>{healthPct}%</strong>
        </div>
      </div>
      <div className="db-health">
        {items.map(i => {
          const pct = Math.round((i.v / i.total) * 100);
          return (
            <div key={i.name}>
              <div className="db-health-top">
                <div className="db-health-name">{i.name}</div>
                <div className="db-health-val"><strong>{i.v}</strong>{pct}% of total</div>
              </div>
              <div className="db-health-bar">
                <div className="db-health-fill" style={{ width: `${Math.max(pct, i.v > 0 ? 2 : 0)}%`, background: i.color }} />
              </div>
              <div className="db-health-desc">{i.desc}</div>
            </div>
          );
        })}
      </div>
      {g && (
        <div className="db-grade-inset">
          <div className="db-grade-head">Grade submission · {term}</div>
          <div className="db-grade-stats">
            {[
              { v: g.submitted_assignments, label: 'Submitted', color: 'var(--adm-green)' },
              { v: g.pending_assignments,   label: 'Pending',   color: 'var(--adm-amber)' },
              { v: g.total_assignments,     label: 'Total',     color: 'var(--adm-ink)'   },
            ].map(item => (
              <div key={item.label} className="db-grade-stat">
                <div className="num" style={{ color: item.color }}>{item.v}</div>
                <div className="lbl">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecentActivity({ logs }) {
  return (
    <div className="db-card" style={{ padding: 0 }}>
      <div className="db-card-head" style={{ padding: '1.5rem 1.5rem 1rem', marginBottom: 0 }}>
        <h4>Recent activity<span>Audit log · latest events</span></h4>
        <Link to="/admin/audit-log" className="db-view-all">
          View all <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
        </Link>
      </div>
      <div className="db-activity" style={{ padding: '0 1.5rem 1.25rem' }}>
        {logs.map((r, i) => {
          const info = ACTION_MAP[r.action] || { what: 'performed action on', tag: 'updated' };
          const tag = r.result === 'failure' ? 'failure' : info.tag;
          return (
            <div key={i} className="db-act-row">
              <div className="db-act-icon">
                <i className={`ti ${ROLE_ICON[r.role] || 'ti-user'}`} />
              </div>
              <div>
                <div className="db-act-text">
                  <strong>{r.user_name}</strong> {info.what} <strong>{r.resource || '-'}</strong>
                </div>
                <div className="db-act-sub">{r.role}</div>
              </div>
              <div className={`db-act-tag ${tag}`}>{tag}</div>
              <div className="db-act-time">{relTime(r.timestamp)} ago</div>
            </div>
          );
        })}
        {!logs.length && (
          <div style={{ color: 'var(--adm-faint)', fontSize: 13, padding: '1rem 0' }}>No recent activity.</div>
        )}
      </div>
    </div>
  );
}

function ActionItem({ icon, n, label, sub }) {
  return (
    <div className="db-action-item">
      <div className="db-action-icon"><i className={`ti ${icon}`} /></div>
      <div>
        <div className="db-action-label">{label}</div>
        <div className="db-action-sub">{sub}</div>
      </div>
      <div className="db-action-n">{n ?? 0}</div>
    </div>
  );
}

function QuickActions({ toast, openDrawer }) {
  const items = [
    { icon: 'ti-user-plus',     title: 'Add a user',     desc: 'Create faculty, registrar, or admin accounts',        act: () => openDrawer('add-user') },
    { icon: 'ti-book-2',        title: 'New program',    desc: 'Add a curriculum or department offering',             act: () => openDrawer('new-program') },
    { icon: 'ti-calendar-plus', title: 'Open a term',    desc: 'Configure semester schedule and enrollment window',   act: () => openDrawer('new-term') },
    { icon: 'ti-file-export',   title: 'Export reports', desc: 'Download enrollment, grades, or audit logs',          act: () => toast('Report export started', { sub: 'CSV will be ready shortly', type: 'success' }) },
  ];
  return (
    <div className="db-quick">
      {items.map(a => (
        <a key={a.title} href="#" className="db-quick-item" onClick={e => { e.preventDefault(); a.act(); }}>
          <div className="db-quick-icon"><i className={`ti ${a.icon}`} /></div>
          <div className="db-quick-title">{a.title}</div>
          <div className="db-quick-desc">{a.desc}</div>
        </a>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast, openDrawer } = useAdminShell();

  const [stats, setStats]       = useState(null);
  const [currentTerm, setTerm]  = useState(null);
  const [recentLogs, setLogs]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    Promise.allSettled([
      api.get('/auth/admin/stats/'),
      api.get('/enrollment/current-term/'),
      api.get('/auth/admin/audit-log/?limit=7'),
    ]).then(([sr, tr, lr]) => {
      if (sr.status === 'fulfilled') setStats(sr.value.data);
      else setError('Could not load stats. Try refreshing.');
      if (tr.status === 'fulfilled') setTerm(tr.value.data);
      if (lr.status === 'fulfilled') {
        const data = lr.value.data;
        setLogs((data.results ?? data).slice(0, 7));
      }
    }).finally(() => setLoading(false));
  }, []);

  const u  = stats?.users;
  const d  = stats?.documents;
  const g  = stats?.grade_submission;
  const termLabel = currentTerm
    ? `${currentTerm.semester_display} ${currentTerm.year}`
    : (stats?.active_term_label ?? '-');


  return (
    <>
      <style>{CSS}</style>
      <div className="db-page">

        {/* Welcome */}
        <div className="db-welcome">
          <div>
            <div className="db-w-eyebrow">Overview · {termLabel}</div>
            <h1 className="db-w-title">Good morning, <em>{firstName(user?.full_name)}</em>.</h1>
            <p className="db-w-sub">
              {d?.ready ?? '-'} document requests are ready for release at the registrar's office.
            </p>
          </div>
          <div className="db-w-side">
            <div className="db-live"><span className="db-live-dot" /> Live data</div>
            <div className="db-stamp">
              Updated {stats?.generated_at ? new Date(stats.generated_at).toLocaleString('en-PH', { hour12: true }) : '-'}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.75rem 1rem', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* KPI strip */}
        {loading ? (
          <div style={{ color: 'var(--adm-faint)', fontSize: 13 }}>Loading analytics…</div>
        ) : (
          <>
            <div className="db-kpis">
              <Kpi label="Total Users"    icon="ti-users"           value={u?.total}
                sub="across all roles" />
              <Kpi label="Students"       icon="ti-school"          value={u?.student}
                sub="enrolled users" />
              <Kpi label="Faculty"        icon="ti-user-edit"       value={u?.faculty}
                sub="teaching staff" />
              <Kpi label="Doc Requests"   icon="ti-file-text"       value={(d?.submitted ?? 0) + (d?.processing ?? 0) + (d?.ready ?? 0) + (d?.released ?? 0) + (d?.rejected ?? 0)}
                sub={`${d?.ready ?? 0} ready for release`} />
            </div>

            {/* Analytics heading */}
            <div className="db-sec">
              <div>
                <h3>System <em>analytics</em></h3>
                <div className="sub">Real-time insights across users and documents.</div>
              </div>
            </div>

            {/* Row: user distribution + document pipeline */}
            <div className="db-row2">
              <UserDist u={u} />
              <DocPipeline d={d} />
            </div>

            {/* Account health + grade submission */}
            <div>
              <AccountHealth u={u} g={g} term={termLabel} />
            </div>

            {/* Recent activity + Pending review */}
            <div className="db-row21">
              <RecentActivity logs={recentLogs} />
              <div className="db-pend-card">
                <div className="db-card-head" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--adm-line-soft)' }}>
                  <h4>Pending review<span>Awaiting your action</span></h4>
                </div>
                <ActionItem icon="ti-file-text"       n={d?.submitted ?? 0} label="Document requests"    sub="New TOR, COR, and certificate requests" />
                <ActionItem icon="ti-shield-check"    n={u?.unverified ?? 0} label="Unverified accounts" sub="Awaiting email verification" />
                <ActionItem icon="ti-lock"            n={u?.locked ?? 0}    label="Locked accounts"      sub="Reset or unlock to restore access" />
              </div>
            </div>

            {/* Quick actions */}
            <div className="db-sec" style={{ marginTop: '.5rem' }}>
              <div>
                <h3>Quick <em>actions</em></h3>
                <div className="sub">Most common administrator workflows.</div>
              </div>
            </div>
            <QuickActions toast={toast} openDrawer={openDrawer} />

            {/* Foot note */}
            <div className="db-foot">
              <span>Data as of {stats?.generated_at ? new Date(stats.generated_at).toLocaleString('en-PH', { hour12: true }) : '-'}</span>
              <span className="db-foot-live">
                <span className="db-foot-live-dot" />
                Connected to <strong style={{ color: 'var(--adm-muted)' }}>nemsuoneportal.api</strong> · refreshed every 60s
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
