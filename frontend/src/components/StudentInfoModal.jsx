import { useEffect, useState } from 'react';
import api from '../api/axios';

/*
  Read-only full profile for one student, for the registrar / admin. Shows
  identity + academic info plus the extended personal details the student
  entered during admission (address, education, parents, …).
*/
export default function StudentInfoModal({ studentId, onClose }) {
  const [data, setData]   = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/auth/registrar/students/${studentId}/info/`)
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load the student’s information.'));
  }, [studentId]);

  const s = data?.student;
  const d = s?.details || {};
  const addr = d.address || {};
  const edu = d.education || {};
  const par = d.parents || {};
  const sp = d.spouse || null;
  const sch = o => (o && o.school ? `${o.school}${o.year_graduated ? ` (${o.year_graduated})` : ''}` : null);
  const YL = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

  return (
    <div className="sim-overlay" onMouseDown={onClose}>
      <style>{CSS}</style>
      <div className="sim-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="sim-head">
          <div>
            <h3>{s ? s.full_name : 'Student information'}</h3>
            {s && <div className="sim-sub">{s.student_id} · {s.institutional_email}</div>}
          </div>
          <button className="sim-x" onClick={onClose} aria-label="Close"><i className="ti ti-x" aria-hidden="true" /></button>
        </div>

        <div className="sim-body">
          {error && <div className="sim-err">{error}</div>}
          {!data ? <p style={{ color: '#6b7280', fontSize: 13 }}>Loading…</p> : (
            <>
              <Sec t="Academic">
                <Row k="Program" v={s.program_name ? `${s.program_name}${s.program_code ? ` (${s.program_code})` : ''}` : null} />
                <Row k="Year level" v={s.year_level_display} />
                <Row k="Department" v={s.department_name} />
                <Row k="Curriculum" v={s.curriculum_code} />
                <Row k="Status" v={s.is_active ? 'Active' : 'Inactive'} />
              </Sec>
              <Sec t="Personal">
                <Row k="Contact" v={s.contact_number} />
                <Row k="Date of birth" v={s.date_of_birth} />
                <Row k="Birthplace" v={d.birthplace} />
                <Row k="Sex" v={d.sex} />
                <Row k="Civil status" v={d.civil_status} />
                <Row k="Citizenship" v={d.citizenship} />
                <Row k="Religion" v={d.religion} />
                <Row k="Ethnicity" v={d.ethnicity} />
              </Sec>
              {(addr.brgy || addr.town || addr.province) && (
                <Sec t="Address"><Row k="Current address" v={[addr.brgy, addr.town, addr.province, addr.zip].filter(Boolean).join(', ')} /></Sec>
              )}
              {sp && (sp.name || sp.address) && (
                <Sec t="Spouse"><Row k="Name" v={sp.name} /><Row k="Address" v={sp.address} /></Sec>
              )}
              {(par.father || par.mother || par.address) && (
                <Sec t="Parent / Guardian"><Row k="Father" v={par.father} /><Row k="Mother" v={par.mother} /><Row k="Address" v={par.address} /></Sec>
              )}
              {(edu.elementary || edu.junior_high || edu.senior_high) && (
                <Sec t="Education">
                  <Row k="Elementary" v={sch(edu.elementary)} />
                  <Row k="Junior High" v={sch(edu.junior_high)} />
                  <Row k="Senior High" v={sch(edu.senior_high)} />
                  {edu.last_attended && <Row k="Last attended" v={sch(edu.last_attended)} />}
                </Sec>
              )}
              {data.admission && (
                <Sec t="Admission application">
                  <Row k="Type" v={data.admission.student_type_display} />
                  <Row k="Reference" v={data.admission.reference_number} />
                  <Row k="Status" v={data.admission.status_display} />
                </Sec>
              )}
              {Object.keys(d).length === 0 && (
                <p style={{ fontSize: 12.5, color: '#6b7280', background: '#f6f8fb', border: '1px solid #e9edf3', borderRadius: 8, padding: '10px 12px' }}>
                  No admission-phase details on record for this student (e.g. a bulk-imported account). Details appear here once the student submits them from their profile or applies through admission.
                </p>
              )}
            </>
          )}
        </div>

        <div className="sim-foot">
          <button className="sim-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  if (!v) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: 12.5, borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ color: '#6b7280', flexShrink: 0 }}>{k}</span>
      <span style={{ color: '#0a1628', fontWeight: 500, textAlign: 'right' }}>{v}</span>
    </div>
  );
}
function Sec({ t, children }) {
  return (
    <div style={{ marginBottom: '.75rem' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#b8860b', margin: '0 0 2px' }}>{t}</div>
      {children}
    </div>
  );
}

const CSS = `
  .sim-overlay{position:fixed;inset:0;background:rgba(10,22,40,.5);z-index:1200;display:flex;align-items:flex-start;justify-content:center;padding:3rem 1rem;overflow-y:auto;overscroll-behavior:contain;}
  .sim-modal{background:#fff;width:100%;max-width:480px;border-radius:12px;box-shadow:0 24px 60px -20px rgba(10,22,40,.45);font-family:'Inter',-apple-system,sans-serif;}
  .sim-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding:1.1rem 1.4rem;border-bottom:1px solid #e9edf3;}
  .sim-head h3{font-size:16px;font-weight:700;color:#0a1628;margin:0;}
  .sim-sub{font-size:12px;color:#6b7280;margin-top:3px;word-break:break-all;}
  .sim-x{background:none;border:none;color:#9aa4b2;font-size:18px;cursor:pointer;border-radius:4px;}
  .sim-x:hover{color:#0a1628;}
  .sim-body{padding:1.1rem 1.4rem;max-height:62vh;overflow-y:auto;}
  .sim-err{background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;padding:.6rem .85rem;border-radius:6px;font-size:12.5px;margin-bottom:1rem;}
  .sim-foot{display:flex;justify-content:flex-end;padding:.9rem 1.4rem;border-top:1px solid #e9edf3;}
  .sim-btn{padding:9px 18px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#374151;font:600 13px 'Inter',sans-serif;cursor:pointer;}
  .sim-btn:hover{border-color:#0a3a6e;color:#0a1628;}
  @media(max-width:768px){ .sim-overlay{padding:1.25rem .75rem;} }
`;
