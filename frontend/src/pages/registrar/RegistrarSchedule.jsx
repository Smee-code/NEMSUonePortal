import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

const DAY_OPTIONS = [
  { value: 'monday',    label: 'Monday'    },
  { value: 'tuesday',   label: 'Tuesday'   },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday',  label: 'Thursday'  },
  { value: 'friday',    label: 'Friday'    },
  { value: 'saturday',  label: 'Saturday'  },
];

const DAY_LABELS = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat',
};

const DAY_ORDER = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

const EMPTY_FORM = {
  department: '',    // scopes the faculty / building / room lists (not saved)
  subject_id: '',
  faculty_id: '',
  program_id: '',    // the block's program (auto-fills from the subject)
  year_level: '',    // the block's year level
  block_name: '',    // e.g. "Block A" — the student cohort
  room: '',
  building: '',
  days: [],          // one or more meeting days; a slot is created per day
  start_time: '',
  end_time: '',
};

const YEAR_LEVELS = [
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' },
];

const CSS = `
.sched-modal-back{
  position:fixed;inset:0;background:rgba(10,22,40,.5);backdrop-filter:blur(3px);
  z-index:1000;display:flex;align-items:flex-start;justify-content:center;
  padding:3rem 1rem;overflow-y:auto;
}
.sched-modal{
  background:#fff;border:1px solid var(--reg-line);border-radius:12px;
  width:100%;max-width:620px;box-shadow:0 20px 60px -20px rgba(10,22,40,.4);
  animation:schedModalIn .2s ease;
}
@keyframes schedModalIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.sched-modal-head{
  display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;
  padding:1.25rem 1.5rem;border-bottom:1px solid var(--reg-line-soft);
}
.sched-modal-head h4{font-size:1.05rem;font-weight:700;color:var(--reg-ink);line-height:1.2;}
.sched-modal-head p{font-size:.82rem;color:var(--reg-muted);margin-top:.25rem;line-height:1.4;}
.sched-modal-x{
  background:none;border:none;cursor:pointer;color:var(--reg-faint);
  font-size:1.2rem;line-height:1;padding:.2rem;flex-shrink:0;
}
.sched-modal-x:hover{color:var(--reg-ink);}
.sched-modal-body{padding:1.25rem 1.5rem;}
.sched-modal-err{
  background:var(--reg-red-tint);color:var(--reg-red);
  padding:.6rem .75rem;border-radius:6px;font-size:.85rem;margin-bottom:1rem;
}
.sched-modal-foot{
  display:flex;justify-content:flex-end;gap:.75rem;
  padding:1rem 1.5rem;border-top:1px solid var(--reg-line-soft);
  background:var(--reg-warm);border-radius:0 0 12px 12px;
}
.sched-form-grid{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.85rem;
}
.sched-cohort{display:grid;grid-template-columns:1.3fr 1fr 1.3fr;gap:.6rem;}
.sched-cohort .form-select{width:100%;box-sizing:border-box;}
@media(max-width:560px){ .sched-cohort{grid-template-columns:1fr;} }
.sched-combo{position:relative;}
.sched-combo-field{position:relative;}
.sched-combo-chev{position:absolute;right:5px;top:50%;transform:translateY(-50%);background:none;border:none;
  cursor:pointer;color:var(--reg-faint);padding:4px;display:flex;line-height:1;}
.sched-combo-chev:hover{color:var(--reg-ink);}
.sched-combo-menu{
  position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:5;
  background:#fff;border:1px solid var(--reg-line);border-radius:8px;
  box-shadow:0 12px 28px -12px rgba(10,22,40,.28);max-height:240px;overflow-y:auto;
}
.sched-combo-head{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:var(--reg-faint);padding:9px 12px 5px;}
.sched-combo-opt{
  display:flex;align-items:center;justify-content:space-between;gap:.5rem;width:100%;
  text-align:left;background:none;border:none;cursor:pointer;
  padding:.55rem .75rem;font-size:.9rem;color:var(--reg-ink);font-family:inherit;
}
.sched-combo-opt:hover{background:var(--reg-warm);}
.sched-combo-opt.is-sel{background:var(--reg-green-tint);}
.sched-combo-name{font-weight:500;}
.sched-combo-dept{font-size:.75rem;color:var(--reg-muted);flex-shrink:0;}
.sched-combo-empty{padding:.6rem .75rem;font-size:.85rem;color:var(--reg-muted);}
.sched-days{display:flex;flex-wrap:wrap;gap:.4rem;}
.sched-day-btn{
  padding:.45rem .8rem;border:1px solid var(--reg-line);background:#fff;
  border-radius:7px;font-size:.85rem;font-weight:600;color:var(--reg-muted);
  cursor:pointer;font-family:inherit;transition:all .12s;
}
.sched-day-btn:hover{border-color:var(--reg-ink);color:var(--reg-ink);}
.sched-day-btn.on{background:var(--reg-ink);border-color:var(--reg-ink);color:#fff;}
/* Day filter chips */
.sched-dayfilter{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1.25rem;}
.sched-chip{padding:6px 13px;border:1px solid var(--reg-line);background:#fff;border-radius:999px;
  font-size:12.5px;font-weight:600;color:var(--reg-muted);cursor:pointer;font-family:inherit;transition:all .12s;}
.sched-chip:hover{border-color:var(--reg-ink);color:var(--reg-ink);}
.sched-chip.on{background:var(--reg-ink);border-color:var(--reg-ink);color:#fff;}

/* Class cards + week strip */
.sched-classes{display:flex;flex-direction:column;gap:.85rem;}
.sched-class{border:1px solid var(--reg-line);border-radius:12px;background:#fff;
  box-shadow:0 1px 2px rgba(10,22,40,.04);overflow:hidden;}
.sched-class-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;
  padding:.9rem 1.1rem;border-bottom:1px solid var(--reg-line-soft);}
.sched-class-id{min-width:0;}
.sched-class-title{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;}
.sched-class-code{font-size:15px;font-weight:700;color:var(--reg-ink);letter-spacing:-.01em;}
.sched-class-name{font-size:13px;color:var(--reg-muted);}
.sched-class-sec{font-size:11px;font-weight:700;color:var(--reg-gold);border:1px solid #e7dcc0;
  background:#fbf7ec;padding:1px 8px;border-radius:5px;}
.sched-class-fac{font-size:12.5px;color:var(--reg-ink-2);margin-top:4px;display:flex;align-items:center;gap:6px;}
.sched-class-fac i{font-size:14px;color:var(--reg-faint);}
.sched-class-actions{display:flex;gap:.4rem;flex-shrink:0;}
.sched-del-class:hover{border-color:var(--reg-red);color:var(--reg-red);}
.sched-del-class:hover i{color:var(--reg-red);}
.sched-week{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;padding:.9rem 1.1rem;}
.sched-day{border:1px solid var(--reg-line-soft);border-radius:9px;min-height:78px;padding:7px 8px;
  display:flex;flex-direction:column;gap:5px;background:#fbfcfe;}
.sched-day-lbl{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--reg-faint);}
.sched-day.has{background:#fff;border-color:#dce4f1;}
.sched-day.has .sched-day-lbl{color:var(--reg-ink-2);}
.sched-day-empty{font-size:15px;color:#d3d9e2;margin:auto auto 6px;}
.sched-meet{position:relative;background:#eef2f9;border:1px solid #dce4f1;border-radius:7px;padding:6px 7px;}
.sched-meet-time{font-size:11.5px;font-weight:700;color:#284a7a;line-height:1.2;}
.sched-meet-room{font-size:10.5px;color:#5c73a0;margin-top:2px;display:flex;align-items:center;gap:3px;line-height:1.2;word-break:break-word;}
.sched-meet-room i{font-size:12px;flex-shrink:0;}
.sched-meet.no-room{background:var(--reg-amber-tint,#fdf3e2);border-color:#f0dcae;}
.sched-meet-assign{border:none;background:none;cursor:pointer;font-weight:700;color:var(--reg-warm,#b8860b);padding:0;font-family:inherit;}
.sched-meet-assign:hover{text-decoration:underline;}
.sched-needroom-banner{display:flex;align-items:center;gap:9px;padding:.7rem 1rem;margin-bottom:.85rem;
  background:var(--reg-amber-tint,#fdf3e2);border:1px solid #f0dcae;border-radius:8px;font-size:13px;color:var(--reg-ink-2);}
.sched-needroom-banner i{font-size:17px;color:var(--reg-warm,#b8860b);flex-shrink:0;}
.sched-time-ro{display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:10px 12px;border:1px solid var(--reg-line);
  background:var(--reg-warm,#faf7f0);font-size:14px;font-weight:600;color:var(--reg-ink);}
.sched-time-ro i{font-size:16px;color:var(--reg-faint);}
.sched-time-note{flex-basis:100%;font-size:11.5px;font-weight:400;color:var(--reg-muted);}
.sched-ro-summary{border:1px solid var(--reg-line);background:var(--reg-warm,#faf7f0);padding:10px 12px;display:flex;flex-direction:column;gap:7px;}
.sched-ro-row{display:flex;gap:10px;align-items:baseline;font-size:13px;}
.sched-ro-k{flex:0 0 68px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--reg-muted);font-weight:600;}
.sched-ro-v{color:var(--reg-ink);font-weight:600;min-width:0;}
.sched-meet-actions{position:absolute;top:4px;right:4px;display:flex;gap:2px;opacity:0;transition:opacity .12s;}
.sched-meet:hover .sched-meet-actions,.sched-meet:focus-within .sched-meet-actions{opacity:1;}
.sched-meet-btn{background:rgba(255,255,255,.9);border:1px solid #dce4f1;border-radius:4px;cursor:pointer;
  color:var(--reg-muted);width:19px;height:19px;display:grid;place-items:center;padding:0;font-size:11px;}
.sched-meet-btn:hover{color:var(--reg-ink);}
.sched-meet-btn.del:hover{color:var(--reg-red);border-color:#e6c3ba;}
:is(.sched-chip,.sched-day-btn,.sched-meet-btn):focus-visible{outline:2px solid var(--reg-gold);outline-offset:1px;}
@media(max-width:860px){ .sched-week{grid-template-columns:repeat(3,1fr);} }
@media(max-width:520px){ .sched-week{grid-template-columns:repeat(2,1fr);} }

/* View toggle (By class / By room) */
.sched-viewtoggle{display:inline-flex;border:1px solid var(--reg-line);border-radius:8px;overflow:hidden;}
.sched-viewtoggle button{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;font-size:12.5px;
  font-weight:600;background:#fff;border:none;border-left:1px solid var(--reg-line);cursor:pointer;
  color:var(--reg-muted);font-family:inherit;}
.sched-viewtoggle button:first-child{border-left:none;}
.sched-viewtoggle button.on{background:var(--reg-ink);color:#fff;}
.sched-viewtoggle button i{font-size:15px;}

/* By-room: department accordion → buildings → room chips */
.sched-figs{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--reg-line);
  background:#fff;border-radius:11px;overflow:hidden;margin-bottom:1.25rem;}
.sched-fig{padding:14px 18px;border-right:1px solid var(--reg-line-soft);display:flex;flex-direction:column;gap:2px;}
.sched-fig:last-child{border-right:none;}
.sched-fig .n{font:600 26px/1 'Inter',sans-serif;color:var(--reg-ink);font-variant-numeric:tabular-nums;letter-spacing:-.02em;}
.sched-fig .l{font-size:11.5px;color:var(--reg-muted);}
@media(max-width:620px){.sched-figs{grid-template-columns:repeat(2,1fr);}
  .sched-fig:nth-child(2){border-right:none;}
  .sched-fig:nth-child(-n+2){border-bottom:1px solid var(--reg-line-soft);}}
.sched-depts{display:flex;flex-direction:column;gap:.7rem;}
.sched-dept-card{border:1px solid var(--reg-line);border-radius:11px;background:#fff;overflow:hidden;transition:border-color .14s,box-shadow .14s;}
.sched-dept-card:hover{border-color:#d9dee7;box-shadow:0 8px 22px -16px rgba(10,22,40,.4);}
.sched-dept-btn{width:100%;display:flex;justify-content:space-between;align-items:center;gap:1rem;
  padding:.95rem 1.1rem;background:#fff;border:none;cursor:pointer;font-family:inherit;text-align:left;}
.sched-dept-btn:hover{background:#fafbfd;}
.sched-dept-l{display:flex;align-items:center;gap:13px;min-width:0;}
.sched-dept-ic{width:42px;height:42px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  background:var(--reg-gold-tint);color:var(--reg-gold);border-radius:10px;}
.sched-dept-ic i{font-size:21px;}
.sched-dept-info{display:flex;flex-direction:column;gap:3px;min-width:0;}
.sched-dept-nameline{display:flex;align-items:center;gap:9px;flex-wrap:wrap;}
.sched-dept-name{font-size:15px;font-weight:600;color:var(--reg-ink);letter-spacing:-.01em;}
.sched-dept-chip{font-size:10.5px;font-weight:700;color:var(--reg-gold);border:1px solid #e7dcc0;
  background:#fbf7ec;padding:1px 8px;border-radius:5px;}
.sched-dept-meta{font-size:12px;color:var(--reg-muted);font-variant-numeric:tabular-nums;}
.sched-dept-r{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.sched-dept-tc{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:700;
  padding:3px 9px;border-radius:999px;border:1px solid;}
.sched-dept-tc i{font-size:13px;}
.sched-dept-tc[data-type="lecture"]{background:#eef2f9;border-color:#dce4f1;color:#284a7a;}
.sched-dept-tc[data-type="laboratory"]{background:#e8f3ee;border-color:#cfe7db;color:#0a6b48;}
.sched-dept-chev{font-size:17px;color:var(--reg-faint);margin-left:2px;}
@media(max-width:560px){ .sched-dept-tc{display:none;} }
.sched-dept-body{border-top:1px solid var(--reg-line-soft);padding:.35rem 1.1rem 1rem;display:flex;flex-direction:column;}
.sched-bldrow{padding-top:.7rem;}
.sched-bldrow-name{font-size:13px;font-weight:600;color:var(--reg-ink-2);display:flex;align-items:center;gap:7px;margin-bottom:.55rem;}
.sched-bldrow-name i{font-size:15px;color:var(--reg-gold);}
.sched-roomchips{display:flex;flex-wrap:wrap;gap:.5rem;}
.sched-roomchips-empty{font-size:12px;color:var(--reg-faint);}
.sched-roomchip{display:inline-flex;align-items:center;gap:7px;border:1px solid;border-radius:8px;
  padding:6px 9px 6px 10px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:transform .1s,box-shadow .1s;}
.sched-roomchip:hover{transform:translateY(-1px);box-shadow:0 5px 12px -6px rgba(10,22,40,.35);}
.sched-roomchip i{font-size:14px;}
.sched-roomchip[data-type="lecture"]{background:#eef2f9;border-color:#dce4f1;color:#284a7a;}
.sched-roomchip[data-type="laboratory"]{background:#e8f3ee;border-color:#cfe7db;color:#0a6b48;}
.sched-roomchip-n{background:rgba(10,22,40,.13);border-radius:999px;font-size:10.5px;font-weight:700;
  min-width:17px;height:17px;display:inline-flex;align-items:center;justify-content:center;padding:0 4px;}

/* Room schedule modal — Mon–Sat week view */
.sched-roomtype-chip{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;
  padding:2px 9px;border-radius:999px;border:1px solid;margin-left:2px;vertical-align:middle;}
.sched-roomtype-chip i{font-size:12px;}
.sched-roomtype-chip[data-type="lecture"]{background:#eef2f9;border-color:#dce4f1;color:#284a7a;}
.sched-roomtype-chip[data-type="laboratory"]{background:#e8f3ee;border-color:#cfe7db;color:#0a6b48;}

.sched-room-stats{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--reg-line);
  border-radius:10px;overflow:hidden;margin-bottom:1.1rem;}
.srs{padding:.7rem .95rem;border-right:1px solid var(--reg-line-soft);display:flex;flex-direction:column;gap:2px;}
.srs:last-child{border-right:none;}
.srs .n{font:600 22px/1 'Inter',sans-serif;color:var(--reg-ink);font-variant-numeric:tabular-nums;letter-spacing:-.02em;}
.srs .n.free{color:var(--reg-green);}
.srs .l{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--reg-muted);font-weight:600;}

.sched-roomweek{display:flex;flex-direction:column;border:1px solid var(--reg-line);border-radius:10px;overflow:hidden;}
.sched-rwday{display:grid;grid-template-columns:108px 1fr;border-bottom:1px solid var(--reg-line-soft);min-height:48px;}
.sched-rwday:last-child{border-bottom:none;}
.sched-rwday-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--reg-ink-2);
  white-space:nowrap;padding:.6rem .7rem;background:var(--reg-warm);border-right:1px solid var(--reg-line-soft);
  display:flex;flex-direction:column;gap:3px;justify-content:center;}
.sched-rwday.is-free .sched-rwday-lbl{color:var(--reg-faint);}
.sched-rwday.today .sched-rwday-lbl{background:var(--reg-gold-tint);color:#8a6a12;}
.sched-rwday-today{font-size:8px;letter-spacing:.05em;font-weight:700;color:#fff;background:var(--reg-gold);
  padding:1px 5px;border-radius:3px;width:fit-content;}
.sched-rwday-body{padding:.5rem .7rem;display:flex;flex-direction:column;gap:.45rem;min-width:0;justify-content:center;}
.sched-rwday-free{font-size:12px;color:var(--reg-faint);display:inline-flex;align-items:center;gap:6px;}
.sched-rwday-free i{font-size:13px;}
.sched-rwmeet{display:flex;gap:.7rem;align-items:center;min-width:0;background:#fff;
  border:1px solid var(--reg-line-soft);border-left:3px solid var(--reg-ink-2);border-radius:7px;padding:.5rem .65rem;}
.sched-rwmeet[data-type="laboratory"]{border-left-color:#0a6b48;}
.sched-rwmeet[data-type="lecture"]{border-left-color:#284a7a;}
.sched-rwmeet-time{flex:0 0 auto;font-size:11.5px;font-weight:700;color:var(--reg-ink-2);background:var(--reg-cool-2);
  border-radius:5px;padding:4px 8px;white-space:nowrap;font-variant-numeric:tabular-nums;}
.sched-rwmeet[data-type="laboratory"] .sched-rwmeet-time{background:#e8f3ee;color:#0a6b48;}
.sched-rwmeet[data-type="lecture"] .sched-rwmeet-time{background:#eef2f9;color:#284a7a;}
.sched-rwmeet-info{min-width:0;}
.sched-rwmeet-course{font-size:13px;color:var(--reg-ink);line-height:1.3;}
.sched-rwmeet-course b{font-weight:700;}
.sched-rwmeet-fac{font-size:11.5px;color:var(--reg-muted);margin-top:2px;display:flex;align-items:center;gap:4px;}
.sched-rwmeet-fac i{font-size:12px;color:var(--reg-faint);}
@media(max-width:520px){ .sched-rwday{grid-template-columns:92px 1fr;} .sched-rwday-lbl{font-size:10px;letter-spacing:.02em;padding:.6rem .5rem;} .sched-rwmeet{flex-direction:column;align-items:flex-start;gap:.3rem;} }
:is(.sched-viewtoggle button,.sched-dept-btn,.sched-roomchip):focus-visible{outline:2px solid var(--reg-gold);outline-offset:1px;}

/* By-class: department grouping */
.sched-cgroups{display:flex;flex-direction:column;gap:1.1rem;}
.sched-cgroup{border:1px solid var(--reg-line);border-radius:12px;background:#fff;overflow:hidden;}
.sched-cgroup-btn{width:100%;display:flex;justify-content:space-between;align-items:center;gap:1rem;
  padding:.85rem 1.05rem;background:var(--reg-warm,#faf7f0);border:none;cursor:pointer;font-family:inherit;text-align:left;}
.sched-cgroup-btn:hover{background:#f3f5fa;}
.sched-cgroup-l{display:flex;align-items:center;gap:12px;min-width:0;}
.sched-cgroup-ic{width:38px;height:38px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  background:var(--reg-gold-tint);color:var(--reg-gold);border-radius:9px;}
.sched-cgroup-ic i{font-size:19px;}
.sched-cgroup-info{display:flex;flex-direction:column;gap:2px;min-width:0;}
.sched-cgroup-nameline{display:flex;align-items:center;gap:9px;flex-wrap:wrap;}
.sched-cgroup-name{font-size:14.5px;font-weight:700;color:var(--reg-ink);letter-spacing:-.01em;}
.sched-cgroup-meta{font-size:12px;color:var(--reg-muted);font-variant-numeric:tabular-nums;}
.sched-cgroup-r{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.sched-cgroup-need{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;
  padding:3px 10px;border-radius:999px;background:var(--reg-amber-tint,#fdf3e2);border:1px solid #f0dcae;color:#8a6a12;white-space:nowrap;}
.sched-cgroup-need i{font-size:13px;}
.sched-cgroup-body{border-top:1px solid var(--reg-line-soft);padding:1rem 1.05rem;background:#fcfdff;}
@media(max-width:560px){ .sched-cgroup-need{padding:3px 7px;} }
`;

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

/* Searchable single-select: type to filter by label, click to choose. */
function SearchSelect({ options, value, onChange, placeholder = 'Search…' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef(null);
  const selected = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const onDoc = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(o =>
        o.label.toLowerCase().includes(q) || (o.sublabel || '').toLowerCase().includes(q))
    : options;

  const shown = open
    ? query
    : (selected ? `${selected.label}${selected.sublabel ? ` · ${selected.sublabel}` : ''}` : '');

  return (
    <div className="sched-combo" ref={boxRef}>
      <input
        className="form-input"
        style={{ width: '100%', boxSizing: 'border-box' }}
        placeholder={placeholder}
        value={shown}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={e => { setQuery(e.target.value); if (!open) setOpen(true); }}
      />
      {open && (
        <div className="sched-combo-menu">
          {filtered.length === 0 ? (
            <div className="sched-combo-empty">No matches found</div>
          ) : filtered.map(o => (
            <button
              type="button"
              key={o.value}
              className={`sched-combo-opt${String(o.value) === String(value) ? ' is-sel' : ''}`}
              onClick={() => { onChange(String(o.value)); setOpen(false); setQuery(''); }}
            >
              <span className="sched-combo-name">{o.label}</span>
              {o.sublabel && <span className="sched-combo-dept">{o.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Pick-or-type field: shows a clear dropdown of catalog options (with a
   chevron), and still lets you type a value that isn't in the catalog yet.
   Picking an option calls onPick(option) (used to auto-fill the building). */
function ComboInput({ value, onChange, options, onPick, placeholder, menuHeader, emptyHint }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const q = (value || '').trim().toLowerCase();
  const filtered = q
    ? options.filter(o => o.value.toLowerCase().includes(q) || (o.sublabel || '').toLowerCase().includes(q))
    : options;

  return (
    <div className="sched-combo" ref={boxRef}>
      <div className="sched-combo-field">
        <input
          className="form-input"
          style={{ width: '100%', boxSizing: 'border-box', paddingRight: 30 }}
          placeholder={placeholder}
          value={value}
          onFocus={() => setOpen(true)}
          onChange={e => { onChange(e.target.value); if (!open) setOpen(true); }}
        />
        <button type="button" className="sched-combo-chev" tabIndex={-1}
          onClick={() => setOpen(o => !o)} aria-label="Show options">
          <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} />
        </button>
      </div>
      {open && (
        <div className="sched-combo-menu">
          {menuHeader && <div className="sched-combo-head">{menuHeader}</div>}
          {filtered.length === 0 ? (
            <div className="sched-combo-empty">{emptyHint || 'No matches — keep typing to enter a value.'}</div>
          ) : filtered.slice(0, 60).map((o, i) => (
            <button
              type="button"
              key={o.value + '-' + i}
              className="sched-combo-opt"
              onClick={() => { onChange(o.value); onPick?.(o); setOpen(false); }}
            >
              <span className="sched-combo-name">{o.value}</span>
              {o.sublabel && <span className="sched-combo-dept">{o.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RegistrarSchedule() {
  const confirm = useConfirm();
  const toast = useToast();
  const [terms,          setTerms]          = useState([]);
  const [selectedTerm,   setSelectedTerm]   = useState('');
  const [subjects,       setSubjects]       = useState([]);
  const [facultyList,    setFacultyList]    = useState([]);
  const [buildings,      setBuildings]      = useState([]);
  const [schedules,      setSchedules]      = useState([]);
  const [search,         setSearch]         = useState('');

  const [page,           setPage]           = useState(1);

  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');

  const [showForm,       setShowForm]       = useState(false);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [editId,         setEditId]         = useState(null);
  // When set, the modal assigns the room to EVERY slot of a class at once.
  const [assignSlots,    setAssignSlots]    = useState(null);

  const [dayFilter,       setDayFilter]       = useState('');   // '' = all days
  const [viewMode,        setViewMode]        = useState('class');  // 'class' | 'room'
  const [departments,     setDepartments]     = useState([]);
  const [programs,        setPrograms]        = useState([]);
  const [blockList,       setBlockList]       = useState([]);
  const [openDepts,       setOpenDepts]       = useState(() => new Set());
  // Class-view department sections are expanded by default; this tracks the
  // ones the user has collapsed.
  const [collapsedCDepts, setCollapsedCDepts] = useState(() => new Set());
  const [roomView,        setRoomView]        = useState(null);     // { room, building } | null

  // Load terms on mount
  useEffect(() => {
    api.get('/enrollment/terms/').then(res => {
      setTerms(res.data);
      const active = res.data.find(t => t.is_active);
      if (active) setSelectedTerm(String(active.id));
    }).catch(() => toast('Failed to load terms.', { type: 'error' }));
  }, []);

  // Subjects, faculty, and the room catalog for the pickers (loaded once)
  useEffect(() => {
    api.get('/enrollment/subjects/').then(r => setSubjects(r.data)).catch(() => {});
    api.get('/grades/registrar/faculty/').then(r => setFacultyList(r.data)).catch(() => {});
    api.get('/schedules/facilities/buildings/').then(r => setBuildings(r.data)).catch(() => {});
    api.get('/enrollment/departments/').then(r => setDepartments(r.data)).catch(() => {});
    api.get('/enrollment/programs/').then(r => setPrograms(r.data)).catch(() => {});
  }, []);

  // Load schedules when term changes
  useEffect(() => {
    if (!selectedTerm) { setSchedules([]); return; }
    setError('');
    setLoadingSchedules(true);
    api.get(`/schedules/?term_id=${selectedTerm}`)
      .then(sRes => { setSchedules(sRes.data); setPage(1); })
      .catch(() => toast('Failed to load schedules for this term.', { type: 'error' }))
      .finally(() => setLoadingSchedules(false));
    api.get(`/enrollment/blocks/?term=${selectedTerm}`).then(r => setBlockList(r.data)).catch(() => {});
  }, [selectedTerm]);

  function reloadSchedules() {
    if (!selectedTerm) return;
    api.get(`/schedules/?term_id=${selectedTerm}`).then(res => {
      setSchedules(res.data);
      setPage(1);
    });
  }

  // Pull the latest buildings + rooms so the room picker reflects anything
  // added in Rooms & Buildings since this page loaded.
  function refreshBuildings() {
    api.get('/schedules/facilities/buildings/').then(r => setBuildings(r.data)).catch(() => {});
  }

  function openCreate() {
    refreshBuildings();
    // Brand-new class has no faculty-declared time yet, so seed a sensible
    // default (the registrar no longer enters times — faculty do on declare).
    setForm({ ...EMPTY_FORM, start_time: '07:00', end_time: '08:30' });
    setEditId(null);
    setError('');
    setShowForm(true);
  }

  // Infer which department a slot belongs to (from its instructor) so the
  // modal opens already scoped to that department.
  function deptOfFaculty(facultyId) {
    const fac = facultyList.find(f => String(f.id) === String(facultyId));
    const d = fac ? departments.find(x => x.code === fac.department_code) : null;
    return d ? String(d.id) : '';
  }

  // Program / year / block for a slot: from its block if it has one, otherwise
  // derived from the subject (program + year) with the old section as the name.
  function cohortFromSlot(s) {
    if (s.block_name) {
      return {
        program_id: s.block_program != null ? String(s.block_program) : '',
        year_level: s.block_year_level != null ? String(s.block_year_level) : '',
        block_name: s.block_name,
      };
    }
    const subj = subjects.find(x => String(x.id) === String(s.subject_id));
    return {
      program_id: subj && subj.program != null ? String(subj.program) : '',
      year_level: subj && subj.year_level != null ? String(subj.year_level) : '',
      block_name: s.section || '',
    };
  }

  function openEdit(sched) {
    refreshBuildings();
    const co = cohortFromSlot(sched);
    setForm({
      department: deptOfFaculty(sched.faculty_id),
      subject_id: sched.subject_id != null ? String(sched.subject_id) : '',
      faculty_id: sched.faculty_id ? String(sched.faculty_id) : '',
      program_id: co.program_id,
      year_level: co.year_level,
      block_name: co.block_name,
      room:       sched.room,
      building:   sched.building ?? '',
      days:       [sched.day_of_week],   // a slot is one day; editing edits that day
      start_time: sched.start_time,
      end_time:   sched.end_time,
    });
    setEditId(sched.id);
    setAssignSlots(null);
    setError('');
    setShowForm(true);
  }

  // Assign a room to the WHOLE class in one go — applies the room/building to
  // every meeting slot of this class (all its days).
  function openAssignClass(cls) {
    refreshBuildings();
    const slots = cls.slots || [];
    const s0 = slots[0] || {};
    const withRoom = slots.find(s => s.room) || s0;   // prefill from an already-roomed slot if any
    const co = cohortFromSlot(s0);
    setForm({
      department: deptOfFaculty(s0.faculty_id),
      subject_id: s0.subject_id != null ? String(s0.subject_id) : '',
      faculty_id: s0.faculty_id ? String(s0.faculty_id) : '',
      program_id: co.program_id,
      year_level: co.year_level,
      block_name: co.block_name,
      room:       withRoom.room || '',
      building:   withRoom.building || '',
      days:       [...new Set(slots.map(s => s.day_of_week))],
      start_time: s0.start_time || '',
      end_time:   s0.end_time || '',
    });
    setEditId(null);
    setAssignSlots(slots.map(s => s.id));
    setError('');
    setShowForm(true);
  }

  // Add another meeting to an existing class: prefill its subject/faculty/section
  // (and room) so the user only picks the new day(s) and time.
  function openAddMeeting(cls) {
    refreshBuildings();
    const s0 = cls.slots[0] || {};
    const co = cohortFromSlot(s0);
    setForm({
      department: deptOfFaculty(s0.faculty_id),
      subject_id: s0.subject_id != null ? String(s0.subject_id) : '',
      faculty_id: s0.faculty_id ? String(s0.faculty_id) : '',
      program_id: co.program_id,
      year_level: co.year_level,
      block_name: co.block_name,
      room:       s0.room || '',
      building:   s0.building || '',
      days:       [],
      // Inherit the faculty's meeting time from the existing class (registrar
      // doesn't enter times); fall back to a default if somehow missing.
      start_time: s0.start_time || '07:00',
      end_time:   s0.end_time || '08:30',
    });
    setEditId(null);
    setError('');
    setShowForm(true);
  }

  // Days are multi-select in both add and edit. When editing, the first
  // selected day updates this slot; any extra days are added as new meetings.
  function toggleDay(d) {
    setForm(p => {
      const has = p.days.includes(d);
      return { ...p, days: has ? p.days.filter(x => x !== d) : [...p.days, d] };
    });
  }

  async function handleDelete(id) {
    if (!await confirm({ title: 'Delete schedule slot?', message: 'This schedule slot will be permanently removed.', confirmText: 'Delete' })) return;
    setError('');
    try {
      await api.delete(`/schedules/${id}/`);
      toast('Schedule deleted.', { type: 'success' });
      reloadSchedules();
    } catch (err) {
      const st = err.response?.status;
      if (st === 404) {   // already gone — resync the view
        toast('That slot was already removed.', { type: 'success' });
        reloadSchedules();
        return;
      }
      const msg = st === 429
        ? 'Too many schedule changes too quickly — please wait a moment and try again.'
        : (err.response?.data?.error || err.response?.data?.detail || 'Failed to delete schedule.');
      toast(msg, { type: 'error' });
    }
  }

  async function handleDeleteClass(c) {
    const n = c.slots?.length ?? 0;
    if (!await confirm({
      title: 'Delete this class schedule?',
      message: `This removes all ${n} meeting${n !== 1 ? 's' : ''} for ${c.subject_code}${c.faculty_name ? ` · ${c.faculty_name}` : ''}. This cannot be undone.`,
      confirmText: 'Delete all',
    })) return;
    setError('');
    try {
      await api.delete(`/schedules/class/${c.taId}/`);
      toast('Class schedule deleted.', { type: 'success' });
      reloadSchedules();
    } catch (err) {
      const st = err.response?.status;
      if (st === 404) { toast('That class schedule was already removed.', { type: 'success' }); reloadSchedules(); return; }
      const msg = st === 429
        ? 'Too many schedule changes too quickly — please wait a moment and try again.'
        : (err.response?.data?.error || 'Failed to delete class schedule.');
      toast(msg, { type: 'error' });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Assign-whole-class mode: apply the room/building to every slot at once.
    if (assignSlots && assignSlots.length) {
      if (!form.room.trim()) { setError('Please choose or enter a room.'); return; }
      setSaving(true);
      try {
        const results = await Promise.allSettled(
          assignSlots.map(id => api.patch(`/schedules/${id}/`, { room: form.room.trim(), building: form.building.trim() }))
        );
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length) {
          const msgs = failed.map(r => {
            const d = r.reason?.response?.data;
            return d?.non_field_errors
              ? (Array.isArray(d.non_field_errors) ? d.non_field_errors.join(' ') : d.non_field_errors)
              : (d?.error || 'could not be saved.');
          });
          setError(`Some meetings couldn’t be assigned — ${[...new Set(msgs)].join(' | ')}`);
          reloadSchedules();
          return;
        }
        toast('Room assigned to all meetings of this class.', { type: 'success' });
        setShowForm(false); setAssignSlots(null); reloadSchedules();
      } catch {
        toast('Failed to assign room.', { type: 'error' });
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!form.subject_id) { setError('Please select a course.'); return; }
    if (!form.faculty_id) { setError('Please select the faculty (instructor) for this class.'); return; }
    if (!form.program_id) { setError('Please select the program.'); return; }
    if (!form.year_level) { setError('Please select the year level.'); return; }
    if (!form.block_name.trim()) { setError('Please choose or enter the block.'); return; }
    if (!form.days.length) { setError('Please select at least one meeting day.'); return; }
    if (!form.room.trim()) { setError('Please choose or enter a room.'); return; }
    // Times are not entered here any more (faculty set them on declare); they
    // are carried through from the slot / existing class / a default.

    setSaving(true);
    try {
      // Find (or create) the teaching assignment for this subject + faculty + section,
      // so choosing the instructor here assigns the class to them for the term.
      const taRes = await api.post('/grades/admin/assignments/resolve/', {
        subject_id:       Number(form.subject_id),
        faculty_id:       form.faculty_id,
        academic_term_id: Number(selectedTerm),
        program_id:       Number(form.program_id),
        year_level:       Number(form.year_level),
        block_name:       form.block_name.trim(),
      });
      const base = {
        teaching_assignment: taRes.data.id,
        room:       form.room.trim(),
        building:   form.building.trim(),
        start_time: form.start_time,
        end_time:   form.end_time,
      };

      if (editId) {
        // Update the edited slot to the first selected day...
        await api.patch(`/schedules/${editId}/`, { ...base, day_of_week: form.days[0] });
        // ...and add any extra days the user ticked as new meetings.
        const extraDays = form.days.slice(1);
        let added = 0;
        const failedMsgs = [];
        if (extraDays.length) {
          const results = await Promise.allSettled(
            extraDays.map(day => api.post('/schedules/', { ...base, day_of_week: day }))
          );
          results.forEach((r, i) => {
            if (r.status === 'fulfilled') { added += 1; return; }
            const data = r.reason?.response?.data;
            const detail = data?.non_field_errors
              ? (Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : data.non_field_errors)
              : (data?.error || 'could not be saved.');
            failedMsgs.push(`${DAY_LABELS[extraDays[i]] || extraDays[i]}: ${detail}`);
          });
        }
        if (failedMsgs.length) {
          // Partial save: don't flash a green success toast next to the error —
          // the banner spells out what saved and what still needs fixing.
          const savedNote = added
            ? `Saved the slot and added ${added} day${added > 1 ? 's' : ''}, but `
            : 'Saved the slot, but ';
          setError(`${savedNote}some added days couldn’t be saved — ${failedMsgs.join(' | ')}`);
          reloadSchedules();
          return;   // keep the modal open so the conflicts can be fixed
        }
        toast(added ? `Updated and ${added} day${added > 1 ? 's' : ''} added.` : 'Schedule updated.', { type: 'success' });
        setShowForm(false);
        setEditId(null);
        reloadSchedules();
        return;
      }

      // Add mode — create one slot per selected day; report per-day failures.
      const results = await Promise.allSettled(
        form.days.map(day => api.post('/schedules/', { ...base, day_of_week: day }))
      );
      const failed = form.days
        .map((day, i) => ({ day, r: results[i] }))
        .filter(x => x.r.status === 'rejected');
      const okCount = form.days.length - failed.length;

      if (failed.length) {
        if (okCount > 0) reloadSchedules();
        const msgs = failed.map(({ day, r }) => {
          const data = r.reason?.response?.data;
          const detail = data?.non_field_errors
            ? (Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : data.non_field_errors)
            : (data?.error || 'could not be saved.');
          return `${DAY_LABELS[day] || day}: ${detail}`;
        });
        // No green success toast on a partial save — fold the saved count into
        // the error banner so a conflict never reads as a success.
        const savedNote = okCount > 0 ? `${okCount} day${okCount > 1 ? 's' : ''} saved, but ` : '';
        setError(`${savedNote}some days could not be saved — ${msgs.join(' | ')}`);
        return;   // keep the modal open so the conflicts can be fixed
      }

      toast(`Schedule created (${okCount} day${okCount > 1 ? 's' : ''}).`, { type: 'success' });
      setShowForm(false);
      setEditId(null);
      reloadSchedules();
    } catch (err) {
      const data = err.response?.data;
      let msg;
      if (data?.non_field_errors) {
        msg = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : data.non_field_errors;
      } else if (data?.error) {
        msg = data.error;
      } else if (data && typeof data === 'object') {
        msg = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
      } else {
        msg = 'Failed to save schedule.';
      }
      setError(msg);
      toast(msg, { type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const termLabel = (() => {
    const t = terms.find(t => String(t.id) === selectedTerm);
    return t ? `${t.semester_display} ${t.year}` : '';
  })();

  // Group meeting slots into classes — one card per subject + section + instructor.
  const classesAll = (() => {
    const map = new Map();
    for (const s of schedules) {
      const key = s.teaching_assignment_id;
      if (!map.has(key)) {
        map.set(key, {
          taId: key,
          subject_code: s.subject_code, subject_name: s.subject_name,
          faculty_name: s.faculty_name, section: s.section,
          department_id: s.department_id ?? null,
          department_name: s.department_name || '',
          department_code: s.department_code || '',
          slots: [],
        });
      }
      map.get(key).slots.push(s);
    }
    const list = [...map.values()];
    list.forEach(c => c.slots.sort((a, b) =>
      (DAY_ORDER[a.day_of_week] - DAY_ORDER[b.day_of_week]) ||
      String(a.start_time).localeCompare(String(b.start_time))
    ));
    list.sort((a, b) => String(a.subject_code).localeCompare(String(b.subject_code)));
    return list;
  })();

  const q = search.trim().toLowerCase();
  const classes = classesAll.filter(c => {
    const matchesSearch = !q || (
      (c.subject_code || '').toLowerCase().includes(q) ||
      (c.subject_name || '').toLowerCase().includes(q) ||
      (c.faculty_name || '').toLowerCase().includes(q) ||
      (c.section || '').toLowerCase().includes(q) ||
      c.slots.some(s => (s.room || '').toLowerCase().includes(q))
    );
    const matchesDay = !dayFilter || c.slots.some(s => s.day_of_week === dayFilter);
    return matchesSearch && matchesDay;
  });

  // Stat row values
  const meetingCount  = schedules.length;
  const classCount    = classesAll.length;
  const uniqueFaculty = new Set(schedules.map(s => s.faculty_name)).size;
  const uniqueRooms   = new Set(schedules.map(s => s.room).filter(Boolean)).size;
  const needRoomCount = schedules.filter(s => !s.room).length;

  // Building/room pickers: catalog suggestions with free-text fallback.
  const selDept = departments.find(d => String(d.id) === String(form.department)) || null;

  // Faculty ordered so the chosen department's instructors come first.
  const facultyOptions = [...facultyList].sort((a, b) => {
    if (selDept) {
      const am = a.department_code === selDept.code ? 0 : 1;
      const bm = b.department_code === selDept.code ? 0 : 1;
      if (am !== bm) return am - bm;
    }
    return (a.full_name || '').localeCompare(b.full_name || '');
  }).map(f => ({ value: String(f.id), label: f.full_name, sublabel: f.department_code || '' }));

  // Courses for the searchable picker — label by code + name so you can type
  // either and filter instead of scrolling the whole catalog.
  const subjectOptions = subjects.map(s => ({
    value: String(s.id),
    label: `${s.code} – ${s.name}`,
    sublabel: s.year_level_display || '',
  }));

  // Buildings + rooms scoped to the chosen department (its own buildings + shared).
  const scopedBuildings = selDept
    ? buildings.filter(b => b.department === selDept.id || !b.department)
    : buildings;
  const buildingOptions = scopedBuildings.map(b => ({ value: b.name }));
  const bldQuery = (form.building || '').trim().toLowerCase();
  const selBuildings = bldQuery
    ? buildings.filter(b => (b.name || '').trim().toLowerCase() === bldQuery)
    : [];
  const selBuilding = selBuildings[0] || null;
  const roomOptions = selBuildings.length
    ? selBuildings.flatMap(b => b.rooms.map(r => ({ value: r.name, sublabel: r.room_type_display })))
    : scopedBuildings.flatMap(b => b.rooms.map(r => ({
        value: r.name,
        sublabel: `${b.name}${r.room_type_display ? ' · ' + r.room_type_display : ''}`,
        building: b.name,
      })));

  // Group the filtered classes by owning department so the registrar can scan
  // the timetable one department at a time. Each group also counts how many of
  // its meetings still need a room — the one thing that needs acting on.
  const classDeptGroups = (() => {
    const map = new Map();
    for (const c of classes) {
      const key = c.department_id != null ? String(c.department_id) : 'none';
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: c.department_name || 'Unassigned department',
          code: c.department_code || '',
          classes: [],
          needRoom: 0,
        });
      }
      const g = map.get(key);
      g.classes.push(c);
      g.needRoom += c.slots.filter(s => !s.room).length;
    }
    const list = [...map.values()];
    list.forEach(g => g.classes.sort((a, b) =>
      String(a.subject_code).localeCompare(String(b.subject_code))));
    // Named departments first (alphabetical), the catch-all group last.
    list.sort((a, b) => {
      if (a.key === 'none') return 1;
      if (b.key === 'none') return -1;
      return a.name.localeCompare(b.name);
    });
    return list;
  })();

  // Block suggestions for the chosen program + year level.
  const blockOptions = blockList
    .filter(b =>
      (!form.program_id || String(b.program) === String(form.program_id)) &&
      (!form.year_level || String(b.year_level) === String(form.year_level)))
    .map(b => ({ value: b.name }));

  // ── By-room view ──
  function meetingsForRoom(roomName, buildingName) {
    const rn = (roomName || '').toLowerCase();
    const bn = (buildingName || '').toLowerCase();
    return schedules
      .filter(s => (s.room || '').toLowerCase() === rn && (!s.building || !bn || (s.building || '').toLowerCase() === bn))
      .sort((a, b) => (DAY_ORDER[a.day_of_week] - DAY_ORDER[b.day_of_week]) ||
        String(a.start_time).localeCompare(String(b.start_time)));
  }
  const deptGroups = [
    ...departments.map(d => ({
      key: d.id, title: d.name, code: d.code,
      buildings: buildings.filter(b => b.department === d.id),
    })),
    { key: 'shared', title: 'Shared & general facilities', code: '', buildings: buildings.filter(b => !b.department) },
  ];
  const roomsIn = g => g.buildings.reduce((n, b) => n + (b.rooms ? b.rooms.length : 0), 0);
  function toggleDept(key) {
    setOpenDepts(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  function toggleClassDept(key) {
    setCollapsedCDepts(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  const roomMeetings = roomView ? meetingsForRoom(roomView.room.name, roomView.building.name) : [];

  return (
    <>
      <style>{CSS}</style>

      {/* ── Page head ── */}
      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">
            Records{termLabel ? ` · ${termLabel}` : ''}
          </div>
          <h2>Room <em>management</em></h2>
          <div className="sub">
            Assign rooms to the classes faculty have declared this term, and see which rooms are in use.
          </div>
        </div>
        <div className="actions">
          {/* Classes are created by faculty when they declare their load; the
              registrar only assigns rooms (via each meeting's Assign room / edit). */}
          {false && (
            <button className="btn-pri" onClick={openCreate}>
              <i className="ti ti-plus" /> Add schedule slot
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="toolbar">
        <span className="label">Term</span>
        <select
          value={selectedTerm}
          onChange={e => { setSelectedTerm(e.target.value); setShowForm(false); setError(''); setSearch(''); }}
          style={{ minWidth: 200 }}
        >
          <option value="">- Select term -</option>
          {terms.map(t => (
            <option key={t.id} value={t.id}>{t.semester_display} {t.year}</option>
          ))}
        </select>
        {selectedTerm && viewMode === 'class' && (
          <div className="toolbar-search" style={{ marginLeft: '.5rem' }}>
            <i className="ti ti-search" />
            <input
              placeholder="Search subject, faculty, or room…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        )}
        {selectedTerm && (
          <div className="sched-viewtoggle" style={{ marginLeft: 'auto' }}>
            <button className={viewMode === 'class' ? 'on' : ''} onClick={() => setViewMode('class')}>
              <i className="ti ti-list-details" /> By class
            </button>
            <button className={viewMode === 'room' ? 'on' : ''} onClick={() => setViewMode('room')}>
              <i className="ti ti-building" /> By room
            </button>
          </div>
        )}
      </div>

      {/* ── Day filter ── */}
      {selectedTerm && viewMode === 'class' && !loadingSchedules && schedules.length > 0 && (
        <div className="sched-dayfilter">
          <button className={`sched-chip${!dayFilter ? ' on' : ''}`} onClick={() => { setDayFilter(''); setPage(1); }}>
            All days
          </button>
          {DAY_OPTIONS.map(d => (
            <button
              key={d.value}
              className={`sched-chip${dayFilter === d.value ? ' on' : ''}`}
              onClick={() => { setDayFilter(d.value); setPage(1); }}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Summary ── */}
      {selectedTerm && viewMode === 'class' && !loadingSchedules && schedules.length > 0 && (
        <div className="sched-figs">
          <div className="sched-fig"><span className="n">{classCount}</span><span className="l">Classes</span></div>
          <div className="sched-fig"><span className="n">{meetingCount}</span><span className="l">Weekly meetings</span></div>
          <div className="sched-fig"><span className="n">{uniqueFaculty}</span><span className="l">Instructors</span></div>
          <div className="sched-fig"><span className="n">{uniqueRooms}</span><span className="l">Rooms in use</span></div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <div
          className="sched-modal-back"
          onMouseDown={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditId(null); setError(''); } }}
        >
          <div className="sched-modal" role="dialog" aria-modal="true" aria-label="Assign room">
            <div className="sched-modal-head">
              <div>
                <h4>Assign room</h4>
                <p>The course, instructor, block, day(s) and time are set by the faculty. You only assign the building and room for this class.</p>
              </div>
              <button
                type="button"
                className="sched-modal-x"
                onClick={() => { setShowForm(false); setEditId(null); setError(''); }}
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="sched-modal-body">
                {error && <div className="sched-modal-err">{error}</div>}
                <div className="sched-form-grid">
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Class <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--reg-faint)' }}>· declared by the faculty</span></label>
                    <div className="sched-ro-summary">
                      <div className="sched-ro-row">
                        <span className="sched-ro-k">Course</span>
                        <span className="sched-ro-v">{(() => { const s = subjects.find(x => String(x.id) === String(form.subject_id)); return s ? `${s.code} — ${s.name}` : '—'; })()}</span>
                      </div>
                      <div className="sched-ro-row">
                        <span className="sched-ro-k">Faculty</span>
                        <span className="sched-ro-v">{facultyList.find(f => String(f.id) === String(form.faculty_id))?.full_name || '—'}</span>
                      </div>
                      <div className="sched-ro-row">
                        <span className="sched-ro-k">Block</span>
                        <span className="sched-ro-v">{[
                          programs.find(pr => String(pr.id) === String(form.program_id))?.code,
                          YEAR_LEVELS.find(y => String(y.value) === String(form.year_level))?.label,
                          form.block_name,
                        ].filter(Boolean).join(' · ') || '—'}</span>
                      </div>
                      <div className="sched-ro-row">
                        <span className="sched-ro-k">Day(s)</span>
                        <span className="sched-ro-v">{form.days.length ? form.days.map(d => DAY_LABELS[d] || d).join(', ') : '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Building <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--reg-faint)' }}>(optional)</span></label>
                    <ComboInput
                      value={form.building}
                      onChange={v => setForm(p => ({ ...p, building: v }))}
                      options={buildingOptions}
                      placeholder="Pick a building, or type a new one"
                      menuHeader={selDept ? `Buildings in ${selDept.code || selDept.name} & shared` : 'Saved buildings'}
                      emptyHint={selDept
                        ? 'No buildings in this department yet — type a name, or add them in Rooms & Buildings.'
                        : 'No saved buildings yet — type a name, or add them in Rooms & Buildings.'}
                    />
                  </div>

                  <div>
                    <label className="form-label">Room</label>
                    <ComboInput
                      value={form.room}
                      onChange={v => setForm(p => ({ ...p, room: v }))}
                      options={roomOptions}
                      onPick={o => { if (o.building && o.building !== form.building) setForm(p => ({ ...p, building: o.building })); }}
                      placeholder={selBuilding ? `Pick a room in ${selBuilding.name}, or type one` : 'Pick a room, or type one'}
                      menuHeader={selBuilding ? `Rooms in ${selBuilding.name}` : (selDept ? 'Rooms in this department' : 'All rooms')}
                      emptyHint={selBuilding
                        ? 'No rooms in this building yet — type one here, or add rooms in Rooms & Buildings.'
                        : 'No rooms defined yet — type one, or add them in Rooms & Buildings.'}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Meeting time</label>
                    <div className="sched-time-ro">
                      <i className="ti ti-clock" />
                      {form.start_time && form.end_time
                        ? <span>{formatTime(form.start_time)} – {formatTime(form.end_time)}</span>
                        : <span>Not set yet</span>}
                      <span className="sched-time-note">Set by the faculty when they declare the class — you only assign the room.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sched-modal-foot">
                <button
                  type="button"
                  className="btn-sec"
                  onClick={() => { setShowForm(false); setEditId(null); setError(''); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-pri" disabled={saving}>
                  {saving ? 'Saving…' : 'Save room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Schedule Table ── */}
      {/* ── Room schedule modal ── */}
      {roomView && (
        <div className="sched-modal-back" onMouseDown={e => { if (e.target === e.currentTarget) setRoomView(null); }}>
          <div className="sched-modal" role="dialog" aria-modal="true" aria-label={`Schedule for ${roomView.room.name}`}>
            <div className="sched-modal-head">
              <div>
                <h4>{roomView.room.name}</h4>
                <p>
                  {roomView.building.name}{roomView.building.code ? ` · ${roomView.building.code}` : ''}
                  {' '}
                  <span className="sched-roomtype-chip" data-type={roomView.room.room_type}>
                    <i className={`ti ${roomView.room.room_type === 'laboratory' ? 'ti-flask' : 'ti-presentation'}`} />
                    {roomView.room.room_type_display || (roomView.room.room_type === 'laboratory' ? 'Laboratory' : 'Lecture room')}
                  </span>
                </p>
              </div>
              <button className="sched-modal-x" onClick={() => setRoomView(null)} aria-label="Close">
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="sched-modal-body">
              {(() => {
                const daysUsed = new Set(roomMeetings.map(s => s.day_of_week)).size;
                const todayKey = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()];
                const rtype = roomView.room.room_type;
                return (
                  <>
                    <div className="sched-room-stats">
                      <div className="srs"><span className="n">{roomMeetings.length}</span><span className="l">Weekly meetings</span></div>
                      <div className="srs"><span className="n">{daysUsed}</span><span className="l">Days in use</span></div>
                      <div className="srs"><span className="n free">{6 - daysUsed}</span><span className="l">Days free</span></div>
                    </div>
                    <div className="sched-roomweek">
                      {DAY_OPTIONS.map(d => {
                        const daySlots = roomMeetings
                          .filter(s => s.day_of_week === d.value)
                          .sort((a, b) => a.start_time.localeCompare(b.start_time));
                        const isToday = d.value === todayKey;
                        return (
                          <div className={`sched-rwday${daySlots.length ? '' : ' is-free'}${isToday ? ' today' : ''}`} key={d.value}>
                            <div className="sched-rwday-lbl">
                              {d.label}
                              {isToday && <span className="sched-rwday-today">Today</span>}
                            </div>
                            <div className="sched-rwday-body">
                              {daySlots.length === 0 ? (
                                <span className="sched-rwday-free"><i className="ti ti-circle-dashed" /> Available all day</span>
                              ) : daySlots.map(s => (
                                <div className="sched-rwmeet" data-type={rtype} key={s.id}>
                                  <span className="sched-rwmeet-time">{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                                  <div className="sched-rwmeet-info">
                                    <div className="sched-rwmeet-course">
                                      <b>{s.subject_code}</b> {s.subject_name}{s.section ? ` · Sec ${s.section}` : ''}
                                    </div>
                                    <div className="sched-rwmeet-fac"><i className="ti ti-user" /> {s.faculty_name}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {!selectedTerm ? (
        <div className="empty">
          <i className="ti ti-calendar-off" />
          <div className="t">Pick a term to begin</div>
          <div className="d">Choose an academic term above to see and manage its class timetable.</div>
        </div>
      ) : loadingSchedules ? (
        <p style={{ color: 'var(--reg-muted)' }}>Loading timetable…</p>
      ) : viewMode === 'room' ? (
        buildings.length === 0 ? (
          <div className="empty">
            <i className="ti ti-building-off" />
            <div className="t">No rooms to browse yet</div>
            <div className="d">Set up buildings and rooms in Rooms &amp; Buildings first — then you can open any room here to see its schedule.</div>
          </div>
        ) : (
          <div className="sched-depts">
            {deptGroups.filter(g => g.buildings.length > 0).map(g => {
              const open = openDepts.has(g.key);
              const allRooms = g.buildings.flatMap(b => b.rooms || []);
              const labCount = allRooms.filter(r => r.room_type === 'laboratory').length;
              const lecCount = allRooms.length - labCount;
              const scheduled = g.buildings.reduce(
                (sum, b) => sum + (b.rooms || []).reduce((s, r) => s + meetingsForRoom(r.name, b.name).length, 0), 0
              );
              return (
                <div className="sched-dept-card" key={g.key}>
                  <button className="sched-dept-btn" onClick={() => toggleDept(g.key)} aria-expanded={open}>
                    <span className="sched-dept-l">
                      <span className="sched-dept-ic"><i className="ti ti-building-community" /></span>
                      <span className="sched-dept-info">
                        <span className="sched-dept-nameline">
                          <span className="sched-dept-name">{g.title}</span>
                          {g.code && <span className="sched-dept-chip">{g.code}</span>}
                        </span>
                        <span className="sched-dept-meta">
                          {g.buildings.length} building{g.buildings.length !== 1 ? 's' : ''} · {roomsIn(g)} room{roomsIn(g) !== 1 ? 's' : ''}
                          {scheduled > 0
                            ? ` · ${scheduled} weekly meeting${scheduled !== 1 ? 's' : ''}`
                            : ' · no classes scheduled'}
                        </span>
                      </span>
                    </span>
                    <span className="sched-dept-r">
                      {lecCount > 0 && (
                        <span className="sched-dept-tc" data-type="lecture" title={`${lecCount} lecture room${lecCount !== 1 ? 's' : ''}`}>
                          <i className="ti ti-presentation" />{lecCount}
                        </span>
                      )}
                      {labCount > 0 && (
                        <span className="sched-dept-tc" data-type="laboratory" title={`${labCount} laborator${labCount !== 1 ? 'ies' : 'y'}`}>
                          <i className="ti ti-flask" />{labCount}
                        </span>
                      )}
                      <i className={`ti ti-chevron-${open ? 'up' : 'down'} sched-dept-chev`} />
                    </span>
                  </button>
                  {open && (
                    <div className="sched-dept-body">
                      {g.buildings.map(b => (
                        <div className="sched-bldrow" key={b.id}>
                          <div className="sched-bldrow-name">
                            <i className="ti ti-building" /> {b.name}{b.code ? ` · ${b.code}` : ''}
                          </div>
                          <div className="sched-roomchips">
                            {b.rooms.length === 0 ? (
                              <span className="sched-roomchips-empty">No rooms in this building.</span>
                            ) : b.rooms.map(r => {
                              const cnt = meetingsForRoom(r.name, b.name).length;
                              return (
                                <button
                                  className="sched-roomchip"
                                  data-type={r.room_type}
                                  key={r.id}
                                  onClick={() => setRoomView({ room: r, building: b })}
                                  title={`${r.name} — view schedule`}
                                >
                                  <i className={`ti ${r.room_type === 'laboratory' ? 'ti-flask' : 'ti-presentation'}`} />
                                  {r.name}
                                  {cnt > 0 && <span className="sched-roomchip-n">{cnt}</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : schedules.length === 0 ? (
        <div className="empty">
          <i className="ti ti-calendar-plus" />
          <div className="t">No classes scheduled yet</div>
          <div className="d">
            Nothing is on the timetable for {termLabel}. Classes appear here once faculty declare their teaching load with a day and time — then you assign each one a room.
          </div>
        </div>
      ) : classes.length === 0 ? (
        <div className="empty">
          <i className="ti ti-search-off" />
          <div className="t">Nothing matches</div>
          <div className="d">
            No classes match your search{dayFilter ? ` on ${DAY_LABELS[dayFilter]}` : ''}. Clear the search or day filter to see everything.
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '.85rem', color: 'var(--reg-muted)', marginBottom: '.85rem' }}>
            {classes.length} class{classes.length !== 1 ? 'es' : ''} across {classDeptGroups.length} department{classDeptGroups.length !== 1 ? 's' : ''}{dayFilter ? ` · meeting ${DAY_LABELS[dayFilter]}` : ''} · {termLabel}
          </p>

          {needRoomCount > 0 && (
            <div className="sched-needroom-banner">
              <i className="ti ti-alert-triangle" />
              <span><strong>{needRoomCount}</strong> faculty meeting{needRoomCount !== 1 ? 's' : ''} {needRoomCount !== 1 ? 'have' : 'has'} no room yet — click <strong>Assign room</strong> on a meeting to set it.</span>
            </div>
          )}
          <div className="sched-cgroups">
            {classDeptGroups.map(g => {
              const open = !collapsedCDepts.has(g.key);
              const mtgs = g.classes.reduce((n, c) => n + c.slots.length, 0);
              return (
                <section className="sched-cgroup" key={g.key}>
                  <button className="sched-cgroup-btn" onClick={() => toggleClassDept(g.key)} aria-expanded={open}>
                    <span className="sched-cgroup-l">
                      <span className="sched-cgroup-ic"><i className="ti ti-building-community" /></span>
                      <span className="sched-cgroup-info">
                        <span className="sched-cgroup-nameline">
                          <span className="sched-cgroup-name">{g.name}</span>
                          {g.code && <span className="sched-dept-chip">{g.code}</span>}
                        </span>
                        <span className="sched-cgroup-meta">
                          {g.classes.length} class{g.classes.length !== 1 ? 'es' : ''} · {mtgs} weekly meeting{mtgs !== 1 ? 's' : ''}
                        </span>
                      </span>
                    </span>
                    <span className="sched-cgroup-r">
                      {g.needRoom > 0 && (
                        <span className="sched-cgroup-need" title={`${g.needRoom} meeting${g.needRoom !== 1 ? 's' : ''} still need a room`}>
                          <i className="ti ti-alert-triangle" /> {g.needRoom} need room
                        </span>
                      )}
                      <i className={`ti ti-chevron-${open ? 'up' : 'down'} sched-dept-chev`} />
                    </span>
                  </button>
                  {open && (
                    <div className="sched-cgroup-body">
                      <div className="sched-classes">
                        {g.classes.map(c => {
              const byDay = {};
              c.slots.forEach(s => { (byDay[s.day_of_week] = byDay[s.day_of_week] || []).push(s); });
              return (
                <div className="sched-class" key={c.taId}>
                  <div className="sched-class-head">
                    <div className="sched-class-id">
                      <div className="sched-class-title">
                        <span className="sched-class-code">{c.subject_code}</span>
                        <span className="sched-class-name">{c.subject_name}</span>
                        {c.section && <span className="sched-class-sec">Sec {c.section}</span>}
                      </div>
                      <div className="sched-class-fac"><i className="ti ti-user" /> {c.faculty_name}</div>
                    </div>
                    <div className="sched-class-actions">
                      <button className="btn-pri" style={{ padding: '5px 10px', fontSize: 11 }}
                        onClick={() => openAssignClass(c)} title="Assign a room to all meetings of this class">
                        <i className="ti ti-door" /> Assign room
                      </button>
                      <button className="btn-sec sched-del-class" style={{ padding: '5px 10px', fontSize: 11 }}
                        onClick={() => handleDeleteClass(c)} title="Delete this instructor's whole class schedule">
                        <i className="ti ti-trash" /> Delete
                      </button>
                    </div>
                  </div>

                  <div className="sched-week">
                    {DAY_OPTIONS.map(d => {
                      const daySlots = byDay[d.value] || [];
                      return (
                        <div className={`sched-day${daySlots.length ? ' has' : ''}`} key={d.value}>
                          <span className="sched-day-lbl">{d.label}</span>
                          {daySlots.length === 0 ? (
                            <span className="sched-day-empty">—</span>
                          ) : daySlots.map(s => (
                            <div className={`sched-meet${s.room ? '' : ' no-room'}`} key={s.id}>
                              <div className="sched-meet-actions">
                                <button className="sched-meet-btn" title="Edit meeting" onClick={() => openEdit(s)}><i className="ti ti-pencil" /></button>
                                <button className="sched-meet-btn del" title="Delete meeting" onClick={() => handleDelete(s.id)}><i className="ti ti-x" /></button>
                              </div>
                              <div className="sched-meet-time">{formatTime(s.start_time)}<br />{formatTime(s.end_time)}</div>
                              {s.room ? (
                                <div className="sched-meet-room"><i className="ti ti-door" /> {s.room}{s.building ? ` · ${s.building}` : ''}</div>
                              ) : (
                                <button type="button" className="sched-meet-room sched-meet-assign" onClick={() => openEdit(s)} title="Assign a room">
                                  <i className="ti ti-alert-triangle" /> Assign room
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
