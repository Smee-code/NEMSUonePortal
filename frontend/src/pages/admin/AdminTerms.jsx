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
  year: '', semester: 'first',
  enrollment_open: false,
  start_date: '', end_date: '',
};

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
      year: term.year, semester: term.semester,
      enrollment_open: term.enrollment_open,
      start_date: term.start_date, end_date: term.end_date,
    });
    setFormError(''); setShowForm(true);
  }

  async function saveForm(e) {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      if (editTarget) {
        await api.patch(`/enrollment/admin/terms/${editTarget.id}/`, form);
      } else {
        await api.post('/enrollment/admin/terms/', form);
      }
      const msg = editTarget ? 'Term updated.' : 'Term created.';
      setShowForm(false);
      toast(msg, { type: 'success' });
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

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">Manage · {terms.length} terms</div>
          <h2>Academic <em>terms</em></h2>
          <div className="sub">Manage semester windows and open or close enrollment. The current term is set automatically — whichever term has the latest start date.</div>
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
                <input
                  className="at-form-input"
                  placeholder="e.g. 2025-2026"
                  value={form.year}
                  onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                  required
                  pattern="\d{4}-\d{4}"
                  title="Format: YYYY-YYYY (e.g. 2025-2026)"
                />
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
              <span>The current term is set automatically — the term with the latest start date becomes current and enrollment can only be opened there.</span>
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
        <div className="grid-cards">
          {terms.map(t => {
            const ended = hasEnded(t);
            const isCurrent = t.is_active;   // derived: the newest term by start date
            // Only the current term can host enrollment. Within it, an ended term
            // still can't (re)open a window — only close one that's stuck open.
            const enrollLocked = ended && !t.enrollment_open;
            const canToggle = isCurrent && !enrollLocked;
            return (
            <div key={t.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="at-card-eyebrow" style={{ color: isCurrent ? 'var(--adm-gold)' : 'var(--adm-muted)' }}>
                    {isCurrent ? 'Current term' : ended ? 'Past term' : `A.Y. ${t.year}`}
                  </div>
                  <div className="at-card-semester">{t.semester_display}</div>
                  {isCurrent && <div className="at-card-year">A.Y. {t.year}</div>}
                </div>
                <TermCardMenu items={[
                  { icon: 'ti-pencil', label: 'Edit', onClick: () => openEdit(t) },
                  ...(canToggle ? [{
                    icon: t.enrollment_open ? 'ti-lock' : 'ti-lock-open',
                    label: t.enrollment_open ? 'Close enrollment' : 'Open enrollment',
                    onClick: () => toggleEnrollment(t),
                  }] : []),
                  'sep',
                  { icon: 'ti-trash', label: 'Delete', danger: true, onClick: () => deleteTerm(t) },
                ]} />
              </div>

              <div className="at-card-dates">
                <div>
                  <span className="at-card-date-label">Start</span>
                  <div className="at-card-date-val">{t.start_date || '-'}</div>
                </div>
                <div>
                  <span className="at-card-date-label">End</span>
                  <div className="at-card-date-val">{t.end_date || '-'}</div>
                </div>
              </div>

              <div className="at-card-enroll-row">
                <span className="at-card-enroll-label">Enrollment</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: (isCurrent && t.enrollment_open) ? 'var(--adm-green)' : 'var(--adm-muted)' }}>
                    {isCurrent
                      ? (t.enrollment_open ? 'Open' : 'Closed')
                      : ended ? 'Term ended' : 'Not current'}
                  </span>
                  {isCurrent && (
                    <button
                      className={`toggle${t.enrollment_open ? ' on' : ''}`}
                      disabled={updatingEnrollId === t.id || enrollLocked}
                      onClick={() => toggleEnrollment(t)}
                      title={enrollLocked ? 'This term has ended — enrollment cannot be opened'
                        : t.enrollment_open ? 'Close enrollment' : 'Open enrollment'}
                      style={enrollLocked ? { opacity: .4, cursor: 'not-allowed' } : undefined}
                    />
                  )}
                </div>
              </div>

              {(deletingId === t.id || updatingEnrollId === t.id) && (
                <div style={{ fontSize: 11, color: 'var(--adm-muted)', textAlign: 'right' }}>Updating…</div>
              )}
            </div>
            );
          })}
        </div>
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
  .at-form-input:focus{border-color:var(--adm-ink)}
  .at-form-toggle-row{display:flex;align-items:center;gap:.75rem;padding:.5rem 0}
  .at-form-toggle-label{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--adm-ink);cursor:pointer;font-weight:500}
  .at-form-toggle-hint{font-size:11px;color:var(--adm-faint)}
  .at-form-note{display:flex;align-items:flex-start;gap:8px;padding:.6rem .75rem;background:var(--adm-warm);border:1px solid var(--adm-line-soft);font-size:12px;color:var(--adm-muted);line-height:1.45}
  .at-form-note i{color:var(--adm-gold);font-size:15px;flex-shrink:0;margin-top:1px}
  .at-form-actions{display:flex;justify-content:flex-end;gap:.5rem;padding-top:.25rem;border-top:1px solid var(--adm-line-soft)}
  .at-card-eyebrow{font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;margin-bottom:6px}
  .at-card-semester{font-family:'Inter',-apple-system,sans-serif;font-weight:500;font-size:24px;color:var(--adm-ink);letter-spacing:-.01em;line-height:1.15}
  .at-card-year{font-size:12px;color:var(--adm-muted);margin-top:4px}
  .at-card-dates{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:12px}
  .at-card-date-label{color:var(--adm-faint);font-size:11px}
  .at-card-date-val{color:var(--adm-ink);font-weight:500;margin-top:2px}
  .at-card-enroll-row{display:flex;justify-content:space-between;align-items:center;padding-top:.75rem;border-top:1px solid var(--adm-line-soft)}
  .at-card-enroll-label{font-size:10px;color:var(--adm-muted);text-transform:uppercase;letter-spacing:.1em;font-weight:600}
`;
