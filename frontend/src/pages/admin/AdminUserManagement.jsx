import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useAdminShell } from '../../context/AdminShellContext';

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

const ROLE_OPTIONS = [
  { value: '',                   label: 'All roles'          },
  { value: 'student',            label: 'Student'            },
  { value: 'faculty',            label: 'Faculty'            },
  { value: 'registrar',          label: 'Registrar'          },
  { value: 'admin',              label: 'Admin'              },
];

// Roles an admin can create/assign (excludes the "All roles" filter entry).
const ASSIGNABLE_ROLES = ROLE_OPTIONS.filter(o => o.value);

const ROLE_LABEL = Object.fromEntries(ROLE_OPTIONS.map(o => [o.value, o.label]));

const ROLE_TAG = {
  student: 'role-student', faculty: 'role-faculty',
  registrar: 'role-registrar', admin: 'role-admin',
};

const PAGE_LIMIT = 20;

function RowMenu({ items }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="dropdown">
      <button
        className="btn-ghost"
        style={{ padding: '4px 10px', fontSize: 20, lineHeight: 1, color: '#8a93a3', letterSpacing: 2 }}
        onClick={() => setOpen(o => !o)}
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
                  onClick={() => { it.onClick(); setOpen(false); }}
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

export default function AdminUserManagement() {
  const { user } = useAuth();
  const { toast } = useAdminShell();

  const [stats,      setStats]      = useState(null);
  const [users,      setUsers]      = useState([]);
  const [total,      setTotal]      = useState(0);
  const [offset,     setOffset]     = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const [filterRole,     setFilterRole]     = useState('');
  const [filterActive,   setFilterActive]   = useState('');
  const [filterVerified, setFilterVerified] = useState('');
  const [searchInput,    setSearchInput]    = useState('');
  const [searchQuery,    setSearchQuery]    = useState('');

  const [expandedId, setExpandedId] = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [saving,     setSaving]     = useState(null);

  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);

  const EMPTY_CREATE = {
    full_name: '', institutional_email: '', student_id: '',
    role: 'faculty', department: '', program: '', is_gec_faculty: false, password: '',
  };
  const [showCreate,  setShowCreate]  = useState(false);
  const [createForm,  setCreateForm]  = useState(EMPTY_CREATE);
  const [createErr,   setCreateErr]   = useState('');
  const [creating,    setCreating]    = useState(false);

  useEffect(() => {
    api.get('/auth/admin/stats/').then(r => setStats(r.data)).catch(() => {});
    api.get('/auth/departments/').then(r => setDepartments(r.data || [])).catch(() => {});
    api.get('/enrollment/admin/programs/').then(r => setPrograms(r.data?.results ?? r.data ?? [])).catch(() => {});
  }, []);

  function openCreate() {
    setCreateForm(EMPTY_CREATE);
    setCreateErr('');
    setShowCreate(true);
  }
  function setCreateField(field, value) {
    setCreateForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true); setCreateErr('');
    try {
      const payload = {
        full_name:           createForm.full_name.trim(),
        institutional_email: createForm.institutional_email.trim(),
        student_id:          createForm.student_id.trim(),
        role:                createForm.role,
        password:            createForm.password,
      };
      if (createForm.role === 'faculty') payload.department = createForm.department;
      if (createForm.role === 'faculty') {
        payload.is_gec_faculty = createForm.is_gec_faculty;
        if (!createForm.is_gec_faculty && createForm.program) payload.program = Number(createForm.program);
      }
      await api.post('/auth/admin/users/', payload);
      const msg = `${ROLE_LABEL[createForm.role]} account for ${payload.full_name} created.`;
      toast(msg, { type: 'success' });
      setShowCreate(false);
      fetchUsers(0);
    } catch (err) {
      const data = err.response?.data;
      // Surface the first field error the serializer returned.
      let m = data?.error || data?.detail;
      if (!m && data && typeof data === 'object') {
        const first = Object.entries(data)[0];
        if (first) m = `${first[0]}: ${Array.isArray(first[1]) ? first[1][0] : first[1]}`;
      }
      setCreateErr(m || 'Failed to create account.');
    } finally { setCreating(false); }
  }

  const fetchUsers = useCallback((newOffset = 0) => {
    setLoading(true); setError('');
    const params = new URLSearchParams({ limit: PAGE_LIMIT, offset: newOffset });
    if (filterRole)     params.append('role',        filterRole);
    if (filterActive)   params.append('is_active',   filterActive);
    if (filterVerified) params.append('is_verified', filterVerified);
    if (searchQuery)    params.append('search',      searchQuery);
    api.get(`/auth/admin/users/?${params.toString()}`)
      .then(res => {
        setUsers(res.data.results ?? res.data);
        setTotal(res.data.count ?? (res.data.results ?? res.data).length);
      })
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, [filterRole, filterActive, filterVerified, searchQuery]);

  useEffect(() => { setOffset(0); fetchUsers(0); }, [filterRole, filterActive, filterVerified, searchQuery]); // eslint-disable-line
  useEffect(() => { fetchUsers(offset); }, [offset]); // eslint-disable-line

  function handleSearch(e) { e.preventDefault(); setSearchQuery(searchInput.trim()); }

  function openExpand(u) {
    if (expandedId === u.id) { setExpandedId(null); return; }
    setExpandedId(u.id);
    if (!editForm[u.id]) {
      setEditForm(prev => ({
        ...prev,
        [u.id]: {
          role: u.role, is_active: u.is_active, unlock: false,
          department: u.department_code || '',
          program: u.program_id || '', is_gec_faculty: u.is_gec_faculty || false,
        },
      }));
    }
  }

  function setField(id, field, value) {
    setEditForm(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleSave(u) {
    const form = editForm[u.id];
    setSaving(u.id); setError('');
    try {
      const payload = {};
      if (form.role !== u.role)           payload.role      = form.role;
      if (form.is_active !== u.is_active) payload.is_active = form.is_active;
      if (form.unlock)                    payload.unlock    = true;
      // Department applies to faculty; send when it changed.
      const effRoleD = form.role ?? u.role;
      const curDept = u.department_code || '';
      const newDept = (effRoleD === 'faculty') ? (form.department ?? curDept) : '';
      if (newDept !== curDept) payload.department = newDept;
      // Faculty classification (program + GEC).
      const effRole = form.role ?? u.role;
      if (effRole === 'faculty') {
        const newGec = form.is_gec_faculty ?? u.is_gec_faculty ?? false;
        if (newGec !== (u.is_gec_faculty || false)) payload.is_gec_faculty = newGec;
        const curProg = u.program_id || '';
        const newProg = newGec ? '' : (form.program ?? curProg);
        if (String(newProg) !== String(curProg)) payload.program = newProg ? Number(newProg) : null;
      }
      if (Object.keys(payload).length === 0) { setSaving(null); return; }
      await api.patch(`/auth/admin/users/${u.id}/`, payload);
      const msg = `Account for ${u.full_name} updated.`;
      toast(msg, { type: 'success' });
      setExpandedId(null);
      fetchUsers(offset);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error || data?.detail || 'Failed to save changes.');
    } finally { setSaving(null); }
  }

  async function handleDelete(u) {
    const ok = window.confirm(
      `Delete ${ROLE_LABEL[u.role] || u.role} "${u.full_name}"?\n\n` +
      'If this account has linked records (grades, schedules, enrolments, documents, or ' +
      'announcements), it will be deactivated instead of deleted so history is kept. ' +
      'Otherwise it is permanently removed.'
    );
    if (!ok) return;
    setError('');
    try {
      const res = await api.delete(`/auth/admin/users/${u.id}/`);
      toast(res.data?.message || 'Account removed.', {
        type: res.data?.status === 'deleted' ? 'success' : 'warn',
      });
      fetchUsers(offset);
    } catch (err) {
      const data = err.response?.data;
      toast(data?.error || data?.detail || 'Failed to remove account.', { type: 'error' });
    }
  }

  const totalPages  = Math.ceil(total / PAGE_LIMIT);
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">Manage · {total.toLocaleString()} records</div>
          <h2>User <em>management</em></h2>
          <div className="sub">View, search, and manage student, faculty, registrar, and admin accounts across the campus.</div>
        </div>
        <div className="actions">
          <button className="btn-sec" onClick={() => toast('Export not yet available', { type: 'warn' })}>
            <i className="ti ti-file-export" /> Export
          </button>
        </div>
      </div>

      {stats && (
        <div className="stat-row">
          <div className="stat">
            <div className="num">{(stats.total_users ?? 0).toLocaleString()}</div>
            <div className="lbl">Total users</div>
          </div>
          <div className="stat">
            <div className="num">{(stats.students ?? 0).toLocaleString()}</div>
            <div className="lbl">Students</div>
          </div>
          <div className="stat">
            <div className="num">{(stats.faculty ?? 0).toLocaleString()}</div>
            <div className="lbl">Faculty</div>
          </div>
          <div className="stat">
            <div className="num">{(stats.registrars ?? 0).toLocaleString()}</div>
            <div className="lbl">Registrars</div>
          </div>
          <div className="stat">
            <div className="num amber">{(stats.unverified_users ?? 0).toLocaleString()}</div>
            <div className="lbl">Unverified</div>
            <div className="delta">Awaiting email verification</div>
          </div>
          <div className="stat">
            <div className="num red">{(stats.locked_users ?? 0).toLocaleString()}</div>
            <div className="lbl">Locked</div>
            <div className="delta">Lockout policy triggered</div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="toolbar-search">
          <i className="ti ti-search" />
          <form onSubmit={handleSearch} style={{ display: 'contents' }}>
            <input
              placeholder="Search by name, ID, or email…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </form>
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)}>
          <option value="">Any status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select value={filterVerified} onChange={e => setFilterVerified(e.target.value)}>
          <option value="">All verified</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <span className="toolbar-spacer" />
        {searchQuery && (
          <button className="btn-ghost" onClick={() => { setSearchInput(''); setSearchQuery(''); }}>
            <i className="ti ti-x" /> Clear
          </button>
        )}
      </div>

      {error && <div className="um-flash um-flash-err">{error}</div>}

      {loading ? (
        <div className="um-loading">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-users" />
          <div className="t">No users found</div>
          <div className="d">Try adjusting your search or filter criteria.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Student ID</th>
                <th>Date joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.flatMap(u => {
                const expanded = expandedId === u.id;
                const form     = editForm[u.id] || {};
                const isSelf   = u.id === user?.id;
                const isSaving = saving === u.id;

                const rows = [
                  <tr key={u.id} style={expanded ? { background: 'var(--adm-cool)' } : undefined}>
                    <td>
                      <div className="row-user">
                        <div className={`avatar sm${u.role === 'admin' ? ' gold' : ''}`}>
                          {initials(u.full_name)}
                        </div>
                        <div className="meta">
                          <div className="name">
                            {u.full_name}
                            {isSelf && <span className="um-self-pill">You</span>}
                          </div>
                          <div className="email">{u.institutional_email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`tag ${ROLE_TAG[u.role] || 'role-system'}`}>
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                      {u.role === 'faculty' && u.faculty_classification && u.faculty_classification !== 'Unclassified' && (
                        <div className="um-dept-line">{u.faculty_classification}</div>
                      )}
                    </td>
                    <td>
                      {u.is_locked
                        ? <span className="tag status-locked">Locked</span>
                        : !u.is_verified
                          ? <span className="tag status-unverified">Unverified</span>
                          : u.is_active
                            ? <span className="tag status-active">Active</span>
                            : <span className="tag status-inactive">Inactive</span>
                      }
                    </td>
                    <td className="muted">{u.student_id || '-'}</td>
                    <td className="muted">
                      {new Date(u.date_joined).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ width: 48 }}>
                      <RowMenu items={[
                        { icon: 'ti-pencil',   label: 'Edit account', onClick: () => openExpand(u) },
                        ...(isSelf ? [] : [
                          'sep',
                          { icon: 'ti-trash', label: 'Remove', danger: true, onClick: () => handleDelete(u) },
                        ]),
                      ]} />
                    </td>
                  </tr>,
                ];

                if (expanded) {
                  rows.push(
                    <tr key={`${u.id}-edit`} className="um-expanded-row">
                      <td colSpan={6}>
                        {isSelf ? (
                          <p className="um-self-note">You cannot modify your own account through this interface.</p>
                        ) : (
                          <div className="um-edit-panel">
                            <p className="um-edit-title">Editing {u.full_name}</p>
                            <div className="um-edit-fields">
                              <div className="um-edit-field">
                                <label className="um-edit-label">Role</label>
                                <select
                                  className="um-edit-select"
                                  value={form.role || u.role}
                                  onChange={e => setField(u.id, 'role', e.target.value)}
                                >
                                  {ASSIGNABLE_ROLES.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                              {(form.role || u.role) === 'faculty' && (
                                <div className="um-edit-field">
                                  <label className="um-edit-label">Department</label>
                                  <select
                                    className="um-edit-select"
                                    value={form.department ?? (u.department_code || '')}
                                    onChange={e => setField(u.id, 'department', e.target.value)}
                                  >
                                    <option value="">Select</option>
                                    {departments.map(d => (
                                      <option key={d.id} value={d.code}>{d.code} - {d.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              {(form.role || u.role) === 'faculty' && (
                                <>
                                  <label className="um-edit-unlock" style={{ paddingTop: '1.5rem' }}>
                                    <input type="checkbox"
                                      checked={form.is_gec_faculty ?? u.is_gec_faculty ?? false}
                                      onChange={e => setField(u.id, 'is_gec_faculty', e.target.checked)} />
                                    GEC faculty
                                  </label>
                                  {!(form.is_gec_faculty ?? u.is_gec_faculty) && (
                                    <div className="um-edit-field">
                                      <label className="um-edit-label">Core program</label>
                                      <select className="um-edit-select"
                                        value={form.program ?? (u.program_id || '')}
                                        onChange={e => setField(u.id, 'program', e.target.value)}>
                                        <option value="">None</option>
                                        {programs.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
                                      </select>
                                    </div>
                                  )}
                                </>
                              )}
                              <div className="um-edit-field">
                                <label className="um-edit-label">Status</label>
                                <select
                                  className="um-edit-select"
                                  value={form.is_active !== undefined ? String(form.is_active) : String(u.is_active)}
                                  onChange={e => setField(u.id, 'is_active', e.target.value === 'true')}
                                >
                                  <option value="true">Active</option>
                                  <option value="false">Inactive</option>
                                </select>
                              </div>
                              {u.is_locked && (
                                <label className="um-edit-unlock">
                                  <input
                                    type="checkbox"
                                    checked={form.unlock || false}
                                    onChange={e => setField(u.id, 'unlock', e.target.checked)}
                                  />
                                  Unlock account
                                </label>
                              )}
                              <button className="btn-pri" onClick={() => handleSave(u)} disabled={isSaving}>
                                {isSaving ? 'Saving…' : <><i className="ti ti-check" /> Save</>}
                              </button>
                              <button className="btn-sec" onClick={() => setExpandedId(null)}>Cancel</button>
                            </div>
                            <div className="um-detail-grid">
                              <div>
                                <span className="um-detail-label">Failed logins</span>
                                <span className="um-detail-val">{u.failed_login_attempts}</span>
                              </div>
                              {u.locked_until && (
                                <div>
                                  <span className="um-detail-label">Locked until</span>
                                  <span className="um-detail-val" style={{ color: 'var(--adm-red)' }}>
                                    {new Date(u.locked_until).toLocaleString('en-PH')}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="um-detail-label">Contact</span>
                                <span className="um-detail-val">{u.contact_number || '-'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }

                return rows;
              })}
            </tbody>
          </table>

          <div className="pagination">
            <div className="count">
              {total === 0
                ? 'No users'
                : `Showing ${offset + 1}–${Math.min(offset + PAGE_LIMIT, total)} of ${total.toLocaleString()} users`}
            </div>
            <div className="controls">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_LIMIT))}
              >
                <i className="ti ti-chevron-left" />
              </button>
              <button className="active">{currentPage}</button>
              {currentPage < totalPages && (
                <button onClick={() => setOffset(offset + PAGE_LIMIT)}>{currentPage + 1}</button>
              )}
              {currentPage < totalPages - 1 && <button disabled>…</button>}
              {totalPages > 1 && currentPage < totalPages - 1 && (
                <button onClick={() => setOffset((totalPages - 1) * PAGE_LIMIT)}>{totalPages}</button>
              )}
              <button
                disabled={offset + PAGE_LIMIT >= total}
                onClick={() => setOffset(offset + PAGE_LIMIT)}
              >
                <i className="ti ti-chevron-right" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="um-modal-overlay" onMouseDown={() => !creating && setShowCreate(false)}>
          <div className="um-modal" onMouseDown={e => e.stopPropagation()}>
            <div className="um-modal-head">
              <div>
                <h3>Add <em>user</em></h3>
                <div className="um-modal-sub">Create a staff account (faculty, registrar, or admin).</div>
              </div>
              <button className="adm-icon-btn" onClick={() => setShowCreate(false)} disabled={creating}>
                <i className="ti ti-x" />
              </button>
            </div>

            <form className="um-modal-body" onSubmit={handleCreate}>
              {createErr && <div className="um-flash um-flash-err">{createErr}</div>}

              <div className="um-modal-field">
                <label className="um-edit-label">Full name</label>
                <input
                  className="um-modal-input" required
                  placeholder="Dela Cruz, Juan A."
                  value={createForm.full_name}
                  onChange={e => setCreateField('full_name', e.target.value)}
                />
              </div>

              <div className="um-modal-field">
                <label className="um-edit-label">Institutional email</label>
                <input
                  className="um-modal-input" type="email" required
                  placeholder="jdelacruz@nemsu.edu.ph"
                  value={createForm.institutional_email}
                  onChange={e => setCreateField('institutional_email', e.target.value)}
                />
              </div>

              <div className="um-modal-field">
                <label className="um-edit-label">Student / Employee ID</label>
                <input
                  className="um-modal-input" required
                  placeholder="e.g. FAC-00010"
                  value={createForm.student_id}
                  onChange={e => setCreateField('student_id', e.target.value)}
                />
              </div>

              <div className="um-modal-grid">
                <div className="um-modal-field">
                  <label className="um-edit-label">Role</label>
                  <select
                    className="um-modal-input"
                    value={createForm.role}
                    onChange={e => setCreateField('role', e.target.value)}
                  >
                    {ASSIGNABLE_ROLES.filter(o => o.value !== 'student').map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {createForm.role === 'faculty' && (
                  <div className="um-modal-field">
                    <label className="um-edit-label">
                      Department (optional)
                    </label>
                    <select
                      className="um-modal-input"
                      value={createForm.department}
                      onChange={e => setCreateField('department', e.target.value)}
                    >
                      <option value="">Select</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.code}>{d.code} - {d.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {createForm.role === 'faculty' && (
                <div className="um-modal-field">
                  <label className="um-edit-label">Faculty classification</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '2px 0 8px' }}>
                    <input type="checkbox" checked={createForm.is_gec_faculty}
                      onChange={e => setCreateField('is_gec_faculty', e.target.checked)} />
                    GEC faculty (teaches general-education courses across programs)
                  </label>
                  {!createForm.is_gec_faculty && (
                    <select className="um-modal-input" value={createForm.program}
                      onChange={e => setCreateField('program', e.target.value)}>
                      <option value="">Core program (optional)</option>
                      {programs.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                    </select>
                  )}
                </div>
              )}

              <div className="um-modal-field">
                <label className="um-edit-label">Temporary password</label>
                <input
                  className="um-modal-input" type="text" required minLength={8}
                  placeholder="At least 8 characters"
                  value={createForm.password}
                  onChange={e => setCreateField('password', e.target.value)}
                />
                <div className="um-modal-hint">The account holder should change this after first login.</div>
              </div>

              <div className="um-modal-foot">
                <button type="button" className="btn-sec" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
                <button type="submit" className="btn-pri" disabled={creating}>
                  {creating ? 'Creating…' : <><i className="ti ti-check" /> Create account</>}
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
  .um-flash{padding:10px 16px;margin-bottom:1rem;font-size:13px}
  .um-flash-err{background:#f6e8e4;color:var(--adm-red)}
  .um-flash-ok{background:#e6f1ec;color:var(--adm-green)}
  .um-loading{color:var(--adm-muted);padding:2rem 0;font-size:13px}
  .um-self-pill{font-size:10px;background:#e6f1ec;color:var(--adm-green);padding:2px 7px;font-weight:700;margin-left:8px;letter-spacing:.06em;text-transform:uppercase}
  .um-expanded-row > td{padding:0;background:var(--adm-cool)!important;border-bottom:2px solid var(--adm-line)!important}
  .um-edit-panel{padding:1.25rem 1.5rem}
  .um-edit-title{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--adm-muted);font-weight:600;margin-bottom:1rem}
  .um-edit-fields{display:flex;flex-wrap:wrap;gap:.75rem;align-items:flex-end}
  .um-edit-field{display:flex;flex-direction:column;gap:4px}
  .um-edit-label{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--adm-faint);font-weight:600}
  .um-edit-select{padding:7px 10px;border:1px solid var(--adm-line);background:#fff;font:13px/1.4 'Inter',sans-serif;color:var(--adm-ink);min-width:140px}
  .um-edit-unlock{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--adm-ink);cursor:pointer;padding-top:1.5rem}
  .um-detail-grid{display:flex;gap:2rem;flex-wrap:wrap;margin-top:1rem;padding-top:.75rem;border-top:1px solid var(--adm-line-soft)}
  .um-detail-label{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--adm-faint);font-weight:600;display:block;margin-bottom:2px}
  .um-detail-val{font-size:12px;color:var(--adm-ink)}
  .um-self-note{font-size:13px;color:var(--adm-muted);font-style:italic;padding:1.25rem 1.5rem;margin:0}
  .um-dept-line{font-size:11px;color:var(--adm-muted);margin-top:4px;letter-spacing:.04em}
  .um-modal-overlay{position:fixed;inset:0;z-index:200;background:rgba(10,22,40,.45);display:flex;align-items:flex-start;justify-content:center;padding:5vh 16px;overflow-y:auto}
  .um-modal{background:#fff;width:100%;max-width:440px;border:1px solid var(--adm-line);box-shadow:0 24px 60px -20px rgba(10,22,40,.4)}
  .um-modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding:1.25rem 1.5rem;border-bottom:1px solid var(--adm-line)}
  .um-modal-head h3{font-size:18px;color:var(--adm-ink);font-weight:600;margin:0}
  .um-modal-head h3 em{font-style:normal;color:var(--adm-gold,#b89043)}
  .um-modal-sub{font-size:12px;color:var(--adm-muted);margin-top:3px}
  .um-modal-body{padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:1rem}
  .um-modal-field{display:flex;flex-direction:column;gap:5px}
  .um-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .um-modal-input{padding:9px 11px;border:1px solid var(--adm-line);background:#fff;font:13px/1.4 'Inter',sans-serif;color:var(--adm-ink);width:100%}
  .um-modal-input:focus{outline:none;border-color:var(--adm-gold,#b89043)}
  .um-modal-hint{font-size:11px;color:var(--adm-faint)}
  .um-modal-foot{display:flex;justify-content:flex-end;gap:.75rem;padding-top:.5rem;margin-top:.25rem;border-top:1px solid var(--adm-line-soft)}
  @media(max-width:520px){.um-modal-grid{grid-template-columns:1fr}}
`;
