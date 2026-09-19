import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { useConfirm } from './ConfirmDialog';

const YEARS = [1, 2, 3, 4];
const YEAR_LABEL = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
const SEMS = [
  { key: 'first', label: '1st Semester' },
  { key: 'second', label: '2nd Semester' },
  { key: 'summer', label: 'Summer' },
];

export default function CurriculumManager() {
  const confirm = useConfirm();
  const [programs, setPrograms]   = useState([]);
  const [programId, setProgramId] = useState('');
  const [curricula, setCurricula] = useState([]);
  const [selId, setSelId]         = useState(null);
  const [detail, setDetail]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [flash, setFlash]         = useState('');
  const [error, setError]         = useState('');

  const [showNewCur, setShowNewCur] = useState(false);
  const [newCur, setNewCur]         = useState({ year_effective: '', code: '', duplicate_from: '' });
  const [curBusy, setCurBusy]       = useState(false);
  const [curErr, setCurErr]         = useState('');

  const EMPTY_COURSE = { code: '', name: '', units: '', subject_type: 'minor', year_level: 1, semester: 'first', prerequisite_code: '' };
  const [showCourse, setShowCourse] = useState(false);
  const [course, setCourse]         = useState(EMPTY_COURSE);
  const [courseBusy, setCourseBusy] = useState(false);
  const [courseErr, setCourseErr]   = useState('');

  useEffect(() => {
    api.get('/enrollment/encoder/programs/').then(r => setPrograms(r.data)).catch(() => setError('Failed to load programs.'));
  }, []);

  const loadCurricula = useCallback((pid) => {
    if (!pid) { setCurricula([]); return; }
    api.get(`/enrollment/curricula/?program=${pid}`).then(r => {
      setCurricula(r.data);
      setSelId(r.data[0]?.id ?? null);
    }).catch(() => setError('Failed to load curricula.'));
  }, []);

  useEffect(() => { loadCurricula(programId); }, [programId, loadCurricula]);

  const loadDetail = useCallback((id) => {
    if (!id) { setDetail(null); return; }
    setLoading(true);
    api.get(`/enrollment/curricula/${id}/`).then(r => setDetail(r.data))
      .catch(() => setError('Failed to load curriculum.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDetail(selId); }, [selId, loadDetail]);

  async function createCurriculum(e) {
    e.preventDefault();
    if (!programId) { setCurErr('Pick a program first.'); return; }
    setCurBusy(true); setCurErr('');
    try {
      const payload = { program: Number(programId), year_effective: Number(newCur.year_effective) };
      if (newCur.code.trim()) payload.code = newCur.code.trim();
      if (newCur.duplicate_from) payload.duplicate_from = Number(newCur.duplicate_from);
      const r = await api.post('/enrollment/curricula/', payload);
      setFlash(`Curriculum ${r.data.code} created.`);
      setShowNewCur(false); setNewCur({ year_effective: '', code: '', duplicate_from: '' });
      loadCurricula(programId);
      setSelId(r.data.id);
    } catch (err) {
      setCurErr(fieldErr(err) || 'Failed to create curriculum.');
    } finally { setCurBusy(false); }
  }

  async function addCourse(e) {
    e.preventDefault();
    setCourseBusy(true); setCourseErr('');
    try {
      const payload = {
        code: course.code.trim(),
        year_level: Number(course.year_level),
        semester: course.semester,
        subject_type: course.subject_type,
      };
      if (course.name.trim()) payload.name = course.name.trim();
      if (course.units !== '') payload.units = course.units;
      if (course.prerequisite_code.trim()) payload.prerequisite_code = course.prerequisite_code.trim();
      await api.post(`/enrollment/curricula/${selId}/subjects/`, payload);
      setFlash(`${payload.code} added.`);
      setShowCourse(false); setCourse(EMPTY_COURSE);
      loadDetail(selId); loadCurricula(programId);
    } catch (err) {
      setCourseErr(err.response?.data?.error || fieldErr(err) || 'Failed to add course.');
    } finally { setCourseBusy(false); }
  }

  async function removeCourse(subjectId, code) {
    if (!await confirm({ title: `Remove ${code}?`, message: 'This removes the course from this curriculum. The course itself stays in the catalog.', confirmText: 'Remove' })) return;
    try {
      await api.delete(`/enrollment/curricula/${selId}/subjects/${subjectId}/`);
      setFlash(`${code} removed.`);
      loadDetail(selId); loadCurricula(programId);
    } catch { setError('Failed to remove course.'); }
  }

  async function deleteCurriculum() {
    if (!detail) return;
    if (!await confirm({ title: `Delete ${detail.code}?`, message: 'This permanently deletes the curriculum and cannot be undone.', confirmText: 'Delete' })) return;
    try {
      await api.delete(`/enrollment/curricula/${detail.id}/`);
      setFlash(`${detail.code} deleted.`);
      loadCurricula(programId);
    } catch (err) { setError(err.response?.data?.error || 'Failed to delete curriculum.'); }
  }

  const subjects = detail?.subjects ?? [];

  return (
    <>
      <style>{CSS}</style>
      <div className="page-head">
        <div className="eyebrow">Department · Curriculum management</div>
        <h2>Program <em>curriculum</em></h2>
        <div className="sub">Define the curriculum of each program in your department. Add a new curriculum version when the program adopts one; courses shared with a previous version stay identical.</div>
      </div>

      {flash && <div className="cu-flash cu-flash-ok">{flash}<button onClick={() => setFlash('')}><i className="ti ti-x" /></button></div>}
      {error && <div className="cu-flash cu-flash-err">{error}<button onClick={() => setError('')}><i className="ti ti-x" /></button></div>}

      <div className="cu-controls">
        <div className="cu-field">
          <label>Program</label>
          <select value={programId} onChange={e => setProgramId(e.target.value)}>
            <option value="">Select a program</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
          </select>
        </div>
        {programId && (
          <div className="cu-field">
            <label>Curriculum version</label>
            <div className="cu-cur-row">
              <select value={selId ?? ''} onChange={e => setSelId(Number(e.target.value))}>
                {curricula.map(c => <option key={c.id} value={c.id}>{c.code} · effective {c.year_effective} ({c.subject_count} courses)</option>)}
              </select>
              <button className="btn-sec" onClick={() => { setShowNewCur(true); setCurErr(''); setNewCur({ year_effective: '', code: '', duplicate_from: '' }); }}>
                <i className="ti ti-plus" /> New curriculum
              </button>
            </div>
          </div>
        )}
      </div>

      {!programId ? (
        <div className="cu-empty">Select a program to view and edit its curriculum.</div>
      ) : loading ? (
        <div className="cu-empty">Loading…</div>
      ) : detail ? (
        <div className="cu-detail">
          <div className="cu-detail-head">
            <div>
              <h3>{detail.code}</h3>
              <div className="cu-sub">Effective {detail.year_effective} · {subjects.length} courses</div>
            </div>
            <div className="cu-detail-actions">
              <button className="btn-pri" onClick={() => { setShowCourse(true); setCourseErr(''); setCourse(EMPTY_COURSE); }}>
                <i className="ti ti-plus" /> Add course
              </button>
              <button className="cu-del" onClick={deleteCurriculum} title="Delete curriculum"><i className="ti ti-trash" /></button>
            </div>
          </div>

          {subjects.length === 0 ? (
            <div className="cu-empty">No courses yet. Use "Add course" to build this curriculum.</div>
          ) : (
            YEARS.map(yr => {
              const yrSubs = subjects.filter(s => s.year_level === yr);
              if (yrSubs.length === 0) return null;
              return (
                <div key={yr} className="cu-year">
                  <div className="cu-year-label">{YEAR_LABEL[yr]}</div>
                  {SEMS.map(sem => {
                    const cell = yrSubs.filter(s => s.semester === sem.key);
                    if (cell.length === 0) return null;
                    const units = cell.reduce((a, s) => a + parseFloat(s.units || 0), 0);
                    return (
                      <div key={sem.key} className="cu-sem">
                        <div className="cu-sem-head">{sem.label}<span>{units} units</span></div>
                        <table className="cu-table">
                          <tbody>
                            {cell.map(s => (
                              <tr key={s.id}>
                                <td className="cu-code">{s.code}</td>
                                <td className="cu-name">{s.name}
                                  {s.prerequisite_code && <span className="cu-prereq">prereq: {s.prerequisite_code}</span>}
                                </td>
                                <td className="cu-type">{s.subject_type_display}</td>
                                <td className="cu-units">{s.units}</td>
                                <td className="cu-rm"><button onClick={() => removeCourse(s.id, s.code)} title="Remove from curriculum"><i className="ti ti-x" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="cu-empty">No curriculum selected.</div>
      )}

      {/* New curriculum modal */}
      {showNewCur && (
        <div className="cu-overlay" onMouseDown={() => !curBusy && setShowNewCur(false)}>
          <div className="cu-modal" onMouseDown={e => e.stopPropagation()}>
            <h3>New <em>curriculum</em></h3>
            <p className="cu-modal-sub">Add a new curriculum version for this program.</p>
            <form onSubmit={createCurriculum}>
              <label className="cu-lbl">Year of effectivity</label>
              <input className="cu-inp" type="number" min="1980" max="2100" placeholder="e.g. 2024" value={newCur.year_effective} onChange={e => setNewCur(f => ({ ...f, year_effective: e.target.value }))} required autoFocus />
              <label className="cu-lbl">Code <span className="cu-opt">(optional, defaults to PROGRAM-YEAR)</span></label>
              <input className="cu-inp" placeholder="e.g. BSIT-2024" value={newCur.code} onChange={e => setNewCur(f => ({ ...f, code: e.target.value }))} />
              <label className="cu-lbl">Start from <span className="cu-opt">(optional)</span></label>
              <select className="cu-inp" value={newCur.duplicate_from} onChange={e => setNewCur(f => ({ ...f, duplicate_from: e.target.value }))}>
                <option value="">Empty curriculum</option>
                {curricula.map(c => <option key={c.id} value={c.id}>Duplicate {c.code} (shares its courses)</option>)}
              </select>
              {curErr && <div className="cu-flash cu-flash-err" style={{ marginTop: 10 }}>{curErr}</div>}
              <div className="cu-modal-foot">
                <button type="button" className="btn-sec" onClick={() => setShowNewCur(false)} disabled={curBusy}>Cancel</button>
                <button type="submit" className="btn-pri" disabled={curBusy}>{curBusy ? 'Creating…' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add course modal */}
      {showCourse && (
        <div className="cu-overlay" onMouseDown={() => !courseBusy && setShowCourse(false)}>
          <div className="cu-modal" onMouseDown={e => e.stopPropagation()}>
            <h3>Add <em>course</em></h3>
            <p className="cu-modal-sub">If the course code already exists (same year/semester), the shared course is reused so both curricula stay identical.</p>
            <form onSubmit={addCourse}>
              <label className="cu-lbl">Course code</label>
              <input className="cu-inp" placeholder="e.g. IT-101" value={course.code} onChange={e => setCourse(f => ({ ...f, code: e.target.value }))} required autoFocus />
              <label className="cu-lbl">Descriptive title <span className="cu-opt">(needed for a new course)</span></label>
              <input className="cu-inp" placeholder="e.g. Introduction to Computing" value={course.name} onChange={e => setCourse(f => ({ ...f, name: e.target.value }))} />
              <div className="cu-grid3">
                <div>
                  <label className="cu-lbl">Units</label>
                  <input className="cu-inp" type="number" step="0.5" min="0" placeholder="3" value={course.units} onChange={e => setCourse(f => ({ ...f, units: e.target.value }))} />
                </div>
                <div>
                  <label className="cu-lbl">Year</label>
                  <select className="cu-inp" value={course.year_level} onChange={e => setCourse(f => ({ ...f, year_level: e.target.value }))}>
                    {YEARS.map(y => <option key={y} value={y}>{YEAR_LABEL[y]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="cu-lbl">Semester</label>
                  <select className="cu-inp" value={course.semester} onChange={e => setCourse(f => ({ ...f, semester: e.target.value }))}>
                    {SEMS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="cu-grid2">
                <div>
                  <label className="cu-lbl">Type</label>
                  <select className="cu-inp" value={course.subject_type} onChange={e => setCourse(f => ({ ...f, subject_type: e.target.value }))}>
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                  </select>
                </div>
                <div>
                  <label className="cu-lbl">Prerequisite code <span className="cu-opt">(optional)</span></label>
                  <input className="cu-inp" placeholder="e.g. IT-100" value={course.prerequisite_code} onChange={e => setCourse(f => ({ ...f, prerequisite_code: e.target.value }))} />
                </div>
              </div>
              {courseErr && <div className="cu-flash cu-flash-err" style={{ marginTop: 10 }}>{courseErr}</div>}
              <div className="cu-modal-foot">
                <button type="button" className="btn-sec" onClick={() => setShowCourse(false)} disabled={courseBusy}>Cancel</button>
                <button type="submit" className="btn-pri" disabled={courseBusy}>{courseBusy ? 'Adding…' : 'Add course'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function fieldErr(err) {
  const d = err.response?.data;
  if (!d) return '';
  if (d.error) return d.error;
  if (typeof d === 'object') {
    const first = Object.entries(d)[0];
    if (first) return `${first[0]}: ${Array.isArray(first[1]) ? first[1][0] : first[1]}`;
  }
  return '';
}

const CSS = `
  .cu-flash{padding:10px 16px;margin-bottom:1rem;font-size:13px;display:flex;justify-content:space-between;gap:12px;align-items:center}
  .cu-flash-ok{background:#e6f1ec;color:#0a7c52}
  .cu-flash-err{background:#f6e8e4;color:#a8331e}
  .cu-flash button{background:none;border:none;cursor:pointer;color:inherit}
  .cu-controls{display:flex;gap:1.25rem;flex-wrap:wrap;margin-bottom:1.5rem}
  .cu-field{display:flex;flex-direction:column;gap:5px;min-width:260px}
  .cu-field > label{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8a93a3;font-weight:600}
  .cu-field select{padding:9px 11px;border:1px solid #e5e7eb;background:#fff;font:13px 'Inter',sans-serif;color:#0a1628;outline:none}
  .cu-cur-row{display:flex;gap:8px}
  .cu-cur-row select{flex:1}
  .cu-empty{padding:3rem;text-align:center;color:#5a6478;font-size:13px;background:#fff;border:1px solid #e5e7eb}
  .cu-detail{background:#fff;border:1px solid #e5e7eb}
  .cu-detail-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding:1.25rem 1.5rem;border-bottom:1px solid #e5e7eb}
  .cu-detail-head h3{font-size:18px;font-weight:600;color:#0a1628;margin:0}
  .cu-sub{font-size:12px;color:#5a6478;margin-top:3px}
  .cu-detail-actions{display:flex;gap:8px;align-items:center}
  .cu-del{border:1px solid #e5e7eb;background:#fff;color:#a8331e;width:36px;height:36px;cursor:pointer}
  .cu-del:hover{background:#f6e8e4}
  .cu-year{padding:1rem 1.5rem;border-bottom:1px solid #eef0f4}
  .cu-year-label{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#b89043;font-weight:700;margin-bottom:.5rem}
  .cu-sem{margin-bottom:1rem}
  .cu-sem-head{display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:#5a6478;padding:6px 0;border-bottom:1px solid #eef0f4}
  .cu-table{width:100%;border-collapse:collapse;font-size:13px}
  .cu-table td{padding:8px 6px;border-bottom:1px solid #eef0f4;vertical-align:top}
  .cu-code{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#b89043;font-weight:600;width:110px}
  .cu-name{color:#0a1628}
  .cu-prereq{display:block;font-size:11px;color:#8a93a3;margin-top:2px}
  .cu-type{color:#5a6478;width:90px}
  .cu-units{text-align:right;width:50px;color:#0a1628}
  .cu-rm{width:34px;text-align:right}
  .cu-rm button{background:none;border:none;cursor:pointer;color:#8a93a3}
  .cu-rm button:hover{color:#a8331e}
  .cu-overlay{position:fixed;inset:0;z-index:200;background:rgba(10,22,40,.45);display:flex;align-items:flex-start;justify-content:center;padding:5vh 16px;overflow-y:auto}
  .cu-modal{background:#fff;width:100%;max-width:460px;border:1px solid #e5e7eb;padding:1.5rem;box-shadow:0 24px 60px -20px rgba(10,22,40,.4)}
  .cu-modal h3{font-size:18px;color:#0a1628;font-weight:600;margin:0 0 .35rem}
  .cu-modal h3 em{font-style:normal;color:#b89043}
  .cu-modal-sub{font-size:12px;color:#5a6478;margin:0 0 1rem;line-height:1.5}
  .cu-lbl{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8a93a3;font-weight:600;margin:10px 0 4px}
  .cu-opt{text-transform:none;letter-spacing:0;color:#8a93a3;font-weight:400}
  .cu-inp{width:100%;border:1px solid #e5e7eb;padding:9px 11px;font:13px 'Inter',sans-serif;box-sizing:border-box;outline:none}
  .cu-inp:focus{border-color:#b89043}
  .cu-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
  .cu-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .cu-modal-foot{display:flex;justify-content:flex-end;gap:.75rem;margin-top:1.25rem}
  @media(max-width:560px){.cu-grid3,.cu-grid2{grid-template-columns:1fr}.cu-cur-row{flex-direction:column}}
`;
