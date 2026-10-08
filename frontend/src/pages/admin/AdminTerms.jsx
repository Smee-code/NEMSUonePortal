import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAdminShell } from '../../context/AdminShellContext';
import { useConfirm } from '../../components/ConfirmDialog';

const SEMESTER_CHOICES = [
  { value: 'first',  label: 'First Semester' },
  { value: 'second', label: 'Second Semester' },
  { value: 'summer', label: 'Summer' },
];

const EMPTY_FORM = {
  start_year: '', semester: 'first',
  enrollment_open: false,
  start_date: '', end_date: '',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(s) {
  if (!s) return '';
  const p = s.split('-').map(Number);
  return `${MONTHS[p[1] - 1]} ${p[2]}, ${p[0]}`;
}
function fmtRange(a, b) {
  if (!a && !b) return 'Dates not set';
  if (!a || !b) return fmtDate(a || b);
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  if (pa[0] === pb[0]) return `${MONTHS[pa[1] - 1]} ${pa[2]} – ${MONTHS[pb[1] - 1]} ${pb[2]}, ${pb[0]}`;
  return `${fmtDate(a)} – ${fmtDate(b)}`;
}

function TermCardMenu({ items }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="dropdown">
      <button
        className="btn-ghost"
        style={{ padding: '4px 10px', fontSize: 20, lineHeight: 1, color: '#8a93a3', letterSpacing: 2 }}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >···</button>
      {open && (
        <div className="dropdown-menu">
          {items.map((it, i) =>
            it === 'sep'
              ? <div key={i} className="dropdown-sep" />
              : (
                <button
                  key={i}
                  className={`dropdown-item${it.danger ? ' danger' : ''}`}
                  onClick={e => { e.stopPropagation(); it.onClick(); setOpen(false); }}
                >
                  <i className={`ti ${it.icon}`} />{it.label}
                </button>
              )
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminTerms() {
  const { toast, openDrawer } = useAdminShell();
  const confirm = useConfirm();

  const [terms,       setTerms]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  const [showForm,    setShowForm]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState('');

  const [updatingEnrollId, setUpdatingEnrollId] = useState(null);
  const [deletingId,       setDeletingId]       = useState(null);

  function fetchTerms() {
    setLoading(true);
    api.get('/enrollment/admin/terms/')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
        // Newest start date first — the current term always leads the list.
        list.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
        setTerms(list);
      })
      .catch(() => setError('Failed to load academic terms.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchTerms(); }, []);

  function openCreate() {
    setEditTarget(null); setForm(EMPTY_FORM); setFormError(''); setShowForm(true);
  }

  function openEdit(term) {
    setEditTarget(term);
    setForm({
      start_year: term.year ? String(term.year).split('-')[0] : '',
      semester: term.semester,
      enrollment_open: term.enrollment_open,
      start_date: term.start_date, end_date: term.end_date,
    });
    setFormError(''); setShowForm(true);
  }

  async function saveForm(e) {
    e.preventDefault();
    const sy = parseInt(form.start_year, 10);
    if (!(sy >= 2000 && sy <= 2100)) {
      setFormError('Enter a valid start year (e.g. 2026).');
      return;
    }
    setSaving(true); setFormError('');
    // The admin picks only the start year; the academic year is formed as
    // "YYYY-(YYYY+1)" (e.g. 2026 → "2026-2027") for the backend.
    const { start_year, ...rest } = form;
    const payload = { ...rest, year: `${sy}-${sy + 1}` };
    try {
      if (editTarget) {
        await api.patch(`/enrollment/admin/terms/${editTarget.id}/`, payload);
      } else {
        await api.post('/enrollment/admin/terms/', payload);
      }
      const msg = editTarget ? 'Term updated.' : 'Term created.';
      setShowForm(false);
      toast(msg, { type: 'success' });
      // Creating a term makes it current, so refresh the topbar chip too.
      if (!editTarget) window.dispatchEvent(new Event('term-changed'));
      fetchTerms();
    } catch (err) {
      const data = err.response?.data;
      setFormError(
        (data && typeof data === 'object')
          ? Object.values(data).flat().join(' ')
          : 'Failed to save term.'
      );
    } finally { setSaving(false); }
  }

  async function setCurrentTerm(term) {
    try {
      await api.post(`/enrollment/admin/terms/${term.id}/set-current/`);
      toast(`${term.semester_display} ${term.year} is now the current term.`, { type: 'success' });
      window.dispatchEvent(new Event('term-changed'));  // refresh the topbar chip
      fetchTerms();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set current term.');
    }
  }

  // Local YYYY-MM-DD for comparing against a term's end_date.
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const hasEnded = term => !!term.end_date && term.end_date < todayStr;

  async function toggleEnrollment(term) {
    if (hasEnded(term) && !term.enrollment_open) {
      toast('This term has already ended; enrollment cannot be opened for a past term.', { type: 'error' });
      return;
    }
    setUpdatingEnrollId(term.id);
    try {
      await api.patch(`/enrollment/terms/${term.id}/enrollment/`, {
        enrollment_open: !term.enrollment_open,
      });
      const msg = `Enrollment ${!term.enrollment_open ? 'opened' : 'closed'} for ${term.semester_display} ${term.year}.`;
      toast(msg, { type: 'success' });
      fetchTerms();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update enrollment.');
    } finally { setUpdatingEnrollId(null); }
  }

  async function deleteTerm(term) {
    if (!await confirm({
      title: `Delete ${term.semester_display} ${term.year}?`,
      message: 'This cannot be undone. Terms with student enrollment records cannot be deleted.',
      confirmText: 'Delete',
    })) return;
    setDeletingId(term.id);
    try {
      await api.delete(`/enrollment/admin/terms/${term.id}/`);
      const msg = 'Term deleted.';
      toast(msg, { type: 'success' });
      fetchTerms();
    } catch (err) {
      const data = err.response?.data;
      const msg = (Array.isArray(data) ? data[0] : data?.detail || data?.error || data?.non_field_errors?.[0]) || 'Failed to delete term.';
      setError(msg);
    } finally { setDeletingId(null); }
  }

  // The active term leads; everything else is grouped under its academic year.
  const current = terms.find(t => t.is_active) || null;
  const byYear = {};
  terms.filter(t => !t.is_active).forEach(t => { (byYear[t.year] = byYear[t.year] || []).push(t); });
  const yearGroups = Object.entries(byYear)
    .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
    .map(([y, list]) => [y, list.sort((x, z) => (x.start_date || '').localeCompare(z.start_date || ''))]);

  function rowStatus(t) {
    if (hasEnded(t)) return { label: 'Ended', tone: 'muted' };
    return { label: 'Scheduled', tone: 'cool' };
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">Manage · {terms.length} terms</div>
          <h2>Academic <em>terms</em></h2>
          <div className="sub">The current term and its enrollment window are shown at the top. Past and upcoming terms are grouped below by academic year.</div>
        </div>
        <div className="actions">
          <button className="btn-pri" onClick={openCreate}>
            <i className="ti ti-plus" /> New term
          </button>
        </div>
      </div>

      {error && (
        <div className="at-flash at-flash-err" onClick={() => setError('')}>{error}</div>
      )}

      {showForm && (
        <div className="at-form-wrap">
          <div className="at-form-head">
            <div>
              <div className="at-form-eyebrow">{editTarget ? 'Edit term' : 'New term'}</div>
              <h3 className="at-form-title">{editTarget ? `${editTarget.semester_display} ${editTarget.year}` : 'Create academic term'}</h3>
            </div>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>
              <i className="ti ti-x" />
            </button>
          </div>
          {formError && <div className="at-flash at-flash-err" style={{ margin: '0 1.5rem .75rem' }}>{formError}</div>}
          <form onSubmit={saveForm} className="at-form-body">
            <div className="at-form-row">
              <div className="at-form-field">
                <label className="at-form-label">Academic Year</label>
                <div className="at-year-pair">
                  <input
                    className="at-form-input at-year-start"
                    type="text"
                    inputMode="numeric"
                    placeholder="2026"
                    value={form.start_year}
                    onChange={e => setForm(f => ({ ...f, start_year: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    required
                    aria-label="Start year"
                    title="Enter the start year — the end year fills in automatically."
                  />
                  <span className="at-year-dash">–</span>
                  <input
                    className="at-form-input at-year-end"
                    type="text"
                    value={/^\d{4}$/.test(form.start_year) ? Number(form.start_year) + 1 : ''}
                    placeholder="2027"
                    readOnly
                    tabIndex={-1}
                    aria-label="End year (set automatically)"
                  />
                </div>
              </div>
              <div className="at-form-field">
                <label className="at-form-label">Semester</label>
                <select
                  className="at-form-input"
                  value={form.semester}
                  onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                >
                  {SEMESTER_CHOICES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="at-form-field">
                <label className="at-form-label">Start Date</label>
                <input
                  className="at-form-input"
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  required
                />
              </div>
              <div className="at-form-field">
                <label className="at-form-label">End Date</label>
                <input
                  className="at-form-input"
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="at-form-note">
              <i className="ti ti-info-circle" />
              <span>A new term becomes the current term automatically. You can switch to any other term later with “Set as current.” Enrollment can only be opened on the current term.</span>
            </div>
            <div className="at-form-actions">
              <button type="button" className="btn-sec" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-pri" disabled={saving}>
                {saving ? 'Saving…' : editTarget ? <><i className="ti ti-check" /> Save changes</> : <><i className="ti ti-plus" /> Create term</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="at-loading">Loading academic terms…</div>
      ) : terms.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-calendar" />
          <div className="t">No academic terms</div>
          <div className="d">Create your first term to get started with enrollment and grade management.</div>
        </div>
      ) : (
        <>
          {/* ── Current term: the one that matters, with its enrollment control ── */}
          {current && (() => {
            const enrollLocked = hasEnded(current) && !current.enrollment_open;
            const busy = updatingEnrollId === current.id;
            return (
              <div className="at-hero">
                <div className="at-hero-top">
                  <div>
                    <div className="at-hero-eyebrow">Current term</div>
                    <div className="at-hero-sem">{current.semester_display}</div>
                    <div className="at-hero-meta">A.Y. {current.year} &middot; {fmtRange(current.start_date, current.end_date)}</div>
                  </div>
                  <button className="at-hero-edit" onClick={() => openEdit(current)}>
                    <i className="ti ti-pencil" /> Edit
                  </button>
                </div>
                <div className="at-hero-enroll">
                  <div>
                    <span className="at-hero-enroll-label">Enrollment</span>
                    <span className={`at-hero-enroll-state${current.enrollment_open ? ' open' : ''}`}>
                      {current.enrollment_open
                        ? 'Open — students can enroll now'
                        : enrollLocked ? 'Closed — this term has ended' : 'Closed'}
                    </span>
                  </div>
                  <div className="at-hero-toggle">
                    {busy && <span className="at-hero-busy">Updating…</span>}
                    <button
                      className={`toggle${current.enrollment_open ? ' on' : ''}`}
                      disabled={busy || enrollLocked}
                      onClick={() => toggleEnrollment(current)}
                      title={enrollLocked ? 'This term has ended — enrollment cannot be opened'
                        : current.enrollment_open ? 'Close enrollment' : 'Open enrollment'}
                      style={enrollLocked ? { opacity: .4, cursor: 'not-allowed' } : undefined}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Everything else, grouped by academic year ── */}
          <div className="at-years">
            {yearGroups.map(([year, sems]) => (
              <section className="at-year" key={year}>
                <div className="at-year-head">
                  <span className="at-year-name">A.Y. {year}</span>
                  <span className="at-year-count">{sems.length} term{sems.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="at-rows">
                  {sems.map(t => {
                    const st = rowStatus(t);
                    const busy = deletingId === t.id;
                    return (
                      <div className="at-row" key={t.id}>
                        <div className="at-row-main">
                          <span className="at-row-sem">{t.semester_display}</span>
                          <span className="at-row-dates">{fmtRange(t.start_date, t.end_date)}</span>
                        </div>
                        <div className="at-row-right">
                          {busy && <span className="at-row-busy">Deleting…</span>}
                          <span className={`at-chip at-chip--${st.tone}`}>{st.label}</span>
                          <TermCardMenu items={[
                            { icon: 'ti-star', label: 'Set as current', onClick: () => setCurrentTerm(t) },
                            { icon: 'ti-pencil', label: 'Edit', onClick: () => openEdit(t) },
                            'sep',
                            { icon: 'ti-trash', label: 'Delete', danger: true, onClick: () => deleteTerm(t) },
                          ]} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
            {yearGroups.length === 0 && (
              <div className="at-noother">Only the current term exists. Create another term to build your history.</div>
            )}
          </div>
        </>
      )}
    </>
  );
}

const CSS = `
  .at-flash{padding:10px 16px;margin-bottom:1rem;font-size:13px;cursor:pointer}
  .at-flash-ok{background:#e6f1ec;color:var(--adm-green)}
  .at-flash-err{background:#f6e8e4;color:var(--adm-red)}
  .at-loading{color:var(--adm-muted);padding:2rem 0;font-size:13px}
  .at-form-wrap{background:#fff;border:1px solid var(--adm-line);margin-bottom:1.5rem}
  .at-form-head{display:flex;justify-content:space-between;align-items:flex-start;padding:1.25rem 1.5rem;border-bottom:1px solid var(--adm-line);background:var(--adm-warm)}
  .at-form-eyebrow{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--adm-gold);font-weight:600;margin-bottom:4px}
  .at-form-title{font-size:18px;font-weight:500;color:var(--adm-ink);margin:0;letter-spacing:-.01em}
  .at-form-body{padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:.85rem}
  .at-form-row{display:flex;flex-wrap:wrap;gap:1rem}
  .at-form-field{display:flex;flex-direction:column;gap:5px;flex:1;min-width:160px}
  .at-form-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--adm-muted);font-weight:600}
  .at-form-input{padding:9px 12px;border:1px solid var(--adm-line);background:#fff;font:13px/1.4 'Inter',sans-serif;color:var(--adm-ink);outline:none}
  /* Academic year = editable start year – read-only end year */
  .at-year-pair{display:flex;align-items:center;gap:8px}
  .at-year-pair .at-form-input{flex:1;min-width:0;text-align:center;font-variant-numeric:tabular-nums}
  .at-year-dash{color:var(--adm-muted);font-weight:600;flex-shrink:0}
  .at-year-end{background:var(--adm-warm);color:var(--adm-muted);cursor:default}
  .at-year-end::placeholder{color:var(--adm-faint)}
  .at-form-input:focus{border-color:var(--adm-ink)}
  .at-form-toggle-row{display:flex;align-items:center;gap:.75rem;padding:.5rem 0}
  .at-form-toggle-label{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--adm-ink);cursor:pointer;font-weight:500}
  .at-form-toggle-hint{font-size:11px;color:var(--adm-faint)}
  .at-form-note{display:flex;align-items:flex-start;gap:8px;padding:.6rem .75rem;background:var(--adm-warm);border:1px solid var(--adm-line-soft);font-size:12px;color:var(--adm-muted);line-height:1.45}
  .at-form-note i{color:var(--adm-gold);font-size:15px;flex-shrink:0;margin-top:1px}
  .at-form-actions{display:flex;justify-content:flex-end;gap:.5rem;padding-top:.25rem;border-top:1px solid var(--adm-line-soft)}

  /* Current-term hero */
  .at-hero{background:var(--adm-ink);border:1px solid var(--adm-ink);border-top:3px solid var(--adm-gold,#b8860b);overflow:hidden;margin-bottom:1.75rem}
  .at-hero-top{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding:1.5rem 1.6rem}
  .at-hero-eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--adm-gold,#b8860b);font-weight:700}
  .at-hero-sem{font-size:30px;font-weight:600;color:#fff;letter-spacing:-.02em;line-height:1.1;margin-top:9px}
  .at-hero-meta{font-size:13.5px;color:#aeb8c7;margin-top:9px;font-variant-numeric:tabular-nums}
  .at-hero-edit{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);color:#dbe2ec;font-size:12px;font-weight:600;padding:7px 13px;cursor:pointer;font-family:inherit;flex-shrink:0}
  .at-hero-edit:hover{background:rgba(255,255,255,.15);color:#fff}
  .at-hero-enroll{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1.05rem 1.6rem;background:#fff}
  .at-hero-enroll-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--adm-muted);font-weight:600;display:block}
  .at-hero-enroll-state{font-size:14px;color:var(--adm-ink);font-weight:600;margin-top:3px;display:block}
  .at-hero-enroll-state.open{color:var(--adm-green,#0a6b48)}
  .at-hero-toggle{display:flex;align-items:center;gap:10px}
  .at-hero-busy{font-size:11.5px;color:var(--adm-muted)}

  /* Terms grouped by academic year */
  .at-years{display:flex;flex-direction:column;gap:1.6rem}
  .at-year-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:.55rem;padding-bottom:.5rem;border-bottom:1px solid var(--adm-line)}
  .at-year-name{font-size:13px;font-weight:700;letter-spacing:.03em;color:var(--adm-ink)}
  .at-year-count{font-size:11.5px;color:var(--adm-faint)}
  .at-rows{display:flex;flex-direction:column;border:1px solid var(--adm-line);background:#fff}
  .at-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.85rem 1.1rem;border-bottom:1px solid var(--adm-line-soft)}
  .at-row:last-child{border-bottom:none}
  .at-row:hover{background:var(--adm-warm)}
  .at-row-main{display:flex;flex-direction:column;gap:3px;min-width:0}
  .at-row-sem{font-size:14.5px;font-weight:600;color:var(--adm-ink)}
  .at-row-dates{font-size:12.5px;color:var(--adm-muted);font-variant-numeric:tabular-nums}
  .at-row-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
  .at-row-busy{font-size:11.5px;color:var(--adm-muted)}
  .at-chip{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 10px;border-radius:999px;white-space:nowrap}
  .at-chip--muted{background:#eef0f4;color:#6a7384}
  .at-chip--cool{background:#eef2f9;color:#284a7a}
  .at-chip--green{background:var(--adm-green-tint,#e6f4ec);color:var(--adm-green,#0a6b48)}
  .at-chip--gold{background:#f5eeda;color:#8a6a12}
  .at-noother{font-size:13px;color:var(--adm-muted);padding:1.5rem;background:#fff;border:1px dashed var(--adm-line);text-align:center}
  @media(max-width:600px){ .at-hero-sem{font-size:24px} .at-row-dates{display:none} }
`;
