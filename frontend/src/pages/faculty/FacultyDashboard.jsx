import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

// "HH:MM[:SS]" → minutes since midnight.
function toMinutes(t) {
  const [h, m] = (t || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Current time in the Philippines (Asia/Manila, no DST), regardless of the
// device's own timezone. Returns the day-of-week and minutes since midnight.
function philippineNow() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
}

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function StatRow({ label, value, sub }) {
  return (
    <div className="fac-stat">
      <span className="fac-stat-l">{label}{sub && <small>{sub}</small>}</span>
      <span className="fac-stat-v">{value ?? '—'}</span>
    </div>
  );
}

export default function FacultyDashboard() {
  const { user } = useAuth();

  const [loading, setLoading]         = useState(true);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [assignments, setAssignments] = useState([]);   // from /grades/teaching-load/
  const [scheduleLoad, setScheduleLoad] = useState([]); // from /schedules/faculty/ — has student_count + slots

  useEffect(() => {
    Promise.allSettled([
      api.get('/enrollment/current-term/'),
      api.get('/grades/teaching-load/'),
    ]).then(([termRes, loadRes]) => {
      const term = termRes.status === 'fulfilled' ? termRes.value.data : null;
      setCurrentTerm(term);
      const all = loadRes.status === 'fulfilled' ? loadRes.value.data : [];
      setAssignments(all);
      if (term) {
        api.get(`/schedules/faculty/?term_id=${term.id}`)
          .then(r => setScheduleLoad(r.data))
          .catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, []);

  const termLabel = currentTerm
    ? `${currentTerm.semester_display} ${currentTerm.year}`
    : 'No active term';

  // Current term assignments from grades API
  const termAssignments = currentTerm
    ? assignments.filter(a => a.term_id === currentTerm.id)
    : [];

  // Derived metrics
  const sections       = scheduleLoad.length || termAssignments.length;
  const totalStudents  = scheduleLoad.reduce((s, a) => s + (a.student_count || 0), 0);
  const totalUnits     = termAssignments.reduce((s, a) => s + (a.subject_units || 0), 0);
  const avgClass       = sections ? Math.round(totalStudents / sections) : 0;
  const teachingDays   = new Set(
    scheduleLoad.flatMap(ta => (ta.slots || []).map(s => s.day_of_week))
  ).size;

  // Today's slots (Philippine time)
  const phNow = philippineNow();
  const today = DAY_NAMES[phNow.day];
  const todaySlots = scheduleLoad
    .flatMap(ta => (ta.slots || [])
      .filter(s => s.day_of_week === today)
      .map(s => ({ ...s, code: ta.subject_code, name: ta.subject_name, students: ta.student_count }))
    )
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Class status by current PH time: 'done' | 'now' (in progress) | 'upcoming'.
  const slotStatus = s => {
    const start = toMinutes(s.start_time), end = toMinutes(s.end_time);
    if (phNow.minutes >= end) return 'done';
    if (phNow.minutes >= start) return 'now';
    return 'upcoming';
  };
  const upNextIndex = todaySlots.findIndex(s => slotStatus(s) === 'upcoming');

  // Greeting
  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  // Faculty full_name carries an honorific (e.g. "Dr. Emmanuel Bautista"); greet
  // with title + surname, else first name.
  const displayName = (() => {
    const parts = (user?.full_name || 'Faculty').trim().split(/\s+/);
    const TITLE = /^(dr|prof|engr|atty|mr|mrs|ms|hon|rev|fr)\.?$/i;
    if (parts.length >= 2 && TITLE.test(parts[0])) return `${parts[0]} ${parts[parts.length - 1]}`;
    return parts[0];
  })();

  return (
    <>
      <style>{CSS}</style>

      {/* ── Welcome banner ── */}
      <div className="welcome">
        <div>
          <div className="welcome-name">Faculty · {termLabel}</div>
          <div className="welcome-greeting">{greeting}, <em>{displayName}</em></div>
          <div className="welcome-sub">
            {sections > 0
              ? <>You’re teaching <strong>{sections}</strong> section{sections !== 1 ? 's' : ''} to <strong>{totalStudents}</strong> student{totalStudents !== 1 ? 's' : ''} this term
                  {todaySlots.length > 0
                    ? <> — <strong>{todaySlots.length}</strong> class{todaySlots.length !== 1 ? 'es' : ''} today.</>
                    : ' — no classes today.'}</>
              : 'You have no teaching assignments for this term yet.'}
          </div>
        </div>
        <div className="welcome-stats">
          <div className="welcome-stat">
            <div className="n">{sections}</div>
            <div className="l">My <em>subjects</em></div>
          </div>
          <div className="welcome-stat">
            <div className="n">{totalStudents}</div>
            <div className="l">My <em>students</em></div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="fac-loading">Loading dashboard…</div>
      ) : (
        <>
          {/* ── Today's classes + This-term rail ── */}
          <div className="row-21" style={{ marginBottom: '1.75rem' }}>
            {/* Today's classes */}
            <div className="card" style={{ padding: 0 }}>
              <div className="card-head" style={{ padding: '1.5rem 1.5rem 1rem', marginBottom: 0 }}>
                <h4>Today's classes<span>
                  {today.charAt(0).toUpperCase() + today.slice(1)}
                  {' · '}{todaySlots.length} session{todaySlots.length !== 1 ? 's' : ''}
                </span></h4>
                <Link to="/faculty/schedule" className="sec-action">Full schedule</Link>
              </div>
              <div style={{ padding: '0 1.5rem 1.25rem' }}>
                {todaySlots.length === 0 ? (
                  <div style={{ padding: '2.5rem 0', textAlign: 'center' }}>
                    <i className="ti ti-coffee" style={{ fontSize: 26, color: 'var(--faint)', display: 'block', marginBottom: 8 }} />
                    <div style={{ color: 'var(--muted)', fontSize: 13 }}>No classes scheduled for today.</div>
                  </div>
                ) : (
                  <>
                    {todaySlots.map((c, i) => {
                      const st       = slotStatus(c);
                      const isNow    = st === 'now';
                      const isNext   = i === upNextIndex;
                      const isDone   = st === 'done';
                      const barColor = isNow ? 'var(--green)' : isNext ? 'var(--gold)' : 'var(--ink)';
                      return (
                        <div key={i} style={{
                          display: 'grid', gridTemplateColumns: 'auto auto 1fr',
                          gap: '1.25rem', alignItems: 'center', padding: '14px 0',
                          borderBottom: i < todaySlots.length - 1 ? '1px solid var(--line-soft)' : 'none',
                          opacity: isDone ? 0.5 : 1,
                        }}>
                          <div style={{ width: 56, textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 500, fontSize: 20, color: 'var(--ink)', lineHeight: 1 }}>
                              {formatTime(c.start_time).split(' ')[0]}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600, letterSpacing: '.1em', marginTop: 2 }}>
                              {formatTime(c.start_time).split(' ')[1]}
                            </div>
                          </div>
                          <div style={{ width: 5, height: 46, background: barColor, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 600 }}>{c.code}</span>
                              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatTime(c.start_time)} – {formatTime(c.end_time)}</span>
                              {isNow  && <span className="tag status-active">In progress</span>}
                              {isNext && <span className="tag pending">Up next</span>}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{c.name || c.code}{c.room ? ` · ${c.room}` : ''}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{c.students} student{c.students !== 1 ? 's' : ''} enrolled</div>
                          </div>
                        </div>
                      );
                    })}
                    {upNextIndex === -1 && (
                      <div style={{ padding: '12px 0 2px', color: 'var(--muted)', fontSize: 12.5, fontWeight: 500 }}>
                        <i className="ti ti-circle-check" style={{ marginRight: 6, color: 'var(--green)' }} />
                        No upcoming classes left today.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* This term — quiet metrics rail */}
            <div className="card" style={{ padding: 0 }}>
              <div className="card-head" style={{ padding: '1.5rem 1.5rem 1rem', marginBottom: 0 }}>
                <h4>This term<span>{termLabel}</span></h4>
              </div>
              <div style={{ padding: '0 1.5rem' }}>
                <StatRow label="Total units" sub=" · contact hours" value={totalUnits} />
                <StatRow label="Teaching days / week" value={teachingDays} />
                <StatRow label="Avg class size" value={avgClass || '—'} />
                <StatRow label="Classes today" value={todaySlots.length} />
              </div>
            </div>
          </div>

          {/* ── Grade encoding (the faculty's main task) ── */}
          <div className="sec-head">
            <div>
              <h3>Grade <em>encoding</em></h3>
              <div className="sub">Your sections this term. Open a grade sheet to encode midterm and final scores.</div>
            </div>
            <Link to="/faculty/grades" className="sec-action">
              <i className="ti ti-pencil" style={{ fontSize: 13 }} /> Encode grades
            </Link>
          </div>

          {sections === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '2.5rem 1.5rem', marginBottom: '1.75rem' }}>
              <i className="ti ti-books" style={{ fontSize: 26, display: 'block', marginBottom: 8, color: 'var(--faint)' }} />
              No sections assigned to you this term.
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid var(--line)', marginBottom: '1.75rem' }}>
              {(scheduleLoad.length ? scheduleLoad : termAssignments.map(a => ({
                teaching_assignment_id: a.id, subject_code: a.subject_code,
                subject_name: a.subject_name, student_count: a.student_count ?? 0, slots: [],
              }))).map((ta, i) => {
                const sched = (ta.slots || []).map(s =>
                  `${s.day_of_week.charAt(0).toUpperCase()}${s.day_of_week.slice(1,3)} ${formatTime(s.start_time)}–${formatTime(s.end_time)}`
                ).join(', ');
                return (
                  <div key={ta.teaching_assignment_id} className="fac-enc"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)' }}>
                    <div style={{ width: 40, height: 40, background: 'var(--cool)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="ti ti-book-2" style={{ fontSize: 18, color: 'var(--ink)' }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>{ta.subject_code}</div>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 500, fontSize: 17, color: 'var(--ink)', letterSpacing: '-.005em' }}>{ta.subject_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                        {ta.student_count} student{ta.student_count !== 1 ? 's' : ''}{sched ? ` · ${sched}` : ''}
                      </div>
                    </div>
                    <Link to="/faculty/grades" className="btn-sec">
                      <i className="ti ti-pencil" /> Encode
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Quick actions ── */}
          <div className="sec-head">
            <div>
              <h3>Quick <em>actions</em></h3>
              <div className="sub">Jump straight to what you need.</div>
            </div>
          </div>
          <div className="quick-actions">
            {[
              { icon: 'ti-pencil',   label: 'Encode grades',     sub: 'Update midterm and final scores',  to: '/faculty/grades'        },
              { icon: 'ti-calendar', label: 'View schedule',     sub: 'Check your weekly teaching load',  to: '/faculty/schedule'      },
              { icon: 'ti-users',    label: 'Class roster',      sub: 'View enrolled students per class', to: '/faculty/roster'        },
              { icon: 'ti-bell',     label: 'Announcements',     sub: 'Read the latest campus bulletins',  to: '/faculty/announcements' },
            ].map(a => (
              <Link key={a.label} to={a.to} className="quick-action">
                <div className="quick-action-icon"><i className={`ti ${a.icon}`} /></div>
                <div>
                  <div className="quick-action-label">{a.label}</div>
                  <div className="quick-action-sub">{a.sub}</div>
                </div>
              </Link>
            ))}
          </div>

          <div className="foot-note">
            <span>Dashboard data · {currentTerm ? termLabel : 'No active term'}</span>
            <span className="live"><span className="dot" /> Connected to NEMSUonePortal API</span>
          </div>
        </>
      )}
    </>
  );
}

const CSS = `
  .fac-loading{color:var(--muted);padding:2rem 0;font-size:13px}

  .fac-stat{display:flex;align-items:baseline;justify-content:space-between;gap:12px;
    padding:14px 0;border-bottom:1px solid var(--line-soft);}
  .fac-stat:last-child{border-bottom:none;}
  .fac-stat-l{font-size:12px;color:var(--muted);}
  .fac-stat-l small{color:var(--faint);}
  .fac-stat-v{font-family:'Inter',sans-serif;font-size:22px;font-weight:500;color:var(--ink);
    letter-spacing:-.015em;font-variant-numeric:tabular-nums;}

  .fac-enc{display:flex;align-items:center;gap:1rem;padding:1.2rem 1.5rem;transition:background .12s;}
  .fac-enc:hover{background:var(--warm);}
`;
