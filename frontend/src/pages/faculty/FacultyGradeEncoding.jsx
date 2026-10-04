import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function gradeColor(grade) {
  const n = parseFloat(grade);
  if (isNaN(n)) return grade === 'INC' ? 'var(--amber)' : 'var(--red)';
  return n <= 3.00 ? 'var(--green)' : 'var(--red)';
}

export default function FacultyGradeEncoding() {
  const toast = useToast();
  const [assignments, setAssignments]             = useState([]);
  const [selectedTerm, setSelectedTerm]           = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [students, setStudents]                   = useState([]);
  const [grades, setGrades]                       = useState({});
  const [rowStatus, setRowStatus]                 = useState({}); // uuid -> 'saving'|'saved'|'error'
  const [submitting, setSubmitting]               = useState(false);

  // Refs so the debounced auto-save closures always read the latest values.
  const gradesRef             = useRef(grades);
  const selectedAssignmentRef = useRef(selectedAssignment);
  const saveTimers            = useRef({}); // uuid -> timeout id
  useEffect(() => { gradesRef.current = grades; }, [grades]);
  useEffect(() => { selectedAssignmentRef.current = selectedAssignment; }, [selectedAssignment]);

  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingStudents, setLoadingStudents]       = useState(false);
  const [error, setError]                           = useState('');
  const [forceStage, setForceStage]                 = useState('');   // '' | 'midterm' | 'final'
  const [search, setSearch]                         = useState('');
  const [showReopen, setShowReopen]                 = useState(false);
  const [reopenReason, setReopenReason]             = useState('');
  const [reopenSaving, setReopenSaving]             = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/grades/teaching-load/'),
      api.get('/enrollment/current-term/').catch(() => ({ data: null })),
    ])
      .then(([taRes, ctRes]) => {
        const tas = taRes.data || [];
        setAssignments(tas);
        // Distinct terms the faculty has courses in (endpoint returns them recent-first).
        const termIds = [];
        tas.forEach(a => { const t = String(a.term_id); if (!termIds.includes(t)) termIds.push(t); });
        // Default to the current term if the faculty teaches this term, else the most recent.
        const currentId = ctRes?.data?.id != null ? String(ctRes.data.id) : '';
        setSelectedTerm(termIds.includes(currentId) ? currentId : (termIds[0] || ''));
      })
      .catch(() => toast('Failed to load teaching assignments.', { type: 'error' }))
      .finally(() => setLoadingAssignments(false));
  }, []);

  // Auto-select the first course of the selected term (tabs, first one shown).
  useEffect(() => {
    const ta = assignments.filter(a => String(a.term_id) === String(selectedTerm));
    setSelectedAssignment(ta.length ? String(ta[0].id) : '');
    setError('');
    setSearch('');
    setForceStage('');
  }, [selectedTerm, assignments]);

  useEffect(() => {
    // Switching course: drop any pending auto-saves and per-row status from the old one.
    Object.values(saveTimers.current).forEach(clearTimeout);
    saveTimers.current = {};
    setRowStatus({});
    if (!selectedAssignment) { setStudents([]); setGrades({}); return; }
    setLoadingStudents(true);
    setError('');
    api.get(`/grades/faculty/students/?assignment=${selectedAssignment}`)
      .then(res => {
        setStudents(res.data);
        const initial = {};
        res.data.forEach(s => {
          initial[s.student_uuid] = {
            midterm_grade: s.midterm_grade || '',
            final_grade:   s.final_grade   || '',
            remarks:       s.remarks       || '',
          };
        });
        setGrades(initial);
      })
      .catch(() => toast('Failed to load students for this assignment.', { type: 'error' }))
      .finally(() => setLoadingStudents(false));
  }, [selectedAssignment]);

  // A grade value is valid to save when it is a well-formed number within 1.00–5.00.
  function gradeFieldValid(v) {
    const n = parseFloat(v);
    return !Number.isNaN(n) && n >= 1 && n <= 5;
  }

  // Apply an encode response to local state (single source of truth = students).
  function applyEncoded(uuid, d, remarks) {
    setStudents(prev => prev.map(s => s.student_uuid === uuid ? {
      ...s,
      midterm_grade: d.midterm_grade, final_grade: d.final_grade, grade: d.grade,
      remarks: remarks != null ? remarks : s.remarks,
      is_dropped: d.is_dropped,
      midterm_is_inc: d.midterm_is_inc, final_is_inc: d.final_is_inc,
      midterm_submitted: d.midterm_submitted, final_submitted: d.final_submitted,
      is_submitted: d.final_submitted,
    } : s));
    setGrades(prev => ({ ...prev, [uuid]: {
      ...prev[uuid], midterm_grade: d.midterm_grade || '', final_grade: d.final_grade || '',
    } }));
  }

  async function postCell(uuid, stage, extra) {
    const assignmentId = selectedAssignmentRef.current;
    if (!assignmentId) return;
    const remarks = gradesRef.current[uuid]?.remarks || '';
    setRowStatus(prev => ({ ...prev, [uuid]: 'saving' }));
    try {
      const res = await api.post('/grades/faculty/encode/', {
        student_id: uuid,
        teaching_assignment_id: Number(assignmentId),
        stage, remarks, ...extra,
      });
      applyEncoded(uuid, res.data, remarks);
      setRowStatus(prev => ({ ...prev, [uuid]: 'saved' }));
      setTimeout(() => setRowStatus(prev => {
        if (prev[uuid] !== 'saved') return prev;
        const n = { ...prev }; delete n[uuid]; return n;
      }), 1600);
    } catch (err) {
      setRowStatus(prev => ({ ...prev, [uuid]: 'error' }));
      const d = err.response?.data;
      const msg = d?.error || d?.value?.[0] || d?.non_field_errors?.[0] || d?.detail || 'Failed to save grade.';
      toast(msg, { type: 'error' });
    }
  }

  // Numeric grade entry — debounced while typing, flushed on blur.
  function updateVal(uuid, stage, value) {
    const key = stage === 'midterm' ? 'midterm_grade' : 'final_grade';
    setGrades(prev => ({ ...prev, [uuid]: { ...prev[uuid], [key]: value } }));
    scheduleSave(uuid, stage);
  }
  function scheduleSave(uuid, stage) {
    const k = `${uuid}:${stage}`;
    if (saveTimers.current[k]) clearTimeout(saveTimers.current[k]);
    saveTimers.current[k] = setTimeout(() => flushVal(uuid, stage), 700);
  }
  function blurVal(uuid, stage) {
    const k = `${uuid}:${stage}`;
    if (saveTimers.current[k]) { clearTimeout(saveTimers.current[k]); delete saveTimers.current[k]; }
    flushVal(uuid, stage);
  }
  function flushVal(uuid, stage) {
    const k = `${uuid}:${stage}`;
    delete saveTimers.current[k];
    const key = stage === 'midterm' ? 'midterm_grade' : 'final_grade';
    const v = (gradesRef.current[uuid]?.[key] ?? '').toString().trim();
    if (v === '') return;                 // nothing entered yet
    if (!gradeFieldValid(v)) return;      // mid-typing / out of range — wait
    postCell(uuid, stage, { status: 'grade', value: v });
  }

  // Status selector (Grade / INC / DRP) for a stage cell.
  function changeStatus(uuid, stage, status) {
    if (status === 'inc' || status === 'drp') { postCell(uuid, stage, { status }); return; }
    // 'grade': switch to numeric mode. Save now if a valid number is already typed,
    // otherwise just flip the local mode so the number box appears.
    const key = stage === 'midterm' ? 'midterm_grade' : 'final_grade';
    const v = (gradesRef.current[uuid]?.[key] ?? '').toString().trim();
    if (v !== '' && gradeFieldValid(v)) { postCell(uuid, stage, { status: 'grade', value: v }); return; }
    setStudents(prev => prev.map(s => s.student_uuid === uuid
      ? { ...s, is_dropped: false, [stage === 'midterm' ? 'midterm_is_inc' : 'final_is_inc']: false }
      : s));
  }

  async function handleSubmitStage(stage, force = false) {
    setSubmitting(true);
    setError('');
    setForceStage('');
    try {
      const res = await api.post('/grades/faculty/submit/', {
        teaching_assignment_id: Number(selectedAssignment), stage, force,
      });
      toast(res.data.message, { type: 'success' });
      const refreshed = await api.get(`/grades/faculty/students/?assignment=${selectedAssignment}`);
      setStudents(refreshed.data);
      const nextGrades = {};
      refreshed.data.forEach(s => {
        nextGrades[s.student_uuid] = {
          midterm_grade: s.midterm_grade || '', final_grade: s.final_grade || '', remarks: s.remarks || '',
        };
      });
      setGrades(nextGrades);
    } catch (err) {
      const data = err.response?.data;
      toast(data?.error || data?.detail || 'Submission failed. Please try again.', { type: 'error' });
      if (data?.missing_count) setForceStage(stage);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReopen(e) {
    e.preventDefault();
    setReopenSaving(true);
    try {
      await api.post('/grades/faculty/midterm-reopen/', {
        teaching_assignment_id: Number(selectedAssignment),
        reason: reopenReason.trim(),
      });
      toast('Reopen request sent to the admin.', { type: 'success', sub: 'You can edit midterms once it is approved.' });
      setShowReopen(false);
      setReopenReason('');
    } catch (err) {
      const d = err.response?.data;
      toast(d?.error || d?.detail || 'Failed to send reopen request.', { type: 'error' });
    } finally {
      setReopenSaving(false);
    }
  }

  const assignment    = assignments.find(a => String(a.id) === String(selectedAssignment));
  // Class-level stage state (dropped students don't gate submission).
  const activeStudents   = students.filter(s => !s.is_dropped);
  const midtermsSubmitted = activeStudents.length > 0 && activeStudents.every(s => s.midterm_submitted);
  const finalsSubmitted   = activeStudents.length > 0 && activeStudents.every(s => s.final_submitted);
  const stage             = !midtermsSubmitted ? 'midterm' : 'final';
  // Distinct terms (recent-first) and the courses for the selected term (the tabs).
  const terms = assignments.reduce((acc, a) => {
    if (!acc.some(t => String(t.id) === String(a.term_id))) acc.push({ id: a.term_id, display: a.term_display });
    return acc;
  }, []);
  const termAssignments = assignments.filter(a => String(a.term_id) === String(selectedTerm));
  // Progress is measured against the CURRENT stage (midterm first, then final).
  const stageDone = s => stage === 'midterm'
    ? (!!s.midterm_grade || s.midterm_is_inc)
    : (!!s.final_grade || s.final_is_inc);
  const encoded       = activeStudents.filter(stageDone).length;
  const pct           = activeStudents.length > 0 ? Math.round((encoded / activeStudents.length) * 100) : 0;
  const droppedCount  = students.filter(s => s.is_dropped).length;

  function renderStageCell(s, stageKey) {
    const isMid = stageKey === 'midterm';
    const uuid  = s.student_uuid;
    const g     = grades[uuid] || {};
    const numInput = val => (
      <input className="form-input ge-num" type="number" min="1" max="5" step="0.01"
        value={val} placeholder="1.00"
        onChange={e => updateVal(uuid, stageKey, e.target.value)}
        onBlur={() => blurVal(uuid, stageKey)} />
    );

    if (!isMid) {
      if (s.is_dropped) return <span className="ge-cell-muted">Dropped</span>;
      if (!midtermsSubmitted) return <span className="ge-cell-muted" title="Submit midterm grades first"><i className="ti ti-lock" /> Locked</span>;
      const editable = !s.final_submitted || s.final_is_inc;
      if (!editable) return <span className="ge-cell-locked"><i className="ti ti-lock" /> {s.final_is_inc ? 'INC' : (s.final_grade || '-')}</span>;
      const mode = s.final_is_inc ? 'inc' : 'grade';
      return (
        <div className="ge-cell">
          <select className="ge-mode" value={mode} onChange={e => changeStatus(uuid, 'final', e.target.value)}>
            <option value="grade">Grade</option>
            <option value="inc">INC</option>
          </select>
          {mode === 'grade' ? numInput(g.final_grade || '') : <span className="ge-badge inc">INC</span>}
        </div>
      );
    }

    // Midterm cell
    const editable = !s.midterm_submitted || s.midterm_is_inc;
    if (!editable) {
      const disp = s.is_dropped ? 'DRP' : (s.midterm_is_inc ? 'INC' : (s.midterm_grade || '-'));
      return <span className="ge-cell-locked"><i className="ti ti-lock" /> {disp}</span>;
    }
    const mode = s.is_dropped ? 'drp' : (s.midterm_is_inc ? 'inc' : 'grade');
    return (
      <div className="ge-cell">
        <select className="ge-mode" value={mode} onChange={e => changeStatus(uuid, 'midterm', e.target.value)}>
          <option value="grade">Grade</option>
          <option value="inc">INC</option>
          <option value="drp">DRP</option>
        </select>
        {mode === 'grade' && numInput(g.midterm_grade || '')}
        {mode === 'inc' && <span className="ge-badge inc">INC</span>}
        {mode === 'drp' && <span className="ge-badge drp">Dropped</span>}
      </div>
    );
  }

  const filteredStudents = search.trim()
    ? students.filter(s =>
        s.student_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.student_id_no || '').toLowerCase().includes(search.toLowerCase())
      )
    : students;

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">Teaching · {assignment ? assignment.term_display : 'Select a subject'}</div>
          <h2>Grade <em>encoding</em></h2>
          <div className="sub">Grades save automatically as you type. Submit <strong>midterms first</strong> — finals unlock once midterms are in. Submitting posts grades to your students.</div>
        </div>
        <div className="actions">
          {selectedAssignment && students.length > 0 && (
            <>
              {/* Stage 1 — midterms */}
              {!midtermsSubmitted && (
                <>
                  {forceStage === 'midterm' && (
                    <button className="btn-sec" disabled={submitting} onClick={() => handleSubmitStage('midterm', true)}>
                      <i className="ti ti-alert-triangle" /> Submit anyway
                    </button>
                  )}
                  <button className="btn-pri" disabled={submitting} onClick={() => handleSubmitStage('midterm', false)}>
                    <i className="ti ti-send" /> {submitting ? 'Submitting…' : 'Submit midterm grades'}
                  </button>
                </>
              )}
              {/* Stage 2 — finals */}
              {midtermsSubmitted && !finalsSubmitted && (
                <>
                  <button className="btn-sec" disabled={submitting} onClick={() => setShowReopen(true)}>
                    <i className="ti ti-lock-open" /> Request midterm reopen
                  </button>
                  {forceStage === 'final' && (
                    <button className="btn-sec" disabled={submitting} onClick={() => handleSubmitStage('final', true)}>
                      <i className="ti ti-alert-triangle" /> Submit anyway
                    </button>
                  )}
                  <button className="btn-pri" disabled={submitting} onClick={() => handleSubmitStage('final', false)}>
                    <i className="ti ti-send" /> {submitting ? 'Submitting…' : 'Submit final grades'}
                  </button>
                </>
              )}
              {midtermsSubmitted && finalsSubmitted && (
                <span className="tag status-active" style={{ fontSize: 12, padding: '8px 14px' }}>
                  <i className="ti ti-check" /> All grades submitted
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Subject sidebar + encoding sheet ── */}
      <div className="ge-layout">
        <aside className="ge-sidebar">
          <div className="ge-sidebar-head">Subjects</div>
          {loadingAssignments ? (
            <div className="ge-side-msg">Loading…</div>
          ) : assignments.length === 0 ? (
            <div className="ge-side-msg">No teaching assignments found.</div>
          ) : (
            <>
              {terms.length > 1 && (
                <div className="ge-side-term">
                  <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.display}</option>)}
                  </select>
                </div>
              )}
              {termAssignments.length === 0 ? (
                <div className="ge-side-msg">No courses this term.</div>
              ) : termAssignments.map(a => (
                <button
                  key={a.id}
                  type="button"
                  className={`ge-subject-btn${String(selectedAssignment) === String(a.id) ? ' active' : ''}`}
                  onClick={() => { setSelectedAssignment(String(a.id)); setError(''); setSearch(''); setForceStage(''); }}
                  title={`${a.subject_name} (${a.subject_units} units)`}
                >
                  <span className="ge-subject-code">{a.subject_code}{a.section ? ` [${a.section}]` : ''}</span>
                  <span className="ge-subject-name">{a.subject_name}</span>
                </button>
              ))}
            </>
          )}
        </aside>

        <div className="ge-main">
          {selectedAssignment && (
            <div className="toolbar" style={{ marginBottom: '1rem' }}>
              <div className="toolbar-search" style={{ marginLeft: 'auto' }}>
                <i className="ti ti-search" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by student name or ID…"
                />
              </div>
            </div>
          )}

          {/* ── Alerts ── */}
          {error && <div className="ge-flash ge-flash-err" onClick={() => setError('')}>{error}</div>}

          {/* ── Content area ── */}
          {!selectedAssignment ? (
            <div className="empty-state">
              <i className="ti ti-book-2" />
              <div className="t">No subject selected</div>
              <div className="d">Choose a subject from the list on the left to start encoding grades. If nothing is listed, declare a subject in Teaching Load or switch terms.</div>
            </div>
          ) : loadingStudents ? (
            <div className="ge-loading">Loading students…</div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <i className="ti ti-users" />
              <div className="t">No enrolled students</div>
              <div className="d">No approved-enrolled students found for this assignment.</div>
            </div>
          ) : (
            <>
          {/* ── Encoding status: stage + progress ── */}
          <div className={`ge-status ge-status--${finalsSubmitted ? 'done' : stage}`}>
            <div className="ge-status-top">
              <div className="ge-status-stage">
                <i className={`ti ${finalsSubmitted ? 'ti-circle-check' : stage === 'midterm' ? 'ti-number-1' : 'ti-number-2'}`} />
                <div>
                  <strong>
                    {finalsSubmitted ? 'All grades submitted'
                      : stage === 'midterm' ? 'Stage 1 — Midterm grades'
                      : 'Stage 2 — Final grades'}
                  </strong>
                  <span>
                    {finalsSubmitted ? 'This class is fully graded.'
                      : stage === 'midterm' ? 'Enter midterms for everyone, then submit. Finals unlock after that.'
                      : 'Midterms are in. Enter and submit finals; INC midterms can still be completed.'}
                  </span>
                </div>
              </div>
              <div className="ge-status-pct">{pct}<small>%</small></div>
            </div>
            <div className="ge-bar"><span style={{ width: `${pct}%` }} /></div>
            <div className="ge-status-counts">
              <span><b>{encoded}</b> {stage === 'midterm' ? 'midterm' : 'final'} done</span>
              <span><b>{Math.max(activeStudents.length - encoded, 0)}</b> pending</span>
              <span><b>{students.length}</b> on roster</span>
              {droppedCount > 0 && <span><b>{droppedCount}</b> dropped</span>}
            </div>
          </div>

          {/* ── Grade table ── */}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 130 }}>Student ID</th>
                  <th>Name</th>
                  <th style={{ width: 150 }}>Midterm</th>
                  <th style={{ width: 150 }}>Final</th>
                  <th style={{ width: 80 }}>Grade</th>
                  <th>Remarks</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th style={{ width: 100 }}>Auto-save</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(s => {
                  const g    = grades[s.student_uuid] || {};
                  const disp = s.grade || '-';
                  const st   = rowStatus[s.student_uuid];
                  return (
                    <tr key={s.student_uuid}
                      style={{ background: s.is_dropped ? 'rgba(120,113,108,.06)' : s.final_submitted ? 'rgba(5,150,105,.04)' : '#fff' }}>
                      <td className="muted num" style={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 12 }}>
                        {s.student_id_no}
                      </td>
                      <td>
                        <div className="row-user">
                          <div className="avatar sm">{initials(s.student_name)}</div>
                          <div className="meta"><div className="name">{s.student_name}</div></div>
                        </div>
                      </td>
                      <td>{renderStageCell(s, 'midterm')}</td>
                      <td>{renderStageCell(s, 'final')}</td>
                      <td className="num" style={{
                        fontFamily: "'Inter',sans-serif", fontWeight: 500, fontSize: 16,
                        color: disp === '-' ? 'var(--faint)' : gradeColor(disp),
                      }}>
                        {disp}
                      </td>
                      <td>
                        {s.is_dropped ? (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>{s.remarks || '-'}</span>
                        ) : (
                          <input
                            className="form-input"
                            type="text"
                            value={g.remarks || ''}
                            onChange={e => setGrades(prev => ({ ...prev, [s.student_uuid]: { ...prev[s.student_uuid], remarks: e.target.value } }))}
                            onBlur={() => {
                              // Remarks ride along with the current stage's save (needs a grade on record).
                              const sd = stage === 'midterm' ? (s.midterm_grade || s.midterm_is_inc) : (s.final_grade || s.final_is_inc);
                              if (sd) postCell(s.student_uuid, stage, stage === 'midterm'
                                ? (s.midterm_is_inc ? { status: 'inc' } : { status: 'grade', value: s.midterm_grade })
                                : (s.final_is_inc ? { status: 'inc' } : { status: 'grade', value: s.final_grade }));
                            }}
                            placeholder="Optional"
                            style={{ fontSize: 13, minWidth: 110 }}
                          />
                        )}
                      </td>
                      <td>
                        {s.is_dropped ? <span className="tag status-unverified">Dropped</span>
                          : s.final_submitted ? <span className="tag status-active">Final submitted</span>
                          : s.midterm_submitted ? <span className="tag pending">Midterm in</span>
                          : stageDone(s) ? <span className="tag pending">Ready</span>
                          : <span className="tag status-unverified">Empty</span>}
                      </td>
                      <td>
                        {st === 'saving' ? <span className="ge-save saving"><i className="ti ti-loader-2" /> Saving…</span>
                          : st === 'saved' ? <span className="ge-save saved"><i className="ti ti-check" /> Saved</span>
                          : st === 'error' ? <span className="ge-save err"><i className="ti ti-alert-circle" /> Not saved</span>
                          : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="pagination">
              <div className="count">
                Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> students
                {assignment && ` · ${assignment.subject_code}`}
              </div>
              <div className="controls">
                <button onClick={() => window.print()}>
                  <i className="ti ti-printer" style={{ marginRight: 4 }} /> Print sheet
                </button>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      </div>

      {/* ── Request midterm reopen modal ── */}
      {showReopen && (
        <div className="ge-overlay" onClick={() => !reopenSaving && setShowReopen(false)}>
          <form className="ge-modal" onClick={e => e.stopPropagation()} onSubmit={submitReopen}>
            <div className="ge-modal-title">Request midterm reopen</div>
            <p className="ge-modal-text">
              Midterm grades for <strong>{assignment ? `${assignment.subject_code}${assignment.section ? ` [${assignment.section}]` : ''}` : 'this subject'}</strong> are
              submitted and locked. Ask the admin to reopen them so you can correct a
              submitted numeric midterm. (INC midterms can already be edited.)
            </p>
            <label className="ge-modal-label">Reason (optional)</label>
            <textarea
              className="form-input"
              rows={3}
              value={reopenReason}
              onChange={e => setReopenReason(e.target.value)}
              placeholder="e.g. Encoded the wrong midterm for one student."
              style={{ width: '100%', resize: 'vertical' }}
            />
            <div className="ge-modal-actions">
              <button type="button" className="btn-sec" disabled={reopenSaving} onClick={() => setShowReopen(false)}>Cancel</button>
              <button type="submit" className="btn-pri" disabled={reopenSaving}>
                {reopenSaving ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

const CSS = `
  /* Two-column layout: subject list + encoding sheet */
  .ge-layout{display:grid;grid-template-columns:240px 1fr;gap:1.5rem;align-items:start;}
  .ge-layout > *{min-width:0;}
  .ge-main{min-width:0;}
  @media (max-width:820px){ .ge-layout{grid-template-columns:1fr;} }

  .ge-sidebar{border:1px solid var(--line);background:#fff;overflow:hidden;}
  .ge-sidebar-head{padding:.75rem 1rem;font-size:10px;font-weight:700;text-transform:uppercase;
    letter-spacing:.1em;color:var(--muted);border-bottom:1px solid var(--line-soft);background:var(--warm);}
  .ge-side-msg{padding:1rem;font-size:13px;color:var(--muted);}
  .ge-side-term{padding:.6rem .75rem;border-bottom:1px solid var(--line-soft);background:var(--warm);}
  .ge-side-term select{width:100%;font-size:12px;padding:6px 8px;}
  .ge-subject-btn{display:block;width:100%;text-align:left;padding:.7rem 1rem;background:none;border:none;
    border-bottom:1px solid var(--line-soft);cursor:pointer;transition:background .12s;}
  .ge-subject-btn:hover{background:var(--warm);}
  .ge-subject-btn.active{background:var(--cool);border-left:3px solid var(--ink);}
  .ge-subject-btn:last-child{border-bottom:none;}
  .ge-subject-code{display:block;font-size:11px;font-weight:700;color:var(--gold);
    text-transform:uppercase;letter-spacing:.08em;}
  .ge-subject-name{display:block;font-size:12px;color:var(--ink);margin-top:2px;font-weight:500;}

  /* Auto-save row indicator */
  .ge-save{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;
    letter-spacing:.02em;white-space:nowrap;}
  .ge-save i{font-size:14px;}
  .ge-save.idle{color:var(--faint);font-weight:500;}
  .ge-save.saving{color:var(--muted);}
  .ge-save.saving i{animation:ge-spin .8s linear infinite;}
  .ge-save.saved{color:var(--green);}
  .ge-save.err{color:var(--red);}
  @keyframes ge-spin{to{transform:rotate(360deg);}}

  .ge-flash{padding:10px 16px;margin-bottom:1rem;font-size:13px;cursor:pointer;border:1px solid}
  .ge-flash-err{background:var(--red-tint);color:var(--red);border-color:#fca5a5}
  .ge-flash-ok{background:var(--green-tint);color:var(--green);border-color:#6ee7b7}
  .ge-loading{color:var(--muted);padding:2rem 0;font-size:13px}

  /* Encoding-status progress header */
  .ge-status{border:1px solid var(--line);background:#fff;padding:1.15rem 1.35rem;margin-bottom:1.25rem;
    border-left:3px solid var(--gold);}
  .ge-status--final{border-left-color:var(--ink);}
  .ge-status--done{border-left-color:var(--green);}
  .ge-status-top{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1rem;}
  .ge-status-stage{display:flex;gap:13px;align-items:flex-start;min-width:0;}
  .ge-status-stage > i{font-size:24px;flex:none;color:var(--gold);margin-top:2px;}
  .ge-status--final .ge-status-stage > i{color:var(--ink);}
  .ge-status--done .ge-status-stage > i{color:var(--green);}
  .ge-status-stage strong{display:block;font-family:'Inter',sans-serif;font-weight:500;font-size:16px;
    color:var(--ink);letter-spacing:-.01em;}
  .ge-status-stage span{display:block;font-size:12.5px;color:var(--muted);margin-top:3px;line-height:1.5;max-width:560px;}
  .ge-status-pct{font-family:'Inter',sans-serif;font-weight:500;font-size:30px;color:var(--ink);
    letter-spacing:-.02em;line-height:1;font-variant-numeric:tabular-nums;flex:none;}
  .ge-status-pct small{font-size:15px;color:var(--muted);margin-left:1px;}
  .ge-bar{height:8px;background:var(--line-soft);overflow:hidden;}
  .ge-bar span{display:block;height:100%;background:var(--gold);transition:width .5s cubic-bezier(.4,0,.2,1);}
  .ge-status--final .ge-bar span{background:var(--ink);}
  .ge-status--done .ge-bar span{background:var(--green);}
  .ge-status-counts{display:flex;flex-wrap:wrap;gap:.4rem 1.75rem;margin-top:.9rem;font-size:12.5px;color:var(--muted);}
  .ge-status-counts b{color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums;margin-right:4px;}

  /* Grade stage cells */
  .ge-cell{display:flex;align-items:center;gap:6px;}
  .ge-mode{font-size:11px;padding:5px 4px;min-width:64px;}
  .ge-num{width:70px;padding:6px 8px;font-size:13px;text-align:right;}
  .ge-badge{font-size:11px;font-weight:700;padding:3px 8px;letter-spacing:.05em;}
  .ge-badge.inc{background:var(--amber-tint,#fef3c7);color:var(--amber,#b45309);}
  .ge-badge.drp{background:var(--line-soft);color:var(--muted);}
  .ge-cell-locked{display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:600;color:var(--ink);}
  .ge-cell-locked i{font-size:13px;color:var(--faint);}
  .ge-cell-muted{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--faint);}

  /* Reopen modal */
  .ge-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;
    justify-content:center;padding:1rem;z-index:1000;}
  .ge-modal{background:#fff;border:1px solid var(--line);width:100%;max-width:440px;padding:1.5rem;
    box-sizing:border-box;max-height:90vh;overflow-y:auto;box-shadow:0 20px 50px rgba(0,0,0,.2);}
  .ge-modal-title{font-family:'Inter',sans-serif;font-weight:600;font-size:18px;color:var(--ink);margin-bottom:.5rem;}
  .ge-modal-text{font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:1rem;}
  .ge-modal-label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;
    letter-spacing:.06em;color:var(--muted);margin-bottom:5px;}
  .ge-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:1.25rem;}
`;
