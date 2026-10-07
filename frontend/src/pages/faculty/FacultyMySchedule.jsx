import { useEffect, useState } from 'react';
import api from '../../api/axios';

const DAY_ORDER  = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' };
const DAY_SHORT  = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat' };
const WEEK_KEYS  = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SLOT_H     = 58;

// Muted, harmonious palette, matched to the student timetable for one house style.
const SUBJECT_COLORS = ['#1e3a5f', '#2f6f68', '#8a5a2b', '#4b4b7a', '#2a6f4b', '#9a3f3f', '#3a5e8e', '#6e6224'];
function subjectColor(code, allCodes) {
  const idx = allCodes.indexOf(code);
  return SUBJECT_COLORS[idx % SUBJECT_COLORS.length] ?? '#1e3a5f';
}

function formatTime(t) {
  if (!t) return '-';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}
function timeToDecimal(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
}
function fmtHr(hr) {
  if (hr === 12) return '12 PM';
  return hr > 12 ? `${hr - 12} PM` : `${hr} AM`;
}

export default function FacultyMySchedule() {
  const [schedule, setSchedule] = useState([]);
  const [termLabel, setTermLabel] = useState('Current term');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const now = new Date();

  // The current (active) term's timetable loads automatically — no picker.
  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    (async () => {
      try {
        const termsRes = await api.get('/enrollment/terms/');
        const terms = Array.isArray(termsRes.data) ? termsRes.data : (termsRes.data.results ?? []);
        const active = terms.find(t => t.is_active) || terms[0] || null;
        if (!alive) return;
        if (active) setTermLabel(`${active.semester_display} ${active.year}`);
        const url = active ? `/schedules/faculty/?term_id=${active.id}` : '/schedules/faculty/';
        const res = await api.get(url);
        if (!alive) return;
        setSchedule(Array.isArray(res.data) ? res.data : (res.data.results ?? []));
      } catch {
        if (alive) setError('Failed to load your schedule.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ── Group meetings by day ──────────────────────────────── */
  const byDay = {};
  DAY_ORDER.forEach(d => { byDay[d] = []; });
  const allCodes = schedule.map(s => s.subject_code);
  schedule.forEach(course => {
    (course.slots ?? []).forEach(slot => {
      byDay[slot.day_of_week]?.push({
        ...slot,
        subject_code: course.subject_code,
        subject_name: course.subject_name,
        section:      course.section,
        student_count: course.student_count,
        color:        subjectColor(course.subject_code, allCodes),
      });
    });
  });
  DAY_ORDER.forEach(d => byDay[d].sort((a, b) => a.start_time.localeCompare(b.start_time)));

  const allSlots = DAY_ORDER.flatMap(d => byDay[d]);
  const hasSlots = allSlots.length > 0;

  /* ── Dynamic hour range (fit earliest → latest class) ───── */
  let minHour = 7, maxHour = 18;
  if (hasSlots) {
    minHour = Math.max(0, Math.floor(Math.min(...allSlots.map(s => timeToDecimal(s.start_time)))));
    maxHour = Math.min(24, Math.ceil(Math.max(...allSlots.map(s => timeToDecimal(s.end_time)))));
    if (maxHour <= minHour) maxHour = minHour + 1;
  }
  const HOURS = [];
  for (let h = minHour; h < maxHour; h++) HOURS.push(h);
  const gridHeight = HOURS.length * SLOT_H;

  const totalMtgs   = schedule.reduce((s, x) => s + (x.slots?.length ?? 0), 0);
  const totalStudents = schedule.reduce((s, x) => s + (x.student_count ?? 0), 0);
  const activeDays  = DAY_ORDER.filter(d => byDay[d].length > 0);

  /* ── Today / now marker ─────────────────────────────────── */
  const todayKey = WEEK_KEYS[now.getDay()];
  const nowDec   = now.getHours() + now.getMinutes() / 60;
  const showNow  = hasSlots && DAY_ORDER.includes(todayKey) && nowDec >= minHour && nowDec <= maxHour;

  const legend = schedule.map(s => ({
    code: s.subject_code, name: s.subject_name, color: subjectColor(s.subject_code, allCodes),
  }));

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div>
          <div className="eyebrow">Teaching · {termLabel}</div>
          <h2>My <em>schedule</em></h2>
          <div className="sub">Your weekly teaching timetable for the current term — the classes you teach, with their blocks, rooms and times.</div>
        </div>
        {hasSlots && (
          <div className="actions">
            <button className="btn-sec" onClick={() => window.print()}>
              <i className="ti ti-printer" /> Print
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: 'var(--red-tint)', color: 'var(--red)', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: 13 }}>{error}</div>
      )}

      {loading && <p style={{ color: 'var(--muted)' }}>Loading your schedule…</p>}

      {!loading && schedule.length === 0 && !error && (
        <div className="empty-state">
          <i className="ti ti-calendar-off" />
          <div className="t">No classes yet for {termLabel}</div>
          <div className="d">Declare a subject on your Teaching Load and set its meeting day and time — it will appear here.</div>
        </div>
      )}

      {!loading && schedule.length > 0 && (
        <>
          <div className="sch-head">
            <h4>Weekly timetable<span>{hasSlots ? `${DAY_SHORT[activeDays[0]] || 'Mon'}–${DAY_SHORT[activeDays[activeDays.length - 1]] || 'Sat'} · ${fmtHr(minHour)} to ${fmtHr(maxHour)}` : termLabel}</span></h4>
            <div className="sch-facts">
              <span className="sch-fact"><b>{schedule.length}</b> classes</span>
              <span className="sch-fact"><b>{totalMtgs}</b> meetings/wk</span>
              <span className="sch-fact"><b>{activeDays.length}</b> teaching days</span>
              <span className="sch-fact"><b>{totalStudents}</b> students</span>
            </div>
          </div>

          {hasSlots && (
            <div className="sch-legend">
              {legend.map(l => (
                <span key={l.code} className="sch-leg">
                  <b>{l.code}</b><span className="sch-leg-nm">{l.name}</span>
                </span>
              ))}
            </div>
          )}

          {hasSlots ? (
            <>
              {/* ── Calendar grid (tablet / desktop) ─────────── */}
              <div className="sched-grid">
                <div className="sch-cal">
                  <div className="sch-row sch-row--head">
                    <div className="sch-corner">Time</div>
                    {DAY_ORDER.map(d => (
                      <div key={d} className={`sch-dayhead${d === todayKey ? ' is-today' : ''}`}>
                        {DAY_LABELS[d]}
                        {d === todayKey && <span className="sch-today-pill">Today</span>}
                      </div>
                    ))}
                  </div>

                  <div className="sch-row" style={{ position: 'relative' }}>
                    <div className="sch-timecol">
                      {HOURS.map(hr => (
                        <div key={hr} className="sch-hour" style={{ height: SLOT_H }}>{fmtHr(hr)}</div>
                      ))}
                    </div>

                    {DAY_ORDER.map(d => (
                      <div key={d} className={`sch-daycol${d === todayKey ? ' is-today' : ''}`} style={{ height: gridHeight }}>
                        {HOURS.map(hr => (
                          <div key={hr} className="sch-cell" style={{ height: SLOT_H }} />
                        ))}

                        {showNow && d === todayKey && (
                          <div className="sch-now" style={{ top: (nowDec - minHour) * SLOT_H }}>
                            <span className="sch-now-dot" />
                          </div>
                        )}

                        {byDay[d].map((s, i) => {
                          const startDec = timeToDecimal(s.start_time);
                          const endDec   = timeToDecimal(s.end_time);
                          const top      = (startDec - minHour) * SLOT_H;
                          const height   = Math.max((endDec - startDec) * SLOT_H - 3, 26);
                          return (
                            <div key={i} className="sch-block"
                              style={{ top, height, background: s.color }}
                              title={`${s.subject_code} — ${s.subject_name}\n${formatTime(s.start_time)} – ${formatTime(s.end_time)}\n${s.room || 'Room to be assigned'}${s.section ? `\n${s.section}` : ''}`}
                            >
                              <div className="sch-block-code">{s.subject_code}</div>
                              <div className="sch-block-room">{s.room || 'Room TBA'}</div>
                              {height >= 56 && (
                                <div className="sch-block-time">{formatTime(s.start_time)} – {formatTime(s.end_time)}</div>
                              )}
                              {height >= 82 && s.section && (
                                <div className="sch-block-fac">{s.section}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Agenda list (phone) ──────────────────────── */}
              <div className="sched-agenda">
                {activeDays.map(d => (
                  <div key={d} className="sch-ag-day">
                    <div className={`sch-ag-dh${d === todayKey ? ' is-today' : ''}`}>
                      {DAY_LABELS[d]}{d === todayKey && <span className="sch-today-pill">Today</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {byDay[d].map((s, i) => (
                        <div key={i} className="sch-ag-item">
                          <div className="sch-ag-bar" style={{ background: s.color }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="sch-ag-code">{s.subject_code}<span className="sch-ag-nm"> · {s.subject_name}</span></div>
                            <div className="sch-ag-time">{formatTime(s.start_time)} – {formatTime(s.end_time)}</div>
                            <div className="sch-ag-meta">{s.room || 'Room to be assigned'}{s.section ? ` · ${s.section}` : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="sch-notimes">
              <i className="ti ti-clock" />
              Your classes for {termLabel} don’t have meeting times yet. Set a day and time for each class on your Teaching Load, and they’ll show up here.
            </div>
          )}
        </>
      )}
    </>
  );
}

const CSS = `
  .sch-head{display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap;margin-bottom:1rem;}
  .sch-head h4{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;line-height:1.3;}
  .sch-head h4 span{display:block;font-family:'Inter',sans-serif;font-weight:400;font-size:20px;color:var(--ink);
    text-transform:none;letter-spacing:-.01em;margin-top:4px;}
  .sch-facts{display:flex;gap:1.5rem;flex-wrap:wrap;}
  .sch-fact{font-size:12px;color:var(--muted);}
  .sch-fact b{color:var(--ink);font-weight:600;font-size:15px;margin-right:5px;font-variant-numeric:tabular-nums;}

  .sch-legend{display:flex;flex-wrap:wrap;gap:.6rem 1.25rem;padding:.9rem 1.1rem;background:#fff;
    border:1px solid var(--line);border-bottom:none;}
  .sch-leg{display:inline-flex;align-items:center;gap:8px;font-size:12px;min-width:0;}
  .sch-leg b{color:var(--ink);font-weight:600;letter-spacing:.02em;}
  .sch-leg-nm{color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;}

  .sch-cal{background:#fff;border:1px solid var(--line);overflow-x:auto;margin-bottom:1.5rem;}
  .sch-row{display:grid;grid-template-columns:64px repeat(6,minmax(96px,1fr));min-width:640px;}
  .sch-row--head{border-bottom:1px solid var(--line);}
  .sch-corner{padding:11px 8px;background:var(--warm);border-right:1px solid var(--line);
    font-size:10px;color:var(--muted);font-weight:600;letter-spacing:.12em;text-transform:uppercase;}
  .sch-dayhead{padding:11px 12px;background:var(--warm);border-right:1px solid var(--line);
    font-size:11px;color:var(--ink);font-weight:600;letter-spacing:.05em;text-align:center;
    display:flex;align-items:center;justify-content:center;gap:7px;}
  .sch-dayhead.is-today{background:var(--gold-tint);color:var(--ink);}
  .sch-today-pill{font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;
    color:#fff;background:var(--gold);padding:2px 6px;}
  .sch-timecol{border-right:1px solid var(--line);}
  .sch-hour{padding:4px 8px;font-size:10px;color:var(--muted);border-bottom:1px solid var(--line-soft);
    font-variant-numeric:tabular-nums;text-align:right;}
  .sch-daycol{position:relative;border-right:1px solid var(--line);}
  .sch-daycol.is-today{background:rgba(184,144,67,.045);}
  .sch-cell{border-bottom:1px solid var(--line-soft);}
  .sch-block{position:absolute;left:3px;right:3px;color:#fff;padding:6px 8px;font-size:11px;line-height:1.3;
    overflow:hidden;transition:filter .15s;cursor:default;box-shadow:0 1px 2px rgba(10,22,40,.18);}
  .sch-block:hover{filter:brightness(1.12);}
  .sch-block-code{font-weight:700;font-size:12px;letter-spacing:.02em;}
  .sch-block-room{opacity:.85;margin-top:2px;}
  .sch-block-time{opacity:.7;margin-top:1px;font-size:10px;}
  .sch-block-fac{opacity:.7;margin-top:2px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sch-now{position:absolute;left:0;right:0;height:2px;background:var(--red);z-index:3;}
  .sch-now-dot{position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--red);}

  .sched-grid{display:block;}
  .sched-agenda{display:none;margin-bottom:1.5rem;}
  .sch-ag-day{margin-bottom:1.1rem;}
  .sch-ag-dh{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);
    margin-bottom:8px;display:flex;align-items:center;gap:8px;}
  .sch-ag-dh.is-today{color:var(--ink);}
  .sch-ag-item{display:flex;gap:12px;background:#fff;border:1px solid var(--line);padding:11px 13px;}
  .sch-ag-bar{width:5px;flex-shrink:0;}
  .sch-ag-code{font-size:13px;font-weight:700;color:var(--ink);}
  .sch-ag-nm{font-weight:400;color:var(--muted);}
  .sch-ag-time{font-size:12px;color:var(--ink);margin-top:3px;font-weight:500;}
  .sch-ag-meta{font-size:11px;color:var(--muted);margin-top:2px;}

  .sch-notimes{background:var(--warm);border:1px solid var(--line);padding:.95rem 1.25rem;margin-bottom:1.5rem;
    display:flex;align-items:center;gap:10px;font-size:13px;color:var(--muted);}
  .sch-notimes i{font-size:16px;flex-shrink:0;}

  @media(max-width:760px){
    .sched-grid{display:none;}
    .sched-agenda{display:block;}
  }
`;
