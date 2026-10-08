import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAdminShell } from '../../context/AdminShellContext';
import { useConfirm } from '../../components/ConfirmDialog';

const PAGE_LIMIT = 20;

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Role-scoped user console: list + search + manual add + remove, for one role.
 * Used by the Students and Faculty admin pages.
 */
export default function RoleUserManager({ role, config }) {
  const { toast } = useAdminShell();
  const confirm = useConfirm();

  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [offset, setOffset]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms]       = useState([]);

  const EMPTY = {
    full_name: '', institutional_email: '', student_id: '', password: '',
    department: '', program: '', is_gec_faculty: false,
  };
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (role === 'faculty') {
      api.get('/auth/departments/').then(r => setDepartments(r.data || [])).catch(() => {});
      api.get('/enrollment/admin/programs/').then(r => setPrograms(r.data?.results ?? r.data ?? [])).catch(() => {});
    }
  }, [role]);

  const fetchUsers = useCallback((newOffset = 0) => {
    setLoading(true); setError('');
    const params = new URLSearchParams({ limit: PAGE_LIMIT, offset: newOffset, role });
    if (searchQuery) params.append('search', searchQuery);
    api.get(`/auth/admin/users/?${params.toString()}`)
      .then(res => {
        setUsers(res.data.results ?? res.data);
        setTotal(res.data.count ?? (res.data.results ?? res.data).length);
      })
      .catch(() => setError(`Failed to load ${config.plural}.`))
      .finally(() => setLoading(false));
  }, [role, searchQuery, config.plural]);

  useEffect(() => { setOffset(0); fetchUsers(0); }, [searchQuery, fetchUsers]);

  function goTo(newOffset) { setOffset(newOffset); fetchUsers(newOffset); }

  function openAdd() { setForm(EMPTY); setCreateErr(''); setShowAdd(true); }
  function setField(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true); setCreateErr('');
    try {
      const payload = {
        full_name: form.full_name.trim(),
        institutional_email: form.institutional_email.trim(),
        student_id: form.student_id.trim(),
        role,
        password: form.password,
      };
      if (role === 'faculty') {
        payload.department = form.department;
        payload.is_gec_faculty = form.is_gec_faculty;
        if (!form.is_gec_faculty && form.program) payload.program = Number(form.program);
      }
      await api.post('/auth/admin/users/', payload);
      toast(`${config.singular} account for ${payload.full_name} created.`, { type: 'success' });
      setShowAdd(false);
      goTo(0);
    } catch (err) {
      const d = err.response?.data;
      let m = d?.error || d?.detail;
      if (!m && d && typeof d === 'object') {
        const first = Object.entries(d)[0];
        if (first) m = `${first[0]}: ${Array.isArray(first[1]) ? first[1][0] : first[1]}`;
      }
      setCreateErr(m || 'Failed to create the account.');
    } finally { setCreating(false); }
  }

  async function handleDelete(u) {
    const ok = await confirm({
      title: `Remove ${u.full_name}?`,
      message: `This permanently deletes the ${config.singular.toLowerCase()} account and cannot be undone.`,
      confirmText: 'Remove',
    });
    if (!ok) return;
    setDeletingId(u.id);
    try {
      await api.delete(`/auth/admin/users/${u.id}/`);
      toast(`${config.singular} account removed.`, { type: 'success' });
      goTo(offset);
    } catch {
      toast('Failed to remove the account.', { type: 'error' });
    } finally {
      setDeletingId(null);
    }
  }

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd   = Math.min(offset + PAGE_LIMIT, total);

  return (
    <>
      <style>{CSS}</style>

      <div className="rum-head">
        <div>
          <div className="eyebrow">Manage · {total} {total === 1 ? config.singular.toLowerCase() : config.plural}</div>
          <h2>{config.titleLead} <em>{config.titleEm}</em></h2>
          <div className="sub">{config.sub}</div>
        </div>
        <button className="btn-pri" onClick={openAdd}>
          <i className={`ti ${config.addIcon}`} /> Add {config.singular.toLowerCase()}
        </button>
      </div>

      <form className="rum-search" onSubmit={e => { e.preventDefault(); setSearchQuery(searchInput.trim()); }}>
        <i className="ti ti-search" />
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder={`Search ${config.plural} by name, ID, or email…`}
        />
        {searchQuery && (
          <button type="button" className="rum-search-clear" onClick={() => { setSearchInput(''); setSearchQuery(''); }}>
            Clear
          </button>
        )}
      </form>

      {error && <div className="rum-flash-err">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--adm-muted)' }}>Loading {config.plural}…</p>
      ) : users.length === 0 ? (
        <div className="rum-empty">
          <i className={`ti ${config.emptyIcon}`} />
          <div className="t">{searchQuery ? `No ${config.plural} match your search` : `No ${config.plural} yet`}</div>
          <div className="d">
            {searchQuery
              ? 'Try a different name, ID, or email — or clear the search.'
              : `Click “Add ${config.singular.toLowerCase()}” to create the first account.`}
          </div>
        </div>
      ) : (
        <>
          <div className="rum-table">
            <div className="rum-row rum-row--head">
              <div className="rum-c-user">{config.singular}</div>
              <div className="rum-c-meta">{config.idLabel}</div>
              <div className="rum-c-status">Status</div>
              <div className="rum-c-date">Joined</div>
              <div className="rum-c-act" />
            </div>
            {users.map(u => (
              <div className="rum-row" key={u.id}>
                <div className="rum-c-user">
                  <div className="rum-avatar">{initials(u.full_name)}</div>
                  <div className="rum-user-id">
                    <div className="rum-name">{u.full_name}</div>
                    <div className="rum-email">{u.institutional_email}</div>
                    {role === 'faculty' && u.faculty_classification && u.faculty_classification !== 'Unclassified' && (
                      <div className="rum-sub">{u.faculty_classification}</div>
                    )}
                  </div>
                </div>
                <div className="rum-c-meta">{u.student_id || '—'}</div>
                <div className="rum-c-status">
                  <span className={`rum-tag ${u.is_active ? 'ok' : 'off'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                  {!u.is_verified && <span className="rum-tag warn">Unverified</span>}
                </div>
                <div className="rum-c-date">{fmtDate(u.date_joined || u.created_at)}</div>
                <div className="rum-c-act">
                  <button className="rum-del" title="Remove account" disabled={deletingId === u.id} onClick={() => handleDelete(u)}>
                    {deletingId === u.id ? '…' : <i className="ti ti-trash" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {total > PAGE_LIMIT && (
            <div className="rum-pager">
              <span>{pageStart}–{pageEnd} of {total}</span>
              <div className="rum-pager-btns">
                <button disabled={offset === 0} onClick={() => goTo(Math.max(0, offset - PAGE_LIMIT))}>
                  <i className="ti ti-chevron-left" /> Prev
                </button>
                <button disabled={pageEnd >= total} onClick={() => goTo(offset + PAGE_LIMIT)}>
                  Next <i className="ti ti-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showAdd && (
        <div className="rum-overlay" onMouseDown={() => !creating && setShowAdd(false)}>
          <div className="rum-modal" onMouseDown={e => e.stopPropagation()}>
            <div className="rum-modal-head">
              <div>
                <h3>Add {config.singular.toLowerCase()}</h3>
                <div className="rum-modal-sub">{config.addSub}</div>
              </div>
              <button className="rum-modal-x" onClick={() => setShowAdd(false)} disabled={creating}><i className="ti ti-x" /></button>
            </div>
            <form className="rum-modal-body" onSubmit={handleCreate}>
              {createErr && <div className="rum-flash-err">{createErr}</div>}

              <div className="rum-field">
                <label>Full name</label>
                <input required placeholder="Dela Cruz, Juan A."
                  value={form.full_name} onChange={e => setField('full_name', e.target.value)} />
              </div>
              <div className="rum-field">
                <label>Institutional email</label>
                <input type="email" required placeholder={config.emailPlaceholder}
                  value={form.institutional_email} onChange={e => setField('institutional_email', e.target.value)} />
              </div>
              <div className="rum-field">
                <label>{config.idLabel}</label>
                <input required placeholder={config.idPlaceholder}
                  value={form.student_id} onChange={e => setField('student_id', e.target.value)} />
              </div>

              {role === 'faculty' && (
                <>
                  <div className="rum-field">
                    <label>Department <span className="rum-opt">(optional)</span></label>
                    <select value={form.department} onChange={e => setField('department', e.target.value)}>
                      <option value="">Select a department</option>
                      {departments.map(d => <option key={d.id} value={d.code}>{d.code} - {d.name}</option>)}
                    </select>
                  </div>
                  <div className="rum-field">
                    <label className="rum-check">
                      <input type="checkbox" checked={form.is_gec_faculty}
                        onChange={e => setField('is_gec_faculty', e.target.checked)} />
                      GEC faculty — teaches general-education courses across programs
                    </label>
                    {!form.is_gec_faculty && (
                      <select value={form.program} onChange={e => setField('program', e.target.value)}>
                        <option value="">Core program (optional)</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                      </select>
                    )}
                  </div>
                </>
              )}

              <div className="rum-field">
                <label>Temporary password</label>
                <input type="text" required minLength={8} placeholder="At least 8 characters"
                  value={form.password} onChange={e => setField('password', e.target.value)} />
                <div className="rum-hint">Share this with the account holder; they should change it after their first login.</div>
              </div>

              <div className="rum-modal-foot">
                <button type="button" className="btn-sec" onClick={() => setShowAdd(false)} disabled={creating}>Cancel</button>
                <button type="submit" className="btn-pri" disabled={creating}>
                  {creating ? 'Creating…' : `Add ${config.singular.toLowerCase()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const CSS = `
  .rum-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1.5rem;}
  .rum-head .sub{font-size:13.5px;color:var(--adm-muted);margin-top:.35rem;max-width:560px;line-height:1.5;}
  .rum-search{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid var(--adm-line);padding:9px 13px;margin-bottom:1.25rem;}
  .rum-search i{font-size:17px;color:var(--adm-faint);}
  .rum-search input{flex:1;border:none;outline:none;font:14px/1.4 'Inter',sans-serif;color:var(--adm-ink);background:none;}
  .rum-search-clear{background:none;border:none;color:var(--adm-muted);font-size:12px;cursor:pointer;font-weight:600;}
  .rum-search-clear:hover{color:var(--adm-ink);}
  .rum-flash-err{background:#fee2e2;color:#991b1b;padding:.6rem .85rem;font-size:12.5px;margin-bottom:1rem;}

  .rum-table{border:1px solid var(--adm-line);background:#fff;}
  .rum-row{display:grid;grid-template-columns:1fr 150px 150px 130px 48px;align-items:center;gap:1rem;padding:.85rem 1.1rem;border-bottom:1px solid var(--adm-line-soft);}
  .rum-row:last-child{border-bottom:none;}
  .rum-row--head{background:var(--adm-warm);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--adm-muted);font-weight:600;padding-top:.7rem;padding-bottom:.7rem;}
  .rum-c-user{display:flex;align-items:center;gap:12px;min-width:0;}
  .rum-avatar{width:36px;height:36px;flex-shrink:0;border-radius:50%;background:var(--adm-ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;}
  .rum-user-id{min-width:0;}
  .rum-name{font-size:14px;font-weight:600;color:var(--adm-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .rum-email{font-size:12px;color:var(--adm-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .rum-sub{font-size:11px;color:var(--adm-gold,#b8860b);font-weight:600;margin-top:1px;}
  .rum-c-meta{font-size:12.5px;color:var(--adm-ink-2);font-variant-numeric:tabular-nums;}
  .rum-tag{display:inline-block;font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;margin-right:5px;}
  .rum-tag.ok{background:var(--adm-green-tint,#e6f4ec);color:var(--adm-green,#0a6b48);}
  .rum-tag.off{background:#eef0f4;color:#6a7384;}
  .rum-tag.warn{background:#fdf3e2;color:#8a6a12;}
  .rum-c-date{font-size:12.5px;color:var(--adm-muted);}
  .rum-c-act{display:flex;justify-content:flex-end;}
  .rum-del{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;background:#fff;border:1px solid var(--adm-line);color:var(--adm-muted);cursor:pointer;font-size:14px;}
  .rum-del:hover:not(:disabled){border-color:#e6b4b4;color:var(--adm-red,#b91c1c);}
  .rum-del:disabled{opacity:.5;cursor:default;}

  .rum-pager{display:flex;align-items:center;justify-content:space-between;margin-top:1rem;font-size:12.5px;color:var(--adm-muted);}
  .rum-pager-btns{display:flex;gap:.5rem;}
  .rum-pager-btns button{display:inline-flex;align-items:center;gap:4px;background:#fff;border:1px solid var(--adm-line);padding:6px 11px;font-size:12.5px;color:var(--adm-ink);cursor:pointer;font-family:inherit;}
  .rum-pager-btns button:hover:not(:disabled){border-color:var(--adm-ink);}
  .rum-pager-btns button:disabled{opacity:.45;cursor:default;}

  .rum-empty{text-align:center;padding:3.5rem 2rem;background:#fff;border:1px solid var(--adm-line);}
  .rum-empty i{font-size:42px;color:var(--adm-faint);display:block;margin-bottom:.9rem;}
  .rum-empty .t{font-size:15px;font-weight:600;color:var(--adm-ink);margin-bottom:.4rem;}
  .rum-empty .d{font-size:13px;color:var(--adm-muted);max-width:340px;margin:0 auto;line-height:1.5;}

  .rum-overlay{position:fixed;inset:0;background:rgba(10,22,40,.5);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:3rem 1rem;overflow-y:auto;}
  .rum-modal{background:#fff;width:100%;max-width:460px;border:1px solid var(--adm-line);box-shadow:0 24px 60px -20px rgba(10,22,40,.4);}
  .rum-modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding:1.2rem 1.4rem;border-bottom:1px solid var(--adm-line-soft);}
  .rum-modal-head h3{font-size:16px;font-weight:700;color:var(--adm-ink);}
  .rum-modal-sub{font-size:12.5px;color:var(--adm-muted);margin-top:3px;line-height:1.4;}
  .rum-modal-x{background:none;border:none;color:var(--adm-faint);font-size:18px;cursor:pointer;line-height:1;}
  .rum-modal-x:hover{color:var(--adm-ink);}
  .rum-modal-body{padding:1.2rem 1.4rem;}
  .rum-field{display:flex;flex-direction:column;gap:5px;margin-bottom:1rem;}
  .rum-field label{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--adm-muted);font-weight:600;}
  .rum-opt{text-transform:none;letter-spacing:0;font-weight:400;color:var(--adm-faint);}
  .rum-field input,.rum-field select{padding:9px 12px;border:1px solid var(--adm-line);background:#fff;font:13.5px/1.4 'Inter',sans-serif;color:var(--adm-ink);outline:none;}
  .rum-field input:focus,.rum-field select:focus{border-color:var(--adm-ink);}
  .rum-check{display:flex;align-items:flex-start;gap:8px;text-transform:none;letter-spacing:0;font-size:12.5px;color:var(--adm-ink);font-weight:500;margin-bottom:8px;}
  .rum-check input{margin-top:1px;}
  .rum-hint{font-size:11.5px;color:var(--adm-faint);line-height:1.4;}
  .rum-modal-foot{display:flex;justify-content:flex-end;gap:.6rem;margin-top:1.2rem;}
  @media(max-width:720px){
    .rum-row{grid-template-columns:1fr 90px 40px;}
    .rum-c-meta,.rum-c-date{display:none;}
  }
`;
