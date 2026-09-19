import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAdminShell } from '../../context/AdminShellContext';

const TABS = [
  { id: 'grades',     label: 'Grade submission' },
  { id: 'documents',  label: 'Document requests' },
  { id: 'users',      label: 'User accounts' },
];

function downloadCSV(filename, headers, rows) {
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReports() {
  const { toast } = useAdminShell();

  const [activeTab, setActiveTab]       = useState('grades');
  const [terms, setTerms]               = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [reportData, setReportData]     = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    api.get('/enrollment/admin/terms/')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
        setTerms(list);
        setSelectedTerm(list.find(t => t.is_active) ?? list[0] ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setReportData(null);
    setError('');
    if (activeTab === 'documents') {
      fetchReport('/documents/admin/reports/');
    } else if (activeTab === 'users') {
      fetchReport('/auth/admin/stats/');
    } else if (selectedTerm && activeTab === 'grades') {
      fetchReport(`/grades/admin/reports/submission-progress/?term=${selectedTerm.id}`);
    }
  }, [activeTab, selectedTerm]); // eslint-disable-line

  function fetchReport(url) {
    setLoading(true);
    api.get(url)
      .then(res => setReportData(res.data))
      .catch(() => setError('Failed to load report data.'))
      .finally(() => setLoading(false));
  }

  function handlePrint() { window.print(); }

  function handleExportCSV() {
    if (!reportData) return;
    if (activeTab === 'grades') {
      downloadCSV('grade_submission.csv',
        ['faculty_name', 'faculty_email', 'subject_code', 'subject_name', 'enrolled_count', 'grades_submitted', 'grades_pending', 'fully_submitted'],
        reportData.assignments ?? []);
    } else if (activeTab === 'documents') {
      downloadCSV('document_requests.csv',
        ['document_type_display', 'count', 'avg_turnaround_days'],
        (reportData.by_type ?? []).map(row => ({
          ...row,
          avg_turnaround_days: reportData.avg_turnaround_days?.[row.document_type] ?? 'N/A',
        })));
    } else if (activeTab === 'users') {
      const u = reportData?.users ?? {};
      downloadCSV('user_accounts.csv', ['label', 'value'], [
        { label: 'Total users',           value: u.total },
        { label: 'Students',              value: u.students },
        { label: 'Faculty',               value: u.faculty },
        { label: 'Registrars',            value: u.registrars },
        { label: 'Active accounts',       value: u.active },
        { label: 'Inactive accounts',     value: u.inactive },
        { label: 'Verified accounts',     value: u.verified },
        { label: 'Unverified accounts',   value: u.unverified },
        { label: 'Locked accounts',       value: u.locked },
      ]);
    }
    toast('CSV exported.', { type: 'success' });
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">System · Real-time data</div>
          <h2>Reports &amp; <em>export</em></h2>
          <div className="sub">View grade submission, document request, and user account summaries. Export to CSV.</div>
        </div>
        <div className="actions">
          <button className="btn-sec" onClick={handlePrint}>
            <i className="ti ti-printer" /> Print
          </button>
          <button className="btn-pri" onClick={handleExportCSV} disabled={!reportData}>
            <i className="ti ti-file-export" /> Export CSV
          </button>
        </div>
      </div>

      <div className="subtabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`subtab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'grades' && (
        <div className="toolbar">
          <label style={{ fontSize: 12, color: 'var(--adm-muted)', fontWeight: 600 }}>Academic term</label>
          <select
            className="toolbar-search"
            style={{ width: 220 }}
            value={selectedTerm?.id ?? ''}
            onChange={e => {
              const t = terms.find(x => x.id === parseInt(e.target.value));
              setSelectedTerm(t ?? null);
            }}
          >
            {terms.map(t => (
              <option key={t.id} value={t.id}>
                {t.semester_display} {t.year}{t.is_active ? ' (Active)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="rp-flash rp-flash-err">{error}</div>}
      {loading && <div className="rp-loading">Loading report…</div>}

      {!loading && reportData && activeTab === 'grades'     && <GradeReport     data={reportData} />}
      {!loading && reportData && activeTab === 'documents'  && <DocumentReport  data={reportData} />}
      {!loading && reportData && activeTab === 'users'      && <UserReport      data={reportData} />}
    </>
  );
}

function GradeReport({ data }) {
  function csvDownload() {
    downloadCSV(
      `grade_submission_${data.term?.replace(/\s/g, '_') ?? 'report'}.csv`,
      ['faculty_name', 'faculty_email', 'subject_code', 'subject_name', 'enrolled_count', 'grades_submitted', 'grades_pending', 'fully_submitted'],
      data.assignments ?? [],
    );
  }

  return (
    <div>
      <div className="rp-report-head">
        <div className="rp-report-title">Grade submission: {data.term}</div>
      </div>

      <div className="stat-row" style={{ marginBottom: '1.25rem' }}>
        <div className="stat">
          <div className="num">{data.total_assignments}</div>
          <div className="lbl">Total assignments</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: 'var(--adm-green)' }}>{data.submitted_count}</div>
          <div className="lbl">Fully submitted</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: 'var(--adm-amber)' }}>{data.pending_count}</div>
          <div className="lbl">Pending submission</div>
        </div>
      </div>

      <ReportSection title="Assignment breakdown" onDownload={csvDownload}>
        <div className="table-scroll"><table className="table">
          <thead>
            <tr>{['Faculty', 'Subject', 'Enrolled', 'Submitted', 'Pending', 'Status'].map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {(data.assignments ?? []).map(row => (
              <tr key={row.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{row.faculty_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--adm-muted)' }}>{row.faculty_email}</div>
                </td>
                <td>
                  <code>{row.subject_code}</code>
                  <div style={{ fontSize: 11, color: 'var(--adm-muted)' }}>{row.subject_name}</div>
                </td>
                <td>{row.enrolled_count}</td>
                <td style={{ color: 'var(--adm-green)' }}>{row.grades_submitted}</td>
                <td style={{ color: row.grades_pending > 0 ? 'var(--adm-red)' : 'var(--adm-muted)' }}>
                  {row.grades_pending}
                </td>
                <td>
                  <span className={`tag${row.fully_submitted ? ' success' : row.grades_submitted > 0 ? ' pending' : ''}`} style={{ fontSize: 10 }}>
                    {row.fully_submitted ? 'Submitted' : row.grades_submitted > 0 ? 'Partial' : 'None'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </ReportSection>
    </div>
  );
}

function DocumentReport({ data }) {
  function csvDownload() {
    downloadCSV(
      'document_requests_report.csv',
      ['document_type_display', 'count', 'avg_turnaround_days'],
      (data.by_type ?? []).map(row => ({
        ...row,
        avg_turnaround_days: data.avg_turnaround_days?.[row.document_type] ?? 'N/A',
      })),
    );
  }

  return (
    <div>
      <div className="rp-report-head">
        <div className="rp-report-title">Document request report</div>
        <span className="rp-total-badge">Total: {data.total}</span>
      </div>

      <div className="stat-row" style={{ marginBottom: '1.25rem' }}>
        {Object.entries(data.by_status ?? {}).map(([s, count]) => (
          <div key={s} className="stat">
            <div className="num" style={{ color: docStatusColor(s) }}>{count}</div>
            <div className="lbl">{docStatusLabel(s)}</div>
          </div>
        ))}
      </div>

      <ReportSection title="By document type" onDownload={csvDownload}>
        <div className="table-scroll"><table className="table">
          <thead>
            <tr>{['Document type', 'Total requests', 'Avg. turnaround (days)'].map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {(data.by_type ?? []).map(row => (
              <tr key={row.document_type}>
                <td>{row.document_type_display}</td>
                <td style={{ fontWeight: 700 }}>{row.count}</td>
                <td>
                  {data.avg_turnaround_days?.[row.document_type] != null
                    ? `${data.avg_turnaround_days[row.document_type]} days`
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </ReportSection>
    </div>
  );
}

function UserReport({ data }) {
  const u = data?.users ?? {};
  const rows = [
    { label: 'Total users',           value: u.total,      color: 'var(--adm-ink)' },
    { label: 'Students',              value: u.students,   color: 'var(--adm-ink)' },
    { label: 'Faculty',               value: u.faculty,    color: 'var(--adm-ink)' },
    { label: 'Registrars',            value: u.registrars, color: 'var(--adm-ink)' },
    { label: 'Active accounts',       value: u.active,     color: 'var(--adm-green)' },
    { label: 'Inactive accounts',     value: u.inactive,   color: 'var(--adm-muted)' },
    { label: 'Verified accounts',     value: u.verified,   color: 'var(--adm-green)' },
    { label: 'Unverified accounts',   value: u.unverified, color: 'var(--adm-amber)' },
    { label: 'Locked accounts',       value: u.locked,     color: 'var(--adm-red)' },
  ];

  function csvDownload() {
    downloadCSV('user_account_report.csv', ['label', 'value'], rows);
  }

  return (
    <div>
      <div className="rp-report-head">
        <div className="rp-report-title">User account report</div>
        <button className="btn-sec" style={{ fontSize: 11, padding: '4px 10px' }} onClick={csvDownload}>
          <i className="ti ti-file-export" /> Download CSV
        </button>
      </div>
      <div className="stat-row" style={{ flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {rows.map(r => (
          <div key={r.label} className="stat">
            <div className="num" style={{ color: r.color }}>{r.value ?? '-'}</div>
            <div className="lbl">{r.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportSection({ title, onDownload, children }) {
  return (
    <div className="info-section" style={{ marginBottom: '1.25rem' }}>
      <div className="info-section-head">
        <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
        <button className="btn-sec" style={{ fontSize: 11, padding: '4px 10px' }} onClick={onDownload}>
          <i className="ti ti-file-export" /> CSV
        </button>
      </div>
      <div className="table-wrap">{children}</div>
    </div>
  );
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function statusColor(s) {
  return s === 'approved' ? 'var(--adm-green)' : s === 'rejected' ? 'var(--adm-red)' : 'var(--adm-amber)';
}

function docStatusColor(s) {
  const map = {
    submitted: 'var(--adm-muted)', processing: 'var(--adm-amber)',
    ready: '#3b82f6', released: 'var(--adm-green)', rejected: 'var(--adm-red)',
  };
  return map[s] ?? 'var(--adm-muted)';
}

function docStatusLabel(s) {
  const map = { submitted: 'Submitted', processing: 'Processing', ready: 'Ready', released: 'Released', rejected: 'Rejected' };
  return map[s] ?? s;
}

const CSS = `
  .rp-flash{padding:10px 16px;margin-bottom:1rem;font-size:13px}
  .rp-flash-err{background:#f6e8e4;color:var(--adm-red)}
  .rp-loading{color:var(--adm-muted);padding:2rem 0;font-size:13px}
  .rp-report-head{display:flex;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap}
  .rp-report-title{font-size:14px;font-weight:600;color:var(--adm-ink);flex:1}
  .rp-total-badge{background:var(--adm-cool-2);color:var(--adm-ink-2);border-radius:999px;padding:3px 10px;font-weight:700;font-size:11px}
`;
