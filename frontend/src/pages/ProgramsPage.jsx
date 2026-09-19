import { useEffect, useState } from 'react';
import api from '../api/axios';
import PublicPageShell from '../components/PublicPageShell';
import { PageLoader } from '../components/Spinner';

export default function ProgramsPage() {
  const [programs, setPrograms] = useState(null);

  useEffect(() => {
    document.title = 'Programs · NEMSUonePortal';
    api.get('/enrollment/public/landing/')
      .then(r => setPrograms(r.data?.programs ?? []))
      .catch(() => setPrograms([]));
  }, []);

  const groups = {};
  (programs || []).forEach(p => {
    const d = p.department_name || p.department || 'Other';
    (groups[d] = groups[d] || []).push(p);
  });
  const deptNames = Object.keys(groups).sort();

  return (
    <PublicPageShell
      eyebrow="Academic programs"
      title={<>All programs by <em>department</em></>}
      subtitle="Undergraduate degree programs offered at NEMSU Cantilan Campus."
    >
      <style>{CSS}</style>
      {programs === null ? (
        <PageLoader label="Loading programs…" />
      ) : deptNames.length === 0 ? (
        <div className="pp-empty">No programs available.</div>
      ) : (
        <div className="pg-grid">
          {deptNames.map(dept => (
            <div key={dept} className="pg-dept">
              <div className="pg-dept-name">{dept}<span>{groups[dept].length}</span></div>
              <ul>
                {groups[dept].map((p, i) => (
                  <li key={i}>
                    <span className="pg-dot" />
                    <div>
                      <div className="pg-name">{p.name}</div>
                      {p.description && <div className="pg-desc">{p.description}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </PublicPageShell>
  );
}

const CSS = `
  .pg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.75rem 2.5rem;}
  .pg-dept-name{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#b89043;font-weight:700;padding-bottom:.6rem;margin-bottom:1rem;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;}
  .pg-dept-name span{color:#8a93a3;}
  .pg-dept ul{list-style:none;display:flex;flex-direction:column;gap:1rem;}
  .pg-dept li{display:flex;align-items:flex-start;gap:10px;}
  .pg-dot{width:6px;height:6px;background:#b89043;border-radius:50%;margin-top:7px;flex-shrink:0;}
  .pg-name{font-size:15px;font-weight:500;color:#0a1628;line-height:1.35;}
  .pg-desc{font-size:12.5px;color:#5a6478;line-height:1.55;margin-top:3px;}
`;
