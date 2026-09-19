import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useRegistrarShell } from '../../context/RegistrarShellContext';

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function fillColor(pct) {
  if (pct >= 100) return 'var(--red)';
  if (pct >= 85)  return 'var(--amber)';
  return 'var(--green)';
}

/* ── SVG Donut ─────────────────────────────────────────────────────────────── */
function Donut({ data, size = 180, thickness = 22 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2, cy = size / 2;
  const r  = (size - thickness) / 2;
  let cum  = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--cool-2)" strokeWidth={thickness} />
      {data.map(d => {
        const frac  = d.value / total;
        const s0    = (cum / total) * 2 * Math.PI - Math.PI / 2;
        const s1    = ((cum + d.value) / total) * 2 * Math.PI - Math.PI / 2;
        cum += d.value;
        if (d.value === 0) return null;
        const sx = cx + r * Math.cos(s0), sy = cy + r * Math.sin(s0);
        const ex = cx + r * Math.cos(s1), ey = cy + r * Math.sin(s1);
        return (
          <path key={d.name}
            d={`M ${sx} ${sy} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${ex} ${ey}`}
            fill="none" stroke={d.color} strokeWidth={thickness} strokeLinecap="butt"
          />
        );
      })}
    </svg>
  );
}

/* ── Treemap colors ─────────────────────────────────────────────────────────── */
const TM_COLORS = ['#1e3a5f','#2d5494','#3b6abf','#4a80ea','#0a7c52','#0d9488','#a06b16','#a8331e'];

/* ── Activity icon map ──────────────────────────────────────────────────────── */
const ACT_ICON = {
  submit: 'ti-chart-bar', approve: 'ti-circle-check', reject: 'ti-circle-x',
  create: 'ti-plus', update: 'ti-pencil', delete: 'ti-trash',
  lockout: 'ti-lock', login: 'ti-login', logout: 'ti-logout',
  advance: 'ti-arrow-right', backup: 'ti-database',
};
const ACT_TAG = {
  created: 'created', approved: 'approved', rejected: 'rejected',
  updated: 'updated', deleted: 'deleted', locked: 'locked',
  submit: 'updated', create: 'created', approve: 'approved', reject: 'rejected',
};

export default function RegistrarDashboard() {
  const { user }        = useAuth();
  const { currentTerm } = useRegistrarShell();

  const [stats,   setStats]   = useState(null);
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    Promise.allSettled([
      api.get('/auth/admin/stats/'),
      api.get('/auth/audit-log/?page_size=7'),
    ]).then(([sRes, aRes]) => {
      if (sRes.status === 'fulfilled') setStats(sRes.value.data);
      else setError('Failed to load analytics. Try refreshing.');
      if (aRes.status === 'fulfilled') {
        const d = aRes.value.data;
        setRecent(Array.isArray(d) ? d.slice(0, 7) : (d?.results ?? []).slice(0, 7));
      }
    }).finally(() => setLoading(false));
  }, []);

  /* ── Derived values ─────────────────────────────────────────────────────── */
  const d  = stats?.documents         ?? {};
  const g  = stats?.grade_submission  ?? {};
  const tl = stats?.active_term_label ?? '';

  const totalDocs   = (d.submitted ?? 0) + (d.processing ?? 0) + (d.ready ?? 0) + (d.released ?? 0) + (d.rejected ?? 0);
  const gradeRate   = (g.total_assignments ?? 0) > 0 ? Math.round((g.submitted_assignments ?? 0) / g.total_assignments * 100) : 0;
  const docRate     = totalDocs > 0 ? Math.round(((d.processing ?? 0) + (d.ready ?? 0) + (d.released ?? 0)) / totalDocs * 100) : 0;

  const termLabel = currentTerm ? `${currentTerm.semester_display} · ${currentTerm.year}` : (tl || 'No active term');
  const now       = stats?.generated_at ? new Date(stats.generated_at).toLocaleString('en-PH') : '—';

  /* ── Chart data ─────────────────────────────────────────────────────────── */
  const docPipeline = [
    { label: 'Submitted',  value: d.submitted  ?? 0, color: 'var(--ink-2)', dot: 'var(--faint)'  },
    { label: 'Processing', value: d.processing ?? 0, color: '#3b82f6',      dot: '#3b82f6'        },
    { label: 'Ready',      value: d.ready      ?? 0, color: 'var(--green)', dot: 'var(--green)'  },
    { label: 'Released',   value: d.released   ?? 0, color: '#0d9488',      dot: '#0d9488'        },
    { label: 'Rejected',   value: d.rejected   ?? 0, color: 'var(--red)',   dot: 'var(--red)'    },
  ];
  const maxDoc = Math.max(...docPipeline.map(p => p.value), 1);

  const healthBars = [
    { name: 'Grade Submission',    val: gradeRate,  sub: `${g.submitted_assignments ?? 0} of ${g.total_assignments ?? 0} submitted`,         color: 'var(--ink-2)'  },
    { name: 'Document Processing', val: docRate,    sub: `${(d.processing ?? 0) + (d.ready ?? 0) + (d.released ?? 0)} of ${totalDocs} progressed`, color: '#3b82f6' },
  ];

  return (
    <>
      <style>{CSS}</style>

      {/* ── Welcome ── */}
      <div className="welcome">
        <div>
          <div className="welcome-eyebrow">Office of the Registrar</div>
          <h1>Good day, <em>{user?.full_name?.split(' ')[0] ?? 'Registrar'}</em></h1>
          <p>Validate student registrations, process document requests, and manage academic records across all programs.</p>
        </div>
        <div className="welcome-side">
          <div className="live-indicator"><span className="dot" />Live data</div>
          <div className="stamp">{termLabel}</div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-tint)', border: '1px solid var(--red)', color: 'var(--red)', padding: '.75rem 1rem', fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty">
          <i className="ti ti-loader" />
          <div className="t">Loading analytics…</div>
        </div>
      ) : (
        <>
          {/* ── KPI strip ── */}
          <div className="kpis">
            {[
              { label: 'Document Requests',   value: totalDocs,                 icon: 'ti-file-text',      sub: `${d.ready ?? 0} ready for release`      },
              { label: 'Ready for Release',   value: d.ready ?? '—',            icon: 'ti-package',        sub: 'awaiting student pickup'               },
              { label: 'Grade Assignments',   value: g.total_assignments ?? '—',icon: 'ti-chart-bar',      sub: `${g.submitted_assignments ?? 0} submitted` },
            ].map(kpi => (
              <div className="kpi" key={kpi.label}>
                <div className="kpi-head">
                  <div className="kpi-label">{kpi.label}</div>
                  <div className="kpi-icon"><i className={`ti ${kpi.icon}`} /></div>
                </div>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-sub">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Document pipeline ── */}
          <div>
            <div className="card">
              <div className="card-head">
                <h4>Document Request Pipeline<span>{totalDocs} total</span></h4>
              </div>
              <div className="pipe">
                {docPipeline.map(p => (
                  <div className="pipe-row" key={p.label}>
                    <div className="pipe-label">
                      <div className="pipe-dot" style={{ background: p.dot }} />
                      {p.label}
                    </div>
                    <div className="pipe-bar">
                      <div className="pipe-bar-fill" style={{ width: `${Math.round(p.value / maxDoc * 100)}%`, background: p.color }}>
                        {p.value > 0 && p.value}
                      </div>
                    </div>
                    <div className="pipe-num">{p.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Account Health + Grade Inset ── */}
          <div className="row-21">
            <div className="card">
              <div className="card-head">
                <h4>Account Health<span>System overview</span></h4>
              </div>
              <div className="db-health">
                {healthBars.map(h => (
                  <div className="db-health-item" key={h.name}>
                    <div className="db-health-top">
                      <div className="db-health-name">{h.name}</div>
                      <div className="db-health-val"><strong>{h.val}</strong>%</div>
                    </div>
                    <div className="health-bar">
                      <div className="health-bar-fill" style={{ width: `${Math.min(h.val, 100)}%`, background: h.color }} />
                    </div>
                    <div className="db-health-desc">{h.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ background: 'var(--warm)' }}>
              <div className="card-head" style={{ borderColor: 'var(--line-soft)' }}>
                <h4>Grade Submission<span style={{ color: 'var(--gold)' }}>This term</span></h4>
              </div>
              <div className="grade-inset">
                <div className="grade-inset-head">Submission Progress</div>
                <div className="grade-stats">
                  {[
                    { num: g.total_assignments    ?? '—', lbl: 'Total assignments' },
                    { num: g.submitted_assignments ?? '—', lbl: 'Submitted'         },
                    { num: g.pending_assignments   ?? '—', lbl: 'Pending'           },
                  ].map(s => (
                    <div className="grade-stat" key={s.lbl}>
                      <div className="num">{s.num}</div>
                      <div className="lbl">{s.lbl}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <div className="health-bar" style={{ height: 8 }}>
                  <div className="health-bar-fill" style={{ width: `${gradeRate}%`, background: 'var(--gold)' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                  {g.submitted_grade_records ?? 0} of {g.total_grade_records ?? 0} grade records submitted
                </div>
              </div>
            </div>
          </div>

          {/* ── Recent Activity + Quick Actions ── */}
          <div className="row-2">
            <div className="card">
              <div className="card-head">
                <h4>Recent Activity<span>Last {Math.min(recent.length, 7)} events</span></h4>
              </div>
              {recent.length > 0 ? (
                <div className="activity">
                  {recent.map((row, i) => {
                    const actionKey = (row.action || '').split('.').pop();
                    const tagClass  = ACT_TAG[actionKey] ?? 'updated';
                    const iconClass = ACT_ICON[actionKey] ?? 'ti-point';
                    return (
                      <div className="activity-row" key={i}>
                        <div className="act-icon"><i className={`ti ${iconClass}`} /></div>
                        <div className="act-meta">
                          <div className="act-text">
                            <strong>{row.performed_by || row.who || 'System'}</strong>
                            {' · '}{row.action || ''}
                          </div>
                          <div className="act-sub">{row.resource_repr || row.resource || ''}</div>
                        </div>
                        <span className={`act-tag ${tagClass}`}>{actionKey}</span>
                        <div className="act-time">
                          {row.timestamp ? new Date(row.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: 'var(--faint)', fontSize: 13, padding: '1rem 0' }}>No recent activity to show.</div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="sec-head" style={{ marginBottom: 0 }}>
                <div><h3>Quick <em>Actions</em></h3></div>
              </div>
              <div className="quick">
                {[
                  { icon: 'ti-user-check', title: 'Registration Requests', desc: 'Validate new student accounts', to: '/registrar/registrations' },
                  { icon: 'ti-file-text',        title: 'Process Documents', desc: 'Advance document request status',   to: '/registrar/documents'  },
                  { icon: 'ti-users',            title: 'View Students',    desc: 'Browse enrolled student list',       to: '/registrar/students'   },
                  { icon: 'ti-calendar-event',   title: 'Class Schedules',  desc: 'View published class timetables',   to: '/registrar/schedule'   },
                ].map(q => (
                  <Link key={q.to} to={q.to} className="quick-item">
                    <div className="quick-icon"><i className={`ti ${q.icon}`} /></div>
                    <div className="quick-title">{q.title}</div>
                    <div className="quick-desc">{q.desc}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="foot-note">
            <div className="live"><span className="dot" />Live · Data as of {now}</div>
            <div>NEMSUonePortal · Registrar</div>
          </div>
        </>
      )}
    </>
  );
}

/* ── Dashboard-specific CSS (shared primitives come from RegistrarShell) ── */
const CSS = `
  .db-health { display: flex; flex-direction: column; gap: 1.25rem; padding: .25rem 0; }
  .db-health-item {}
  .db-health-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  .db-health-name { font-size: 13px; color: var(--ink); font-weight: 500; }
  .db-health-val { font-size: 12px; color: var(--muted); }
  .db-health-val strong { font-family: 'Inter', sans-serif; font-weight: 500; font-size: 18px; color: var(--ink); letter-spacing: -.01em; margin-right: 6px; }
  .db-health-desc { font-size: 11px; color: var(--faint); margin-top: 6px; letter-spacing: .02em; }
`;
