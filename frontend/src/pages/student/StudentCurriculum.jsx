import { useEffect, useState } from 'react';
import api from '../../api/axios';

const YEARS = [1, 2, 3, 4];
const YEAR_LABEL = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };
const SEMS = [
  { key: 'first', label: '1st Semester' },
  { key: 'second', label: '2nd Semester' },
  { key: 'summer', label: 'Summer' },
];

export default function StudentCurriculum() {
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get('/enrollment/my-curriculum/')
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load your curriculum.'))
      .finally(() => setLoad(false));
  }, []);

  const subjects = data?.subjects ?? [];
  const totalUnits = subjects.reduce((a, s) => a + parseFloat(s.units || 0), 0);

  return (
    <div className="page">
      <style>{CSS}</style>
      <div className="page-head">
        <div>
          <div className="eyebrow">Academic{data?.label ? ` · ${data.label}` : ''}</div>
          <h2>My <em>curriculum</em></h2>
          <div className="sub">The official course map for the curriculum you follow.</div>
        </div>
      </div>

      {error && <div style={{ background: 'var(--red-tint)', color: 'var(--red)', padding: '.75rem 1rem', fontSize: 13, marginBottom: '1.5rem' }}>{error}</div>}

      {loading ? (
        <div className="stu-empty"><p>Loading…</p></div>
      ) : !data?.curriculum && subjects.length === 0 && !data?.code ? (
        <div className="stu-empty">
          <i className="ti ti-book-2" />
          <p>No curriculum has been assigned to you yet. Please contact the registrar.</p>
        </div>
      ) : (
        <>
          <div className="sc-meta">
            <span className="tag" style={{ background: 'var(--gold-tint)', color: 'var(--gold)' }}>{data.code}</span>
            <span className="sc-meta-txt">Effective {data.year_effective} · {subjects.length} courses · {totalUnits} units</span>
          </div>
          {YEARS.map(yr => {
            const yrSubs = subjects.filter(s => s.year_level === yr);
            if (yrSubs.length === 0) return null;
            return (
              <div key={yr} className="sc-year">
                <h4 className="sc-year-h">{YEAR_LABEL[yr]}</h4>
                {SEMS.map(sem => {
                  const cell = yrSubs.filter(s => s.semester === sem.key);
                  if (cell.length === 0) return null;
                  const units = cell.reduce((a, s) => a + parseFloat(s.units || 0), 0);
                  return (
                    <div key={sem.key} className="sc-sem">
                      <div className="sc-sem-h">{sem.label}<span>{units} units</span></div>
                      <div className="table-wrap">
                        <table className="table">
                          <thead>
                            <tr><th style={{ width: 120 }}>Code</th><th>Descriptive Title</th><th>Prereq</th><th className="num" style={{ width: 70 }}>Units</th></tr>
                          </thead>
                          <tbody>
                            {cell.map(s => (
                              <tr key={s.id}>
                                <td style={{ fontWeight: 600, color: 'var(--gold)' }}>{s.code}</td>
                                <td>{s.name}</td>
                                <td style={{ color: 'var(--muted)' }}>{s.prerequisite_code || '-'}</td>
                                <td className="num">{s.units}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

const CSS = `
  .sc-meta{display:flex;align-items:center;gap:12px;margin-bottom:1.5rem}
  .sc-meta-txt{font-size:13px;color:var(--muted)}
  .sc-year{margin-bottom:2rem}
  .sc-year-h{font-size:15px;color:var(--ink);font-weight:600;margin-bottom:.75rem;padding-bottom:.5rem;border-bottom:2px solid var(--line)}
  .sc-sem{margin-bottom:1.25rem}
  .sc-sem-h{display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem}
`;
