import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/axios';

const RANKS = [
  'COS',
  'Instructor I', 'Instructor II', 'Instructor III',
  'Assistant Professor I', 'Assistant Professor II', 'Assistant Professor III', 'Assistant Professor IV',
  'Associate Professor I', 'Associate Professor II', 'Associate Professor III', 'Associate Professor IV', 'Associate Professor V',
  'Professor I', 'Professor II', 'Professor III', 'Professor IV', 'Professor V', 'Professor VI',
];

/*
  Edit a student's or faculty's information. Used by the admin user console and
  the registrar's student/faculty pages. Both the student and faculty update
  endpoints are IsRegistrarOrAdmin, so this one component serves both roles.
  Identity fields (email, ID) are intentionally read-only here.
*/
export default function UserEditModal({ user, onClose, onSaved }) {
  const isFaculty = user.role === 'faculty';

  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms]       = useState([]);
  const [form, setForm] = useState({
    full_name:      user.full_name || '',
    contact_number: user.contact_number || '',
    department:     user.department_code || '',
    program:        user.program_id ? String(user.program_id) : '',
    year_level:     user.year_level ? String(user.year_level) : '',
    is_gec_faculty: !!user.is_gec_faculty,
    rank:           user.rank || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const nameRef = useRef(null);

  // Close on Escape for keyboard users.
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  useEffect(() => {
    api.get('/auth/departments/').then(r => setDepartments(r.data || [])).catch(() => {});
    api.get('/enrollment/programs/').then(r => setPrograms(r.data?.results ?? r.data ?? [])).catch(() => {});
  }, []);

  const programsForDept = useMemo(
    () => (form.department ? programs.filter(p => p.department_code === form.department) : programs),
    [programs, form.department],
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.full_name.trim()) { setError('Full name is required.'); nameRef.current?.focus(); return; }
    setSaving(true);
    try {
      const payload = {
        full_name:      form.full_name.trim(),
        contact_number: form.contact_number.trim(),
        department:     form.department || '',
        program:        form.program ? Number(form.program) : null,
      };
      if (isFaculty) {
        payload.is_gec_faculty = form.is_gec_faculty;
        payload.rank = form.rank || '';
        if (form.is_gec_faculty) payload.program = null;
      } else {
        payload.year_level = form.year_level ? Number(form.year_level) : null;
      }
      const url = isFaculty
        ? `/auth/registrar/faculty/${user.id}/`
        : `/auth/registrar/students/${user.id}/`;
      const res = await api.patch(url, payload);
      onSaved?.(res.data);
    } catch (err) {
      const d = err.response?.data;
      let m = d?.error || d?.detail;
      if (!m && d && typeof d === 'object') {
        const first = Object.entries(d)[0];
        if (first) m = `${first[0]}: ${Array.isArray(first[1]) ? first[1][0] : first[1]}`;
      }
      setError(m || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="uem-overlay" onMouseDown={() => !saving && onClose()}>
      <style>{CSS}</style>
      <div className="uem-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="uem-head">
          <div>
            <h3>Edit {isFaculty ? 'faculty' : 'student'}</h3>
            <div className="uem-sub">Update the information below. Email and ID aren’t editable here.</div>
          </div>
          <button className="uem-x" onClick={onClose} disabled={saving} aria-label="Close"><i className="ti ti-x" aria-hidden="true" /></button>
        </div>

        <form className="uem-body" onSubmit={handleSubmit}>
          <div role="alert" aria-live="polite">
            {error && <div className="uem-err">{error}</div>}
          </div>

          <div className="uem-readonly">
            <div><span>Name on record</span><b>{user.full_name}</b></div>
            <div><span>{isFaculty ? 'Faculty ID' : 'Student ID'}</span><b>{user.student_id || '—'}</b></div>
            <div><span>Email</span><b>{user.institutional_email}</b></div>
          </div>

          <div className="uem-field">
            <label htmlFor="uem-full-name">Full name</label>
            <input id="uem-full-name" name="full_name" ref={nameRef} value={form.full_name}
              onChange={e => set('full_name', e.target.value)} placeholder="e.g. Dela Cruz, Juan A." required />
          </div>

          <div className="uem-field">
            <label htmlFor="uem-contact">Contact number <span className="uem-opt">(optional)</span></label>
            <input id="uem-contact" name="contact_number" type="tel" inputMode="tel" autoComplete="tel"
              value={form.contact_number} onChange={e => set('contact_number', e.target.value)} placeholder="e.g. 0917 123 4567" />
          </div>

          <div className="uem-field">
            <label htmlFor="uem-department">Department</label>
            <select id="uem-department" name="department" value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value, program: '' }))}>
              <option value="">Not set</option>
              {departments.map(d => <option key={d.id} value={d.code}>{d.code} — {d.name}</option>)}
            </select>
          </div>

          {isFaculty ? (
            <>
              <div className="uem-field">
                <span className="uem-grouplabel" id="uem-classification">Classification</span>
                <div className="uem-choice" role="group" aria-labelledby="uem-classification">
                  <button type="button" aria-pressed={!form.is_gec_faculty} className={`uem-choice-btn${!form.is_gec_faculty ? ' on' : ''}`} onClick={() => set('is_gec_faculty', false)}>Core faculty</button>
                  <button type="button" aria-pressed={form.is_gec_faculty} className={`uem-choice-btn${form.is_gec_faculty ? ' on' : ''}`} onClick={() => set('is_gec_faculty', true)}>GEC faculty</button>
                </div>
              </div>
              {!form.is_gec_faculty && (
                <div className="uem-field">
                  <label htmlFor="uem-program">Core program <span className="uem-opt">(optional)</span></label>
                  <select id="uem-program" name="program" value={form.program} onChange={e => set('program', e.target.value)} disabled={!form.department}>
                    <option value="">{form.department ? 'Not set' : 'Choose a department first'}</option>
                    {programsForDept.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="uem-field">
                <label htmlFor="uem-rank">Rank <span className="uem-opt">(optional)</span></label>
                <select id="uem-rank" name="rank" value={form.rank} onChange={e => set('rank', e.target.value)}>
                  <option value="">Not set</option>
                  {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="uem-field">
                <label htmlFor="uem-program">Program</label>
                <select id="uem-program" name="program" value={form.program} onChange={e => set('program', e.target.value)} disabled={!form.department}>
                  <option value="">{form.department ? 'Not set' : 'Choose a department first'}</option>
                  {programsForDept.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              <div className="uem-field">
                <label htmlFor="uem-year">Year level</label>
                <select id="uem-year" name="year_level" value={form.year_level} onChange={e => set('year_level', e.target.value)}>
                  <option value="">Not set</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </>
          )}

          <div className="uem-foot">
            <button type="button" className="uem-btn-sec" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="uem-btn-pri" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const CSS = `
  .uem-overlay{position:fixed;inset:0;background:rgba(10,22,40,.5);z-index:1200;display:flex;align-items:flex-start;justify-content:center;padding:3rem 1rem;overflow-y:auto;overscroll-behavior:contain;}
  .uem-modal{background:#fff;width:100%;max-width:460px;border-radius:12px;box-shadow:0 24px 60px -20px rgba(10,22,40,.45);font-family:'Inter',-apple-system,sans-serif;}
  .uem-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding:1.2rem 1.4rem;border-bottom:1px solid #e9edf3;}
  .uem-head h3{font-size:16px;font-weight:700;color:#0a1628;margin:0;}
  .uem-sub{font-size:12px;color:#6b7280;margin-top:3px;line-height:1.4;}
  .uem-x{background:none;border:none;color:#9aa4b2;font-size:18px;cursor:pointer;line-height:1;border-radius:4px;}
  .uem-x:hover{color:#0a1628;}
  .uem-x:focus-visible{outline:2px solid #0a3a6e;outline-offset:2px;}
  .uem-body{padding:1.2rem 1.4rem;}
  .uem-err{background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;padding:.6rem .85rem;border-radius:6px;font-size:12.5px;margin-bottom:1rem;}
  .uem-readonly{background:#f6f8fb;border:1px solid #e9edf3;border-radius:8px;padding:.5rem .85rem;margin-bottom:1.1rem;}
  .uem-readonly>div{display:flex;justify-content:space-between;gap:1rem;padding:.3rem 0;font-size:12.5px;}
  .uem-readonly span{color:#6b7280;}
  .uem-readonly b{color:#0a1628;font-weight:600;text-align:right;word-break:break-all;}
  .uem-field{display:flex;flex-direction:column;gap:5px;margin-bottom:1rem;}
  .uem-field label,.uem-grouplabel{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6b7280;font-weight:600;}
  .uem-opt{text-transform:none;letter-spacing:0;font-weight:400;color:#9aa4b2;}
  .uem-field input,.uem-field select{padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font:13.5px/1.4 'Inter',sans-serif;color:#0a1628;outline:none;}
  .uem-field input:focus-visible,.uem-field select:focus-visible{outline:2px solid #0a3a6e;outline-offset:1px;border-color:#0a3a6e;}
  .uem-choice{display:flex;gap:.5rem;}
  .uem-choice-btn{flex:1;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font:13px/1 'Inter',sans-serif;color:#6b7280;font-weight:600;cursor:pointer;}
  .uem-choice-btn:hover{border-color:#0a3a6e;color:#0a1628;}
  .uem-choice-btn:focus-visible{outline:2px solid #0a3a6e;outline-offset:2px;}
  .uem-choice-btn.on{background:#0a3a6e;border-color:#0a3a6e;color:#fff;}
  .uem-foot{display:flex;justify-content:flex-end;gap:.6rem;margin-top:1.2rem;}
  .uem-btn-sec{padding:9px 16px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#374151;font:600 13px 'Inter',sans-serif;cursor:pointer;}
  .uem-btn-sec:hover:not(:disabled){border-color:#0a3a6e;color:#0a1628;}
  .uem-btn-sec:focus-visible{outline:2px solid #0a3a6e;outline-offset:2px;}
  .uem-btn-sec:disabled{opacity:.6;cursor:not-allowed;}
  .uem-btn-pri{padding:9px 16px;border:none;border-radius:8px;background:#0a3a6e;color:#fff;font:600 13px 'Inter',sans-serif;cursor:pointer;}
  .uem-btn-pri:hover:not(:disabled){background:#0c4a8a;}
  .uem-btn-pri:focus-visible{outline:2px solid #0a3a6e;outline-offset:2px;}
  .uem-btn-pri:disabled{opacity:.6;cursor:not-allowed;}
  @media(max-width:768px){
    .uem-overlay{padding:1.25rem .75rem;}
    .uem-modal{border-radius:10px;}
    .uem-head,.uem-body{padding-left:1.1rem;padding-right:1.1rem;}
    /* 16px avoids iOS zoom-on-focus; taller inputs hit the 44px touch target */
    .uem-field input,.uem-field select{font-size:16px;padding-top:11px;padding-bottom:11px;}
    .uem-foot{flex-direction:column-reverse;}
    .uem-foot button{width:100%;min-height:44px;}
  }
`;
