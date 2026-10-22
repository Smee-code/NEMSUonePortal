import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { REQUIRED_DOCS, STUDENT_TYPE_LABEL } from '../data/admissionDocs';

const MAX_BYTES = 2 * 1024 * 1024;

/*
  Public page an applicant reaches from the "Upload my documents" button in a
  registrar follow-up email: /admission/upload/<application id>. The UUID in the
  link is the access token — no login. Shows the document checklist for their
  applicant type and lets them upload whatever is still missing.
*/
export default function AdmissionUpload() {
  const { id } = useParams();
  const [state, setState] = useState('loading'); // loading | ready | notfound | error
  const [app, setApp]     = useState(null);

  const load = useCallback(() => {
    api.get(`/enrollment/public/pre-enroll/${id}/`)
      .then(r => { setApp(r.data); setState('ready'); })
      .catch(err => setState(err.response?.status === 404 ? 'notfound' : 'error'));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const required = app ? (REQUIRED_DOCS[app.student_type] || []) : [];
  const uploadedLabels = new Set((app?.uploaded || []).map(d => d.requirement_label));
  const receivedCount = required.filter(l => uploadedLabels.has(l)).length;
  const locked = app && app.status !== 'pending';

  return (
    <div className="au-wrap">
      <style>{CSS}</style>
      <div className="au-card">
        <div className="au-brand">
          <span className="au-brand-mark">NEMSU</span>
          <span className="au-brand-sub">Cantilan · Pre-Enrollment</span>
        </div>

        {state === 'loading' && <p className="au-muted">Loading your application…</p>}

        {state === 'notfound' && (
          <div className="au-note au-note-err">
            <i className="ti ti-alert-triangle" />
            <div>We couldn’t find this application. The link may be incorrect or expired. Please contact the Registrar’s Office at <a href="mailto:cantilan@nemsu.edu.ph">cantilan@nemsu.edu.ph</a>.</div>
          </div>
        )}

        {state === 'error' && (
          <div className="au-note au-note-err">
            <i className="ti ti-cloud-off" />
            <div>Something went wrong loading your application. Please refresh, or try again later.</div>
          </div>
        )}

        {state === 'ready' && app && (
          <>
            <h1 className="au-title">Upload your documents</h1>
            <p className="au-lead">
              Hello <strong>{app.full_name}</strong>. Upload the required documents for your
              application below. PDF only, up to 2&nbsp;MB each.
            </p>
            <div className="au-meta">
              <span><i className="ti ti-hash" /> {app.reference_number}</span>
              <span><i className="ti ti-user" /> {STUDENT_TYPE_LABEL[app.student_type] || app.student_type}</span>
              <span className={`au-chip au-chip-${app.status}`}>{app.status}</span>
            </div>

            {locked ? (
              <div className="au-note au-note-info">
                <i className="ti ti-info-circle" />
                <div>
                  This application has already been <strong>{app.status}</strong>, so document
                  uploads are closed. If you believe this is a mistake, please contact the
                  Registrar’s Office at <a href="mailto:cantilan@nemsu.edu.ph">cantilan@nemsu.edu.ph</a>.
                </div>
              </div>
            ) : (
              <>
                <div className="au-progress">
                  <div className="au-progress-bar"><span style={{ width: `${required.length ? (receivedCount / required.length) * 100 : 0}%` }} /></div>
                  <span className="au-progress-txt">{receivedCount} of {required.length} received</span>
                </div>

                <div className="au-list">
                  {required.map(label => (
                    <DocRow
                      key={label}
                      label={label}
                      received={uploadedLabels.has(label)}
                      appId={id}
                      onUploaded={load}
                    />
                  ))}
                </div>

                <p className="au-foot">
                  Already uploaded everything? You can safely close this page — the Registrar’s
                  Office will continue reviewing your application.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DocRow({ label, received, appId, onUploaded }) {
  const inputRef = useRef(null);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  const [justDone, setJustDone] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setError('');
    if (!file.name.toLowerCase().endsWith('.pdf')) { setError('Only PDF files are accepted.'); return; }
    if (file.size > MAX_BYTES) { setError('File must not exceed 2 MB.'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('requirement_label', label);
      fd.append('file', file);
      await api.post(`/enrollment/public/pre-enroll/${appId}/upload/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setJustDone(true);
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const done = received || justDone;
  return (
    <div className={`au-row ${done ? 'au-row-done' : ''}`}>
      <i className={`ti ${done ? 'ti-circle-check-filled' : 'ti-file-upload'} au-row-ic`} aria-hidden="true" />
      <div className="au-row-main">
        <div className="au-row-label">{label}</div>
        <div className="au-row-status">
          {done ? 'Received' : 'Not uploaded yet'}
          {error && <span className="au-row-err"> · {error}</span>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={handleFile} hidden />
      <button type="button" className={`au-btn ${done ? 'au-btn-ghost' : 'au-btn-pri'}`} disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? 'Uploading…' : done ? 'Replace' : 'Upload'}
      </button>
    </div>
  );
}

const CSS = `
  .au-wrap{min-height:100vh;background:#eef2f7;display:flex;align-items:flex-start;justify-content:center;padding:clamp(1rem,4vw,3rem) 1rem;font-family:'Inter',-apple-system,sans-serif;box-sizing:border-box;}
  .au-card{background:#fff;width:100%;max-width:620px;border-radius:14px;box-shadow:0 20px 50px -24px rgba(10,22,40,.4);padding:clamp(1.3rem,4vw,2.3rem);box-sizing:border-box;}
  .au-brand{display:flex;align-items:baseline;gap:9px;margin-bottom:1.3rem;}
  .au-brand-mark{font-weight:800;letter-spacing:.06em;color:#0a3a6e;font-size:19px;}
  .au-brand-sub{font-size:12px;color:#94a3b8;font-weight:600;}
  .au-title{font-size:clamp(1.3rem,4vw,1.6rem);font-weight:800;color:#0a1628;margin:0 0 .4rem;}
  .au-lead{font-size:14px;color:#475569;line-height:1.55;margin:0 0 1rem;}
  .au-meta{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;font-size:12.5px;color:#64748b;margin-bottom:1.3rem;}
  .au-meta i{margin-right:4px;color:#b8860b;}
  .au-chip{text-transform:capitalize;font-weight:700;font-size:11px;padding:3px 10px;border-radius:999px;}
  .au-chip-pending{background:#fef3c7;color:#92400e;}
  .au-chip-approved{background:#dcfce7;color:#166534;}
  .au-chip-rejected{background:#fee2e2;color:#991b1b;}
  .au-chip-activated{background:#dbeafe;color:#1e40af;}
  .au-progress{display:flex;align-items:center;gap:12px;margin-bottom:1rem;}
  .au-progress-bar{flex:1;height:7px;background:#e2e8f0;border-radius:999px;overflow:hidden;}
  .au-progress-bar span{display:block;height:100%;background:#0a3a6e;transition:width .35s ease;}
  .au-progress-txt{font-size:12px;font-weight:700;color:#0a3a6e;white-space:nowrap;}
  .au-list{display:flex;flex-direction:column;gap:9px;}
  .au-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;background:#fff7ed;}
  .au-row-done{background:#f0fdf4;border-color:#bbf7d0;}
  .au-row-ic{font-size:22px;flex-shrink:0;color:#d97706;}
  .au-row-done .au-row-ic{color:#16a34a;}
  .au-row-main{flex:1;min-width:0;}
  .au-row-label{font-size:13.5px;font-weight:600;color:#0a1628;}
  .au-row-status{font-size:12px;color:#64748b;margin-top:2px;}
  .au-row-err{color:#dc2626;font-weight:600;}
  .au-btn{flex-shrink:0;border-radius:8px;font:600 13px 'Inter',sans-serif;padding:9px 16px;cursor:pointer;border:1px solid transparent;}
  .au-btn:disabled{opacity:.6;cursor:default;}
  .au-btn-pri{background:#0a3a6e;color:#fff;}
  .au-btn-pri:hover:not(:disabled){background:#09315d;}
  .au-btn-ghost{background:#fff;color:#0a3a6e;border-color:#cdd7e5;}
  .au-foot{font-size:12.5px;color:#64748b;line-height:1.55;margin:1.2rem 0 0;}
  .au-muted{font-size:14px;color:#64748b;}
  .au-note{display:flex;gap:11px;padding:13px 15px;border-radius:10px;font-size:13.5px;line-height:1.5;}
  .au-note i{font-size:20px;flex-shrink:0;margin-top:1px;}
  .au-note a{color:inherit;font-weight:600;}
  .au-note-err{background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;}
  .au-note-info{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;}
  @media(max-width:520px){
    .au-row{flex-wrap:wrap;}
    .au-btn{width:100%;}
  }
`;
