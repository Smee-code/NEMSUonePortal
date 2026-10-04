import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useRegistrarShell } from '../../context/RegistrarShellContext';

const DOC_STATUSES = [
  { key: 'submitted',  label: 'Submitted',  color: 'var(--ink-2)' },
  { key: 'processing', label: 'Processing', color: '#3b82f6'      },
  { key: 'ready',      label: 'Ready',      color: 'var(--green)' },
  { key: 'released',   label: 'Released',   color: '#0d9488'      },
  { key: 'rejected',   label: 'Rejected',   color: 'var(--red)'   },
];

export default function RegistrarDashboard() {
  const { user }        = useAuth();
  const { currentTerm } = useRegistrarShell();

  const [stats,   setStats]   = useState(null);
  const [queue,   setQueue]   = useState({ registrations: 0, enrollments: 0 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    let alive = true;

    // Counts work whether the endpoint paginates ({count}) or returns a plain array.
    const countOf = res => {
      if (res.status !== 'fulfilled') return 0;
      const d = res.value.data;
      if (Array.isArray(d)) return d.length;
      return d?.count ?? (Array.isArray(d?.results) ? d.results.length : 0);
    };

    const load = () => Promise.allSettled([
      api.get('/auth/admin/stats/'),
      api.get('/auth/registrar/registrations/?status=pending&page_size=1'),
      api.get('/enrollment/requests/?status=pending&page_size=1'),
    ]).then(([s, r, e]) => {
      if (!alive) return;
      if (s.status === 'fulfilled') { setStats(s.value.data); setError(''); }
      else setError('Couldn’t load the dashboard figures. Refresh to try again.');
      setQueue({ registrations: countOf(r), enrollments: countOf(e) });
    }).finally(() => { if (alive) setLoading(false); });

    load();
    // Keep the desk live: refresh on a timer and whenever the tab regains focus.
    const iv = setInterval(load, 45000);
    const onVis = () => { if (!document.hidden) load(); };
    window.addEventListener('focus', onVis);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      clearInterval(iv);
      window.removeEventListener('focus', onVis);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const doc = stats?.documents        ?? {};
  const usr = stats?.users            ?? {};
  const grd = stats?.grade_submission ?? {};

  const totalDocs = DOC_STATUSES.reduce((s, x) => s + (doc[x.key] ?? 0), 0);
  const gradeRate = (grd.total_assignments ?? 0) > 0
    ? Math.round((grd.submitted_assignments ?? 0) / grd.total_assignments * 100) : 0;

  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

  const termLabel = currentTerm
    ? `${currentTerm.semester_display} ${currentTerm.year}`
    : (stats?.active_term_label || 'No active term');
  const generated = stats?.generated_at ? new Date(stats.generated_at).toLocaleString('en-PH', {
    dateStyle: 'medium', timeStyle: 'short',
  }) : '';

  // The registrar's live work queue — the hero of the page.
  const tiles = [
    { value: queue.registrations, label: 'Registration requests', verb: 'Validate accounts', icon: 'ti-user-check',       to: '/registrar/registrations' },
    { value: queue.enrollments,   label: 'Enrollment requests',   verb: 'Review enrollments', icon: 'ti-clipboard-check',  to: '/registrar/enrollment'    },
    { value: doc.submitted ?? 0,  label: 'Documents to process',  verb: 'Start processing',   icon: 'ti-file-text',        to: '/registrar/documents'     },
    { value: doc.ready ?? 0,      label: 'Ready for release',      verb: 'Release to student', icon: 'ti-package',          to: '/registrar/documents'     },
  ];
  const openTotal  = tiles.reduce((s, t) => s + (t.value || 0), 0);
  const openQueues = tiles.filter(t => (t.value || 0) > 0).length;

  const figures = [
    { num: usr.student    ?? 0, label: 'Students on record' },
    { num: usr.faculty    ?? 0, label: 'Faculty on record'  },
    { num: usr.unverified ?? 0, label: 'Unverified accounts', warn: (usr.unverified ?? 0) > 0 },
    { num: usr.locked     ?? 0, label: 'Locked accounts',     warn: (usr.locked ?? 0) > 0     },
  ];

  const goTo = [
    { icon: 'ti-users',          label: 'Students',        to: '/registrar/students' },
    { icon: 'ti-calendar-event', label: 'Class schedules', to: '/registrar/schedule' },
    { icon: 'ti-user-edit',      label: 'Faculty',         to: '/registrar/faculty'  },
    { icon: 'ti-database',       label: 'Academic data',   to: '/registrar/academic-data' },
  ];

  return (
    <>
      <style>{CSS}</style>

      <header className="rd-head">
        <div>
          <div className="rd-desk">{greeting} · Registrar's desk</div>
          <h1 className="rd-name">{user?.full_name || 'Registrar'}</h1>
        </div>
        <div className="rd-head-r">
          <span className="rd-term"><i className="ti ti-calendar" />{termLabel}</span>
        </div>
      </header>

      {error && <div className="rd-error">{error}</div>}

      {loading ? (
        <div className="rd-loading">Loading the desk…</div>
      ) : (
        <>
          {/* ── The docket: what needs the registrar today ── */}
          <section className="rd-docket">
            <div className="rd-docket-head">
              <h2>What needs you today</h2>
              <span className={`rd-docket-sum${openTotal === 0 ? ' clear' : ''}`}>
                {openTotal > 0
                  ? `${openTotal} waiting across ${openQueues} ${openQueues === 1 ? 'queue' : 'queues'}`
                  : 'Every queue is clear — nothing waiting'}
              </span>
            </div>
            <div className="rd-tiles">
              {tiles.map(t => {
                const active = (t.value || 0) > 0;
                return (
                  <Link key={t.label} to={t.to} className={`rd-tile${active ? ' active' : ''}`}>
                    <div className="rd-tile-top">
                      <span className="rd-tile-num">{t.value}</span>
                      <i className={`ti ${t.icon}`} />
                    </div>
                    <div className="rd-tile-label">{t.label}</div>
                    <div className="rd-tile-act">{active ? t.verb : 'Up to date'}</div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ── Throughput: document flow + grade submission ── */}
          <div className="rd-row2">
            <section className="rd-panel">
              <div className="rd-panel-head">
                <h3>Document flow</h3>
                <span>{totalDocs} total this term</span>
              </div>
              {totalDocs > 0 ? (
                <>
                  <div className="rd-stack" role="img" aria-label="Document requests by status">
                    {DOC_STATUSES.map(s => (doc[s.key] ?? 0) > 0 && (
                      <div key={s.key} style={{ flexGrow: doc[s.key], background: s.color }}
                        title={`${s.label}: ${doc[s.key]}`} />
                    ))}
                  </div>
                  <div className="rd-legend">
                    {DOC_STATUSES.map(s => (
                      <div className="rd-leg" key={s.key}>
                        <span className="d" style={{ background: s.color }} />
                        {s.label}<b>{doc[s.key] ?? 0}</b>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rd-empty">No document requests have come in this term.</div>
              )}
            </section>

            <section className="rd-panel warm">
              <div className="rd-panel-head">
                <h3>Grade submission</h3>
                <span>this term</span>
              </div>
              {(grd.total_assignments ?? 0) > 0 ? (
                <>
                  <div className="rd-grade-top">
                    <span className="rd-grade-pct">{gradeRate}<em>%</em></span>
                    <span className="rd-grade-cap">of teaching loads submitted</span>
                  </div>
                  <div className="rd-grade-bar">
                    <div className="rd-grade-bar-fill" style={{ width: `${gradeRate}%` }} />
                  </div>
                  <div className="rd-grade-figs">
                    <div><b>{grd.total_assignments ?? 0}</b><span>total loads</span></div>
                    <div><b>{grd.submitted_assignments ?? 0}</b><span>submitted</span></div>
                    <div><b>{grd.pending_assignments ?? 0}</b><span>pending</span></div>
                  </div>
                </>
              ) : (
                <div className="rd-empty">No teaching loads recorded for {termLabel} yet.</div>
              )}
            </section>
          </div>

          {/* ── Records at a glance ── */}
          <section className="rd-records">
            <div className="rd-records-head"><h3>Records at a glance</h3></div>
            <div className="rd-figs">
              {figures.map(f => (
                <div className={`rd-fig${f.warn ? ' warn' : ''}`} key={f.label}>
                  <span className="rd-fig-num">{f.num}</span>
                  <span className="rd-fig-lbl">{f.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Go to ── */}
          <nav className="rd-goto">
            <span className="rd-goto-lbl">Go to</span>
            {goTo.map(l => (
              <Link key={l.to} to={l.to} className="rd-goto-link">
                <i className={`ti ${l.icon}`} />{l.label}
              </Link>
            ))}
          </nav>

          {generated && <div className="rd-foot">Figures as of {generated}</div>}
        </>
      )}
    </>
  );
}

const CSS = `
  /* ── Header ── */
  .rd-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:1rem;
    padding-bottom:1.1rem; margin-bottom:1.6rem; border-bottom:1px solid var(--line); flex-wrap:wrap; }
  .rd-desk{ font-size:12.5px; color:var(--muted); font-weight:500; }
  .rd-name{ font:600 25px/1.1 'Inter',sans-serif; color:var(--ink); margin:.3rem 0 0; letter-spacing:-.015em; }
  .rd-head-r{ display:flex; align-items:center; gap:12px; padding-top:2px; }
  .rd-term{ display:inline-flex; align-items:center; gap:7px; font-size:12.5px; color:var(--ink);
    background:var(--warm); border:1px solid var(--line); padding:7px 13px; }
  .rd-term i{ font-size:15px; color:var(--gold); }

  .rd-error{ background:var(--red-tint); border:1px solid var(--red); color:var(--red);
    padding:.7rem 1rem; font-size:13px; margin-bottom:1.25rem; }
  .rd-loading{ color:var(--muted); font-size:13px; padding:3rem 0; }

  /* ── Docket (hero) ── */
  .rd-docket-head{ display:flex; align-items:baseline; justify-content:space-between; gap:1rem;
    flex-wrap:wrap; margin-bottom:15px; }
  .rd-docket-head h2{ margin:0; font:400 27px/1.05 'Instrument Serif',Georgia,serif; color:var(--ink); }
  .rd-docket-sum{ font-size:13px; color:var(--muted); font-variant-numeric:tabular-nums; }
  .rd-docket-sum.clear{ color:var(--green); }

  .rd-tiles{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .rd-tile{ position:relative; display:flex; flex-direction:column; gap:11px;
    background:#fff; border:1px solid var(--line); padding:18px 18px 15px 21px;
    text-decoration:none; color:inherit; transition:border-color .16s, box-shadow .16s, transform .16s; }
  .rd-tile::before{ content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
    background:var(--line); transition:background .16s, width .16s; }
  .rd-tile.active::before{ background:var(--gold); width:4px; }
  .rd-tile:hover{ border-color:var(--ink); box-shadow:0 10px 26px -18px rgba(10,22,40,.55); transform:translateY(-2px); }
  .rd-tile:hover::before{ width:6px; }
  .rd-tile:focus-visible{ outline:2px solid var(--ink); outline-offset:2px; }
  .rd-tile-top{ display:flex; align-items:flex-start; justify-content:space-between; }
  .rd-tile-num{ font:600 42px/.9 'Inter',sans-serif; letter-spacing:-.03em;
    font-variant-numeric:tabular-nums; color:var(--ink); }
  .rd-tile:not(.active) .rd-tile-num{ color:var(--faint); }
  .rd-tile-top i{ font-size:19px; color:var(--gold); margin-top:4px; }
  .rd-tile:not(.active) .rd-tile-top i{ color:var(--faint); }
  .rd-tile-label{ font-size:13px; font-weight:600; color:var(--ink); }
  .rd-tile-act{ font-size:12px; color:var(--muted); margin-top:1px; transition:color .16s; }
  .rd-tile.active:hover .rd-tile-act{ color:var(--ink); }

  /* ── Throughput row ── */
  .rd-row2{ display:grid; grid-template-columns:1.5fr 1fr; gap:14px; margin-top:1.6rem; }
  .rd-panel{ background:#fff; border:1px solid var(--line); padding:18px 20px; }
  .rd-panel.warm{ background:var(--warm); }
  .rd-panel-head{ display:flex; align-items:baseline; justify-content:space-between; margin-bottom:16px; }
  .rd-panel-head h3{ margin:0; font:600 15px 'Inter',sans-serif; color:var(--ink); letter-spacing:-.005em; }
  .rd-panel-head span{ font-size:11px; color:var(--muted); }
  .rd-empty{ font-size:13px; color:var(--muted); padding:.75rem 0 1.25rem; }

  .rd-stack{ display:flex; height:16px; overflow:hidden; border:1px solid var(--line); background:var(--cool-2); }
  .rd-stack > div{ min-width:3px; }
  .rd-legend{ display:flex; flex-wrap:wrap; gap:8px 16px; margin-top:14px; }
  .rd-leg{ display:flex; align-items:center; gap:7px; font-size:12px; color:var(--muted); }
  .rd-leg .d{ width:9px; height:9px; flex:none; }
  .rd-leg b{ color:var(--ink); font-weight:600; font-variant-numeric:tabular-nums; }

  .rd-grade-top{ display:flex; align-items:baseline; gap:9px; }
  .rd-grade-pct{ font:600 42px/.9 'Inter',sans-serif; color:var(--ink); letter-spacing:-.03em; font-variant-numeric:tabular-nums; }
  .rd-grade-pct em{ font:500 20px 'Inter',sans-serif; color:var(--muted); margin-left:1px; }
  .rd-grade-cap{ font-size:12px; color:var(--muted); }
  .rd-grade-bar{ height:8px; background:var(--cool-2); border:1px solid var(--line); margin:14px 0 14px; overflow:hidden; }
  .rd-grade-bar-fill{ height:100%; background:var(--gold); }
  .rd-grade-figs{ display:flex; gap:1.5rem; }
  .rd-grade-figs div{ display:flex; flex-direction:column; }
  .rd-grade-figs b{ font:600 17px 'Inter',sans-serif; color:var(--ink); font-variant-numeric:tabular-nums; }
  .rd-grade-figs span{ font-size:11px; color:var(--muted); margin-top:1px; }

  /* ── Records strip ── */
  .rd-records{ margin-top:1.6rem; border:1px solid var(--line); background:#fff; }
  .rd-records-head{ padding:12px 20px; border-bottom:1px solid var(--line-soft); }
  .rd-records-head h3{ margin:0; font:600 13px 'Inter',sans-serif; color:var(--ink); }
  .rd-figs{ display:grid; grid-template-columns:repeat(4,1fr); }
  .rd-fig{ padding:16px 20px; border-right:1px solid var(--line-soft); display:flex; flex-direction:column; gap:3px; }
  .rd-fig:last-child{ border-right:none; }
  .rd-fig-num{ font:600 27px/1 'Inter',sans-serif; color:var(--ink); font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
  .rd-fig.warn .rd-fig-num{ color:var(--amber); }
  .rd-fig-lbl{ font-size:12px; color:var(--muted); }

  /* ── Go to ── */
  .rd-goto{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:1.6rem; }
  .rd-goto-lbl{ font-size:12px; color:var(--faint); margin-right:2px; }
  .rd-goto-link{ display:inline-flex; align-items:center; gap:7px; font-size:12.5px; color:var(--ink);
    text-decoration:none; background:#fff; border:1px solid var(--line); padding:8px 13px; transition:border-color .15s, background .15s; }
  .rd-goto-link:hover{ border-color:var(--ink); background:var(--warm); }
  .rd-goto-link i{ font-size:15px; color:var(--muted); }

  .rd-foot{ margin-top:1.6rem; padding-top:1rem; border-top:1px solid var(--line-soft); font-size:11px; color:var(--faint); }

  /* ── Responsive ── */
  @media (max-width:900px){ .rd-tiles{ grid-template-columns:repeat(2,1fr); } .rd-row2{ grid-template-columns:1fr; } }
  @media (max-width:640px){ .rd-tiles{ grid-template-columns:1fr; } .rd-figs{ grid-template-columns:repeat(2,1fr); }
    .rd-fig:nth-child(2){ border-right:none; } }
  @media (prefers-reduced-motion: reduce){
    .rd-tile, .rd-tile::before, .rd-tile-act i, .rd-goto-link{ transition:none; }
    .rd-tile:hover{ transform:none; }
    .rd-tile:hover .rd-tile-act i{ transform:none; }
  }
`;
