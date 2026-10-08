import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useShell } from '../../components/layout/StudentShell';

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function greeting(d) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function fmtTime(timeStr) {
  if (!timeStr) return '-';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function toMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function gradeColor(g) {
  const n = parseFloat(g);
  if (!g || isNaN(n)) return 'var(--muted)';
  if (n <= 1.75) return 'var(--green)';
  if (n <= 2.5)  return 'var(--ink)';
  return 'var(--red)';
}

/* ── Today's classes — the focal element ────────────────────────── */

const SLOT_STATE = {
  now:  { label: 'In session', tone: 'var(--green)', bar: 'var(--green)' },
  next: { label: 'Up next',    tone: 'var(--gold)',  bar: 'var(--gold)'  },
};

function TodaysClasses({ slots, navigate, dayLabel, nowMinutes }) {
  // Sort chronologically, then classify each session against the clock.
  const sorted = [...slots].sort(
    (a, b) => (toMinutes(a.start_time) ?? 0) - (toMinutes(b.start_time) ?? 0)
  );
  let nextMarked = false;
  const rows = sorted.map(s => {
    const start = toMinutes(s.start_time);
    const end   = toMinutes(s.end_time);
    let state = null;
    if (nowMinutes != null && start != null && end != null) {
      if (nowMinutes >= end) state = 'done';
      else if (nowMinutes >= start) state = 'now';
      else if (!nextMarked) { state = 'next'; nextMarked = true; }
    } else if (!nextMarked) { state = 'next'; nextMarked = true; }
    return { s, state };
  });

  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="card-head" style={{ padding: '1.5rem 1.5rem 1rem', marginBottom: 0 }}>
        <h4>Today's classes<span>{dayLabel} · {slots.length} session{slots.length !== 1 ? 's' : ''}</span></h4>
        <button className="sec-action" onClick={() => navigate('/student/schedule')}>
          Full schedule
        </button>
      </div>
      <div style={{ padding: '0 1.5rem 1.25rem', display: 'flex', flexDirection: 'column' }}>
        {rows.length === 0 ? (
          <div style={{ padding: '2.5rem 0', textAlign: 'center' }}>
            <i className="ti ti-coffee" style={{ fontSize: 26, color: 'var(--faint)', display: 'block', marginBottom: 8 }} />
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>No classes scheduled today.</div>
          </div>
        ) : rows.map(({ s, state }, i) => {
          const start = fmtTime(s.start_time);
          const [timePart, ampmPart] = start.split(' ');
          const meta = SLOT_STATE[state];
          const done = state === 'done';
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: '1.25rem',
              alignItems: 'center', padding: '14px 0',
              borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 'none',
              opacity: done ? 0.5 : 1,
            }}>
              <div style={{ width: 58, textAlign: 'center' }}>
                <div style={{ fontWeight: 500, fontSize: 22, color: 'var(--ink)', lineHeight: 1 }}>{timePart}</div>
                <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600, letterSpacing: '.1em', marginTop: 2 }}>{ampmPart}</div>
              </div>
              <div style={{ width: 4, height: 48, background: meta ? meta.bar : 'var(--line)', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {s.subject_code || s.code}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{start} – {fmtTime(s.end_time)}</span>
                  {meta && (
                    <span style={{
                      fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700,
                      padding: '2px 7px', color: '#fff', background: meta.tone,
                    }}>{meta.label}</span>
                  )}
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
                  {s.subject_name || s.name || s.subject_code}{s.room ? ` · ${s.room}` : ''}
                </div>
                {(s.instructor_name || s.instructor) && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.instructor_name || s.instructor}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Term status rail (replaces the flat KPI strip) ─────────────── */

function StatRow({ label, value, tone, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { onClick, type: 'button' } : {})}
      style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12,
        padding: '14px 0', width: '100%', textAlign: 'left',
        background: 'none', border: 0, borderBottom: '1px solid var(--line-soft)',
        font: 'inherit', cursor: onClick ? 'pointer' : 'default', color: 'inherit',
      }}>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 500, color: tone || 'var(--ink)', letterSpacing: '-.01em', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </Tag>
  );
}

function TermStatus({ termLabel, enrolled, gwa, units, subjectCount, openCount, navigate }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="card-head" style={{ padding: '1.5rem 1.5rem 1rem', marginBottom: 0 }}>
        <h4>This term<span>{termLabel}</span></h4>
      </div>
      <div style={{ padding: '0 1.5rem' }}>
        <StatRow
          label="Enrollment"
          value={enrolled ? 'Enrolled' : 'Not enrolled'}
          tone={enrolled ? 'var(--green)' : 'var(--amber)'}
          onClick={() => navigate('/student/enrollment')}
        />
        <StatRow label="Units enrolled" value={subjectCount ? units : '—'} />
        <StatRow
          label="Document requests"
          value={openCount > 0 ? `${openCount} active` : 'None'}
          onClick={() => navigate('/student/documents')}
        />
      </div>
      {!enrolled && (
        <div style={{ padding: '1rem 1.5rem 1.5rem' }}>
          <button className="btn-pri" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => navigate('/student/enrollment')}>
            <i className="ti ti-clipboard-check" /> Enroll for {termLabel}
          </button>
        </div>
      )}
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
        <h4>Document requests<span>{docs.length ? `${docs.length} in progress` : 'Nothing pending'}</span></h4>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {docs.length === 0 ? (
          <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--green)', fontSize: 13 }}>
            <i className="ti ti-circle-check" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
            You're all caught up
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

function GradeCell({ label, value, big = false, placeholder = '—' }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 4, whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ fontWeight: big ? 600 : 500, fontSize: big ? 22 : 16, color: gradeColor(value), fontVariantNumeric: 'tabular-nums' }}>
        {value ?? placeholder}
      </div>
    </div>
  );
}

function SubjectsThisTerm({ subjects, gradeFor, termLabel, blockCode }) {
  if (!subjects.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)' }}>
      <div className="card-head" style={{ margin: '1.25rem 1.5rem 0', paddingBottom: '1rem' }}>
        <h4>Subjects enrolled<span>{termLabel}{blockCode ? ` · ${blockCode}` : ''}</span></h4>
      </div>
      <div>
        {subjects.map((s, i) => {
          const code = s.code || s.subject_code;
          const combined = s.grade ?? gradeFor(code);
          return (
            <div key={i} className="sd-term-row" style={{
              padding: '1.25rem 1.5rem', borderTop: '1px solid var(--line-soft)',
              display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 72px 72px 96px 56px', gap: '1rem', alignItems: 'center',
            }}>
              <div className="sd-term-info" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  {code}
                </div>
                <div style={{ fontWeight: 500, fontSize: 17, color: 'var(--ink)', letterSpacing: '-.005em' }}>
                  {s.name || s.subject_name}
                </div>
                {(s.instructor || s.instructor_name) && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {s.instructor || s.instructor_name}{s.room ? ` · ${s.room}` : ''}
                  </div>
                )}
              </div>
              <GradeCell label="Midterm" value={s.midterm_grade} />
              <GradeCell label="Final" value={s.final_grade} />
              <GradeCell label="Final Grade" value={combined} big placeholder="Pending" />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Units</div>
                <div style={{ fontWeight: 500, fontSize: 18, color: 'var(--ink)' }}>{s.units}</div>
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
          <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nothing new yet. Grades and request updates show up here.</div>
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

function QuickActions({ navigate }) {
  const actions = [
    { icon: 'ti-school',          title: 'View my grades',    desc: 'Current term grades and history per semester',     path: '/student/grades'      },
    { icon: 'ti-calendar-event',  title: 'My schedule',       desc: 'Weekly timetable with room and instructor info',   path: '/student/schedule'    },
    { icon: 'ti-file-text',       title: 'Request document',  desc: 'TOR, certificates, and other registrar documents', path: '/student/documents'   },
    { icon: 'ti-clipboard-check', title: 'My enrollment',     desc: 'Submit and track your enrollment for the term',     path: '/student/enrollment'  },
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

  const [loading, setLoading]     = useState(true);
  const [grades, setGrades]       = useState([]);
  const [documents, setDocuments] = useState([]);
  const [schedule, setSchedule]   = useState([]);
  const [now]                     = useState(new Date());

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
  const blockCode = '';

  // Weighted GWA across all numerically-graded records (INC / DRP are excluded).
  const unitsOf = g => parseFloat(g.subject_units ?? g.units ?? 1) || 1;
  const gradedRecords = grades.filter(g => g.grade != null && !isNaN(parseFloat(g.grade)));
  const totalWeightedGrade = gradedRecords.reduce((s, g) => s + parseFloat(g.grade) * unitsOf(g), 0);
  const totalUnitsGraded   = gradedRecords.reduce((s, g) => s + unitsOf(g), 0);
  const gwa = totalUnitsGraded > 0 ? (totalWeightedGrade / totalUnitsGraded).toFixed(2) : null;

  // Grades for the current term (feeds the subjects table)
  const currentTermGrades = currentTerm
    ? grades.filter(g => {
        if (g.academic_term === currentTerm.id) return true;
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

  // Enrolled subjects this term come from the instructor-built roster
  // (the student's own course grade-records), not the old subject-selection.
  const subjects = currentTermGrades.map(g => ({
    subject_code: g.subject_code,
    subject_name: g.subject_name,
    units: g.subject_units,
    instructor_name: g.faculty_name,
    midterm_grade: g.midterm_grade,
    final_grade: g.final_grade,
    grade: g.grade,
  }));
  const enrolledUnits = subjects.reduce((s, x) => s + parseFloat(x.units || 0), 0);
  const enrolled = subjects.length > 0;

  const pendingDocs = documents.filter(d => ['submitted','processing','ready'].includes(d.status));

  // Today's schedule. The endpoint returns courses with nested meeting
  // slots, so flatten them into individual sessions and tag each with its
  // course + room before filtering to today.
  const todayName   = DAY_NAMES[now.getDay()];
  const allSlots    = schedule.flatMap(c =>
    (c.slots || []).map(sl => ({
      ...sl,
      subject_code: c.subject_code,
      subject_name: c.subject_name,
      instructor_name: c.faculty_name,
      room: [sl.building, sl.room].filter(Boolean).join(' '),
    }))
  );
  const todaySlots  = allSlots.filter(s => s.day_of_week === todayName);
  const nowMinutes  = now.getHours() * 60 + now.getMinutes();

  const termLabel = currentTerm
    ? `${currentTerm.semester_display} ${currentTerm.year}`
    : 'No active term';
  const dayLabel  = now.toLocaleDateString('en-PH', { weekday: 'long' });
  const firstName = (user?.full_name || '').split(' ')[0] || 'there';

  if (loading) {
    return (
      <div className="page">
        <p style={{ color: 'var(--muted)' }}>Loading dashboard…</p>
      </div>
    );
  }

  // A plain-language summary line that adapts to what actually matters today.
  const summaryBits = [];
  if (!enrolled) summaryBits.push(<>you're <strong style={{ color: 'var(--amber)' }}>not enrolled yet</strong> for {termLabel}</>);
  else summaryBits.push(<>you have <strong style={{ color: 'var(--ink)' }}>{todaySlots.length} class{todaySlots.length !== 1 ? 'es' : ''}</strong> today</>);
  if (pendingDocs.length > 0) summaryBits.push(<><strong style={{ color: 'var(--ink)' }}>{pendingDocs.length} document request{pendingDocs.length !== 1 ? 's' : ''}</strong> in progress</>);

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <style>{`
        @media(max-width:640px){
          .sd-term-row{grid-template-columns:repeat(4,1fr)!important;gap:.85rem 1rem!important;padding:1.1rem 1.25rem!important;}
          .sd-term-info{grid-column:1/-1!important;}
        }
        @media(max-width:400px){
          .sd-term-row{grid-template-columns:repeat(2,1fr)!important;}
        }
      `}</style>

      {/* ── Welcome ──────────────────────────────────────── */}
      <div className="welcome">
        <div className="welcome-head">
          <div className="welcome-eyebrow">Student portal · {termLabel}</div>
          <h1>{greeting(now)}, <em>{firstName}</em>.</h1>
          <p>
            Here's where things stand —{' '}
            {summaryBits.map((b, i) => (
              <span key={i}>{i > 0 ? (i === summaryBits.length - 1 ? ', and ' : ', ') : ''}{b}</span>
            ))}.
          </p>
        </div>
        <div className="welcome-side">
          <div className="stamp">{now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      {/* ── Hero: Today + term status ────────────────────── */}
      <div className="row-21">
        <TodaysClasses slots={todaySlots} navigate={navigate} dayLabel={dayLabel} nowMinutes={nowMinutes} />
        <TermStatus
          termLabel={termLabel}
          enrolled={enrolled}
          gwa={gwa}
          units={enrolledUnits}
          subjectCount={subjects.length}
          openCount={pendingDocs.length}
          navigate={navigate}
        />
      </div>

      {/* ── Subjects this term ────────────────────────────── */}
      {subjects.length > 0 && (
        <div>
          <div className="sec-head">
            <div>
              <h3>This <em>term</em></h3>
              <div className="sub">{subjects.length} subjects · {enrolledUnits} units{blockCode ? ` · ${blockCode}` : ''}</div>
            </div>
            <div className="actions">
              <Link to="/student/grades" className="sec-action">View grades</Link>
            </div>
          </div>
          <SubjectsThisTerm
            subjects={subjects}
            gradeFor={gradeFor}
            termLabel={termLabel}
            blockCode={blockCode}
          />
        </div>
      )}

      {/* ── Recent activity + Document requests ───────────── */}
      <div className="row-21">
        <RecentActivity docs={documents} grades={grades} />
        <OpenRequests docs={pendingDocs} navigate={navigate} />
      </div>

      {/* ── Quick actions ─────────────────────────────────── */}
      <div>
        <div className="sec-head">
          <div>
            <h3>Quick <em>actions</em></h3>
            <div className="sub">Jump straight to what you need.</div>
          </div>
        </div>
        <QuickActions navigate={navigate} />
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <div className="foot-note">
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
