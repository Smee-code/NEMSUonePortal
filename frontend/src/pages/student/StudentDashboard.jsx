import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useShell } from '../../components/layout/StudentShell';

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function fmtTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function gradeColor(g) {
  const n = parseFloat(g);
  if (!g || isNaN(n)) return 'var(--muted)';
  if (n <= 1.75) return 'var(--green)';
  if (n <= 2.5)  return 'var(--ink)';
  return 'var(--red)';
}

/* ── Sub-components ─────────────────────────────────────────────── */

function Kpi({ label, value, icon, sub }) {
  return (
    <div className="kpi">
      <div className="kpi-head">
        <div className="kpi-label">{label}</div>
        <div className="kpi-icon"><i className={`ti ${icon}`} /></div>
      </div>
      <div>
        <div className="kpi-value">{value ?? '—'}</div>
        {sub && <div className="kpi-sub"><span>{sub}</span></div>}
      </div>
    </div>
  );
}

function TodaysClasses({ slots, navigate, dayLabel }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="card-head" style={{ padding: '1.5rem 1.5rem 1rem', marginBottom: 0 }}>
        <h4>Today's classes<span>{dayLabel} · {slots.length} session{slots.length !== 1 ? 's' : ''}</span></h4>
        <button className="sec-action" onClick={() => navigate('/student/schedule')}>
          Full schedule <i className="ti ti-arrow-right" style={{ fontSize: 11, marginLeft: 4 }} />
        </button>
      </div>
      <div style={{ padding: '0 1.5rem 1.25rem', display: 'flex', flexDirection: 'column' }}>
        {slots.length === 0 ? (
          <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No classes scheduled today — enjoy the day.
          </div>
        ) : slots.map((s, i) => {
          const start = fmtTime(s.start_time);
          const [timePart, ampmPart] = start.split(' ');
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: '1.25rem',
              alignItems: 'center', padding: '14px 0',
              borderBottom: i < slots.length - 1 ? '1px solid var(--line-soft)' : 'none',
            }}>
              <div style={{ width: 60, textAlign: 'center' }}>
                <div style={{ fontWeight: 500, fontSize: 22, color: 'var(--ink)', lineHeight: 1 }}>{timePart}</div>
                <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600, letterSpacing: '.1em', marginTop: 2 }}>{ampmPart}</div>
              </div>
              <div style={{ width: 6, height: 48, background: i === 0 ? 'var(--gold)' : 'var(--ink-2)', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {s.subject_code || s.code}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {start} – {fmtTime(s.end_time)}</span>
                  {i === 0 && <span className="tag pending">Up next</span>}
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
                  {s.subject_name || s.name || s.subject_code} · {s.room}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.instructor_name || s.instructor}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DOC_TAG = {
  submitted:  { cls: 'status-unverified', label: 'Submitted'  },
  processing: { cls: 'pending',           label: 'Processing' },
  ready:      { cls: 'role-faculty',      label: 'Ready'      },
};

function OpenRequests({ docs, navigate }) {
  return (
    <div className="card" style={{ background: 'var(--warm)' }}>
      <div className="card-head">
        <h4>Open requests<span>{docs.length} active</span></h4>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {docs.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--green)', fontSize: 13 }}>
            <i className="ti ti-circle-check" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
            No open requests
          </div>
        ) : docs.map(d => {
          const meta = DOC_TAG[d.status] ?? { cls: 'pending', label: d.status };
          return (
            <div key={d.id}
              onClick={() => navigate('/student/documents')}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', background: '#fff',
                border: '1px solid var(--line)', cursor: 'pointer',
                transition: 'border-color .15s, padding-left .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.paddingLeft = '18px'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.paddingLeft = '14px'; }}>
              <div style={{ width: 36, height: 36, background: 'var(--cool)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-file-text" style={{ fontSize: 16 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.document_type_display || d.document_type}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {d.id} · filed {new Date(d.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })}
                </div>
              </div>
              <span className={`tag ${meta.cls}`}>{meta.label}</span>
              <i className="ti ti-arrow-right" style={{ fontSize: 14, color: 'var(--faint)' }} />
            </div>
          );
        })}
        <button className="btn-sec" style={{ marginTop: '.25rem' }} onClick={() => navigate('/student/documents')}>
          <i className="ti ti-plus" /> Request a document
        </button>
      </div>
    </div>
  );
}

function SubjectsThisTerm({ subjects, gradeFor, termLabel, blockCode }) {
  if (!subjects.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', marginBottom: '1.75rem' }}>
      <div className="card-head" style={{ margin: '1.25rem 1.5rem 0', paddingBottom: '1rem' }}>
        <h4>Subjects enrolled<span>{termLabel}{blockCode ? ` · ${blockCode}` : ''}</span></h4>
      </div>
      <div>
        {subjects.map((s, i) => {
          const grade = gradeFor(s.code || s.subject_code);
          return (
            <div key={i} style={{
              padding: '1.25rem 1.5rem', borderTop: '1px solid var(--line-soft)',
              display: 'grid', gridTemplateColumns: '1.6fr 140px 80px 1fr', gap: '1.5rem', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  {s.code || s.subject_code}
                </div>
                <div style={{ fontWeight: 500, fontSize: 18, color: 'var(--ink)', letterSpacing: '-.005em' }}>
                  {s.name || s.subject_name}
                </div>
                {(s.instructor || s.instructor_name) && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {s.instructor || s.instructor_name}{s.room ? ` · ${s.room}` : ''}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Grade</div>
                <div style={{ fontWeight: 500, fontSize: 22, color: gradeColor(grade) }}>{grade ?? '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Units</div>
                <div style={{ fontWeight: 500, fontSize: 18, color: 'var(--ink)' }}>{s.units}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="tag" style={{ background: 'var(--cool-2)', color: 'var(--ink-2)' }}>
                  {s.section || blockCode || 'Enrolled'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentActivity({ docs, grades }) {
  const events = [];

  docs.slice(0, 3).forEach(d => {
    const icon = d.status === 'ready' ? 'ti-check' : d.status === 'rejected' ? 'ti-x' : 'ti-clock';
    const tag  = d.status === 'ready' ? 'approved' : d.status === 'rejected' ? 'rejected' : 'updated';
    events.push({
      icon, tag,
      what: `Document ${d.status}`,
      resource: d.document_type_display || d.document_type,
      who: 'Registrar',
      time: new Date(d.updated_at || d.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric' }),
    });
  });

  grades.slice(0, 3).forEach(g => {
    if (g.grade == null) return;
    events.push({
      icon: 'ti-pencil', tag: 'updated',
      what: 'Grade released for',
      resource: `${g.subject_code} · ${g.subject_name || ''}`,
      who: g.instructor_name || 'Faculty',
      time: new Date(g.updated_at || g.created_at || Date.now()).toLocaleDateString('en-PH', { month:'short', day:'numeric' }),
    });
  });

  const sorted = events.slice(0, 5);

  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="card-head" style={{ padding: '1.5rem 1.5rem 1rem', marginBottom: 0 }}>
        <h4>Recent activity<span>Updates from your campus accounts</span></h4>
      </div>
      <div className="activity" style={{ padding: '0 1.5rem 1.25rem' }}>
        {sorted.length === 0 ? (
          <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No recent activity.</div>
        ) : sorted.map((r, i) => (
          <div key={i} className="activity-row">
            <div className="act-icon"><i className={`ti ${r.icon}`} /></div>
            <div className="act-meta">
              <div className="act-text">{r.what} <strong>{r.resource}</strong></div>
              <div className="act-sub">{r.who}</div>
            </div>
            <div className={`act-tag ${r.tag}`}>{r.tag}</div>
            <div className="act-time">{r.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RemindersCard({ docs }) {
  const reminders = docs.map(d => ({
    icon:  d.status === 'ready' ? 'ti-file-text' : 'ti-clock',
    label: d.status === 'ready' ? `${d.document_type_display || d.document_type} ready for pickup` : `${d.document_type_display || d.document_type} in progress`,
    sub:   `Ref: ${d.id}`,
    tone:  d.status === 'ready' ? 'green' : 'amber',
  }));

  return (
    <div className="card" style={{ background: 'var(--warm)' }}>
      <div className="card-head">
        <h4>Reminders<span>Upcoming notices</span></h4>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {reminders.length === 0 ? (
          <div style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No reminders at this time.
          </div>
        ) : reminders.map((r, i) => {
          const toneColor = r.tone === 'green' ? 'var(--green)' : r.tone === 'amber' ? 'var(--amber)' : 'var(--ink)';
          return (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: '#fff', border: '1px solid var(--line)' }}>
              <div style={{ width: 36, height: 36, background: 'var(--cool)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: toneColor }}>
                <i className={`ti ${r.icon}`} style={{ fontSize: 16 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{r.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }}>{r.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickActions({ navigate }) {
  const actions = [
    { icon: 'ti-school',          title: 'View my grades',    desc: 'Current term grades and history per semester',     path: '/student/grades'      },
    { icon: 'ti-calendar-event',  title: 'My schedule',       desc: 'Weekly timetable with room and instructor info',   path: '/student/schedule'    },
    { icon: 'ti-file-text',       title: 'Request document',  desc: 'TOR, certificates, and other registrar documents', path: '/student/documents'   },
  ];
  return (
    <div className="quick">
      {actions.map(a => (
        <a key={a.path} href={a.path} className="quick-item"
          onClick={e => { e.preventDefault(); navigate(a.path); }}>
          <div className="quick-icon"><i className={`ti ${a.icon}`} /></div>
          <div className="quick-title">{a.title}</div>
          <div className="quick-desc">{a.desc}</div>
        </a>
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function StudentDashboard() {
  const { user }         = useAuth();
  const { currentTerm }  = useShell();
  const navigate         = useNavigate();

  const [loading, setLoading]         = useState(true);
  const [grades, setGrades]           = useState([]);
  const [documents, setDocuments]     = useState([]);
  const [schedule, setSchedule]       = useState([]);
  const [now]                         = useState(new Date());

  useEffect(() => {
    Promise.allSettled([
      api.get('/grades/my/'),
      api.get('/documents/my/'),
    ]).then(([gradesRes, docsRes]) => {
      if (gradesRes.status === 'fulfilled') setGrades(gradesRes.value.data);
      if (docsRes.status === 'fulfilled')   setDocuments(docsRes.value.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!currentTerm?.id) return;
    api.get(`/schedules/student/?term_id=${currentTerm.id}`)
      .then(r => setSchedule(r.data))
      .catch(() => {});
  }, [currentTerm?.id]);

  /* ── Derived ─────────────────────────────────────────── */
  const blockCode     = '';

  // Weighted GWA across all graded records
  const gradedRecords = grades.filter(g => g.grade != null);
  const totalWeightedGrade = gradedRecords.reduce((s, g) => s + parseFloat(g.grade) * (g.units || 1), 0);
  const totalUnitsGraded   = gradedRecords.reduce((s, g) => s + (g.units || 1), 0);
  const gwa = totalUnitsGraded > 0 ? (totalWeightedGrade / totalUnitsGraded).toFixed(2) : null;

  // Grades for current term (to show in subjects table)
  const currentTermGrades = currentTerm
    ? grades.filter(g => {
        if (g.academic_term === currentTerm.id) return true;
        // fallback: match by year/semester string
        return (
          String(g.term_year) === String(currentTerm.year) &&
          String(g.term_semester) === String(currentTerm.semester)
        );
      })
    : grades.length > 0
      ? (() => {
          const key = `${grades[0].term_year}-${grades[0].term_semester}`;
          return grades.filter(g => `${g.term_year}-${g.term_semester}` === key);
        })()
      : [];

  function gradeFor(code) {
    return currentTermGrades.find(g => g.subject_code === code)?.grade ?? null;
  }

  // Enrolled subjects this term now come from the instructor-built roster
  // (the student's own course grade-records), not the old subject-selection.
  const subjects = currentTermGrades.map(g => ({
    subject_code: g.subject_code,
    subject_name: g.subject_name,
    units: g.subject_units,
    instructor_name: g.faculty_name,
  }));
  const enrolledUnits = subjects.reduce((s, x) => s + parseFloat(x.units || 0), 0);
  const enrollStatus = subjects.length > 0 ? 'enrolled' : null;

  // Open documents
  const pendingDocs = documents.filter(d => ['submitted','processing','ready'].includes(d.status));

  // Today's schedule
  const todayName  = DAY_NAMES[now.getDay()];
  const todaySlots = schedule.filter(s => s.day_of_week === todayName);

  const termLabel  = currentTerm
    ? `${currentTerm.semester_display} ${currentTerm.year}`
    : 'No active term';
  const dayLabel   = now.toLocaleDateString('en-PH', { weekday: 'long' });
  const firstName  = (user?.full_name || '').split(' ')[0];

  const enrollStatusLabel = enrollStatus
    ? enrollStatus.charAt(0).toUpperCase() + enrollStatus.slice(1)
    : '—';

  if (loading) {
    return (
      <div className="page">
        <p style={{ color: 'var(--muted)' }}>Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="page">

      {/* ── Welcome ──────────────────────────────────────── */}
      <div className="welcome">
        <div className="welcome-head">
          <div className="welcome-eyebrow">Overview · {termLabel}</div>
          <h1>Good morning, <em>{firstName}</em>.</h1>
          <p>
            You have{' '}
            <strong style={{ color: 'var(--ink)' }}>{todaySlots.length} class{todaySlots.length !== 1 ? 'es' : ''} today</strong>,{' '}
            <strong style={{ color: 'var(--ink)' }}>{pendingDocs.length} document request{pendingDocs.length !== 1 ? 's' : ''}</strong>{' '}
            in progress, and your current GWA is{' '}
            <strong style={{ color: 'var(--ink)' }}>{gwa ?? '—'}</strong>.
          </p>
        </div>
        <div className="welcome-side">
          <div className="live-indicator"><span className="dot" /> Live data</div>
          <div className="stamp">{now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      {/* ── KPI strip ────────────────────────────────────── */}
      <div className="kpis">
        <Kpi label="Subjects"        value={subjects.length || '—'} icon="ti-book-2"          sub="enrolled this term" />
        <Kpi label="Units enrolled"  value={enrolledUnits || '—'}   icon="ti-stack-2"          sub={`of the required load`} />
        <Kpi label="GWA"             value={gwa ?? '—'}             icon="ti-school"           sub={gradedRecords.length > 0 ? `${gradedRecords.length} graded subjects` : 'No grades yet'} />
        <Kpi label="Doc. requests"   value={documents.length}       icon="ti-file-text"        sub={pendingDocs.length > 0 ? `${pendingDocs.length} in progress` : 'None pending'} />
        <Kpi label="Enrollment"      value={enrollStatusLabel}       icon="ti-clipboard-check"  sub={termLabel} />
      </div>

      {/* ── Today's Classes + Open Requests ──────────────── */}
      <div className="row-21" style={{ marginBottom: '1.75rem' }}>
        <TodaysClasses slots={todaySlots} navigate={navigate} dayLabel={dayLabel} />
        <OpenRequests docs={pendingDocs} navigate={navigate} />
      </div>

      {/* ── Subjects this term ────────────────────────────── */}
      {subjects.length > 0 && (
        <>
          <div className="sec-head">
            <div>
              <h3>This <em>term</em></h3>
              <div className="sub">{subjects.length} subjects · {enrolledUnits} units{blockCode ? ` · ${blockCode}` : ''}</div>
            </div>
            <div className="actions">
              <Link to="/student/grades" className="sec-action">
                <i className="ti ti-school" style={{ fontSize: 13, marginRight: 4 }} />View grades
              </Link>
            </div>
          </div>
          <SubjectsThisTerm
            subjects={subjects}
            gradeFor={gradeFor}
            termLabel={termLabel}
            blockCode={blockCode}
          />
        </>
      )}

      {/* ── Recent Activity + Reminders ───────────────────── */}
      <div className="row-21" style={{ margin: '1.75rem 0' }}>
        <RecentActivity docs={documents} grades={grades} />
        <RemindersCard docs={pendingDocs} />
      </div>

      {/* ── Quick Actions ─────────────────────────────────── */}
      <div className="sec-head" style={{ marginTop: '.5rem' }}>
        <div>
          <h3>Quick <em>actions</em></h3>
          <div className="sub">Your most common workflows.</div>
        </div>
      </div>
      <QuickActions navigate={navigate} />

      {/* ── Footer ───────────────────────────────────────── */}
      <div className="foot-note" style={{ marginTop: '1.25rem' }}>
        <span>
          Data as of {now.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </span>
        <span className="live">
          <span className="dot" /> Connected to{' '}
          <strong style={{ color: 'var(--muted)' }}>nemsuoneportal.api</strong>
        </span>
      </div>
    </div>
  );
}
