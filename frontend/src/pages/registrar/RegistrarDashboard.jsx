import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const C = {
  navy:       '#1e3a5f',
  approved:   '#10b981',
  pending:    '#f59e0b',
  rejected:   '#ef4444',
  submitted:  '#6b7280',
  processing: '#3b82f6',
  ready:      '#059669',
  released:   '#0d9488',
  enrolled:   '#6366f1',
  remaining:  '#e2e8f0',
  purple:     '#8b5cf6',
};

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
        {value ?? ' - '}
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

export default function RegistrarDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get('/auth/admin/stats/')
      .then(res => setStats(res.data))
      .catch(err => setError(`Failed to load analytics (${err.response?.status ?? 'network error'}). Try refreshing.`))
      .finally(() => setLoading(false));
  }, []);

  const e  = stats?.enrollments;
  const d  = stats?.documents;
  const g  = stats?.grade_submission;
  const ep = stats?.enrollment_by_program ?? [];
  const bf = stats?.block_fill;
  const tl = stats?.active_term_label ?? '';

  const totalEnroll = (e?.pending ?? 0) + (e?.approved ?? 0) + (e?.rejected ?? 0);
  const totalDocs   = (d?.submitted ?? 0) + (d?.processing ?? 0) + (d?.ready ?? 0)
                    + (d?.released ?? 0) + (d?.rejected ?? 0);

  const enrollPie = [
    { name: 'Approved', value: e?.approved ?? 0 },
    { name: 'Pending',  value: e?.pending  ?? 0 },
    { name: 'Rejected', value: e?.rejected ?? 0 },
  ];
  const enrollPieColors = [C.approved, C.pending, C.rejected];

  const docBar = [
    { name: 'Submitted',  value: d?.submitted  ?? 0, fill: C.submitted  },
    { name: 'Processing', value: d?.processing ?? 0, fill: C.processing },
    { name: 'Ready',      value: d?.ready      ?? 0, fill: C.ready      },
    { name: 'Released',   value: d?.released   ?? 0, fill: C.released   },
    { name: 'Rejected',   value: d?.rejected   ?? 0, fill: C.rejected   },
  ];

  const gradesPie = [
    { name: 'Submitted', value: g?.submitted_assignments ?? 0 },
    { name: 'Pending',   value: g?.pending_assignments   ?? 0 },
  ];
  const gradesPieColors = [C.approved, C.pending];

  const programBar = ep.map(p => ({
    name:     p.program_code,
    fullName: p.program_name,
    enrolled: p.enrolled,
  }));

  const blockBar = (bf?.by_program ?? []).map(b => ({
    name:      b.program_code,
    enrolled:  b.enrolled,
    remaining: Math.max(0, b.capacity - b.enrolled),
  }));

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link active" to="/registrar/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/registrar/enrollment">Enrollment Requests</Link>
        <Link className="sidebar-link" to="/registrar/grades">List of Students</Link>
        <Link className="sidebar-link" to="/registrar/faculty">Faculty</Link>
        <Link className="sidebar-link" to="/registrar/schedule">Class Schedules</Link>
        <Link className="sidebar-link" to="/registrar/documents">Document Requests</Link>
        <Link className="sidebar-link" to="/registrar/academic-data">Academic Data</Link>
        <Link className="sidebar-link" to="/registrar/announcements">Announcements</Link>
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
          <p style={{ color: '#6b7280' }}>Loading analytics...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* â”€â”€ KPI row â”€â”€ */}
            <div style={S.kpiRow}>
              <KpiCard label="Total Enrollments" value={totalEnroll} color={C.navy}
                sub={tl || undefined} />
              <KpiCard label="Approved" value={e?.approved} color={C.approved}
                sub="enrollment requests" />
              <KpiCard label="Pending Review" value={e?.pending} color={C.pending} />
              <KpiCard label="Grade Assignments" value={g?.total_assignments} color={C.purple}
                sub={`${g?.submitted_assignments ?? 0} fully submitted`} />
              <KpiCard label="Document Requests" value={totalDocs} color={C.processing}
                sub={`${d?.ready ?? 0} ready for release`} />
            </div>

            {/* â”€â”€ Row 2: Enrollment donut + Document pipeline â”€â”€ */}
            <div style={S.twoCol}>
              <ChartCard title={`Enrollment Status${tl ? `  -  ${tl}` : ''}`}>
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={enrollPie} cx="50%" cy="50%"
                      innerRadius={58} outerRadius={95}
                      dataKey="value" labelLine={false} label={PieLabel}>
                      {enrollPie.map((_, i) => (
                        <Cell key={i} fill={enrollPieColors[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '0.8rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Document Request Pipeline">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={docBar} layout="vertical"
                    margin={{ left: 8, right: 28, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="value" radius={[0, 5, 5, 0]}
                      label={{ position: 'right', fontSize: 11, fill: '#374151' }}>
                      {docBar.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* â”€â”€ Row 3: Enrollment by program (full width) â”€â”€ */}
            {programBar.length > 0 && (
              <ChartCard title={`Approved Enrollment by Program${tl ? `  -  ${tl}` : ''}`}>
                <ResponsiveContainer width="100%"
                  height={Math.max(200, programBar.length * 36)}>
                  <BarChart data={programBar} layout="vertical"
                    margin={{ left: 8, right: 40, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip
                      formatter={(v) => [v, 'Enrolled']}
                      labelFormatter={label => {
                        const p = programBar.find(x => x.name === label);
                        return p ? p.fullName : label;
                      }}
                    />
                    <Bar dataKey="enrolled" fill={C.enrolled} radius={[0, 5, 5, 0]}
                      label={{ position: 'right', fontSize: 11, fill: '#374151' }} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* â”€â”€ Row 4: Grade submission donut + Block capacity stacked bar â”€â”€ */}
            <div style={S.twoCol}>
              <ChartCard title={`Grade Submission${tl ? `  -  ${tl}` : ''}`}>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={gradesPie} cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90}
                      dataKey="value" labelLine={false} label={PieLabel}>
                      {gradesPie.map((_, i) => (
                        <Cell key={i} fill={gradesPieColors[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '0.8rem' }} />
                  </PieChart>
                </ResponsiveContainer>
                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
                  {g?.submitted_grade_records ?? 0} of {g?.total_grade_records ?? 0} individual grade records submitted
                </p>
              </ChartCard>

              {blockBar.length > 0 ? (
                <ChartCard title={`Block Capacity by Program${tl ? `  -  ${tl}` : ''}`}>
                  <ResponsiveContainer width="100%"
                    height={Math.max(210, blockBar.length * 36)}>
                    <BarChart data={blockBar} layout="vertical"
                      margin={{ left: 8, right: 20, top: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                      <Tooltip />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: '0.8rem' }} />
                      <Bar dataKey="enrolled"  stackId="a" fill={C.enrolled}
                        name="Enrolled"  radius={[0, 0, 0, 0]} />
                      <Bar dataKey="remaining" stackId="a" fill={C.remaining}
                        name="Available" radius={[0, 5, 5, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
                    {bf?.full_blocks ?? 0} full block{(bf?.full_blocks ?? 0) !== 1 ? 's' : ''} &middot; avg {bf?.avg_fill_pct ?? 0}% filled
                  </p>
                </ChartCard>
              ) : (
                <ChartCard title={`Block Fill Rate${tl ? `  -  ${tl}` : ''}`}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.5rem' }}>
                    {[
                      { label: 'Total Blocks', value: bf?.total_blocks ?? ' - ',                      color: C.navy    },
                      { label: 'Avg Fill',     value: bf?.avg_fill_pct != null ? `${bf.avg_fill_pct}%` : ' - ', color: C.purple  },
                      { label: 'Full Blocks',  value: bf?.full_blocks  ?? ' - ',                      color: C.rejected },
                    ].map(item => (
                      <div key={item.label} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.5rem 0.75rem', background: '#f9fafb',
                        borderRadius: 6, borderLeft: `3px solid ${item.color}`,
                      }}>
                        <span style={{ fontSize: '0.82rem', color: '#374151' }}>{item.label}</span>
                        <span style={{ fontWeight: 700, color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              )}
            </div>

            <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              Analytics as of {stats?.generated_at
                ? new Date(stats.generated_at).toLocaleString('en-PH')
                : ' - '}
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

