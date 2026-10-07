import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useToast } from './Toast';

const YEARS = [1, 2, 3, 4];
const YEAR_LABEL = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

export default function BlockManager() {
  const toast = useToast();

  const [term, setTerm]           = useState(null);
  const [departments, setDepts]   = useState([]);
  const [programs, setPrograms]   = useState([]);
  const [loading, setLoading]     = useState(true);

  const [dept, setDept]           = useState(null);   // selected department
  const [program, setProgram]     = useState(null);   // selected program
  const [blocks, setBlocks]       = useState([]);
  const [blocksLoading, setBL]    = useState(false);

  // Year-level modal (shows that year's blocks + generate/manage controls)
  const [yearModal, setYearModal] = useState(null);   // { year_level }
  const [genOpen, setGenOpen]     = useState(false);   // inline generate form toggled in the year modal
  const [genForm, setGenForm]     = useState({ count: 5, capacity: 30 });
  const [genSaving, setGenSaving] = useState(false);
  const [genError, setGenError]   = useState('');

  const [edit, setEdit]           = useState(null);    // block being edited
  const [editCap, setEditCap]     = useState(30);
  const [editSaving, setEditSave] = useState(false);
  const [editError, setEditError] = useState('');

  const [detail, setDetail]       = useState(null);    // block id -> students modal
  const [detailData, setDD]       = useState(null);
  const [detailLoading, setDL]    = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.get('/enrollment/current-term/'),
      api.get('/enrollment/departments/'),
      api.get('/enrollment/programs/'),
    ]).then(([t, d, p]) => {
      if (t.status === 'fulfilled') setTerm(t.value.data);
      if (d.status === 'fulfilled') setDepts(Array.isArray(d.value.data) ? d.value.data : (d.value.data.results ?? []));
      if (p.status === 'fulfilled') setPrograms(Array.isArray(p.value.data) ? p.value.data : (p.value.data.results ?? []));
    }).finally(() => setLoading(false));
  }, []);

  function fetchBlocks(prog) {
    if (!prog || !term?.id) return;
    setBL(true);
    api.get(`/enrollment/blocks/?term=${term.id}&program=${prog.id}`)
      .then(res => setBlocks(Array.isArray(res.data) ? res.data : (res.data.results ?? [])))
      .catch(() => toast('Failed to load blocks.', 'error'))
      .finally(() => setBL(false));
  }

  function openProgram(prog) { setProgram(prog); setBlocks([]); fetchBlocks(prog); }

  // Year modal + generate
  function openYear(year_level) {
    setYearModal({ year_level });
    setGenOpen(false);
    setGenForm({ count: 5, capacity: 30 });
    setGenError('');
  }
  async function submitGenerate(e) {
    e.preventDefault();
    const count = Number(genForm.count), capacity = Number(genForm.capacity);
    if (!(count >= 1 && count <= 50)) { setGenError('Number of blocks must be 1–50.'); return; }
    if (!(capacity >= 1 && capacity <= 500)) { setGenError('Capacity must be 1–500.'); return; }
    setGenSaving(true); setGenError('');
    try {
      const res = await api.post('/enrollment/blocks/generate/', {
        program_id: program.id, year_level: yearModal.year_level, count, capacity,
      });
      const c = res.data.created, u = res.data.updated;
      toast(`${YEAR_LABEL[yearModal.year_level]}: ${c} block${c !== 1 ? 's' : ''} created${u ? `, ${u} updated` : ''}.`, 'success');
      setGenOpen(false);
      fetchBlocks(program);   // year modal stays open and refreshes
    } catch (err) {
      setGenError(err.response?.data?.error || 'Failed to generate blocks.');
    } finally { setGenSaving(false); }
  }

  // Edit capacity
  function openEdit(b) { setEdit(b); setEditCap(b.capacity); setEditError(''); }
  async function submitEdit(e) {
    e.preventDefault();
    setEditSave(true); setEditError('');
    try {
      await api.patch(`/enrollment/blocks/${edit.id}/`, { capacity: Number(editCap) });
      toast(`${edit.name} capacity set to ${editCap}.`, 'success');
      setEdit(null);
      fetchBlocks(program);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update capacity.');
    } finally { setEditSave(false); }
  }
  async function deleteBlock(b) {
    if (!window.confirm(`Delete ${b.name}? This can't be undone.`)) return;
    try {
      await api.delete(`/enrollment/blocks/${b.id}/`);
      toast(`${b.name} deleted.`, 'success');
      setEdit(null);
      fetchBlocks(program);
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to delete block.', 'error');
    }
  }

  // Students detail
  function openDetail(b) {
    setDetail(b); setDD(null); setDL(true);
    api.get(`/enrollment/blocks/${b.id}/`)
      .then(res => setDD(res.data))
      .catch(() => toast('Failed to load students.', 'error'))
      .finally(() => setDL(false));
  }

  // Programs grouped under a department
  const deptPrograms = useMemo(
    () => dept ? programs.filter(p => p.department === dept.id || p.department_code === dept.code) : [],
    [dept, programs],
  );
  const programCount = (d) => (d.program_count ?? programs.filter(p => p.department === d.id || p.department_code === d.code).length);

  // Blocks grouped by year level
  const byYear = useMemo(() => {
    const m = {}; YEARS.forEach(y => { m[y] = []; });
    blocks.forEach(b => { (m[b.year_level] = m[b.year_level] || []).push(b); });
    return m;
  }, [blocks]);

  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <header className="bm-head">
        <div>
          <div className="bm-eyebrow">Enrollment · Capacity</div>
          <h1>Block <em>management</em></h1>
          <p className="bm-lede">
            Organize each program&rsquo;s class blocks per year level. Set how many blocks and how many students
            each holds — the system creates Block&nbsp;A, B, C&hellip; and stops accepting students once every block is full.
          </p>
        </div>
        {term && <div className="bm-term"><i className="ti ti-calendar" /> {term.semester_display} · {term.year}</div>}
      </header>

      {/* Breadcrumb */}
      <div className="bm-crumbs">
        <button className={`bm-crumb${!dept ? ' here' : ''}`} onClick={() => { setDept(null); setProgram(null); }}>
          <i className="ti ti-building-community" /> Departments
        </button>
        {dept && (
          <>
            <i className="ti ti-chevron-right bm-sep" />
            <button className={`bm-crumb${dept && !program ? ' here' : ''}`} onClick={() => setProgram(null)}>
              {dept.code}
            </button>
          </>
        )}
        {program && (
          <>
            <i className="ti ti-chevron-right bm-sep" />
            <span className="bm-crumb here">{program.code}</span>
          </>
        )}
      </div>

      {loading ? (
        <p className="bm-muted">Loading…</p>
      ) : !dept ? (
        /* ── Level 1: departments ── */
        <div className="bm-grid">
          {departments.map(d => (
            <button key={d.id} className="bm-dept" onClick={() => setDept(d)}>
              <span className="bm-dept-code">{d.code}</span>
              <span className="bm-dept-name">{d.name}</span>
              <span className="bm-dept-count">{programCount(d)} program{programCount(d) !== 1 ? 's' : ''}</span>
            </button>
          ))}
          {departments.length === 0 && <p className="bm-muted">No departments found.</p>}
        </div>
      ) : !program ? (
        /* ── Level 2: programs in a department ── */
        <>
          <h2 className="bm-h2">{dept.name}</h2>
          <div className="bm-prog-list">
            {deptPrograms.map(p => (
              <button key={p.id} className="bm-prog" onClick={() => openProgram(p)}>
                <span className="bm-prog-code">{p.code}</span>
                <span className="bm-prog-name">{p.name}</span>
                <i className="ti ti-chevron-right bm-prog-chev" />
              </button>
            ))}
            {deptPrograms.length === 0 && <p className="bm-muted">No programs under this department.</p>}
          </div>
        </>
      ) : (
        /* ── Level 3: program → year-level summary rows (click a year → modal) ── */
        <>
          <h2 className="bm-h2">{program.code} — <span style={{ fontWeight: 400, color: 'var(--bm-muted)' }}>{program.name}</span></h2>
          {blocksLoading ? (
            <p className="bm-muted">Loading blocks…</p>
          ) : (
            <div className="bm-year-list">
              {YEARS.map(y => {
                const list  = byYear[y] || [];
                const cap   = list.reduce((s, b) => s + b.capacity, 0);
                const enr   = list.reduce((s, b) => s + b.enrolled_count, 0);
                const avail = list.reduce((s, b) => s + b.available_slots, 0);
                const full  = list.length > 0 && avail === 0;
                return (
                  <button key={y} className="bm-year-row" onClick={() => openYear(y)}>
                    <span className="bm-year-row-name">{YEAR_LABEL[y]}</span>
                    <span className="bm-year-row-meta">
                      {list.length
                        ? `${list.length} block${list.length !== 1 ? 's' : ''} · ${enr}/${cap} enrolled · ${avail} slot${avail !== 1 ? 's' : ''} left`
                        : 'No blocks yet'}
                    </span>
                    {full && <span className="bm-full">Full</span>}
                    <span className="bm-year-row-cta">{list.length ? 'Manage blocks' : 'Set up blocks'} <i className="ti ti-chevron-right" /></span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Year modal — that year's blocks + generate / manage controls */}
      {yearModal && (() => {
        const y = yearModal.year_level;
        const list  = byYear[y] || [];
        const cap   = list.reduce((s, b) => s + b.capacity, 0);
        const enr   = list.reduce((s, b) => s + b.enrolled_count, 0);
        const avail = list.reduce((s, b) => s + b.available_slots, 0);
        const full  = list.length > 0 && avail === 0;
        return (
          <div className="bm-backdrop" onClick={() => setYearModal(null)}>
            <div className="bm-modal bm-year-modal" onClick={e => e.stopPropagation()}>
              <div className="bm-ym-head">
                <div>
                  <h3>{YEAR_LABEL[y]} — {program.code}</h3>
                  <p className="bm-modal-sub" style={{ margin: 0 }}>
                    {term?.semester_display} {term?.year}
                    {list.length
                      ? ` · ${list.length} block${list.length !== 1 ? 's' : ''} · ${enr}/${cap} enrolled · ${avail} slot${avail !== 1 ? 's' : ''} left`
                      : ' · no blocks yet'}
                    {full && <span className="bm-full" style={{ marginLeft: 8 }}>Full</span>}
                  </p>
                </div>
                <button className="bm-ym-x" onClick={() => setYearModal(null)} aria-label="Close"><i className="ti ti-x" /></button>
              </div>

              {!genOpen ? (
                <button className="bm-gen-btn" style={{ margin: '0 0 1.1rem' }}
                  onClick={() => { setGenForm({ count: 5, capacity: 30 }); setGenError(''); setGenOpen(true); }}>
                  <i className="ti ti-plus" /> {list.length ? 'Add / adjust blocks' : 'Generate blocks'}
                </button>
              ) : (
                <form className="bm-genform" onSubmit={submitGenerate}>
                  <div className="bm-genform-row">
                    <div>
                      <label className="bm-label">Number of blocks</label>
                      <input className="bm-input" type="number" min="1" max="50" value={genForm.count}
                        onChange={e => setGenForm(f => ({ ...f, count: e.target.value }))} required autoFocus />
                    </div>
                    <div>
                      <label className="bm-label">Students per block</label>
                      <input className="bm-input" type="number" min="1" max="500" value={genForm.capacity}
                        onChange={e => setGenForm(f => ({ ...f, capacity: e.target.value }))} required />
                    </div>
                  </div>
                  <p className="bm-hint">
                    Creates Block A, B, C … (A–{blockPreview(Number(genForm.count))}) with {genForm.capacity} students each —
                    up to <strong>{(Number(genForm.count) || 0) * (Number(genForm.capacity) || 0)}</strong> students.
                    Existing blocks are kept and set to this capacity.
                  </p>
                  {genError && <p className="bm-err">{genError}</p>}
                  <div className="bm-modal-actions" style={{ marginTop: '.75rem' }}>
                    <button type="button" className="bm-btn-sec" onClick={() => setGenOpen(false)}>Cancel</button>
                    <button type="submit" className="bm-btn-pri" disabled={genSaving}>{genSaving ? 'Creating…' : 'Create blocks'}</button>
                  </div>
                </form>
              )}

              {list.length === 0 && !genOpen ? (
                <div className="bm-empty" style={{ padding: '1.25rem 0' }}>
                  No blocks yet for {YEAR_LABEL[y].toLowerCase()}. Generate blocks to start enrolling students.
                </div>
              ) : list.length > 0 && (
                <div className="bm-blocks" style={{ padding: 0 }}>
                  {list.map(b => {
                    const pct = b.capacity ? Math.min(100, Math.round(b.enrolled_count / b.capacity * 100)) : 0;
                    return (
                      <div key={b.id} className={`bm-block${b.is_full ? ' is-full' : ''}`}>
                        <div className="bm-block-top">
                          <span className="bm-block-name">{b.name}</span>
                          <span className={`bm-block-tag${b.is_full ? ' full' : ''}`}>{b.is_full ? 'Full' : 'Open'}</span>
                        </div>
                        <div className="bm-block-count">{b.enrolled_count}<span>/{b.capacity}</span></div>
                        <div className="bm-bar"><div className="bm-bar-fill" style={{ width: `${pct}%`, background: b.is_full ? 'var(--bm-red)' : 'var(--bm-green)' }} /></div>
                        <div className="bm-block-actions">
                          <button onClick={() => openDetail(b)} title="View students"><i className="ti ti-users" /></button>
                          <button onClick={() => openEdit(b)} title="Edit capacity / delete"><i className="ti ti-settings" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Edit capacity modal */}
      {edit && (
        <div className="bm-backdrop" style={{ zIndex: 1100 }} onClick={() => setEdit(null)}>
          <form className="bm-modal" onClick={e => e.stopPropagation()} onSubmit={submitEdit}>
            <h3>{edit.name}</h3>
            <p className="bm-modal-sub">{edit.enrolled_count} enrolled · currently {edit.capacity} capacity</p>
            <label className="bm-label">Capacity (students)</label>
            <input className="bm-input" type="number" min={Math.max(1, edit.enrolled_count)} max="500" value={editCap}
              onChange={e => setEditCap(e.target.value)} required />
            {editError && <p className="bm-err">{editError}</p>}
            <div className="bm-modal-actions">
              <button type="button" className="bm-btn-danger" onClick={() => deleteBlock(edit)}>
                <i className="ti ti-trash" /> Delete block
              </button>
              <span style={{ flex: 1 }} />
              <button type="button" className="bm-btn-sec" onClick={() => setEdit(null)}>Cancel</button>
              <button type="submit" className="bm-btn-pri" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Students detail modal */}
      {detail && (
        <div className="bm-backdrop" style={{ zIndex: 1100 }} onClick={() => setDetail(null)}>
          <div className="bm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3>{detail.name} — enrolled students</h3>
            <p className="bm-modal-sub">{detail.enrolled_count}/{detail.capacity} enrolled</p>
            {detailLoading ? (
              <p className="bm-muted">Loading…</p>
            ) : (detailData?.students || []).length === 0 ? (
              <p className="bm-muted">No students enrolled in this block yet.</p>
            ) : (
              <div className="bm-students">
                {detailData.students.map(s => (
                  <div key={s.enrollment_id} className="bm-student">
                    <span className="bm-student-name">{s.student_name}</span>
                    <span className="bm-student-id">{s.student_id}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="bm-modal-actions">
              <span style={{ flex: 1 }} />
              <button className="bm-btn-sec" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Last block letter for a preview string (e.g. count 5 -> "E", 28 -> "1B").
function blockPreview(count) {
  const i = Math.max(1, Math.min(50, count || 1)) - 1;
  return i < 26 ? String.fromCharCode(65 + i) : `${Math.floor(i / 26)}${String.fromCharCode(65 + (i % 26))}`;
}

const CSS = `
:where(.bm-head,.bm-crumbs,.bm-grid,.bm-prog-list,.bm-year-list,.bm-h2,.bm-modal){
  --bm-ink:#0a1628; --bm-ink2:#1e3a5f; --bm-gold:#b89043; --bm-line:#e5e7eb;
  --bm-muted:#5a6478; --bm-faint:#8a93a3; --bm-green:#1f7a4d; --bm-red:#b23b2e;
  --bm-warm:#f8f7f3; --bm-cool:#f4f6fa;
}
.bm-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap;
  padding-bottom:1.1rem; margin-bottom:1rem; border-bottom:1px solid var(--bm-line); }
.bm-eyebrow{ display:inline-flex; align-items:center; gap:10px; font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--bm-gold); font-weight:700; margin-bottom:.5rem; }
.bm-eyebrow::before{ content:''; width:22px; height:1px; background:var(--bm-gold); }
.bm-head h1{ margin:0; font:600 24px/1.15 'Inter',sans-serif; color:var(--bm-ink); letter-spacing:-.015em; }
.bm-head h1 em{ font-family:'Instrument Serif',Georgia,serif; font-style:italic; font-weight:400; color:var(--bm-gold); letter-spacing:0; }
.bm-lede{ margin:.4rem 0 0; font-size:13.5px; color:var(--bm-muted); max-width:66ch; line-height:1.5; }
.bm-term{ display:inline-flex; align-items:center; gap:7px; padding:7px 12px; border:1px solid var(--bm-line); background:#fff; font:600 12px 'Inter',sans-serif; color:var(--bm-ink); white-space:nowrap; }
.bm-term i{ color:var(--bm-gold); }
.bm-muted{ color:var(--bm-muted); font-size:13px; }

.bm-crumbs{ display:flex; align-items:center; gap:8px; margin-bottom:1.25rem; flex-wrap:wrap; }
.bm-crumb{ display:inline-flex; align-items:center; gap:6px; background:none; border:none; cursor:pointer; font:600 13px 'Inter',sans-serif; color:var(--bm-muted); padding:2px 0; }
.bm-crumb:hover{ color:var(--bm-ink); }
.bm-crumb.here{ color:var(--bm-ink); cursor:default; }
.bm-sep{ color:var(--bm-faint); font-size:14px; }
.bm-h2{ font:600 17px 'Inter',sans-serif; color:var(--bm-ink); margin:0 0 1rem; }

/* Departments — cards keep a comfortable width and left-align instead of
   stretching across the whole row when only a few departments exist. */
.bm-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),250px)); gap:1rem; justify-content:start; }
.bm-dept{ display:flex; flex-direction:column; align-items:flex-start; gap:4px; text-align:left; cursor:pointer;
  background:#fff; border:1px solid var(--bm-line); border-left:4px solid var(--bm-gold); padding:1.1rem 1.25rem; transition:box-shadow .15s, transform .15s; }
.bm-dept:hover{ box-shadow:0 10px 24px -16px rgba(10,22,40,.5); transform:translateY(-1px); }
.bm-dept-code{ font:700 26px 'Instrument Serif',Georgia,serif; color:var(--bm-ink); letter-spacing:.01em; line-height:1; }
.bm-dept-name{ font-size:13px; color:var(--bm-ink2); margin-top:4px; }
.bm-dept-count{ font-size:11.5px; color:var(--bm-muted); margin-top:6px; background:var(--bm-cool); padding:2px 8px; }

/* Programs */
.bm-prog-list{ display:flex; flex-direction:column; gap:.6rem; }
.bm-prog{ display:flex; align-items:center; gap:14px; text-align:left; cursor:pointer; background:#fff; border:1px solid var(--bm-line); padding:.9rem 1.2rem; transition:border-color .15s; }
.bm-prog:hover{ border-color:var(--bm-ink); }
.bm-prog-code{ font:700 14px ui-monospace,monospace; color:var(--bm-ink); min-width:72px; }
.bm-prog-name{ font-size:13.5px; color:var(--bm-ink2); flex:1; }
.bm-prog-chev{ color:var(--bm-faint); font-size:18px; }

/* Year-level rows (click -> modal) */
.bm-year-list{ display:flex; flex-direction:column; gap:.6rem; }
.bm-year-row{ display:flex; align-items:center; gap:1rem; flex-wrap:wrap; text-align:left; cursor:pointer;
  background:#fff; border:1px solid var(--bm-line); border-left:4px solid var(--bm-ink2); padding:1rem 1.25rem; transition:border-color .15s, box-shadow .15s; }
.bm-year-row:hover{ box-shadow:0 8px 20px -16px rgba(10,22,40,.5); }
.bm-year-row-name{ font:600 15px 'Inter',sans-serif; color:var(--bm-ink); min-width:90px; }
.bm-year-row-meta{ font-size:12.5px; color:var(--bm-muted); flex:1; }
.bm-year-row-cta{ display:inline-flex; align-items:center; gap:4px; font:600 12.5px 'Inter',sans-serif; color:var(--bm-ink); }
.bm-full{ font:700 10.5px 'Inter',sans-serif; text-transform:uppercase; letter-spacing:.06em; background:#f6e8e4; color:var(--bm-red); padding:2px 8px; }

/* Year modal */
.bm-year-modal{ max-width:720px; max-height:88vh; overflow-y:auto; }
.bm-ym-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1.1rem; }
.bm-ym-head h3{ margin:0 0 .25rem; font:600 18px 'Inter',sans-serif; color:var(--bm-ink); }
.bm-ym-x{ background:none; border:none; cursor:pointer; color:var(--bm-faint); font-size:20px; line-height:1; padding:2px; }
.bm-ym-x:hover{ color:var(--bm-ink); }
.bm-genform{ background:var(--bm-warm); border:1px solid var(--bm-line); border-left:3px solid var(--bm-gold); padding:1rem 1.1rem; margin-bottom:1.1rem; }
.bm-genform-row{ display:flex; gap:1rem; flex-wrap:wrap; }
.bm-genform-row > div{ flex:1; min-width:140px; }
.bm-genform .bm-label{ margin-top:0; }
.bm-gen-btn{ display:inline-flex; align-items:center; gap:6px; padding:7px 13px; border:1px solid var(--bm-ink); background:var(--bm-ink); color:#fff; font:600 12px 'Inter',sans-serif; cursor:pointer; }
.bm-gen-btn:hover{ filter:brightness(1.12); }
.bm-empty{ padding:1.1rem 1.2rem; font-size:13px; color:var(--bm-muted); }
.bm-blocks{ display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),200px)); gap:.75rem; padding:1.1rem 1.2rem; justify-content:start; }
.bm-block{ border:1px solid var(--bm-line); padding:.75rem .85rem; }
.bm-block.is-full{ border-color:#f0c9c0; background:#fdf6f4; }
.bm-block-top{ display:flex; align-items:center; justify-content:space-between; }
.bm-block-name{ font:600 13px 'Inter',sans-serif; color:var(--bm-ink); }
.bm-block-tag{ font:700 9.5px 'Inter',sans-serif; text-transform:uppercase; letter-spacing:.05em; background:#e6f1ec; color:var(--bm-green); padding:2px 6px; }
.bm-block-tag.full{ background:#f6e8e4; color:var(--bm-red); }
.bm-block-count{ font:700 20px 'Inter',sans-serif; color:var(--bm-ink); font-variant-numeric:tabular-nums; margin:6px 0 4px; }
.bm-block-count span{ font-size:13px; font-weight:500; color:var(--bm-faint); }
.bm-bar{ height:4px; background:var(--bm-cool); overflow:hidden; }
.bm-bar-fill{ height:100%; transition:width .4s ease; }
.bm-block-actions{ display:flex; gap:4px; margin-top:8px; }
.bm-block-actions button{ flex:1; background:#fff; border:1px solid var(--bm-line); cursor:pointer; padding:5px; color:var(--bm-muted); }
.bm-block-actions button:hover{ border-color:var(--bm-ink); color:var(--bm-ink); }

/* Modal */
.bm-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1000; padding:1rem; }
.bm-modal{ background:#fff; padding:1.5rem 1.75rem; width:100%; max-width:430px; box-shadow:0 8px 32px rgba(0,0,0,.18); }
.bm-modal h3{ margin:0 0 .25rem; font:600 17px 'Inter',sans-serif; color:var(--bm-ink); }
.bm-modal-sub{ margin:0 0 1rem; font-size:12.5px; color:var(--bm-muted); }
.bm-label{ display:block; font:600 11px 'Inter',sans-serif; text-transform:uppercase; letter-spacing:.06em; color:var(--bm-muted); margin:.75rem 0 .3rem; }
.bm-input{ width:100%; padding:9px 12px; border:1px solid var(--bm-line); font:14px 'Inter',sans-serif; color:var(--bm-ink); box-sizing:border-box; }
.bm-input:focus{ outline:none; border-color:var(--bm-ink); }
.bm-hint{ font-size:12px; color:var(--bm-muted); line-height:1.5; margin:.8rem 0 0; background:var(--bm-warm); border-left:2px solid var(--bm-gold); padding:8px 11px; }
.bm-err{ color:var(--bm-red); font-size:12.5px; margin:.6rem 0 0; }
.bm-modal-actions{ display:flex; align-items:center; gap:.6rem; margin-top:1.25rem; }
.bm-btn-pri{ padding:9px 18px; border:1px solid var(--bm-ink); background:var(--bm-ink); color:#fff; font:600 13px 'Inter',sans-serif; cursor:pointer; }
.bm-btn-pri:hover{ filter:brightness(1.12); } .bm-btn-pri:disabled{ opacity:.6; cursor:default; }
.bm-btn-sec{ padding:9px 18px; border:1px solid var(--bm-line); background:#fff; color:var(--bm-ink); font:600 13px 'Inter',sans-serif; cursor:pointer; }
.bm-btn-sec:hover{ border-color:var(--bm-ink); }
.bm-btn-danger{ display:inline-flex; align-items:center; gap:6px; padding:9px 14px; border:1px solid #f0c9c0; background:#fdf6f4; color:var(--bm-red); font:600 12.5px 'Inter',sans-serif; cursor:pointer; }
.bm-students{ display:flex; flex-direction:column; gap:1px; max-height:46vh; overflow:auto; }
.bm-student{ display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:8px 10px; background:var(--bm-warm); }
.bm-student-name{ font-size:13px; color:var(--bm-ink); }
.bm-student-id{ font:12px ui-monospace,monospace; color:var(--bm-muted); }
`;
