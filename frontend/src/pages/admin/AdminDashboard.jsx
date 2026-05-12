import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend,
  PieChart, Pie,
  RadialBarChart, RadialBar,
  Treemap,
  ResponsiveContainer,
} from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const C = {
  navy:   '#1e3a5f',
  blue:   '#3b82f6',
  purple: '#8b5cf6',
  gold:   '#f59e0b',
  green:  '#10b981',
  teal:   '#059669',
  orange: '#f97316',
  red:    '#ef4444',
  gray:   '#6b7280',
  indigo: '#6366f1',
};

const TREEMAP_COLORS = [
  '#6366f1','#3b82f6','#8b5cf6','#10b981',
  '#f59e0b','#f97316','#ef4444','#0d9488','#ec4899','#14b8a6',
];

const RADIAN = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function KpiCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
      padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      borderLeft: `4px solid ${color || C.navy}`,
    }}>
      <div style={{ fontSize: '0.71rem', color: '#6b7280', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a5f', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: '0.73rem', color: '#9ca3af', marginTop: '0.3rem' }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children, style }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      padding: '1.25rem 1.25rem 1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      ...style,
    }}>
      <p style={{ margin: '0 0 0.85rem', fontSize: '0.77rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em', color: '#374151' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function TreemapContent(props) {
  const { x, y, width, height, name, size, index } = props;
  const fill = TREEMAP_COLORS[index % TREEMAP_COLORS.length];
  if (width < 20 || height < 20) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height}
        fill={fill} stroke="#fff" strokeWidth={2} rx={4} />
      {width > 55 && height > 28 && (
        <text x={x + width / 2} y={y + height / 2 - (height > 45 ? 8 : 0)}
          textAnchor="middle" dominantBaseline="central"
          fill="#fff" fontSize={Math.min(12, width / 5)} fontWeight={700}>
          {name}
        </text>
      )}
      {width > 55 && height > 45 && (
        <text x={x + width / 2} y={y + height / 2 + 12}
          textAnchor="middle" dominantBaseline="central"
          fill="rgba(255,255,255,0.85)" fontSize={Math.min(11, width / 6)}>
          {size}
        </text>
      )}
    </g>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats]     = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    Promise.allSettled([
      api.get('/auth/admin/stats/'),
      api.get('/enrollment/current-term/'),
    ]).then(([statsResult, termResult]) => {
      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value.data);
      } else {
        setError(`Stats failed (${statsResult.reason?.response?.status ?? 'network error'}). Try refreshing or re-logging in.`);
      }
      if (termResult.status === 'fulfilled') {
        setCurrentTerm(termResult.value.data);
      }
    }).finally(() => setLoading(false));
  }, []);

  const u  = stats?.users;
  const e  = stats?.enrollments;
  const d  = stats?.documents;
  const g  = stats?.grade_submission;
  const ep = stats?.enrollment_by_program ?? [];
  const tl = stats?.active_term_label ?? '';

  const totalDocs   = (d?.submitted ?? 0) + (d?.processing ?? 0) + (d?.ready ?? 0)
                    + (d?.released  ?? 0) + (d?.rejected   ?? 0);
  const totalEnroll = (e?.pending ?? 0) + (e?.approved ?? 0) + (e?.rejected ?? 0);

  const userRolesData = [
    { name: 'Students',   value: u?.student   ?? 0, fill: C.blue   },
    { name: 'Faculty',    value: u?.faculty   ?? 0, fill: C.purple },
    { name: 'Registrars', value: u?.registrar ?? 0, fill: C.gold   },
  ];

  const enrollPie = [
    { name: 'Approved', value: e?.approved ?? 0 },
    { name: 'Pending',  value: e?.pending  ?? 0 },
    { name: 'Rejected', value: e?.rejected ?? 0 },
  ];
  const enrollColors = [C.green, C.gold, C.red];

  const docBar = [
    { name: 'Submitted',  value: d?.submitted  ?? 0, fill: C.gray   },
    { name: 'Processing', value: d?.processing ?? 0, fill: C.blue   },
    { name: 'Ready',      value: d?.ready      ?? 0, fill: C.green  },
    { name: 'Released',   value: d?.released   ?? 0, fill: C.teal   },
    { name: 'Rejected',   value: d?.rejected   ?? 0, fill: C.red    },
  ];

  const treemapData = ep.map(p => ({ name: p.program_code, size: p.enrolled }));

  const healthItems = [
    { label: 'Unverified Accounts', value: u?.unverified ?? 0, color: C.orange, desc: 'awaiting email verification' },
    { label: 'Locked Accounts',     value: u?.locked     ?? 0, color: C.red,    desc: 'currently locked out' },
  ];

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link active" to="/admin/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/admin/users">User Management</Link>
        <Link className="sidebar-link" to="/admin/programs">Programs &amp; Curriculum</Link>
        <Link className="sidebar-link" to="/admin/audit-log">Audit Log</Link>
        <Link className="sidebar-link" to="/admin/announcements">Announcements</Link>
        <Link className="sidebar-link" to="/admin/settings">System Settings</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Welcome, {user?.full_name}</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b',
            padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading analytics…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* ── KPI Row ── */}
            <div style={S.kpiRow}>
              <KpiCard label="Total Users"  value={u?.total}    color={C.navy}
                sub={currentTerm?.semester_display
                  ? `${currentTerm.semester_display} ${currentTerm.year}`
                  : 'No active term'} />
              <KpiCard label="Students"     value={u?.student}  color={C.blue}   />
              <KpiCard label="Faculty"      value={u?.faculty}  color={C.purple} />
              <KpiCard label="Enrollments"  value={totalEnroll} color={C.green}
                sub={`${e?.approved ?? 0} approved`} />
              <KpiCard label="Doc Requests" value={totalDocs}   color={C.indigo}
                sub={`${d?.ready ?? 0} ready for release`} />
            </div>

            {/* ── Row 2: User Roles RadialBar + Enrollment Donut ── */}
            <div style={S.twoCol}>
              <ChartCard title="User Distribution by Role">
                <ResponsiveContainer width="100%" height={240}>
                  <RadialBarChart cx="50%" cy="50%"
                    innerRadius="25%" outerRadius="90%"
                    data={userRolesData}
                    startAngle={180} endAngle={-180}>
                    <RadialBar
                      minAngle={10}
                      background={{ fill: '#f3f4f6' }}
                      clockWise
                      dataKey="value"
                      label={{ position: 'insideStart', fill: '#fff', fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '0.8rem' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={`Enrollment Status${tl ? ` — ${tl}` : ''}`}>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={enrollPie} cx="50%" cy="50%"
                      innerRadius={60} outerRadius={98}
                      dataKey="value" labelLine={false} label={PieLabel}>
                      {enrollPie.map((_, i) => <Cell key={i} fill={enrollColors[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '0.8rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* ── Row 3: Document Pipeline + Account Health ── */}
            <div style={S.twoCol}>
              <ChartCard title="Document Request Pipeline">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={docBar} layout="vertical"
                    margin={{ left: 8, right: 44, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={72} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="value" radius={[0, 5, 5, 0]}
                      label={{ position: 'right', fontSize: 11, fill: '#374151' }}>
                      {docBar.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Account Health">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', padding: '0.25rem 0' }}>
                  {healthItems.map(h => {
                    const pct = u?.total ? Math.round((h.value / u.total) * 100) : 0;
                    return (
                      <div key={h.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{h.label}</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: h.color }}>
                            {h.value}
                            <span style={{ color: '#9ca3af', fontWeight: 400 }}> ({pct}%)</span>
                          </span>
                        </div>
                        <div style={{ height: 10, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.max(pct, h.value > 0 ? 2 : 0)}%`,
                            background: h.color,
                            borderRadius: 99,
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>{h.desc}</div>
                      </div>
                    );
                  })}

                  {g && (
                    <div style={{ marginTop: '0.5rem', padding: '0.85rem 1rem', background: '#f8fafc',
                      borderRadius: 8, border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.05em', color: '#6b7280', marginBottom: '0.6rem' }}>
                        Grade Submission{tl ? ` — ${tl}` : ''}
                      </div>
                      <div style={{ display: 'flex', gap: '1.25rem' }}>
                        {[
                          { v: g.submitted_assignments, label: 'Submitted', color: C.green  },
                          { v: g.pending_assignments,   label: 'Pending',   color: C.gold   },
                          { v: g.total_assignments,     label: 'Total',     color: C.navy   },
                        ].map(item => (
                          <div key={item.label}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: item.color, lineHeight: 1 }}>
                              {item.v}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.2rem' }}>
                              {item.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ChartCard>
            </div>

            {/* ── Row 4: Enrollment by Program Treemap ── */}
            {treemapData.length > 0 && (
              <ChartCard title={`Enrollment by Program — Treemap${tl ? ` (${tl})` : ''}`}>
                <ResponsiveContainer width="100%" height={260}>
                  <Treemap
                    data={treemapData}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    content={(props) => <TreemapContent {...props} />}
                  >
                    <Tooltip formatter={(v) => [v, 'Enrolled']} />
                  </Treemap>
                </ResponsiveContainer>
              </ChartCard>
            )}

            <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              Analytics as of {stats?.generated_at
                ? new Date(stats.generated_at).toLocaleString('en-PH')
                : '—'}
            </p>

          </div>
        )}
      </main>
    </div>
  );
}

const S = {
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: '0.75rem',
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.25rem',
  },
};
