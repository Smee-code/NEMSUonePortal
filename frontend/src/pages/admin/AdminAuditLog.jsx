import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'student',   label: 'Student' },
  { value: 'faculty',   label: 'Faculty' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'admin',     label: 'Admin' },
];

const PAGE_LIMIT = 20;

function ResultBadge({ result }) {
  const ok = result === 'success';
  return (
    <span style={{
      background: ok ? '#d1fae5' : '#fee2e2',
      color: ok ? '#065f46' : '#991b1b',
      borderRadius: 12, padding: '0.15rem 0.6rem',
      fontSize: '0.72rem', fontWeight: 700,
    }}>
      {ok ? 'Success' : 'Failure'}
    </span>
  );
}

export default function AdminAuditLog() {
  const { user, logout } = useAuth();

  const [logs, setLogs]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

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
    if (filterRole)   params.append('role', filterRole);
    if (filterResult) params.append('result', filterResult);
    if (actionQuery)  params.append('action', actionQuery);
    if (dateFrom)     params.append('date_from', dateFrom);
    if (dateTo)       params.append('date_to', dateTo);
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
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link" to="/admin/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/admin/users">User Management</Link>
        <Link className="sidebar-link" to="/admin/programs">Programs &amp; Curriculum</Link>
        <Link className="sidebar-link active" to="/admin/audit-log">Audit Log</Link>
        <Link className="sidebar-link" to="/admin/announcements">Announcements</Link>
        <Link className="sidebar-link" to="/admin/settings">System Settings</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Audit Log</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        {/* Filters */}
        <div style={styles.filterBar}>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={styles.filterSelect}>
            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filterResult} onChange={e => setFilterResult(e.target.value)} style={styles.filterSelect}>
            <option value="">All Results</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={styles.filterInput} />
            <label style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>To</label>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={styles.filterInput} />
          </div>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.4rem', flex: 1 }}>
            <input
              type="text"
              placeholder="Filter by action keyword…"
              value={actionInput}
              onChange={e => setActionInput(e.target.value)}
              style={{ ...styles.filterInput, flex: 1 }}
            />
            <button type="submit" style={styles.btnSearch}>Search</button>
            {actionQuery && (
              <button type="button" onClick={() => { setActionInput(''); setActionQuery(''); }} style={styles.btnClear}>
                Clear
              </button>
            )}
          </form>
        </div>

        {error && <div style={styles.alertError}>{error}</div>}

        {!loading && (
          <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            {total === 0
              ? 'No audit events found.'
              : `Showing ${offset + 1}–${Math.min(offset + PAGE_LIMIT, total)} of ${total} event${total !== 1 ? 's' : ''}`}
          </p>
        )}

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading…</p>
        ) : logs.length === 0 ? (
          <div style={styles.emptyState}>No audit events match your filters.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {logs.map(log => {
              const expanded = expandedId === log.id;
              return (
                <div key={log.id} style={styles.card}>
                  <div
                    style={styles.cardRow}
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setExpandedId(expanded ? null : log.id)}
                  >
                    <span style={styles.timestamp}>
                      {new Date(log.timestamp).toLocaleString('en-PH', { hour12: true })}
                    </span>
                    <span style={styles.action}>{log.action}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                      <span style={styles.rolePill}>{log.role || '—'}</span>
                      <ResultBadge result={log.result} />
                      <span style={{ color: '#9ca3af', fontSize: '0.72rem', userSelect: 'none' }}>
                        {expanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {expanded && (
                    <div style={styles.cardBody}>
                      <div style={styles.detailGrid}>
                        <div style={styles.detailCell}>
                          <span style={styles.detailLabel}>User</span>
                          <span style={styles.detailValue}>{log.user_name}</span>
                        </div>
                        <div style={styles.detailCell}>
                          <span style={styles.detailLabel}>Email</span>
                          <span style={styles.detailValue}>{log.user_email || '—'}</span>
                        </div>
                        <div style={styles.detailCell}>
                          <span style={styles.detailLabel}>Resource</span>
                          <span style={styles.detailValue}>{log.resource}</span>
                        </div>
                        <div style={styles.detailCell}>
                          <span style={styles.detailLabel}>IP Address</span>
                          <span style={styles.detailValue}>{log.ip_address || '—'}</span>
                        </div>
                      </div>
                      {log.extra && Object.keys(log.extra).length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <span style={styles.detailLabel}>Extra</span>
                          <pre style={styles.pre}>{JSON.stringify(log.extra, null, 2)}</pre>
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
          <div style={styles.pagination}>
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_LIMIT))}
              disabled={offset === 0}
              style={styles.pageBtn(offset === 0)}
            >
              ← Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: '#374151' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + PAGE_LIMIT)}
              disabled={offset + PAGE_LIMIT >= total}
              style={styles.pageBtn(offset + PAGE_LIMIT >= total)}
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  filterBar:    { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' },
  filterSelect: { padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.875rem', background: '#fff', minWidth: 130 },
  filterInput:  { padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.875rem' },
  btnSearch:    { background: '#1e3a5f', color: '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' },
  btnClear:     { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '0.45rem 0.75rem', borderRadius: 6, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' },
  alertError:   { background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' },
  emptyState:   { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.5rem', textAlign: 'center', color: '#6b7280' },
  card:         { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' },
  cardRow:      { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', cursor: 'pointer', userSelect: 'none', flexWrap: 'wrap' },
  cardBody:     { padding: '0.6rem 1rem 0.85rem', borderTop: '1px solid #f3f4f6' },
  timestamp:    { fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap', minWidth: 140 },
  action:       { fontSize: '0.82rem', fontWeight: 600, color: '#1e3a5f', fontFamily: 'monospace' },
  rolePill:     { fontSize: '0.72rem', background: '#f3f4f6', color: '#374151', borderRadius: 10, padding: '0.1rem 0.5rem', fontWeight: 600, textTransform: 'capitalize' },
  detailGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.4rem 1.5rem' },
  detailCell:   { display: 'flex', flexDirection: 'column', gap: '0.1rem' },
  detailLabel:  { fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' },
  detailValue:  { fontSize: '0.83rem', color: '#374151' },
  pre:          { fontSize: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.5rem 0.75rem', margin: '0.3rem 0 0', overflowX: 'auto', color: '#374151' },
  pagination:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' },
  pageBtn:      (d) => ({ background: d ? '#f3f4f6' : '#1e3a5f', color: d ? '#9ca3af' : '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.875rem', cursor: d ? 'default' : 'pointer' }),
};
