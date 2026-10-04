import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAdminShell } from '../../context/AdminShellContext';

const ROLE_OPTIONS = [
  { value: '',          label: 'All roles'  },
  { value: 'student',   label: 'Student'    },
  { value: 'faculty',   label: 'Faculty'    },
  { value: 'registrar', label: 'Registrar'  },
  { value: 'admin',     label: 'Admin'      },
];

const PAGE_LIMIT = 20;

const ROLE_TAG = {
  student:   'role-student',
  faculty:   'role-faculty',
  registrar: 'role-registrar',
  admin:     'role-admin',
};

export default function AdminAuditLog() {
  useAdminShell(); // ensures admin context

  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [offset, setOffset]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const [filterRole,   setFilterRole]   = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [actionInput,  setActionInput]  = useState('');
  const [actionQuery,  setActionQuery]  = useState('');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');

  const [expandedId, setExpandedId] = useState(null);

  const fetchLogs = useCallback((newOffset = 0) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ limit: PAGE_LIMIT, offset: newOffset });
    if (filterRole)   params.append('role',      filterRole);
    if (filterResult) params.append('result',    filterResult);
    if (actionQuery)  params.append('action',    actionQuery);
    if (dateFrom)     params.append('date_from', dateFrom);
    if (dateTo)       params.append('date_to',   dateTo);
    api.get(`/auth/admin/audit-log/?${params.toString()}`)
      .then(res => {
        setLogs(res.data.results ?? res.data);
        setTotal(res.data.count ?? (res.data.results ?? res.data).length);
      })
      .catch(() => setError('Failed to load audit log.'))
      .finally(() => setLoading(false));
  }, [filterRole, filterResult, actionQuery, dateFrom, dateTo]);

  useEffect(() => {
    setOffset(0);
    fetchLogs(0);
  }, [filterRole, filterResult, actionQuery, dateFrom, dateTo]); // eslint-disable-line

  useEffect(() => {
    fetchLogs(offset);
  }, [offset]); // eslint-disable-line

  function handleSearch(e) {
    e.preventDefault();
    setActionQuery(actionInput.trim());
  }

  const totalPages  = Math.ceil(total / PAGE_LIMIT);
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">Security · {total.toLocaleString()} events</div>
          <h2>Audit <em>log</em></h2>
          <div className="sub">Track every significant system event: logins, role changes, data access, and failures.</div>
        </div>
      </div>

      <div className="toolbar">
        <select
          className="al-select"
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
        >
          {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          className="al-select"
          value={filterResult}
          onChange={e => setFilterResult(e.target.value)}
        >
          <option value="">All results</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="label">From</span>
          <input type="date" className="al-date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="label">To</span>
          <input type="date" className="al-date" value={dateTo}   onChange={e => setDateTo(e.target.value)} />
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, flex: 1 }}>
          <div className="toolbar-search" style={{ flex: 1, maxWidth: 340 }}>
            <i className="ti ti-search" />
            <input
              type="text"
              placeholder="Filter by action keyword…"
              value={actionInput}
              onChange={e => setActionInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-sec">Search</button>
          {actionQuery && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => { setActionInput(''); setActionQuery(''); }}
            >
              <i className="ti ti-x" /> Clear
            </button>
          )}
        </form>
      </div>

      {error && <div className="al-flash al-flash-err">{error}</div>}

      {!loading && (
        <div className="al-count">
          {total === 0
            ? 'No audit events found.'
            : `Showing ${offset + 1}–${Math.min(offset + PAGE_LIMIT, total)} of ${total.toLocaleString()} event${total !== 1 ? 's' : ''}`}
        </div>
      )}

      {loading ? (
        <div className="al-loading">Loading audit log…</div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-clock-hour-4" />
          <div className="t">No events match your filters</div>
          <div className="d">Try changing the role, result, or date range filters.</div>
        </div>
      ) : (
        <div className="al-list">
          {logs.map(log => {
            const expanded = expandedId === log.id;
            const roleTag  = ROLE_TAG[log.role] ?? 'outline';
            return (
              <div key={log.id} className="al-card">
                <div
                  className="al-card-row"
                  onClick={() => setExpandedId(expanded ? null : log.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setExpandedId(expanded ? null : log.id)}
                >
                  <span className="al-ts">
                    {new Date(log.timestamp).toLocaleString('en-PH', { hour12: true })}
                  </span>
                  <span className="al-action">{log.action}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                    {log.role && <span className={`tag ${roleTag}`}>{log.role}</span>}
                    <span className={`tag ${log.result === 'success' ? 'success' : 'failure'}`}>
                      {log.result === 'success' ? 'Success' : 'Failure'}
                    </span>
                    <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'} al-chevron`} />
                  </div>
                </div>

                {expanded && (
                  <div className="al-card-body">
                    <div className="al-detail-grid">
                      <div className="al-detail-cell">
                        <span className="al-detail-label">User</span>
                        <span className="al-detail-val">{log.user_name}</span>
                      </div>
                      <div className="al-detail-cell">
                        <span className="al-detail-label">Email</span>
                        <span className="al-detail-val">{log.user_email || '-'}</span>
                      </div>
                      <div className="al-detail-cell">
                        <span className="al-detail-label">Resource</span>
                        <span className="al-detail-val">{log.resource}</span>
                      </div>
                      <div className="al-detail-cell">
                        <span className="al-detail-label">IP address</span>
                        <span className="al-detail-val">{log.ip_address || '-'}</span>
                      </div>
                    </div>
                    {log.extra && Object.keys(log.extra).length > 0 && (
                      <div style={{ marginTop: '.5rem' }}>
                        <span className="al-detail-label">Extra data</span>
                        <pre className="al-pre">{JSON.stringify(log.extra, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <span className="count">Page {currentPage} of {totalPages}</span>
          <div className="controls">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_LIMIT))}
              disabled={offset === 0}
            >
              <i className="ti ti-chevron-left" /> Previous
            </button>
            <button
              onClick={() => setOffset(offset + PAGE_LIMIT)}
              disabled={offset + PAGE_LIMIT >= total}
            >
              Next <i className="ti ti-chevron-right" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const CSS = `
  .al-flash{padding:10px 16px;margin-bottom:1rem;font-size:13px}
  .al-flash-err{background:#f6e8e4;color:var(--adm-red)}
  .al-loading{color:var(--adm-muted);padding:2rem 0;font-size:13px}
  .al-count{font-size:12px;color:var(--adm-muted);margin-bottom:.75rem}
  .al-select{padding:9px 12px;background:#fff;border:1px solid var(--adm-line);outline:none;font:13px/1.4 'Inter',sans-serif;color:var(--adm-ink);font-family:inherit;min-width:130px}
  .al-date{padding:9px 10px;background:#fff;border:1px solid var(--adm-line);outline:none;font:13px/1.4 'Inter',sans-serif;color:var(--adm-ink);font-family:inherit}
  .al-list{display:flex;flex-direction:column;gap:4px}
  .al-card{background:#fff;border:1px solid var(--adm-line);overflow:hidden}
  .al-card-row{display:flex;align-items:center;gap:10px;padding:12px 18px;cursor:pointer;user-select:none;flex-wrap:wrap}
  .al-card-row:hover{background:var(--adm-warm)}
  .al-card-body{padding:10px 18px 14px;border-top:1px solid var(--adm-line-soft)}
  .al-ts{font-size:11px;color:var(--adm-faint);white-space:nowrap;min-width:140px;font-variant-numeric:tabular-nums}
  .al-action{font-size:12px;font-weight:600;color:var(--adm-ink-2);font-family:'Courier New',monospace}
  .al-chevron{font-size:13px;color:var(--adm-faint)}
  .al-detail-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.4rem 1.5rem}
  .al-detail-cell{display:flex;flex-direction:column;gap:2px}
  .al-detail-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--adm-faint);font-weight:600}
  .al-detail-val{font-size:13px;color:var(--adm-ink)}
  .al-pre{font-size:11px;background:var(--adm-cool);border:1px solid var(--adm-line);padding:8px 12px;margin:.3rem 0 0;overflow-x:auto;color:var(--adm-ink-2);font-family:'Courier New',monospace;line-height:1.5}
`;
