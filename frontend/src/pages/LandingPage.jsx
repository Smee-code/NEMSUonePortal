import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

/* ══════════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════════ */
const TYPE_HINTS = {
  freshman:   'Freshmen must submit their SHS Form 138, PSA Birth Certificate, and other admission documents.',
  regular:    'Regular students need their previous COR, student ID, and clearance from the previous semester.',
  shiftee:    "Shiftees must secure clearance from their current department and the dean's endorsement letter.",
  transferee: 'Transferees must provide their Transcript of Records (TOR) and Honorable Dismissal from their previous school.',
};
const TYPE_LABELS = { freshman: 'Freshman', regular: 'Regular', shiftee: 'Shiftee', transferee: 'Transferee' };
const TYPE_ICONS  = { freshman: 'ti-school', regular: 'ti-refresh', shiftee: 'ti-arrows-exchange', transferee: 'ti-building-community' };
const TYPE_DESCS  = { freshman: 'Incoming first-year student from SHS', regular: 'Continuing or returning student', shiftee: 'Changing program within NEMSU Cantilan', transferee: 'Coming from another institution' };

const ALL_REQUIREMENTS = {
  freshman: [
    { group: 'Basic documents', items: [
      { id: 'r1', label: 'SHS Form 138 / Report Card',              tag: 'Required'    },
      { id: 'r2', label: 'PSA Birth Certificate',                   tag: 'Required'    },
      { id: 'r3', label: 'Good Moral Certificate',                  tag: 'Required'    },
      { id: 'r4', label: 'SHS Diploma / Certificate of Completion', tag: 'Required'    },
      { id: 'r5', label: '2x2 ID photos (4 copies)',                tag: 'Required'    },
      { id: 'r6', label: 'Medical Certificate',                     tag: 'Required'    },
    ]},
    { group: 'Admission', items: [
      { id: 'r7', label: 'Entrance Exam Result / Admission Slip',   tag: 'If required' },
      { id: 'r8', label: 'Accomplished Application Form',           tag: 'Required'    },
    ]},
  ],
  regular: [{ group: 'Documents', items: [
    { id: 'r1', label: 'Previous Certificate of Registration (COR)', tag: 'Required'     },
    { id: 'r2', label: 'Student ID (current)',                        tag: 'Required'     },
    { id: 'r3', label: 'Clearance from previous semester',            tag: 'Required'     },
    { id: 'r4', label: 'Proof of payment or scholarship form',        tag: 'If applicable'},
  ]}],
  shiftee: [{ group: 'Shifting requirements', items: [
    { id: 'r1', label: 'Shifting Application Form',         tag: 'Required' },
    { id: 'r2', label: 'Clearance from current department', tag: 'Required' },
    { id: 'r3', label: "Dean's Endorsement Letter",         tag: 'Required' },
    { id: 'r4', label: 'Transcript of Records (internal)',  tag: 'Required' },
    { id: 'r5', label: 'Acceptance from target department', tag: 'Required' },
  ]}],
  transferee: [
    { group: 'Admission documents', items: [
      { id: 'r1', label: 'Transcript of Records (TOR)', tag: 'Required'    },
      { id: 'r2', label: 'Honorable Dismissal',         tag: 'Required'    },
      { id: 'r3', label: 'Good Moral Certificate',      tag: 'Required'    },
      { id: 'r4', label: 'PSA Birth Certificate',       tag: 'Required'    },
      { id: 'r5', label: '2x2 ID photos (4 copies)',    tag: 'Required'    },
      { id: 'r6', label: 'Medical Certificate',         tag: 'Required'    },
    ]},
    { group: 'Additional', items: [
      { id: 'r7', label: 'Entrance Exam Result',        tag: 'If required' },
      { id: 'r8', label: 'Application / Admission Form',tag: 'Required'    },
    ]},
  ],
};

const SUBJECTS = [
  { code: 'CC 101',   name: 'Introduction to Computing',         units: 3 },
  { code: 'CC 102',   name: 'Computer Programming 1',            units: 3 },
  { code: 'MATH 101', name: 'Mathematics in the Modern World',   units: 3 },
  { code: 'ENG 101',  name: 'Purposive Communication',           units: 3 },
  { code: 'STS 101',  name: 'Science, Technology & Society',     units: 3 },
  { code: 'NSTP 1',   name: 'National Service Training Program', units: 3 },
  { code: 'PE 1',     name: 'Physical Education 1',              units: 2 },
  { code: 'HUM 101',  name: 'Art Appreciation',                  units: 3 },
];

const WIZARD_STEPS = ['Student type', 'Personal info', 'Requirements', 'Subjects', 'Review & confirm'];

const PROGRAMS = [
  { icon: 'ti-cpu',            name: 'BS Computer Science',       desc: 'Focuses on computing principles, algorithms, software development, and emerging technologies.',           tag: 'Technology',   iBg: '#e8f1fb', iC: '#0a3a6e', tBg: '#e8f1fb', tC: '#0a3a6e' },
  { icon: 'ti-device-laptop',  name: 'BS Information Technology', desc: 'Covers information systems, networking, database management, and IT infrastructure.',                    tag: 'Technology',   iBg: '#e8f1fb', iC: '#0a3a6e', tBg: '#e8f1fb', tC: '#0a3a6e' },
  { icon: 'ti-school',         name: 'BS Education',              desc: 'Prepares future teachers in secondary and elementary education with strong pedagogical foundations.',     tag: 'Education',    iBg: '#fff8e6', iC: '#b07a00', tBg: '#fff8e6', tC: '#b07a00' },
  { icon: 'ti-building-bank',  name: 'BS Business Administration',desc: 'Develops business acumen in marketing, finance, management, and entrepreneurship.',                     tag: 'Business',     iBg: '#fbeaff', iC: '#6e0a9e', tBg: '#fbeaff', tC: '#6e0a9e' },
  { icon: 'ti-stethoscope',    name: 'BS Nursing',                desc: 'Produces competent nurses equipped with clinical skills, critical thinking, and compassionate care.',    tag: 'Health',       iBg: '#e8fbf0', iC: '#0a6e3a', tBg: '#e8fbf0', tC: '#0a6e3a' },
  { icon: 'ti-plant',          name: 'BS Agriculture',            desc: 'Trains students in modern agricultural practices, crop science, and sustainable food systems.',          tag: 'Agriculture',  iBg: '#e8f5ea', iC: '#2e7d32', tBg: '#e8f5ea', tC: '#2e7d32' },
];

const FACILITIES = [
  { icon: 'ti-books',         name: 'Library',             desc: 'Extensive collection of academic resources and digital subscriptions',           bg: 'linear-gradient(135deg,#0a1628 0%,#0a3a6e 100%)' },
  { icon: 'ti-cpu',           name: 'Computer Laboratory', desc: 'State-of-the-art computing facilities for IT and CS students',                   bg: 'linear-gradient(135deg,#0d2547,#0a5296)'          },
  { icon: 'ti-stethoscope',   name: 'Science Laboratory',  desc: 'Fully equipped labs for nursing, biology, and chemistry programs',               bg: 'linear-gradient(135deg,#162d14,#2e7d32)'          },
  { icon: 'ti-ball-football', name: 'Sports Complex',      desc: 'Basketball courts, open fields, and recreational areas for students',            bg: 'linear-gradient(135deg,#2d1647,#6e0a9e)'          },
];

const ANNOUNCEMENTS_DATA = [
  { icon: 'ti-pencil', iBg: '#e8f1fb', iC: '#0a3a6e', title: 'Online Enrollment Now Open for A.Y. 2025–2026',             body: 'All students of NEMSU Cantilan Campus — incoming freshmen, transferees, shiftees, and regular students — may now enroll online. Prepare all required documents before proceeding.',                          date: 'May 28, 2025' },
  { icon: 'ti-award',  iBg: '#fff8e6', iC: '#b07a00', title: 'Scholarship Applications Open for 1st Semester',             body: 'CHED, DOST, LGU, and institutional scholarship applications are being accepted at the OSAS office, Cantilan Campus. Deadline is June 15, 2025.',                                                          date: 'May 20, 2025' },
  { icon: 'ti-trophy', iBg: '#e8fbf0', iC: '#0a6e3a', title: 'NEMSU Cantilan Achieves AACCUP Level II Accreditation',      body: "Several programs in the Cantilan Campus have successfully achieved Level II accreditation, reflecting the campus's commitment to academic quality.",                                                        date: 'May 10, 2025' },
];

const CSS = `
  html { scroll-behavior: smooth; }
  @keyframes pulse        { 0%,100%{opacity:1}50%{opacity:.45} }
  @keyframes slideUp      { from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1} }
  @keyframes fadeIn       { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
  @keyframes slideInRight { from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)} }
  @keyframes slideInLeft  { from{opacity:0;transform:translateX(-32px)}to{opacity:1;transform:translateX(0)} }
  @keyframes lp-float1    { 0%,100%{transform:translate(0,0) scale(1)} 35%{transform:translate(14px,-20px) scale(1.1)} 70%{transform:translate(-8px,12px) scale(.92)} }
  @keyframes lp-float2    { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-16px,18px) scale(1.06)} 68%{transform:translate(10px,-14px) scale(.95)} }
  @keyframes lp-float3    { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(10px,-26px) scale(1.12)} }
  @keyframes lp-ring      { 0%{transform:scale(.85);opacity:.5} 100%{transform:scale(2.6);opacity:0} }
  @keyframes lp-shimmer   { 0%{background-position:200% center} 100%{background-position:-200% center} }
  .lp-tl:hover   { color:#fff!important }
  .lp-nl:hover   { color:#fff!important; border-bottom-color:#3b9eff!important }
  .lp-pc:hover   { border-color:#1a6ebd!important; box-shadow:0 6px 24px rgba(26,110,189,.1)!important; transform:translateY(-2px)!important }
  .lp-fc:hover   { box-shadow:0 6px 24px rgba(10,58,110,.1)!important; transform:translateY(-2px)!important }
  .lp-ac:hover   { box-shadow:0 4px 16px rgba(10,58,110,.08)!important }
  .lp-pi:hover   { border-color:#1a6ebd!important; box-shadow:0 2px 12px rgba(26,110,189,.1)!important }
  .lp-fl:hover   { color:rgba(255,255,255,.75)!important }
  .lp-bg:hover   { background:#f0f4fb!important }
  .lp-bp:hover   { background:#0a3a6e!important }
  .lp-bgo:hover  { background:#c87010!important }
  .lp-bout:hover { background:rgba(255,255,255,.1)!important }
  .lp-mc:hover   { background:rgba(255,255,255,.2)!important; color:#fff!important }

  /* ── Responsive layout system ─────────────────────────────── */
  .lp-sec       { padding:5rem 0 }
  .lp-wrap      { max-width:1200px; margin:0 auto; padding:0 2rem }
  .lp-hero-grid { display:grid; grid-template-columns:1fr 420px; gap:4rem; align-items:center; width:100%; padding:5rem 2rem 7rem }
  .lp-hero-rt   { display:flex; flex-direction:column; gap:12px }
  .lp-hero-h1   { font-size:40px; font-weight:800; color:#fff; line-height:1.2; margin-bottom:.75rem }
  .lp-stats     { display:flex; gap:2.5rem; padding-top:1.5rem; border-top:1px solid rgba(255,255,255,.1) }
  .lp-info4     { display:grid; grid-template-columns:repeat(4,1fr) }
  .lp-ab2       { display:grid; grid-template-columns:1fr 1fr; gap:5rem; align-items:center }
  .lp-vm2       { display:grid; grid-template-columns:1fr 1fr; gap:1px }
  .lp-p3        { display:grid; grid-template-columns:repeat(3,1fr); gap:14px }
  .lp-f4        { display:grid; grid-template-columns:repeat(4,1fr); gap:14px }
  .lp-a21       { display:grid; grid-template-columns:2fr 1fr; gap:24px }
  .lp-ft-grid   { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:3rem; margin-bottom:2.5rem }
  .lp-topinfo   { display:flex; gap:1.25rem }
  .lp-navlinks  { display:flex; flex:1 }
  .lp-burger    { display:none; cursor:pointer; background:rgba(255,255,255,.08); border:none; color:rgba(255,255,255,.7); border-radius:6px; padding:7px 9px; font-size:18px; align-items:center; justify-content:center; flex-shrink:0; margin-left:auto }
  .lp-mob       { display:none; flex-direction:column; position:absolute; top:68px; left:0; right:0; background:#0d2547; border-top:1px solid rgba(255,255,255,.08); z-index:98; box-shadow:0 8px 24px rgba(0,0,0,.4) }
  .lp-mob.open  { display:flex }
  .lp-mob a     { padding:14px 2rem; font-size:14px; color:rgba(255,255,255,.65); text-decoration:none; border-bottom:1px solid rgba(255,255,255,.06); transition:background .15s,color .15s }
  .lp-mob a:hover { background:rgba(255,255,255,.06); color:#fff }

  @media(max-width:1024px){
    .lp-hero-grid { grid-template-columns:1fr; padding:3.5rem 2rem 5rem }
    .lp-hero-rt   { display:none }
    .lp-ft-grid   { grid-template-columns:1fr 1fr; gap:2rem }
  }
  @media(max-width:768px){
    .lp-sec       { padding:3rem 0 }
    .lp-wrap      { padding:0 1.25rem }
    .lp-hero-grid { padding:2.5rem 1.25rem 4rem }
    .lp-hero-h1   { font-size:28px }
    .lp-stats     { gap:1.5rem }
    .lp-info4     { grid-template-columns:repeat(2,1fr) }
    .lp-ab2       { grid-template-columns:1fr; gap:2.5rem }
    .lp-vm2       { grid-template-columns:1fr }
    .lp-p3        { grid-template-columns:repeat(2,1fr) }
    .lp-f4        { grid-template-columns:repeat(2,1fr) }
    .lp-a21       { grid-template-columns:1fr }
    .lp-ft-grid   { grid-template-columns:1fr 1fr; gap:1.5rem }
    .lp-topinfo   { display:none }
    .lp-navlinks  { display:none }
    .lp-burger    { display:flex }
  }
  @media(max-width:480px){
    .lp-sec       { padding:2rem 0 }
    .lp-wrap      { padding:0 1rem }
    .lp-hero-grid { padding:2rem 1rem 3rem }
    .lp-hero-h1   { font-size:22px }
    .lp-stats     { flex-wrap:wrap; gap:1.25rem }
    .lp-info4     { grid-template-columns:1fr }
    .lp-p3        { grid-template-columns:1fr }
    .lp-f4        { grid-template-columns:1fr }
    .lp-ft-grid   { grid-template-columns:1fr }
  }
`;

/* ══════════════════════════════════════════════════════════════
   ANIMATION HOOKS
══════════════════════════════════════════════════════════════ */
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function useCountUp(end, duration = 1800) {
  const ref  = useRef(null);
  const [val, setVal]     = useState(0);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setActive(true); obs.disconnect(); }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!active) return;
    let start = null;
    const tick = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * end));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, end, duration]);
  return [ref, val];
}

/* ── Floating particles (hero background) ────────────────────── */
const PARTICLES = [
  { w: 6,  top: '13%', left: '6%',  delay: 0,   dur: 7,   op: .22, a: 1 },
  { w: 10, top: '22%', left: '90%', delay: 1.3, dur: 9,   op: .14, a: 2 },
  { w: 4,  top: '55%', left: '3%',  delay: 2,   dur: 6.5, op: .3,  a: 3 },
  { w: 8,  top: '72%', left: '83%', delay: .6,  dur: 8,   op: .18, a: 1 },
  { w: 5,  top: '38%', left: '71%', delay: 1.8, dur: 7.5, op: .24, a: 2 },
  { w: 7,  top: '84%', left: '43%', delay: 3,   dur: 9.5, op: .19, a: 3 },
  { w: 3,  top: '9%',  left: '53%', delay: 2.5, dur: 6,   op: .35, a: 1 },
  { w: 9,  top: '47%', left: '19%', delay: .9,  dur: 8.5, op: .13, a: 2 },
  { w: 4,  top: '64%', left: '62%', delay: 1.5, dur: 7,   op: .28, a: 3 },
  { w: 6,  top: '29%', left: '35%', delay: 3.5, dur: 10,  op: .15, a: 1 },
  { w: 5,  top: '18%', left: '78%', delay: 4,   dur: 8,   op: .2,  a: 2 },
  { w: 3,  top: '78%', left: '24%', delay: 1.1, dur: 7,   op: .26, a: 3 },
];
function FloatingParticles() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
      {PARTICLES.map((p, i) => (
        <div key={i} style={{ position: 'absolute', top: p.top, left: p.left, width: p.w, height: p.w, borderRadius: '50%', background: `rgba(59,158,255,${p.op})`, animation: `lp-float${p.a} ${p.dur}s ease-in-out ${p.delay}s infinite` }} />
      ))}
    </div>
  );
}

/* ── Stat counter ─────────────────────────────────────────────── */
function StatCounter({ end, suffix, label }) {
  const [ref, val] = useCountUp(end);
  return (
    <div ref={ref}>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
        {val.toLocaleString()}<sup style={{ fontSize: 15, color: '#f5c842' }}>{suffix}</sup>
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</div>
    </div>
  );
}

/* ── Reveal wrapper ───────────────────────────────────────────── */
function Reveal({ children, delay = 0, style: extra = {} }) {
  const [ref, visible] = useInView();
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(30px)', transition: `opacity .65s ${delay}s cubic-bezier(.4,0,.2,1), transform .65s ${delay}s cubic-bezier(.4,0,.2,1)`, ...extra }}>
      {children}
    </div>
  );
}

/* ── Date helpers ─────────────────────────────────────────────── */
function fmtDateRange(start, end) {
  const f = d => new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  return `${f(start)} – ${f(end)}`;
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ══════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [typePickOpen, setTypePickOpen] = useState(false);
  const [enrollOpen,   setEnrollOpen]   = useState(false);
  const [landingData,  setLandingData]  = useState(null);

  function openEnroll()    { setTypePickOpen(true);  document.body.style.overflow = 'hidden'; }
  function closeTypePick() { setTypePickOpen(false); document.body.style.overflow = '';       }
  function closeEnroll()   { setEnrollOpen(false);   document.body.style.overflow = '';       }

  function handleNewStudent() {
    setTypePickOpen(false);
    setEnrollOpen(true);
    // body overflow stays hidden for the enrollment modal
  }
  function handleReturningStudent() {
    setTypePickOpen(false);
    document.body.style.overflow = '';
    navigate('/login');
  }

  useEffect(() => () => { document.body.style.overflow = ''; }, []);
  useEffect(() => {
    const anyOpen = typePickOpen || enrollOpen;
    if (!anyOpen) return;
    const fn = e => {
      if (e.key !== 'Escape') return;
      if (enrollOpen)   closeEnroll();
      else              closeTypePick();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [typePickOpen, enrollOpen]);
  useEffect(() => {
    api.get('/enrollment/public/landing/')
      .then(res => setLandingData(res.data))
      .catch(() => {});
  }, []);

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", background: '#f4f6fb', color: '#0a1628' }}>
      <style>{CSS}</style>
      <Topbar />
      <Navbar onEnroll={openEnroll} />
      <Hero onEnroll={openEnroll} term={landingData?.term} schedules={landingData?.enrollment_schedules} />
      <InfoStrip />
      <AboutSection />
      <VisionMission />
      <ProgramsSection programs={landingData?.programs} />
      <FacilitiesSection />
      <AnnouncementsSection onEnroll={openEnroll} announcements={landingData?.announcements} schedules={landingData?.enrollment_schedules} />
      <CtaBanner onEnroll={openEnroll} />
      <SiteFooter onEnroll={openEnroll} />
      {typePickOpen && (
        <StudentTypePicker
          onClose={closeTypePick}
          onNewStudent={handleNewStudent}
          onReturningStudent={handleReturningStudent}
        />
      )}
      {enrollOpen && <EnrollmentModal onClose={closeEnroll} term={landingData?.term} programs={landingData?.programs ?? []} />}
    </div>
  );
}

/* ── Student type picker ─────────────────────────────────────── */
function StudentTypePicker({ onClose, onNewStudent, onReturningStudent }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,.55)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, padding: '2.5rem 2rem', width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(10,22,40,.25)', animation: 'slideUp .22s ease' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="NEMSU" style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid #e0e7ff', marginBottom: '0.75rem' }} />
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0a1628', margin: '0 0 .35rem' }}>Are you a new or returning student?</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Select the option that applies to you to continue.</p>
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* New student */}
          <button
            onClick={onNewStudent}
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f0f7ff', border: '2px solid #bfdbfe', borderRadius: 14, padding: '1.1rem 1.25rem', cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s,background .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#3b82f6'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f0f7ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-user-plus" style={{ fontSize: 24, color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1e3a5f' }}>New Student</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Freshman or transferee enrolling for the first time</div>
            </div>
            <i className="ti ti-chevron-right" style={{ fontSize: 18, color: '#93c5fd', marginLeft: 'auto' }} />
          </button>

          {/* Returning student */}
          <button
            onClick={onReturningStudent}
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 14, padding: '1.1rem 1.25rem', cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s,background .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#4ade80'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#bbf7d0'; }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-login" style={{ fontSize: 24, color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#14532d' }}>Returning Student</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Already have an account — log in to continue enrollment</div>
            </div>
            <i className="ti ti-chevron-right" style={{ fontSize: 18, color: '#86efac', marginLeft: 'auto' }} />
          </button>
        </div>

        {/* Dismiss */}
        <button
          onClick={onClose}
          style={{ display: 'block', width: '100%', marginTop: '1.25rem', padding: '9px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, color: '#6b7280', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Topbar ───────────────────────────────────────────────────── */
function Topbar() {
  return (
    <div style={{ background: '#0a1628', color: 'rgba(255,255,255,.5)', fontSize: 11, padding: '6px 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="lp-topinfo">
        {[
          { icon: 'ti-map-pin', text: 'Cantilan, Surigao del Sur, Philippines' },
          { icon: 'ti-phone',   text: '(086) 211-3000' },
          { icon: 'ti-mail',    text: 'cantilan@nemsu.edu.ph' },
        ].map(c => (
          <span key={c.text} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className={`ti ${c.icon}`} />{c.text}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
        <Link to="/login"           className="lp-tl" style={{ color: 'rgba(255,255,255,.5)', textDecoration: 'none', marginLeft: '.75rem', transition: 'color .15s', whiteSpace: 'nowrap' }}>Log In</Link>
        <Link to="/signup"          className="lp-tl" style={{ color: 'rgba(255,255,255,.5)', textDecoration: 'none', marginLeft: '.75rem', transition: 'color .15s', whiteSpace: 'nowrap' }}>Sign Up</Link>
      </div>
    </div>
  );
}

/* ── Navbar ───────────────────────────────────────────────────── */
function Navbar({ onEnroll }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { label: 'Home',          href: '#home'          },
    { label: 'About',         href: '#about'         },
    { label: 'Programs',      href: '#programs'      },
    { label: 'Facilities',    href: '#facilities'    },
    { label: 'Announcements', href: '#announcements' },
  ];
  function closeMenu() { setMenuOpen(false); }
  return (
    <nav style={{ background: '#0d2547', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,.08)', boxShadow: '0 2px 16px rgba(0,0,0,.3)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', height: 68, gap: '1.5rem' }}>
        <a href="#home" onClick={closeMenu} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', flexShrink: 0 }}>
          <img src="/logo.png" alt="NEMSU" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid rgba(255,255,255,.2)', objectFit: 'contain' }} />
          <div style={{ lineHeight: 1.25 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
              NEMSU{' '}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, padding: '3px 10px', borderRadius: 99, background: 'rgba(232,160,32,.15)', border: '1px solid rgba(232,160,32,.3)', color: '#f5c842', fontWeight: 600, letterSpacing: '.04em', marginLeft: '.5rem' }}>
                <i className="ti ti-map-pin" style={{ fontSize: 9 }} /> Cantilan Campus
              </span>
            </p>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', letterSpacing: '.03em' }}>North Eastern Mindanao State University</span>
          </div>
        </a>

        <div className="lp-navlinks">
          {links.map(l => (
            <a key={l.label} href={l.href} className="lp-nl" style={{ padding: '0 14px', height: 68, display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.5)', textDecoration: 'none', borderBottom: '2px solid transparent', transition: 'all .15s' }}>
              {l.label}
            </a>
          ))}
        </div>

        <button className="lp-bp" onClick={onEnroll} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid #1a6ebd', background: '#1a6ebd', color: '#fff', transition: 'all .15s', marginLeft: 'auto', flexShrink: 0 }}>
          <i className="ti ti-pencil" /> Enroll now
        </button>

        <button className="lp-burger" onClick={() => setMenuOpen(p => !p)} aria-label="Toggle menu">
          <i className={menuOpen ? 'ti ti-x' : 'ti ti-menu-2'} />
        </button>
      </div>

      <div className={`lp-mob${menuOpen ? ' open' : ''}`}>
        {links.map(l => (
          <a key={l.label} href={l.href} onClick={closeMenu}>{l.label}</a>
        ))}
        <div style={{ padding: '12px 2rem', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <button className="lp-bp" onClick={() => { onEnroll(); closeMenu(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid #1a6ebd', background: '#1a6ebd', color: '#fff' }}>
            <i className="ti ti-pencil" /> Enroll now
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero ─────────────────────────────────────────────────────── */
function Hero({ onEnroll, term, schedules }) {
  // undefined = data not yet loaded; true/false = real API value
  const isEnrollOpen = term != null ? term.enrollment_open : undefined;
  const SCHED = schedules?.length
    ? schedules.map(s => ({ type: s.student_type_display, dates: fmtDateRange(s.start_date, s.end_date) }))
    : [
        { type: 'Freshmen',         dates: 'June 2 – 5, 2025'   },
        { type: 'Transferees',      dates: 'June 6 – 8, 2025'   },
        { type: 'Shiftees',         dates: 'June 9 – 11, 2025'  },
        { type: 'Regular students', dates: 'June 12 – 20, 2025' },
      ];
  const INFO = [
    { label: 'Campus',            value: 'Cantilan, Surigao del Sur',                                              special: false },
    { label: 'Academic year',     value: term ? `${term.year}, ${term.semester_display}` : '2025–2026, 1st Sem',   special: false },
    { label: 'Office hours',      value: '8AM – 5PM, Mon–Fri',                                                     special: false },
    { label: 'Enrollment status', value: isEnrollOpen == null ? '—' : isEnrollOpen ? 'Open' : 'Closed',            special: true  },
  ];
  return (
    <section id="home" style={{ position: 'relative', background: '#0a1628', overflow: 'hidden', minHeight: 580, display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#050e1c 0%,#0a1f42 35%,#0a3264 65%,#084a8a 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: .05, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(255,255,255,.8) 59px,rgba(255,255,255,.8) 60px),repeating-linear-gradient(90deg,transparent,transparent 59px,rgba(255,255,255,.8) 59px,rgba(255,255,255,.8) 60px)' }} />
      <div style={{ position: 'absolute', right: -80, top: -80, width: 500, height: 500, background: 'radial-gradient(circle,rgba(59,158,255,.18) 0%,transparent 70%)' }} />
      <div style={{ position: 'absolute', left: -60, bottom: -60, width: 380, height: 380, background: 'radial-gradient(circle,rgba(26,110,189,.14) 0%,transparent 70%)' }} />
      {/* Pulsing rings */}
      <div style={{ position: 'absolute', right: '16%', top: '18%', width: 180, height: 180, borderRadius: '50%', border: '1.5px solid rgba(59,158,255,.2)', animation: 'lp-ring 4.5s ease-out infinite', zIndex: 1 }} />
      <div style={{ position: 'absolute', right: '16%', top: '18%', width: 180, height: 180, borderRadius: '50%', border: '1.5px solid rgba(59,158,255,.15)', animation: 'lp-ring 4.5s ease-out 2.25s infinite', zIndex: 1 }} />
      <div style={{ position: 'absolute', left: '8%',  bottom: '20%', width: 120, height: 120, borderRadius: '50%', border: '1px solid rgba(232,160,32,.15)', animation: 'lp-ring 5s ease-out 1s infinite', zIndex: 1 }} />
      <FloatingParticles />

      <div className="lp-hero-grid" style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto' }}>
        {/* Left */}
        <div>
          {isEnrollOpen != null && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, letterSpacing: '.1em', color: '#f5c842', textTransform: 'uppercase', marginBottom: '1.25rem', background: 'rgba(232,160,32,.1)', padding: '5px 14px', borderRadius: 99, border: '1px solid rgba(232,160,32,.25)', fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isEnrollOpen ? '#4ade80' : '#f87171', display: 'inline-block', boxShadow: `0 0 6px ${isEnrollOpen ? '#4ade80' : '#f87171'}`, animation: 'pulse 2s infinite' }} />
              {isEnrollOpen ? 'Enrollment now open' : 'Enrollment closed'} — A.Y. {term.year}
            </div>
          )}
          <h1 className="lp-hero-h1">
            North Eastern Mindanao<br />State University
            <span style={{ color: '#f5c842', display: 'block', fontSize: 28, fontWeight: 600, marginTop: 4 }}>
              <i className="ti ti-map-pin" style={{ fontSize: 22, verticalAlign: -3, marginRight: 6 }} />Cantilan Campus
            </span>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: '1rem', letterSpacing: '.02em' }}>Cantilan, Surigao del Sur, Philippines</p>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.65)', lineHeight: 1.75, marginBottom: '2rem', maxWidth: 500 }}>
            Committed to delivering quality higher education, cutting-edge research, and meaningful community service to the people of northeastern Mindanao.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: '2.25rem' }}>
            <button className="lp-bgo" onClick={onEnroll} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: '1px solid #e8a020', background: '#e8a020', color: '#fff', transition: 'all .15s' }}>
              <i className="ti ti-pencil" /> Start enrollment
            </button>
            <a href="#announcements" className="lp-bout" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: 'rgba(255,255,255,.85)', textDecoration: 'none', transition: 'all .15s' }}>
              <i className="ti ti-bell" /> Announcements
            </a>
          </div>
          <div className="lp-stats">
            <StatCounter end={5000} suffix="+" label="Students enrolled" />
            <StatCounter end={20}   suffix="+" label="Programs offered"  />
            <StatCounter end={50}   suffix="+" label="Years of service"  />
          </div>
        </div>

        {/* Right cards */}
        <div className="lp-hero-rt">
          <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, padding: '18px 20px', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-calendar-event" /> Enrollment schedule
            </div>
            {SCHED.map((r, i) => (
              <div key={r.type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '7px 0', borderBottom: i < SCHED.length - 1 ? '1px solid rgba(255,255,255,.07)' : 'none' }}>
                <span style={{ color: 'rgba(255,255,255,.55)' }}>{r.type}</span>
                <span style={{ color: '#fff', fontWeight: 500 }}>{r.dates}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, padding: '18px 20px', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-info-circle" /> Quick info
            </div>
            {INFO.map((r, i) => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '7px 0', borderBottom: i < INFO.length - 1 ? '1px solid rgba(255,255,255,.07)' : 'none' }}>
                <span style={{ color: 'rgba(255,255,255,.55)' }}>{r.label}</span>
                {r.special
                  ? isEnrollOpen == null
                    ? <span style={{ color: 'rgba(255,255,255,.4)', fontWeight: 500 }}>—</span>
                    : <span style={{ color: isEnrollOpen ? '#4ade80' : '#f87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: isEnrollOpen ? '#4ade80' : '#f87171', display: 'inline-block', boxShadow: `0 0 6px ${isEnrollOpen ? '#4ade80' : '#f87171'}`, ...(isEnrollOpen ? { animation: 'pulse 2s infinite' } : {}) }} />
                        {r.value}
                      </span>
                  : <span style={{ color: '#fff', fontWeight: 500 }}>{r.value}</span>
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: -2, left: 0, right: 0, display: 'block', width: '100%', height: 60, zIndex: 3 }}>
        <path d="M0,60 Q720,0 1440,60 L1440,60 L0,60 Z" fill="#f4f6fb" />
      </svg>
    </section>
  );
}

/* ── Info strip ───────────────────────────────────────────────── */
function InfoStrip() {
  const cells = [
    { icon: 'ti-calendar-event', title: 'Enrollment period',  text: 'June 2 – June 20, 2025'         },
    { icon: 'ti-building',       title: 'Registrar office',   text: 'Mon – Fri, 8:00 AM – 5:00 PM'   },
    { icon: 'ti-map-pin',        title: 'Campus location',    text: 'Cantilan, Surigao del Sur'        },
    { icon: 'ti-mail',           title: 'Contact',            text: 'cantilan@nemsu.edu.ph'            },
  ];
  return (
    <div className="lp-info4" style={{ background: '#fff', borderBottom: '1px solid #dde6f0' }}>
      {cells.map((c, i) => (
        <div key={c.title} style={{ padding: '14px 18px', borderRight: i < cells.length - 1 ? '1px solid #dde6f0' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className={`ti ${c.icon}`} style={{ fontSize: 20, color: '#1a6ebd', flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: 12, color: '#0a1628', display: 'block' }}>{c.title}</strong>
            <p style={{ fontSize: 11, color: '#5a7a9a', marginTop: 1, margin: 0 }}>{c.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── About ────────────────────────────────────────────────────── */
function AboutSection() {
  const pillars = [
    { icon: 'ti-book',              title: 'Instruction', desc: 'Quality academic delivery' },
    { icon: 'ti-microscope',        title: 'Research',    desc: 'Innovation & discovery'    },
    { icon: 'ti-heart-handshake',   title: 'Extension',   desc: 'Community engagement'      },
    { icon: 'ti-building-factory',  title: 'Production',  desc: 'Sustainable enterprise'    },
  ];
  return (
    <section id="about" className="lp-sec" style={{ background: '#fff' }}>
      <div className="lp-wrap">
        <div className="lp-ab2">
          <Reveal delay={0}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 280, height: 280, borderRadius: '50%', background: 'linear-gradient(135deg,#e8f1fb,#c4dcf5)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #1a6ebd', padding: 18, margin: '0 auto' }}>
                <img src="/logo.png" alt="NEMSU Cantilan" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'contain' }} />
              </div>
              <div style={{ position: 'absolute', top: -16, right: 20, background: '#e8a020', color: '#fff', fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 99 }}>Est. NEMSU Cantilan</div>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#1a6ebd', marginBottom: '.75rem' }}>About the campus</div>
              <h2 style={{ fontSize: 30, fontWeight: 700, color: '#0a1628', lineHeight: 1.3, marginBottom: '.75rem' }}>NEMSU <span style={{ color: '#1a6ebd' }}>Cantilan Campus</span></h2>
              <p style={{ fontSize: 14, color: '#5a7a9a', lineHeight: 1.75, maxWidth: 600, margin: 0 }}>The NEMSU Cantilan Campus is one of the key campuses of North Eastern Mindanao State University, located in the municipality of Cantilan in the province of Surigao del Sur. It serves students from Cantilan and surrounding municipalities, providing accessible and quality higher education to the community.</p>
              <p style={{ fontSize: 14, color: '#5a7a9a', lineHeight: 1.75, maxWidth: 600, marginTop: '1rem' }}>The campus offers a wide range of undergraduate programs in technology, education, business, health sciences, and the arts — all aligned with NEMSU's vision of producing globally competitive and morally upright graduates.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: '1.75rem' }}>
                {pillars.map(p => (
                  <div key={p.title} className="lp-pi" style={{ padding: 14, border: '1px solid #dde6f0', borderRadius: 10, background: '#f4f6fb', display: 'flex', alignItems: 'flex-start', gap: 10, transition: 'border-color .15s,box-shadow .15s' }}>
                    <i className={`ti ${p.icon}`} style={{ fontSize: 20, color: '#1a6ebd', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong style={{ fontSize: 12, fontWeight: 700, color: '#0a1628', display: 'block' }}>{p.title}</strong>
                      <span style={{ fontSize: 11, color: '#5a7a9a', marginTop: 2, display: 'block' }}>{p.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── Vision & Mission ─────────────────────────────────────────── */
function VisionMission() {
  const cards = [
    { icon: 'ti-eye',  title: 'Our Vision',  text: 'A premier state university producing globally competitive and morally upright graduates who are agents of change for sustainable national development.' },
    { icon: 'ti-flag', title: 'Our Mission', text: 'To provide quality higher technological and professional education, advance research and development, and render extension and production services responsive to the needs of the community in northeastern Mindanao.' },
  ];
  return (
    <section className="lp-sec" style={{ background: '#0a1628' }}>
      <div className="lp-wrap">
        <div className="lp-vm2" style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)' }}>
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.15}>
              <div style={{ background: 'rgba(255,255,255,.04)', padding: '2.5rem', borderRight: i === 0 ? '1px solid rgba(255,255,255,.08)' : 'none', height: '100%' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(26,110,189,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <i className={`ti ${c.icon}`} style={{ fontSize: 22, color: '#3b9eff' }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: '.75rem' }}>{c.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', lineHeight: 1.8, margin: 0 }}>{c.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Programs ─────────────────────────────────────────────────── */
const DEPT_STYLE = {
  DCS:  { icon: 'ti-cpu',           iBg: '#e8f1fb', iC: '#0a3a6e', tBg: '#e8f1fb', tC: '#0a3a6e' },
  DIT:  { icon: 'ti-tool',          iBg: '#fff3e6', iC: '#c87010', tBg: '#fff3e6', tC: '#c87010' },
  DBM:  { icon: 'ti-building-bank', iBg: '#fbeaff', iC: '#6e0a9e', tBg: '#fbeaff', tC: '#6e0a9e' },
  DGTT: { icon: 'ti-school',        iBg: '#e8fbf0', iC: '#0a6e3a', tBg: '#e8fbf0', tC: '#0a6e3a' },
  CCJE: { icon: 'ti-shield-check',  iBg: '#ffebeb', iC: '#8e1010', tBg: '#ffebeb', tC: '#8e1010' },
};
const DEPT_STYLE_DEFAULT = { icon: 'ti-certificate', iBg: '#f0f4fb', iC: '#3a5a8a', tBg: '#f0f4fb', tC: '#3a5a8a' };

function ProgramsSection({ programs }) {
  const loading = programs === undefined;
  const items   = programs ?? [];

  return (
    <section id="programs" className="lp-sec" style={{ background: '#f4f6fb' }}>
      <div className="lp-wrap">
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#1a6ebd', marginBottom: '.75rem' }}>Academic programs</div>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: '#0a1628', lineHeight: 1.3, marginBottom: '.75rem' }}>Programs offered at <span style={{ color: '#1a6ebd' }}>Cantilan Campus</span></h2>
            <p style={{ fontSize: 14, color: '#5a7a9a', lineHeight: 1.75, maxWidth: 600, margin: '0 auto' }}>Choose from a range of undergraduate programs designed to prepare you for a successful career.</p>
          </div>
        </Reveal>

        {loading ? (
          <div className="lp-p3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ border: '1px solid #dde6f0', borderRadius: 12, padding: 20, background: '#fff', minHeight: 140 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eef2f8', marginBottom: 12 }} />
                <div style={{ height: 11, width: '60%', background: '#eef2f8', borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 9,  width: '90%', background: '#eef2f8', borderRadius: 4, marginBottom: 4 }} />
                <div style={{ height: 9,  width: '70%', background: '#eef2f8', borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="lp-p3">
            {items.map((p, i) => {
              const s = DEPT_STYLE[p.department_code] ?? DEPT_STYLE_DEFAULT;
              return (
                <Reveal key={p.id} delay={i * 0.05}>
                  <div className="lp-pc" style={{ border: '1px solid #dde6f0', borderRadius: 12, padding: 20, background: '#fff', transition: 'border-color .2s,box-shadow .2s,transform .2s', height: '100%' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: s.iBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <i className={`ti ${s.icon}`} style={{ fontSize: 20, color: s.iC }} />
                    </div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0a1628', marginBottom: 5 }}>{p.name}</h4>
                    <p style={{ fontSize: 11, color: '#5a7a9a', lineHeight: 1.65, margin: 0 }}>
                      {p.description || `Offered by the ${p.department_name} at NEMSU Cantilan Campus.`}
                    </p>
                    <span style={{ display: 'inline-block', fontSize: 10, padding: '2px 9px', borderRadius: 99, marginTop: 10, fontWeight: 600, background: s.tBg, color: s.tC }}>{p.department_code}</span>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Facilities ───────────────────────────────────────────────── */
function FacilitiesSection() {
  return (
    <section id="facilities" className="lp-sec" style={{ background: '#fff' }}>
      <div className="lp-wrap">
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#1a6ebd', marginBottom: '.75rem' }}>Campus facilities</div>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: '#0a1628', lineHeight: 1.3, marginBottom: '.75rem' }}>Built for <span style={{ color: '#1a6ebd' }}>student success</span></h2>
            <p style={{ fontSize: 14, color: '#5a7a9a', lineHeight: 1.75, maxWidth: 600, margin: '0 auto' }}>The Cantilan Campus provides modern facilities to support academic, research, and extracurricular activities.</p>
          </div>
        </Reveal>
        <div className="lp-f4">
          {FACILITIES.map((f, i) => (
            <Reveal key={f.name} delay={i * 0.1}>
              <div className="lp-fc" style={{ border: '1px solid #dde6f0', borderRadius: 12, overflow: 'hidden', background: '#f4f6fb', textAlign: 'center', transition: 'box-shadow .2s,transform .2s' }}>
                <div style={{ height: 100, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`ti ${f.icon}`} style={{ fontSize: 36, color: 'rgba(255,255,255,.35)' }} />
                </div>
                <div style={{ padding: 14 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: '#0a1628', marginBottom: 4 }}>{f.name}</h4>
                  <p style={{ fontSize: 11, color: '#5a7a9a', margin: 0 }}>{f.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const ANN_ICON_PRESETS = [
  { icon: 'ti-bell',   iBg: '#e8f1fb', iC: '#0a3a6e' },
  { icon: 'ti-award',  iBg: '#fff8e6', iC: '#b07a00' },
  { icon: 'ti-trophy', iBg: '#e8fbf0', iC: '#0a6e3a' },
];

/* ── Announcements ────────────────────────────────────────────── */
function AnnouncementsSection({ onEnroll, announcements, schedules }) {
  const annList = announcements?.length
    ? announcements.map((a, i) => ({
        ...ANN_ICON_PRESETS[i % ANN_ICON_PRESETS.length],
        title: a.title,
        body:  a.body,
        date:  fmtDate(a.created_at),
      }))
    : ANNOUNCEMENTS_DATA;

  const SCHED_FALLBACK = [
    { type: 'Freshmen',    dates: 'June 2 – 5'   },
    { type: 'Transferees', dates: 'June 6 – 8'   },
    { type: 'Shiftees',    dates: 'June 9 – 11'  },
    { type: 'Regular',     dates: 'June 12 – 20' },
  ];
  const schedList = schedules?.length
    ? schedules.map(s => ({ type: s.student_type_display, dates: fmtDateRange(s.start_date, s.end_date) }))
    : SCHED_FALLBACK;
  return (
    <section id="announcements" className="lp-sec" style={{ background: '#f4f6fb' }}>
      <div className="lp-wrap">
        <Reveal>
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#1a6ebd', marginBottom: '.75rem' }}>Latest updates</div>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: '#0a1628', lineHeight: 1.3 }}>Announcements & <span style={{ color: '#1a6ebd' }}>news</span></h2>
          </div>
        </Reveal>
        <div className="lp-a21">
          {/* Main */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {annList.map((a, i) => (
              <Reveal key={a.title} delay={i * 0.1}>
                <div className="lp-ac" style={{ background: '#fff', border: '1px solid #dde6f0', borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 14, transition: 'box-shadow .2s' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: a.iBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${a.icon}`} style={{ fontSize: 18, color: a.iC }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0a1628', marginBottom: 4 }}>{a.title}</h4>
                    <p style={{ fontSize: 12, color: '#5a7a9a', lineHeight: 1.65, margin: 0 }}>{a.body}</p>
                    <div style={{ fontSize: 11, color: '#1a6ebd', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="ti ti-calendar" /> {a.date}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Side */}
          <Reveal delay={0.2}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#fff', border: '1px solid #dde6f0', borderRadius: 12, padding: 18 }}>
              <div style={widgetTitle}>Contact us</div>
              {[
                { icon: 'ti-phone',   text: '(086) 211-3000',          link: false },
                { icon: 'ti-mail',    text: 'cantilan@nemsu.edu.ph',    link: true  },
                { icon: 'ti-world',   text: 'www.nemsu.edu.ph',         link: true  },
                { icon: 'ti-map-pin', text: 'Cantilan, Surigao del Sur',link: false },
                { icon: 'ti-clock',   text: 'Mon–Fri, 8:00AM – 5:00PM',link: false },
              ].map(c => (
                <div key={c.text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#5a7a9a', marginBottom: 9 }}>
                  <i className={`ti ${c.icon}`} style={{ fontSize: 16, color: '#1a6ebd', flexShrink: 0 }} />
                  {c.link ? <a href="#" style={{ color: '#1a6ebd', textDecoration: 'none' }}>{c.text}</a> : <span>{c.text}</span>}
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', border: '1px solid #dde6f0', borderRadius: 12, padding: 18 }}>
              <div style={widgetTitle}>Enrollment schedule</div>
              {schedList.map((s, i) => (
                <div key={s.type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '7px 0', borderBottom: i < schedList.length - 1 ? '1px solid #dde6f0' : 'none', alignItems: 'center' }}>
                  <span style={{ color: '#5a7a9a' }}>{s.type}</span>
                  <span style={{ fontWeight: 600, fontSize: 11, color: '#0a1628' }}>{s.dates}</span>
                </div>
              ))}
            </div>

            <button className="lp-bp" onClick={onEnroll} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid #1a6ebd', background: '#1a6ebd', color: '#fff', transition: 'all .15s', width: '100%' }}>
              <i className="ti ti-pencil" /> Enroll now
            </button>
          </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── CTA Banner ───────────────────────────────────────────────── */
function CtaBanner({ onEnroll }) {
  return (
    <div className="lp-sec" style={{ background: 'linear-gradient(135deg,#0a1628 0%,#0a3a6e 100%)' }}>
      <div className="lp-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
        <Reveal style={{ flex: 1 }}>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Ready to start your journey at NEMSU Cantilan?</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', margin: 0 }}>Enrollment for A.Y. 2025–2026 is open. Complete your application online in minutes.</p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <button className="lp-bgo" onClick={onEnroll} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: '1px solid #e8a020', background: '#e8a020', color: '#fff', transition: 'all .15s', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <i className="ti ti-pencil" /> Begin enrollment
          </button>
        </Reveal>
      </div>
    </div>
  );
}

/* ── Footer ───────────────────────────────────────────────────── */
function SiteFooter({ onEnroll }) {
  return (
    <footer style={{ background: '#0a1628', padding: '3rem 0 1.5rem', borderTop: '1px solid rgba(255,255,255,.08)' }}>
      <div className="lp-wrap">
        <div className="lp-ft-grid">
          <div>
            <img src="/logo.png" alt="NEMSU" style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid rgba(255,255,255,.15)', marginBottom: 12, objectFit: 'contain' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.75)', display: 'block' }}>North Eastern Mindanao State University</span>
            <span style={{ fontSize: 11, color: '#f5c842', display: 'block', marginBottom: 8 }}>Cantilan Campus</span>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', lineHeight: 1.7, margin: 0 }}>Cantilan, Surigao del Sur, Philippines. Committed to quality education, research, and community service for the people of northeastern Mindanao.</p>
          </div>
          <FooterCol title="Quick links" links={[
            { label: 'About the campus',  href: '#about'         },
            { label: 'Programs offered',  href: '#programs'      },
            { label: 'Campus facilities', href: '#facilities'    },
            { label: 'Announcements',     href: '#announcements' },
          ]} />
          <div>
            <h4 style={footerH4}>Student services</h4>
            <a href="#" onClick={e => { e.preventDefault(); onEnroll(); }} className="lp-fl" style={footerLink}>Online enrollment</a>
            {['Scholarship info', 'Student handbook', 'Registrar services', 'OSAS office'].map(l => (
              <a key={l} href="#" className="lp-fl" style={footerLink}>{l}</a>
            ))}
          </div>
          <FooterCol title="Contact" links={[
            { label: '(086) 211-3000',       href: '#' },
            { label: 'cantilan@nemsu.edu.ph', href: '#' },
            { label: 'www.nemsu.edu.ph',      href: '#' },
            { label: 'Facebook page',         href: '#' },
          ]} />
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'rgba(255,255,255,.25)', flexWrap: 'wrap', gap: '.5rem' }}>
          <span>&copy; 2025 NEMSU Cantilan Campus. All rights reserved.</span>
          <div>
            <a href="#" className="lp-fl" style={{ color: 'rgba(255,255,255,.35)', textDecoration: 'none', marginLeft: '1rem', transition: 'color .15s' }}>Privacy policy</a>
            <a href="#" className="lp-fl" style={{ color: 'rgba(255,255,255,.35)', textDecoration: 'none', marginLeft: '1rem', transition: 'color .15s' }}>Terms of use</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 style={footerH4}>{title}</h4>
      {links.map(l => <a key={l.label} href={l.href} className="lp-fl" style={footerLink}>{l.label}</a>)}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ENROLLMENT MODAL
══════════════════════════════════════════════════════════════ */
const YEAR_LEVEL_MAP = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4 };

function EnrollmentModal({ onClose, term, programs }) {
  const [step,             setStep]             = useState(1);
  const [dir,              setDir]              = useState('forward');
  const [studentType,      setStudentType]      = useState('freshman');
  const [checkedReqs,      setCheckedReqs]      = useState(new Set());
  const [reqFiles,         setReqFiles]         = useState({});   // { [reqId]: File }
  const [selectedSubjects, setSelectedSubjects] = useState(new Set());
  const [submitting,       setSubmitting]       = useState(false);
  const [submitError,      setSubmitError]      = useState('');
  const [referenceNumber,  setReferenceNumber]  = useState('');
  const [personalInfo,     setPersonalInfo]     = useState({
    lastName: '', firstName: '', middleName: '', suffix: 'None',
    dob: '', sex: 'Male', email: '', contact: '',
    program: '', yearLevel: '1st Year',
  });

  const defaultProgram = programs.length > 0 ? programs[0].name : 'BS Information Technology';
  const effectiveProgram = personalInfo.program || defaultProgram;

  const progress   = step <= 5 ? (step / 5) * 100 : 100;
  const totalUnits = [...selectedSubjects].reduce((s, id) => s + SUBJECTS[parseInt(id.replace('s', ''))].units, 0);
  const isPreaEnroll = studentType === 'freshman' || studentType === 'transferee';

  function goTo(n) { setDir(n > step ? 'forward' : 'back'); setStep(n); }
  function selectType(t) { setStudentType(t); setCheckedReqs(new Set()); }
  function toggleReq(id) { setCheckedReqs(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleSubject(id) { setSelectedSubjects(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function handleSubmit() {
    if (isPreaEnroll) {
      setSubmitting(true);
      setSubmitError('');
      try {
        const res = await api.post('/enrollment/public/pre-enroll/', {
          student_type:   studentType,
          first_name:     personalInfo.firstName,
          last_name:      personalInfo.lastName,
          middle_name:    personalInfo.middleName,
          suffix:         personalInfo.suffix === 'None' ? '' : personalInfo.suffix,
          email:          personalInfo.email,
          contact_number: personalInfo.contact,
          date_of_birth:  personalInfo.dob || null,
          sex:            personalInfo.sex,
          program_name:   effectiveProgram,
          year_level:     YEAR_LEVEL_MAP[personalInfo.yearLevel] ?? 1,
          term_id:        term?.id ?? null,
        });
        const pendingId = res.data.pending_id;
        // Upload any attached PDF files (fire-and-forget; don't block success screen)
        const fileEntries = Object.entries(reqFiles);
        if (pendingId && fileEntries.length > 0) {
          await Promise.allSettled(
            fileEntries.map(([reqId, file]) => {
              const fd = new FormData();
              fd.append('requirement_label', file.reqLabel);
              fd.append('file', file.fileObj);
              return api.post(`/enrollment/public/pre-enroll/${pendingId}/upload/`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
            })
          );
        }
        setReferenceNumber(res.data.reference_number);
        setStep(6);
      } catch (err) {
        const d = err.response?.data;
        setSubmitError(
          d?.email?.[0] || d?.detail || d?.non_field_errors?.[0] || 'Submission failed. Please try again.'
        );
      } finally {
        setSubmitting(false);
      }
    } else {
      setStep(6);
    }
  }

  function restart() {
    setStep(1); setStudentType('freshman'); setCheckedReqs(new Set()); setReqFiles({}); setSelectedSubjects(new Set());
    setSubmitError(''); setReferenceNumber('');
    setPersonalInfo({ lastName: '', firstName: '', middleName: '', suffix: 'None', dob: '', sex: 'Male', email: '', contact: '', program: '', yearLevel: '1st Year' });
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,14,28,.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 980, maxHeight: '92vh', borderRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUp .3s cubic-bezier(.4,0,.2,1)' }}>

        {/* Header */}
        <div style={{ background: '#0d2547', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
              <i className="ti ti-pencil" style={{ marginRight: 8, verticalAlign: -2 }} />
              Online Enrollment{term ? ` — A.Y. ${term.year}` : ''}
            </h2>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2, margin: '2px 0 0' }}>NEMSU Cantilan Campus &nbsp;|&nbsp; Cantilan, Surigao del Sur</p>
          </div>
          <button className="lp-mc" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.1)', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <aside style={{ width: 215, flexShrink: 0, background: '#f8fafd', borderRight: '1px solid #dde6f0', padding: '1.25rem 0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '.875rem 1.25rem 1rem', borderBottom: '1px solid #dde6f0', marginBottom: '.75rem' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0a1628', margin: 0 }}>Enrollment wizard</p>
              <span style={{ fontSize: 11, color: '#7a92ab' }}>Complete all 5 steps</span>
            </div>
            <nav style={{ flex: 1, padding: '0 .625rem' }}>
              {WIZARD_STEPS.map((label, i) => {
                const n = i + 1, active = n === step, done = n < step || step === 6;
                return (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', borderRadius: 8, marginBottom: 2, background: active ? '#fff' : 'transparent', boxShadow: active ? '0 1px 4px rgba(10,58,110,.08)' : 'none' }}>
                    <div style={{ width: 23, height: 23, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0, border: done || active ? 'none' : '1.5px solid #c5d4e8', color: done || active ? '#fff' : '#7a92ab', background: done ? '#1a6ebd' : active ? '#0a3a6e' : '#fff' }}>
                      {done ? <i className="ti ti-check" style={{ fontSize: 11 }} /> : n}
                    </div>
                    <span style={{ fontSize: 12, color: active ? '#0a1628' : '#7a92ab', fontWeight: active ? 600 : 400 }}>{label}</span>
                  </div>
                );
              })}
            </nav>
            <div style={{ padding: '.875rem 1.25rem', marginTop: 'auto', borderTop: '1px solid #dde6f0' }}>
              <p style={{ fontSize: 10, color: '#7a92ab', margin: 0 }}>Need help?</p>
              <a href="mailto:cantilan@nemsu.edu.ph" style={{ fontSize: 12, color: '#1a6ebd', textDecoration: 'none', display: 'block', marginTop: 2 }}>cantilan@nemsu.edu.ph</a>
            </div>
          </aside>

          {/* Main */}
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ height: 3, background: '#e8eef8', flexShrink: 0 }}>
              <div style={{ height: '100%', background: '#1a6ebd', width: `${progress}%`, transition: 'width .35s cubic-bezier(.4,0,.2,1)' }} />
            </div>

            <div key={step} style={{ flex: 1, padding: '1.75rem 2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

              {/* Step 1 */}
              {step === 1 && (
                <div style={panel(dir)}>
                  <MHead title="Select student type" sub="Choose the category that best describes your enrollment status." />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.25rem' }}>
                    {['freshman', 'transferee'].map(t => (
                      <div key={t} onClick={() => selectType(t)} style={{ border: `1.5px solid ${studentType === t ? '#1a6ebd' : '#dde6f0'}`, borderRadius: 10, padding: 16, cursor: 'pointer', background: studentType === t ? '#e8f1fb' : '#fff', boxShadow: studentType === t ? '0 0 0 3px rgba(26,110,189,.1)' : 'none', transition: 'all .15s' }}>
                        <i className={`ti ${TYPE_ICONS[t]}`} style={{ fontSize: 22, color: studentType === t ? '#0a3a6e' : '#7a92ab', marginBottom: 8, display: 'block' }} />
                        <strong style={{ fontSize: 14, fontWeight: 700, color: '#0a1628', display: 'block' }}>{TYPE_LABELS[t]}</strong>
                        <span style={{ fontSize: 11, color: '#7a92ab', marginTop: 3, display: 'block' }}>{TYPE_DESCS[t]}</span>
                      </div>
                    ))}
                  </div>
                  <div style={hintBox}><i className="ti ti-info-circle" style={{ fontSize: 16, flexShrink: 0 }} /><span>{TYPE_HINTS[studentType]}</span></div>
                  <BtnRow><Btn primary onClick={() => goTo(2)}>Continue <i className="ti ti-arrow-right" /></Btn></BtnRow>
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div style={panel(dir)}>
                  <MHead title="Personal information" sub="Enter your details as they appear on official documents." />
                  <div style={fRow}><MInput label="Last name"   placeholder="Dela Cruz"              value={personalInfo.lastName}   onChange={v => setPersonalInfo(p => ({ ...p, lastName:   v }))} /><MInput label="First name"  placeholder="Juan"                   value={personalInfo.firstName}  onChange={v => setPersonalInfo(p => ({ ...p, firstName:  v }))} /></div>
                  <div style={fRow}><MInput label="Middle name" placeholder="Santos"                 value={personalInfo.middleName} onChange={v => setPersonalInfo(p => ({ ...p, middleName: v }))} /><MSelect label="Suffix"       value={personalInfo.suffix}    onChange={v => setPersonalInfo(p => ({ ...p, suffix:     v }))} options={['None','Jr.','Sr.','II','III']} /></div>
                  <div style={fRow}><MInput label="Date of birth" type="date"                        value={personalInfo.dob}        onChange={v => setPersonalInfo(p => ({ ...p, dob:        v }))} /><MSelect label="Sex"          value={personalInfo.sex}       onChange={v => setPersonalInfo(p => ({ ...p, sex:        v }))} options={['Male','Female']} /></div>
                  <div style={{ ...fRow, gridTemplateColumns: '1fr' }}><MInput label="Email address" type="email" placeholder="juan.delacruz@email.com" value={personalInfo.email} onChange={v => setPersonalInfo(p => ({ ...p, email: v }))} /></div>
                  <div style={fRow}><MInput label="Contact number" placeholder="09XX XXX XXXX"       value={personalInfo.contact}    onChange={v => setPersonalInfo(p => ({ ...p, contact:    v }))} /><MSelect label="Program / course" value={effectiveProgram} onChange={v => setPersonalInfo(p => ({ ...p, program: v }))} options={programs.length > 0 ? programs.map(pg => pg.name) : ['BS Computer Science','BS Information Technology','BS Education','BS Business Administration','BS Nursing','BS Agriculture']} /></div>
                  <div style={fRow}>
                    <div>
                      <label style={fLabel}>Campus</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid #c8d8f0', borderRadius: 8, background: '#f0f6ff', fontSize: 13, color: '#0a3a6e', fontWeight: 500 }}>
                        <i className="ti ti-lock" style={{ fontSize: 15 }} /> NEMSU Cantilan Campus
                      </div>
                    </div>
                    {studentType === 'freshman' ? (
                      <div>
                        <label style={fLabel}>Year level</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px solid #c8d8f0', borderRadius: 8, background: '#f0f6ff', fontSize: 13, color: '#0a3a6e', fontWeight: 500 }}>
                          <i className="ti ti-lock" style={{ fontSize: 15 }} /> 1st Year
                        </div>
                      </div>
                    ) : (
                      <MSelect label="Year level" value={personalInfo.yearLevel} onChange={v => setPersonalInfo(p => ({ ...p, yearLevel: v }))} options={['1st Year','2nd Year','3rd Year','4th Year']} />
                    )}
                  </div>
                  <BtnRow><Btn onClick={() => goTo(1)}><i className="ti ti-arrow-left" /> Back</Btn><Btn primary onClick={() => goTo(3)}>Continue <i className="ti ti-arrow-right" /></Btn></BtnRow>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div style={panel(dir)}>
                  <MHead title="Requirements checklist" sub="Check each document you have ready and upload a PDF copy for online verification." />
                  {(ALL_REQUIREMENTS[studentType] || []).map(g => (
                    <div key={g.group} style={{ marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#5a7a9a', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>{g.group}</div>
                      {g.items.map(item => {
                        const chk = checkedReqs.has(item.id);
                        const attached = reqFiles[item.id];
                        return (
                          <div key={item.id} style={{ border: `1px solid ${chk ? '#90b8e8' : '#dde6f0'}`, borderRadius: 8, marginBottom: 6, background: chk ? '#e8f1fb' : '#fff', transition: 'background .1s', overflow: 'hidden' }}>
                            {/* Checkbox row */}
                            <div onClick={() => toggleReq(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer' }}>
                              <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${chk ? '#0a3a6e' : '#c5d4e8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: chk ? '#0a3a6e' : '#fff', color: '#fff' }}>
                                {chk && <i className="ti ti-check" style={{ fontSize: 11 }} />}
                              </div>
                              <span style={{ fontSize: 13, color: '#0a1628', flex: 1 }}>{item.label}</span>
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: chk ? '#c4dcf5' : '#eef3fb', color: chk ? '#0a3a6e' : '#5a7a9a', flexShrink: 0, border: `.5px solid ${chk ? '#90b8e8' : '#c8d8f0'}` }}>{item.tag}</span>
                            </div>
                            {/* File upload row */}
                            <div style={{ borderTop: `1px dashed ${chk ? '#b0cfe8' : '#e5eaf2'}`, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.6)' }}>
                              <i className="ti ti-file-type-pdf" style={{ fontSize: 15, color: attached ? '#dc2626' : '#9ca3af', flexShrink: 0 }} />
                              {attached ? (
                                <>
                                  <span style={{ fontSize: 11, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attached.fileObj.name}</span>
                                  <button
                                    onClick={e => { e.stopPropagation(); setReqFiles(p => { const n = { ...p }; delete n[item.id]; return n; }); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12, flexShrink: 0, padding: '2px 6px' }}
                                  >Remove</button>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: 11, color: '#9ca3af', flex: 1 }}>Upload PDF (optional)</span>
                                  <label style={{ fontSize: 11, color: '#1a6ebd', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
                                    Browse
                                    <input
                                      type="file"
                                      accept=".pdf,application/pdf"
                                      style={{ display: 'none' }}
                                      onClick={e => e.stopPropagation()}
                                      onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) setReqFiles(p => ({ ...p, [item.id]: { fileObj: f, reqLabel: item.label } }));
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div style={{ ...hintBox, marginTop: 4 }}><i className="ti ti-info-circle" style={{ fontSize: 15, flexShrink: 0 }} /><span style={{ fontSize: 12 }}>PDF uploads are optional but recommended for faster verification. Max 10 MB per file.</span></div>
                  <BtnRow><Btn onClick={() => goTo(2)}><i className="ti ti-arrow-left" /> Back</Btn><Btn primary onClick={() => goTo(4)}>Continue <i className="ti ti-arrow-right" /></Btn></BtnRow>
                </div>
              )}

              {/* Step 4 */}
              {step === 4 && (
                <div style={panel(dir)}>
                  <MHead title="Subject selection" sub="Select subjects for this term at NEMSU Cantilan Campus." />
                  <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                    <span style={unitPill}>Selected: <strong style={{ color: '#0a1628' }}>{totalUnits}</strong> units</span>
                    <span style={unitPill}>Maximum: <strong style={{ color: '#0a1628' }}>24</strong> units</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem' }}>
                    {SUBJECTS.map((s, i) => {
                      const id = `s${i}`, sel = selectedSubjects.has(id);
                      return (
                        <div key={id} onClick={() => toggleSubject(id)} style={{ border: `1.5px solid ${sel ? '#1a6ebd' : '#dde6f0'}`, borderRadius: 9, padding: '11px 13px', cursor: 'pointer', background: sel ? '#e8f1fb' : '#fff', transition: 'all .15s' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#0a3a6e', textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.code}</div>
                          <div style={{ fontSize: 13, color: '#0a1628', margin: '3px 0' }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: '#7a92ab' }}>{s.units} units</div>
                        </div>
                      );
                    })}
                  </div>
                  <BtnRow><Btn onClick={() => goTo(3)}><i className="ti ti-arrow-left" /> Back</Btn><Btn primary onClick={() => goTo(5)}>Continue <i className="ti ti-arrow-right" /></Btn></BtnRow>
                </div>
              )}

              {/* Step 5 */}
              {step === 5 && (
                <div style={panel(dir)}>
                  <MHead title="Review & confirm" sub="Verify your enrollment details before submitting." />
                  <RevBlock title="Student information">
                    <RRow label="Student type"  value={TYPE_LABELS[studentType]} />
                    <RRow label="Program"        value={effectiveProgram} />
                    <RRow label="Campus"         value="NEMSU Cantilan Campus" />
                    <RRow label="Academic year"  value={term ? `${term.year}, ${term.semester_display}` : '—'} />
                  </RevBlock>
                  <RevBlock title="Enrolled subjects">
                    {selectedSubjects.size === 0
                      ? <div style={{ padding: '8px 14px', fontSize: 13, color: '#7a92ab', fontStyle: 'italic' }}>No subjects selected.</div>
                      : [...selectedSubjects].map(id => { const s = SUBJECTS[parseInt(id.replace('s', ''))]; return <RRow key={id} label={`${s.code} — ${s.name}`} value={`${s.units} units`} />; })
                    }
                  </RevBlock>
                  <RevBlock title="">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '8px 14px', background: '#f0f6ff' }}>
                      <span style={{ fontWeight: 700 }}>Total units</span>
                      <span style={{ color: '#0a3a6e', fontWeight: 700 }}>{totalUnits} units</span>
                    </div>
                  </RevBlock>
                  {submitError && <p style={{ color: '#dc2626', fontSize: 12, margin: '0 0 .75rem', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6 }}>{submitError}</p>}
                  <BtnRow><Btn onClick={() => goTo(4)}><i className="ti ti-arrow-left" /> Back</Btn><Btn primary onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting…' : <><i className="ti ti-check" /> Submit enrollment</>}</Btn></BtnRow>
                </div>
              )}

              {/* Step 6 */}
              {step === 6 && isPreaEnroll && (
                <div style={{ textAlign: 'center', padding: '2.5rem', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'slideInRight .22s cubic-bezier(.4,0,.2,1)' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                    <i className="ti ti-circle-check" style={{ fontSize: 32, color: '#059669' }} />
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0a1628', marginBottom: 8 }}>Pre-enrollment submitted!</h2>
                  <p style={{ fontSize: 13, color: '#7a92ab', maxWidth: 420, lineHeight: 1.75, margin: '0 auto .75rem' }}>
                    Your application has been received. Please <strong style={{ color: '#0a3a6e' }}>submit your requirements</strong> to the Registrar's Office.
                  </p>
                  <div style={{ margin: '1rem auto', padding: '14px 24px', background: '#f0f6ff', border: '1.5px solid #90b8e8', borderRadius: 10, display: 'inline-block' }}>
                    <div style={{ fontSize: 10, color: '#7a92ab', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Reference number</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0a3a6e', letterSpacing: '.04em' }}>{referenceNumber}</div>
                  </div>
                  <p style={{ fontSize: 12, color: '#7a92ab', maxWidth: 420, lineHeight: 1.7, margin: '.5rem auto 1.5rem' }}>
                    Once the Registrar approves your application, you will receive an email with a link to create your student account.
                  </p>
                  <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', background: '#0a3a6e', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                    <i className="ti ti-check" /> Done
                  </button>
                  <button onClick={restart} style={{ marginTop: '1rem', fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    ← Submit another application
                  </button>
                </div>
              )}

              {step === 6 && !isPreaEnroll && (
                <div style={{ textAlign: 'center', padding: '2.5rem', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'slideInRight .22s cubic-bezier(.4,0,.2,1)' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e8f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                    <i className="ti ti-user-check" style={{ fontSize: 30, color: '#0a3a6e' }} />
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0a1628', marginBottom: 8 }}>Almost there!</h2>
                  <p style={{ fontSize: 13, color: '#7a92ab', maxWidth: 400, lineHeight: 1.75, margin: '0 auto 1.75rem' }}>
                    To submit your enrollment request, you need to <strong style={{ color: '#0a3a6e' }}>log in to your student account</strong> in the portal. If you don't have an account yet, sign up first — it only takes a minute.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/login" onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', background: '#0a3a6e', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      <i className="ti ti-login" /> Log in to my account
                    </Link>
                    <Link to="/signup" onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', background: '#fff', color: '#0a3a6e', border: '1.5px solid #90b8e8', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      <i className="ti ti-user-plus" /> Create an account
                    </Link>
                  </div>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: '1.5rem', lineHeight: 1.6 }}>
                    After logging in, go to <strong>Enrollment</strong> in your student dashboard to complete and submit your request.
                  </p>
                  <button onClick={restart} style={{ marginTop: '1rem', fontSize: 11, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    ← Start over
                  </button>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ── Micro-components ─────────────────────────────────────────── */
function MHead({ title, sub }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0a1628', margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 13, color: '#7a92ab', marginTop: 3, marginBottom: 0 }}>{sub}</p>
    </div>
  );
}
function MInput({ label, type = 'text', placeholder, value, onChange }) {
  return (
    <div>
      <label style={fLabel}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={fInput} />
    </div>
  );
}
function MSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label style={fLabel}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={fInput}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
function RevBlock({ title, children }) {
  return (
    <div style={{ border: '1px solid #dde6f0', borderRadius: 10, overflow: 'hidden', marginBottom: '1rem' }}>
      {title && <div style={{ padding: '9px 14px', background: '#f4f8ff', borderBottom: '1px solid #dde6f0', fontSize: 11, fontWeight: 700, color: '#5a7a9a', textTransform: 'uppercase', letterSpacing: '.06em' }}>{title}</div>}
      {children}
    </div>
  );
}
function RRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '8px 14px', borderBottom: '.5px solid #dde6f0' }}>
      <span style={{ color: '#7a92ab' }}>{label}</span>
      <span style={{ color: '#0a1628', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
function BtnRow({ children }) {
  return <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #eef3fb' }}>{children}</div>;
}
function Btn({ primary, children, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: primary ? '1px solid #1a6ebd' : '1px solid #dde6f0', background: primary ? '#1a6ebd' : '#fff', color: primary ? '#fff' : '#0a1628' }}>
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   SHARED STYLE TOKENS
══════════════════════════════════════════════════════════════ */
const panel = (dir) => ({ display: 'flex', flexDirection: 'column', flex: 1, animation: `${dir === 'back' ? 'slideInLeft' : 'slideInRight'} .22s cubic-bezier(.4,0,.2,1)` });
const fRow      = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 };
const fLabel    = { fontSize: 11, fontWeight: 700, color: '#5a7a9a', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' };
const fInput    = { width: '100%', padding: '9px 12px', border: '1px solid #d0dcea', borderRadius: 8, fontSize: 13, background: '#fff', color: '#0a1628', outline: 'none', boxSizing: 'border-box' };
const hintBox   = { padding: '12px 14px', border: '1px solid #c8d8f0', borderRadius: 8, background: '#f0f6ff', fontSize: 12, color: '#2a4a6e', display: 'flex', gap: 8, alignItems: 'flex-start' };
const unitPill  = { fontSize: 12, padding: '4px 12px', borderRadius: 99, background: '#eef3fb', border: '.5px solid #c8d8f0', color: '#5a7a9a' };
const widgetTitle = { fontSize: 11, fontWeight: 700, color: '#0a1628', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #dde6f0' };
const footerH4  = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14, marginTop: 0 };
const footerLink = { display: 'block', fontSize: 12, color: 'rgba(255,255,255,.35)', textDecoration: 'none', marginBottom: 8, transition: 'color .15s' };
