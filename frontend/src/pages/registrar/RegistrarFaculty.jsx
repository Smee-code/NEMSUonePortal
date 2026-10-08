import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';

const EMPTY_FACULTY = {
  full_name: '', institutional_email: '', student_id: '', contact_number: '',
  department: '', is_gec_faculty: false, program: '', rank: '', password: '',
};

// Academic ranks — COS through the NBC 461 ladder (must match the backend list).
const FACULTY_RANKS = [
  'COS',
  'Instructor I', 'Instructor II', 'Instructor III',
  'Assistant Professor I', 'Assistant Professor II', 'Assistant Professor III', 'Assistant Professor IV',
  'Associate Professor I', 'Associate Professor II', 'Associate Professor III', 'Associate Professor IV', 'Associate Professor V',
  'Professor I', 'Professor II', 'Professor III', 'Professor IV', 'Professor V', 'Professor VI',
];
const RANK_LABEL = r => (r === 'COS' ? 'COS (Contract of Service)' : r);

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

const CSS = `
/* ── Header ── */
.fac-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; padding-bottom:1.1rem; margin-bottom:1.3rem; border-bottom:1px solid var(--reg-line); flex-wrap:wrap; }
.fac-head h1{ margin:0; font:600 24px/1.15 'Inter',sans-serif; color:var(--reg-ink); letter-spacing:-.015em; }
.fac-lede{ margin:.4rem 0 0; font-size:13.5px; color:var(--reg-muted); max-width:66ch; line-height:1.5; }
.fac-add{ display:inline-flex; align-items:center; gap:6px; padding:9px 15px; border:1px solid var(--reg-ink); background:var(--reg-ink); color:#fff; font:600 12.5px 'Inter',sans-serif; cursor:pointer; transition:filter .14s; }
.fac-add:hover{ filter:brightness(1.15); }

/* ── Ink avatar ── */
.fac-av{ border-radius:50%; background:var(--reg-ink); color:#fff; display:flex; align-items:center; justify-content:center; font-family:'Inter',sans-serif; font-weight:600; flex-shrink:0; }

/* ── Department overview ── */
.fac-depts{ display:grid; grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr)); gap:12px; }
.fac-dept{ display:flex; align-items:center; gap:14px; background:#fff; border:1px solid var(--reg-line); padding:16px 18px; cursor:pointer; text-align:left; font-family:inherit; transition:border-color .14s, box-shadow .14s; }
.fac-dept:hover{ border-color:var(--reg-ink); box-shadow:0 10px 26px -18px rgba(10,22,40,.5); }
.fac-dept-ico{ width:42px; height:42px; background:var(--reg-cool-2); color:var(--reg-ink); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.fac-dept-ico i{ font-size:20px; }
.fac-dept-body{ flex:1; min-width:0; }
.fac-dept-name{ font:600 14.5px 'Inter',sans-serif; color:var(--reg-ink); line-height:1.25; }
.fac-dept-code{ font-size:11px; color:var(--reg-gold); font-weight:600; margin-top:2px; }
.fac-dept-n{ text-align:right; flex-shrink:0; }
.fac-dept-n b{ display:block; font:600 22px/1 'Inter',sans-serif; color:var(--reg-ink); font-variant-numeric:tabular-nums; }
.fac-dept-n span{ font-size:11px; color:var(--reg-muted); }

/* ── Department opened ── */
.fac-bar{ display:flex; align-items:center; gap:1rem; margin-bottom:1.4rem; flex-wrap:wrap; }
.fac-back{ display:inline-flex; align-items:center; gap:6px; padding:8px 13px; border:1px solid var(--reg-line); background:#fff; color:var(--reg-ink); font:600 12.5px 'Inter',sans-serif; cursor:pointer; }
.fac-back:hover{ border-color:var(--reg-ink); background:var(--reg-warm); }
.fac-bar-title{ font:600 18px 'Inter',sans-serif; color:var(--reg-ink); letter-spacing:-.01em; }
.fac-bar-search{ margin-left:auto; display:flex; align-items:center; gap:8px; border:1px solid var(--reg-line); background:#fff; padding:0 12px; min-width:220px; }
.fac-bar-search:focus-within{ border-color:var(--reg-ink); }
.fac-bar-search i{ color:var(--reg-faint); font-size:15px; }
.fac-bar-search input{ border:none; outline:none; padding:8px 0; font:13px 'Inter',sans-serif; background:none; color:var(--reg-ink); flex:1; }

/* ── Classification groups ── */
.fac-group{ margin-bottom:1.75rem; }
.fac-group-head{ display:flex; align-items:baseline; justify-content:space-between; padding-bottom:.5rem; margin-bottom:.85rem; border-bottom:1px solid var(--reg-line); }
.fac-group-name{ font:600 14px 'Inter',sans-serif; color:var(--reg-ink); }
.fac-group-count{ font-size:12px; color:var(--reg-muted); font-variant-numeric:tabular-nums; }
.fac-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr)); gap:10px; }

/* ── Faculty card ── */
.fac-card{ display:flex; align-items:center; gap:12px; background:#fff; border:1px solid var(--reg-line); padding:12px 14px; cursor:pointer; font-family:inherit; text-align:left; transition:border-color .14s; }
.fac-card:hover{ border-color:var(--reg-ink); }
.fac-card-body{ min-width:0; flex:1; }
.fac-card-name{ font:600 14px 'Inter',sans-serif; color:var(--reg-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fac-card-sub{ font:11.5px ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--reg-muted); margin-top:2px; }
.fac-card-load{ font-size:11px; color:var(--reg-faint); margin-top:3px; }

/* ── Modal (shared) ── */
.fac-modal-backdrop{ position:fixed; inset:0; background:rgba(10,22,40,.5); display:flex; align-items:flex-start; justify-content:center; z-index:1000; padding:6vh 1rem; overflow-y:auto; }
.fac-modal{ background:#fff; width:100%; max-width:900px; border:1px solid var(--reg-line); box-shadow:0 24px 60px -20px rgba(10,22,40,.5); display:flex; flex-direction:column; overflow:hidden; max-height:88vh; }
.fac-modal-header{ display:flex; justify-content:space-between; align-items:flex-start; padding:1.25rem 1.5rem 1.1rem; border-bottom:1px solid var(--reg-line); flex-shrink:0; }
.fac-modal-title{ margin:0; font:600 19px 'Inter',sans-serif; color:var(--reg-ink); }
.fac-modal-x{ border:1px solid var(--reg-line); background:#fff; color:var(--reg-muted); cursor:pointer; padding:7px 9px; display:inline-flex; }
.fac-modal-x:hover{ border-color:var(--reg-ink); color:var(--reg-ink); }
.fac-modal-figs{ display:flex; flex-wrap:wrap; background:var(--reg-warm); border-bottom:1px solid var(--reg-line); flex-shrink:0; }
.fac-fig{ padding:12px 20px; border-right:1px solid var(--reg-line-soft); }
.fac-fig:last-child{ border-right:none; }
.fac-fig b{ display:block; font:600 20px 'Inter',sans-serif; color:var(--reg-ink); font-variant-numeric:tabular-nums; }
.fac-fig span{ font-size:11px; color:var(--reg-muted); }
.fac-modal-body{ padding:1.25rem 1.5rem; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:.85rem; }
.fac-term-block{ border:1px solid var(--reg-line); overflow:hidden; }
.fac-term-block.current{ border-color:var(--reg-ink); }
.fac-term-header{ width:100%; border:none; border-bottom:1px solid var(--reg-line); padding:.75rem 1rem; cursor:pointer; display:flex; justify-content:space-between; align-items:center; text-align:left; background:var(--reg-warm); }
.fac-term-header.current{ background:var(--reg-cool-2); }

/* ── Add-faculty form ── */
.rf-field{display:flex;flex-direction:column;gap:5px}
.rf-row{display:flex;gap:.85rem;flex-wrap:wrap}
.rf-row > .rf-field{flex:1;min-width:180px}
.rf-label{font-size:11px;font-weight:600;color:var(--reg-ink)}
.rf-opt{font-weight:400;color:var(--reg-faint)}
.rf-input{padding:9px 12px;border:1px solid var(--reg-line);background:#fff;font:13px/1.4 'Inter',sans-serif;color:var(--reg-ink);outline:none;width:100%;box-sizing:border-box}
.rf-input:focus{border-color:var(--reg-ink)}
.rf-check{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--reg-ink);cursor:pointer}
`;

export default function RegistrarFaculty() {
  const toast = useToast();
  const [faculty,       setFaculty]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [selectedDept,  setSelectedDept]  = useState(null);   // department block opened

  const [selected,      setSelected]      = useState(null);
  const [detail,        setDetail]        = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError,   setDetailError]   = useState('');
  const [expandedTerms, setExpandedTerms] = useState({});

  // Add-faculty modal
  const [showCreate,  setShowCreate]  = useState(false);
  const [createForm,  setCreateForm]  = useState(EMPTY_FACULTY);
  const [creating,    setCreating]    = useState(false);
  const [createErr,   setCreateErr]   = useState('');
  const [departments, setDepartments] = useState([]);
  const [programs,    setPrograms]    = useState([]);

  // Edit-faculty modal
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(null);   // { id, full_name, student_id, email, contact_number, department, program, is_gec_faculty, rank }
  const [editing,  setEditing]  = useState(false);
  const [editErr,  setEditErr]  = useState('');
  const [deleting, setDeleting] = useState(false);

  function fetchFaculty() {
    setLoading(true);
    api.get('/grades/registrar/faculty/')
      .then(res => setFaculty(res.data))
      .catch(() => setError('Failed to load faculty list.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchFaculty();
    api.get('/auth/departments/').then(r => setDepartments(r.data || [])).catch(() => {});
    api.get('/enrollment/programs/').then(r => setPrograms(r.data?.results ?? r.data ?? [])).catch(() => {});
  }, []);

  function setCF(field, value) { setCreateForm(f => ({ ...f, [field]: value })); }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setCreateErr('');
    try {
      const payload = {
        full_name:           createForm.full_name.trim(),
        institutional_email: createForm.institutional_email.trim(),
        student_id:          createForm.student_id.trim(),
        contact_number:      createForm.contact_number.trim(),
        role:                'faculty',
        password:            createForm.password,
        department:          createForm.department,
        is_gec_faculty:      createForm.is_gec_faculty,
      };
      if (createForm.rank) payload.rank = createForm.rank;
      if (!createForm.is_gec_faculty && createForm.program) payload.program = Number(createForm.program);
      await api.post('/auth/registrar/faculty/', payload);
      toast(`Faculty account for ${payload.full_name} created.`, { type: 'success' });
      setShowCreate(false);
      setCreateForm(EMPTY_FACULTY);
      fetchFaculty();
    } catch (err) {
      const d = err.response?.data;
      setCreateErr(
        (d && typeof d === 'object') ? Object.values(d).flat().join(' ') : 'Failed to create faculty account.'
      );
    } finally {
      setCreating(false);
    }
  }

  function setEF(field, value) { setEditForm(f => ({ ...f, [field]: value })); }

  function openEdit(f) {
    setEditErr('');
    setEditForm({
      id:             f.id,
      full_name:      f.full_name || '',
      student_id:     f.faculty_id || '',
      email:          f.email || '',
      contact_number: f.contact_number || '',
      department:     f.department_code || '',
      program:        f.program_id ? String(f.program_id) : '',
      is_gec_faculty: !!f.is_gec_faculty,
      rank:           f.rank || '',
    });
    setShowEdit(true);
  }

  async function handleEdit(e) {
    e.preventDefault();
    setEditing(true);
    setEditErr('');
    try {
      const payload = {
        full_name:      editForm.full_name.trim(),
        contact_number: editForm.contact_number.trim(),
        department:     editForm.department,
        is_gec_faculty: editForm.is_gec_faculty,
        rank:           editForm.rank,
        program:        (!editForm.is_gec_faculty && editForm.program) ? Number(editForm.program) : null,
      };
      await api.patch(`/auth/registrar/faculty/${editForm.id}/`, payload);
      toast(`${payload.full_name}'s information updated.`, { type: 'success' });
      setShowEdit(false);
      setSelected(null);
      fetchFaculty();
    } catch (err) {
      const d = err.response?.data;
      setEditErr(
        (d && typeof d === 'object') ? Object.values(d).flat().join(' ') : 'Failed to update faculty.'
      );
    } finally {
      setEditing(false);
    }
  }

  async function handleDelete(f) {
    const ok = window.confirm(
      `Delete faculty "${f.full_name}"?\n\n` +
      'If this faculty has teaching load, encoded grades, or posted announcements, ' +
      'the account will be deactivated (disabled) instead of deleted so records are kept. ' +
      'Otherwise it is permanently removed.'
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/auth/registrar/faculty/${f.id}/`);
      toast(res.data?.message || 'Faculty removed.', {
        type: res.data?.status === 'deleted' ? 'success' : 'warn',
      });
      setSelected(null);
      fetchFaculty();
    } catch (err) {
      const d = err.response?.data;
      toast(
        (d && (d.error || (typeof d === 'object' && Object.values(d).flat().join(' ')))) ||
          'Failed to delete faculty.',
        { type: 'error' }
      );
    } finally {
      setDeleting(false);
    }
  }

  function openDetail(f) {
    setSelected(f);
    setDetail(null);
    setDetailError('');
    setExpandedTerms({});
    setDetailLoading(true);
    api.get(`/grades/registrar/faculty/${f.id}/`)
      .then(res => {
        setDetail(res.data);
        const expanded = {};
        res.data.terms.forEach(t => { if (t.is_current) expanded[t.term_id] = true; });
        setExpandedTerms(expanded);
      })
      .catch(() => setDetailError('Failed to load faculty details.'))
      .finally(() => setDetailLoading(false));
  }

  function toggleTerm(termId) {
    setExpandedTerms(prev => ({ ...prev, [termId]: !prev[termId] }));
  }

  // Group faculty by department for the department-block view.
  const deptMap = {};
  faculty.forEach(f => {
    const code = f.department_code || 'UNASSIGNED';
    if (!deptMap[code]) deptMap[code] = { code, name: f.department_name || 'Unassigned', list: [] };
    deptMap[code].list.push(f);
  });
  const deptBlocks = Object.values(deptMap).sort((a, b) => a.code.localeCompare(b.code));

  // Faculty within the opened department, filtered by search and grouped by classification.
  const deptFaculty = (selectedDept ? deptMap[selectedDept.code]?.list ?? [] : []).filter(f => {
    const q = search.trim().toLowerCase();
    return !q || f.full_name.toLowerCase().includes(q) || (f.faculty_id || '').toLowerCase().includes(q);
  });
  const classGroups = {};
  deptFaculty.forEach(f => {
    const key = f.classification || 'Unclassified';
    (classGroups[key] = classGroups[key] || []).push(f);
  });
  // Core-program groups first, GEC and Unclassified last.
  const groupOrder = Object.keys(classGroups).sort((a, b) => {
    const rank = k => (k === 'GEC Faculty' ? 1 : k === 'Unclassified' ? 2 : 0);
    return rank(a) - rank(b) || a.localeCompare(b);
  });

  return (
    <>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <header className="fac-head">
        <div>
          <h1>Faculty</h1>
          <p className="fac-lede">
            {selectedDept
              ? `${selectedDept.name} — faculty grouped by their program, or as GEC faculty.`
              : `${faculty.length} faculty across ${deptBlocks.length} department${deptBlocks.length !== 1 ? 's' : ''}. Open one to see its roster, or add a new member.`}
          </p>
        </div>
        <button className="fac-add" onClick={() => { setCreateForm(EMPTY_FACULTY); setCreateErr(''); setShowCreate(true); }}>
          <i className="ti ti-plus" /> Add faculty
        </button>
      </header>

      {error && (
        <div style={{ background: 'var(--reg-red-tint)', color: 'var(--reg-red)', padding: '.75rem', marginBottom: '1rem', fontSize: '.9rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty"><i className="ti ti-loader" /><div className="t">Loading faculty…</div></div>
      ) : !selectedDept ? (
        deptBlocks.length === 0 ? (
          <div className="empty"><i className="ti ti-building" /><div className="t">No departments found.</div></div>
        ) : (
          <div className="fac-depts">
            {deptBlocks.map(d => (
              <button key={d.code} className="fac-dept" onClick={() => { setSelectedDept(d); setSearch(''); }}>
                <div className="fac-dept-ico"><i className="ti ti-building-bank" /></div>
                <div className="fac-dept-body">
                  <div className="fac-dept-name">{d.name}</div>
                  <div className="fac-dept-code">{d.code}</div>
                </div>
                <div className="fac-dept-n"><b>{d.list.length}</b><span>faculty</span></div>
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="fac-bar">
            <button className="fac-back" onClick={() => { setSelectedDept(null); setSearch(''); }}>
              <i className="ti ti-arrow-left" /> All departments
            </button>
            <div className="fac-bar-title">{selectedDept.name}</div>
            <div className="fac-bar-search">
              <i className="ti ti-search" />
              <input placeholder="Search faculty…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {groupOrder.length === 0 ? (
            <div className="empty"><i className="ti ti-user-search" /><div className="t">No faculty match your search.</div></div>
          ) : groupOrder.map(group => (
            <div key={group} className="fac-group">
              <div className="fac-group-head">
                <span className="fac-group-name">{group}</span>
                <span className="fac-group-count">{classGroups[group].length}</span>
              </div>
              <div className="fac-grid">
                {classGroups[group].map(f => (
                  <button key={f.id} className="fac-card" onClick={() => openDetail(f)}>
                    <div className="fac-av" style={{ width: 42, height: 42, fontSize: 13 }}>{initials(f.full_name)}</div>
                    <div className="fac-card-body">
                      <div className="fac-card-name">{f.full_name}</div>
                      <div className="fac-card-sub">{f.faculty_id || f.email}</div>
                      <div className="fac-card-load">{f.rank ? `${f.rank} · ` : ''}{f.current_term_load} this term · {f.total_assignments} all-time</div>
                    </div>
                    <i className="ti ti-chevron-right" style={{ color: 'var(--reg-faint)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      {/* ── Faculty Detail Modal ── */}
      {selected && (
        <div className="fac-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="fac-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="fac-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div className="fac-av" style={{ width: 48, height: 48, fontSize: 15 }}>{initials(selected.full_name)}</div>
                <div style={{ minWidth: 0 }}>
                  <h2 className="fac-modal-title">{selected.full_name}</h2>
                  <p style={{ margin: '.25rem 0 0', fontSize: '.85rem', color: 'var(--reg-muted)' }}>
                    {selected.faculty_id}
                    {selected.rank && <> · {selected.rank}</>}
                    {selected.department_name && <> · {selected.department_name}</>}
                  </p>
                  <p style={{ margin: '.15rem 0 0', fontSize: '.82rem', color: 'var(--reg-faint)' }}>
                    {selected.email}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button className="btn-sec" onClick={() => openEdit(selected)}>
                  <i className="ti ti-edit" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(selected)}
                  disabled={deleting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 15px',
                    border: '1px solid var(--reg-red)', background: 'var(--reg-red-tint)', color: 'var(--reg-red)',
                    font: "600 12.5px 'Inter',sans-serif", cursor: deleting ? 'default' : 'pointer' }}
                >
                  <i className="ti ti-trash" /> {deleting ? 'Deleting…' : 'Delete'}
                </button>
                <button className="fac-modal-x" onClick={() => setSelected(null)}>
                  <i className="ti ti-x" />
                </button>
              </div>
            </div>

            {/* Figures */}
            {detail && (
              <div className="fac-modal-figs">
                <div className="fac-fig">
                  <b>{selected.current_term_load}</b>
                  <span>Subjects this term</span>
                </div>
                <div className="fac-fig">
                  <b>{selected.total_assignments}</b>
                  <span>Subjects all-time</span>
                </div>
                <div className="fac-fig">
                  <b>{detail.terms.length}</b>
                  <span>Terms on record</span>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="fac-modal-body">
              {detailLoading && (
                <p style={{ color: 'var(--reg-muted)' }}>Loading teaching history…</p>
              )}
              {detailError && (
                <div style={{ background: 'var(--reg-red-tint)', color: 'var(--reg-red)', padding: '.75rem', borderRadius: 6, fontSize: '.9rem' }}>
                  {detailError}
                </div>
              )}

              {detail && detail.terms.length === 0 && (
                <p style={{ color: 'var(--reg-muted)', fontSize: '.9rem' }}>
                  No teaching assignments found for this faculty member.
                </p>
              )}

              {detail && detail.terms.filter(t => t.is_current).map(term => (
                <div key={term.term_id} className={`fac-term-block${term.is_current ? ' current' : ''}`}>
                  <button
                    className={`fac-term-header${term.is_current ? ' current' : ''}`}
                    onClick={() => toggleTerm(term.term_id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      {term.is_current && (
                        <span className="tag approved" style={{ fontSize: '.68rem', padding: '1px 8px' }}>Current</span>
                      )}
                      <span style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--reg-ink)' }}>
                        {term.term_display}
                      </span>
                      <span style={{ color: 'var(--reg-muted)', fontSize: '.82rem' }}>
                        {term.assignments.length} subject{term.assignments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <i className={`ti ti-chevron-${expandedTerms[term.term_id] ? 'up' : 'down'}`}
                      style={{ color: 'var(--reg-faint)', fontSize: '1rem' }} />
                  </button>

                  {expandedTerms[term.term_id] && (
                    <div style={{ overflowX: 'auto', maxHeight: 380 }}>
                      <table className="table">
                        <thead>
                          <tr>
                            {['Subject Code', 'Subject Name', 'Units', 'Year Level', 'Type', 'Students', 'Grades', 'Schedule'].map(h => (
                              <th key={h} style={{ position: 'sticky', top: 0, zIndex: 1 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {term.assignments.map(a => (
                            <tr key={a.id}>
                              <td style={{ fontWeight: 700, color: 'var(--reg-cool)', whiteSpace: 'nowrap' }}>
                                {a.subject_code}
                              </td>
                              <td style={{ fontSize: '.85rem' }}>{a.subject_name}</td>
                              <td style={{ textAlign: 'center', fontSize: '.85rem' }}>{a.subject_units}</td>
                              <td style={{ fontSize: '.82rem', whiteSpace: 'nowrap', color: 'var(--reg-muted)' }}>
                                {a.year_level_display || '-'}
                              </td>
                              <td>
                                <span className={`tag ${a.subject_type === 'major' ? 'pending' : 'outline'}`}>
                                  {a.subject_type_display}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  background: a.student_count > 0 ? '#eff6ff' : '#f9fafb',
                                  color: a.student_count > 0 ? '#1e40af' : 'var(--reg-faint)',
                                  borderRadius: 20, padding: '1px 9px',
                                  fontWeight: 700, fontSize: '.8rem',
                                }}>
                                  {a.student_count}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', fontSize: '.82rem' }}>
                                {a.grades_submitted > 0 ? (
                                  <span style={{ color: 'var(--reg-green)', fontWeight: 600 }}>
                                    {a.grades_submitted} submitted
                                  </span>
                                ) : a.grades_encoded > 0 ? (
                                  <span style={{ color: 'var(--reg-amber)' }}>
                                    {a.grades_encoded} encoded
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--reg-faint)' }}>-</span>
                                )}
                              </td>
                              <td style={{ fontSize: '.82rem', whiteSpace: 'nowrap', color: 'var(--reg-ink-2)' }}>
                                {a.schedule ? (
                                  <>
                                    <div style={{ fontWeight: 600 }}>{a.schedule.day}</div>
                                    <div style={{ color: 'var(--reg-muted)' }}>
                                      {a.schedule.start_time} – {a.schedule.end_time}
                                    </div>
                                    <div style={{ color: 'var(--reg-faint)' }}>{a.schedule.room}</div>
                                  </>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Add faculty modal ── */}
      {showCreate && (
        <div className="fac-modal-backdrop" onClick={() => !creating && setShowCreate(false)}>
          <form className="fac-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()} onSubmit={handleCreate}>
            <div className="fac-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--reg-ink)' }}>Add faculty</h3>
                <div style={{ fontSize: 12, color: 'var(--reg-muted)', marginTop: 4 }}>
                  Create a new faculty account. Share the initial password with the faculty member.
                </div>
              </div>
              <button type="button" className="reg-icon-btn" onClick={() => setShowCreate(false)} disabled={creating}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="fac-modal-body" style={{ gap: '.85rem' }}>
              {createErr && (
                <div style={{ background: 'var(--reg-red-tint)', color: 'var(--reg-red)', padding: '.6rem .85rem', fontSize: 13 }}>{createErr}</div>
              )}

              <div className="rf-field">
                <label className="rf-label">Full name</label>
                <input className="rf-input" required value={createForm.full_name}
                  onChange={e => setCF('full_name', e.target.value)} placeholder="Dela Cruz, Juan A." />
              </div>

              <div className="rf-row">
                <div className="rf-field">
                  <label className="rf-label">Faculty ID</label>
                  <input className="rf-input" required value={createForm.student_id}
                    onChange={e => setCF('student_id', e.target.value)} placeholder="FAC-2026-001" />
                </div>
                <div className="rf-field">
                  <label className="rf-label">Contact number <span className="rf-opt">(optional)</span></label>
                  <input className="rf-input" value={createForm.contact_number}
                    onChange={e => setCF('contact_number', e.target.value)} placeholder="09xxxxxxxxx" />
                </div>
              </div>

              <div className="rf-field">
                <label className="rf-label">Institutional email</label>
                <input className="rf-input" type="email" required value={createForm.institutional_email}
                  onChange={e => setCF('institutional_email', e.target.value)} placeholder="juan.delacruz@nemsu.edu.ph" />
              </div>

              <div className="rf-row">
                <div className="rf-field">
                  <label className="rf-label">Department <span className="rf-opt">(optional)</span></label>
                  <select className="rf-input" value={createForm.department} onChange={e => setCF('department', e.target.value)}>
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id ?? d.code} value={d.code}>{d.code} — {d.name}</option>)}
                  </select>
                </div>
                <div className="rf-field">
                  <label className="rf-label">Academic rank <span className="rf-opt">(optional)</span></label>
                  <select className="rf-input" value={createForm.rank} onChange={e => setCF('rank', e.target.value)}>
                    <option value="">Select rank</option>
                    {FACULTY_RANKS.map(r => <option key={r} value={r}>{RANK_LABEL(r)}</option>)}
                  </select>
                </div>
              </div>

              <label className="rf-check">
                <input type="checkbox" checked={createForm.is_gec_faculty}
                  onChange={e => setCF('is_gec_faculty', e.target.checked)} />
                GEC faculty (teaches general-education courses across programs)
              </label>

              {!createForm.is_gec_faculty && (
                <div className="rf-field">
                  <label className="rf-label">Core program <span className="rf-opt">(optional)</span></label>
                  <select className="rf-input" value={createForm.program} onChange={e => setCF('program', e.target.value)}>
                    <option value="">Select program</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select>
                </div>
              )}

              <div className="rf-field">
                <label className="rf-label">Initial password</label>
                <input className="rf-input" type="text" required minLength={12} value={createForm.password}
                  onChange={e => setCF('password', e.target.value)} placeholder="At least 12 characters" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--reg-line)' }}>
              <button type="button" className="btn-sec" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
              <button type="submit" className="btn-pri" disabled={creating}>
                {creating ? 'Creating…' : <><i className="ti ti-plus" /> Create faculty</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Edit Faculty Modal ── */}
      {showEdit && editForm && (
        <div className="fac-modal-backdrop" onClick={() => !editing && setShowEdit(false)}>
          <form className="fac-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()} onSubmit={handleEdit}>
            <div className="fac-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--reg-ink)' }}>Edit faculty</h3>
                <div style={{ fontSize: 12, color: 'var(--reg-muted)', marginTop: 4 }}>
                  Update this faculty member’s information. Email and faculty ID are kept by the registrar’s office.
                </div>
              </div>
              <button type="button" className="reg-icon-btn" onClick={() => setShowEdit(false)} disabled={editing}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="fac-modal-body" style={{ gap: '.85rem' }}>
              {editErr && (
                <div style={{ background: 'var(--reg-red-tint)', color: 'var(--reg-red)', padding: '.6rem .85rem', fontSize: 13 }}>{editErr}</div>
              )}

              <div className="rf-field">
                <label className="rf-label">Full name</label>
                <input className="rf-input" required value={editForm.full_name}
                  onChange={e => setEF('full_name', e.target.value)} placeholder="Dela Cruz, Juan A." />
              </div>

              <div className="rf-row">
                <div className="rf-field">
                  <label className="rf-label">Faculty ID <span className="rf-opt">(not editable)</span></label>
                  <input className="rf-input" value={editForm.student_id} readOnly disabled
                    style={{ background: 'var(--reg-warm)', color: 'var(--reg-muted)' }} />
                </div>
                <div className="rf-field">
                  <label className="rf-label">Contact number <span className="rf-opt">(optional)</span></label>
                  <input className="rf-input" value={editForm.contact_number}
                    onChange={e => setEF('contact_number', e.target.value)} placeholder="09xxxxxxxxx" />
                </div>
              </div>

              <div className="rf-field">
                <label className="rf-label">Institutional email <span className="rf-opt">(not editable)</span></label>
                <input className="rf-input" value={editForm.email} readOnly disabled
                  style={{ background: 'var(--reg-warm)', color: 'var(--reg-muted)' }} />
              </div>

              <div className="rf-row">
                <div className="rf-field">
                  <label className="rf-label">Department <span className="rf-opt">(optional)</span></label>
                  <select className="rf-input" value={editForm.department} onChange={e => setEF('department', e.target.value)}>
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id ?? d.code} value={d.code}>{d.code} — {d.name}</option>)}
                  </select>
                </div>
                <div className="rf-field">
                  <label className="rf-label">Academic rank <span className="rf-opt">(optional)</span></label>
                  <select className="rf-input" value={editForm.rank} onChange={e => setEF('rank', e.target.value)}>
                    <option value="">Select rank</option>
                    {FACULTY_RANKS.map(r => <option key={r} value={r}>{RANK_LABEL(r)}</option>)}
                  </select>
                </div>
              </div>

              <label className="rf-check">
                <input type="checkbox" checked={editForm.is_gec_faculty}
                  onChange={e => setEF('is_gec_faculty', e.target.checked)} />
                GEC faculty (teaches general-education courses across programs)
              </label>

              {!editForm.is_gec_faculty && (
                <div className="rf-field">
                  <label className="rf-label">Core program <span className="rf-opt">(optional)</span></label>
                  <select className="rf-input" value={editForm.program} onChange={e => setEF('program', e.target.value)}>
                    <option value="">Select program</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--reg-line)' }}>
              <button type="button" className="btn-sec" onClick={() => setShowEdit(false)} disabled={editing}>Cancel</button>
              <button type="submit" className="btn-pri" disabled={editing}>
                {editing ? 'Saving…' : <><i className="ti ti-device-floppy" /> Save changes</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
