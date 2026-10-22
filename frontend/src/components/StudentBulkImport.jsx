import { useRef, useState } from 'react';
import api from '../api/axios';

/* Button + modal for bulk-adding students from an .xlsx/.csv (IDNO + Name).
   Used by the admin Students page and the registrar List of Students page. */
export default function StudentBulkImport({ onImported, buttonClassName = 'btn-sec', buttonLabel = 'Import from file' }) {
  const [open, setOpen]         = useState(false);
  const [file, setFile]         = useState(null);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState(null);
  const inputRef = useRef(null);

  function reset() { setFile(null); setError(''); setResult(null); setBusy(false); }
  function close() { if (!busy) { setOpen(false); reset(); } }

  function pick(e) {
    const f = e.target.files?.[0] || null;
    setFile(f); setError(''); setResult(null);
  }

  async function upload() {
    if (!file) { setError('Choose an .xlsx or .csv file first.'); return; }
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/auth/students/bulk-import/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      if (res.data?.created > 0) onImported?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Check the file and try again.');
    } finally {
      setBusy(false);
    }
  }

  function downloadSample() {
    const csv =
      'IDNO,Name,Email\n' +
      '2026-00001,Dela Cruz Juan A.,juan.delacruz@gmail.com\n' +
      '2026-00002,Santos Maria L.,maria.santos@gmail.com\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'student-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <style>{CSS}</style>
      <button type="button" className={buttonClassName} onClick={() => { reset(); setOpen(true); }}>
        <i className="ti ti-file-upload" /> {buttonLabel}
      </button>

      {open && (
        <div className="sbi-overlay" onMouseDown={close}>
          <div className="sbi-modal" onMouseDown={e => e.stopPropagation()}>
            <div className="sbi-head">
              <div>
                <h3>Add students from a file</h3>
                <p>Upload an Excel (.xlsx) or CSV file. <strong>IDNO</strong> and <strong>Name</strong> are required; an <strong>Email</strong> column is optional but recommended.</p>
              </div>
              <button className="sbi-x" onClick={close} disabled={busy}><i className="ti ti-x" /></button>
            </div>

            <div className="sbi-body">
              {!result ? (
                <>
                  <div className="sbi-note">
                    <i className="ti ti-info-circle" />
                    <span>Each student is added as a <strong>pending account</strong>. It activates when the student registers and verifies their email. <strong>Include each student’s email</strong> so registration is locked to their real address — without it, anyone who knows the ID could register first.</span>
                  </div>

                  {error && <div className="sbi-err">{error}</div>}

                  <button type="button" className="sbi-drop" onClick={() => inputRef.current?.click()}>
                    <i className="ti ti-cloud-upload" />
                    <span className="sbi-drop-main">{file ? file.name : 'Choose a .xlsx or .csv file'}</span>
                    <span className="sbi-drop-sub">{file ? `${(file.size / 1024).toFixed(0)} KB · click to change` : 'Header row must contain “IDNO” and “Name”'}</span>
                  </button>
                  <input ref={inputRef} type="file" accept=".xlsx,.csv,.txt" onChange={pick} style={{ display: 'none' }} />

                  <button type="button" className="sbi-sample" onClick={downloadSample}>
                    <i className="ti ti-download" /> Download a sample file
                  </button>
                </>
              ) : (
                <div className="sbi-result">
                  <div className="sbi-result-stats">
                    <div className="sbi-stat"><span className="n ok">{result.created}</span><span className="l">Added</span></div>
                    <div className="sbi-stat"><span className="n">{result.existing}</span><span className="l">Already existed</span></div>
                    <div className="sbi-stat"><span className="n">{result.total_rows}</span><span className="l">Rows read</span></div>
                  </div>
                  {result.samples?.length > 0 && (
                    <div className="sbi-samples">
                      <div className="sbi-samples-h">Added</div>
                      {result.samples.map(s => (
                        <div className="sbi-sample-row" key={s.student_id}>
                          <span className="sbi-sample-name">{s.full_name}</span>
                          <span className="sbi-sample-id">{s.student_id}</span>
                        </div>
                      ))}
                      {result.created > result.samples.length && (
                        <div className="sbi-more">…and {result.created - result.samples.length} more</div>
                      )}
                    </div>
                  )}
                  {result.errors?.length > 0 && (
                    <div className="sbi-errlist">
                      <div className="sbi-errlist-h"><i className="ti ti-alert-triangle" /> {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} skipped</div>
                      {result.errors.slice(0, 6).map((e, i) => <div key={i} className="sbi-errline">{e}</div>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sbi-foot">
              {!result ? (
                <>
                  <button className="btn-sec" onClick={close} disabled={busy}>Cancel</button>
                  <button className="btn-pri" onClick={upload} disabled={busy || !file}>
                    {busy ? 'Importing…' : 'Import students'}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-sec" onClick={() => { reset(); }}>Import another file</button>
                  <button className="btn-pri" onClick={close}>Done</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const CSS = `
  .sbi-overlay{position:fixed;inset:0;background:rgba(10,22,40,.5);z-index:1100;display:flex;align-items:flex-start;justify-content:center;padding:3rem 1rem;overflow-y:auto;}
  .sbi-modal{background:#fff;width:100%;max-width:480px;border:1px solid #e4e7ec;box-shadow:0 24px 60px -20px rgba(10,22,40,.45);animation:sbiIn .18s ease;}
  @keyframes sbiIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
  .sbi-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding:1.2rem 1.4rem;border-bottom:1px solid #eef0f4;}
  .sbi-head h3{font-size:16px;font-weight:700;color:#0b1b2e;}
  .sbi-head p{font-size:12.5px;color:#64748b;margin-top:4px;line-height:1.5;}
  .sbi-head strong{color:#0b1b2e;}
  .sbi-x{background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;line-height:1;}
  .sbi-x:hover{color:#0b1b2e;}
  .sbi-body{padding:1.2rem 1.4rem;}
  .sbi-note{display:flex;gap:9px;align-items:flex-start;background:#fbf5e6;border:1px solid #e7d3a1;border-left:3px solid #b8860b;color:#7a5c16;padding:10px 12px;font-size:12px;line-height:1.5;margin-bottom:1.1rem;}
  .sbi-note i{font-size:16px;flex-shrink:0;color:#b8860b;margin-top:1px;}
  .sbi-note strong{color:#5c4410;}
  .sbi-err{background:#fee2e2;color:#991b1b;padding:.6rem .85rem;font-size:12.5px;margin-bottom:1rem;}
  .sbi-drop{width:100%;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;
    border:1.5px dashed #cbd5e1;background:#f8fafc;padding:1.5rem 1rem;cursor:pointer;font-family:inherit;}
  .sbi-drop:hover{border-color:#0b1b2e;background:#f1f5f9;}
  .sbi-drop i{font-size:28px;color:#94a3b8;margin-bottom:4px;}
  .sbi-drop-main{font-size:13.5px;font-weight:600;color:#0b1b2e;word-break:break-all;}
  .sbi-drop-sub{font-size:11.5px;color:#8a93a3;}
  .sbi-sample{margin-top:.9rem;background:none;border:none;color:#1b3a6b;font-size:12.5px;font-weight:600;cursor:pointer;
    display:inline-flex;align-items:center;gap:5px;font-family:inherit;padding:0;}
  .sbi-sample:hover{text-decoration:underline;}

  .sbi-result-stats{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #e4e7ec;}
  .sbi-stat{padding:.9rem;text-align:center;border-right:1px solid #eef0f4;}
  .sbi-stat:last-child{border-right:none;}
  .sbi-stat .n{display:block;font:600 24px/1 'Inter',sans-serif;color:#0b1b2e;}
  .sbi-stat .n.ok{color:#0a6b48;}
  .sbi-stat .l{display:block;font-size:10.5px;color:#64748b;margin-top:5px;}
  .sbi-samples{margin-top:1rem;border:1px solid #eef0f4;}
  .sbi-samples-h{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8a93a3;font-weight:700;padding:8px 12px;background:#f8fafc;border-bottom:1px solid #eef0f4;}
  .sbi-sample-row{display:flex;justify-content:space-between;gap:1rem;padding:7px 12px;font-size:12.5px;border-bottom:1px solid #f3f5f8;}
  .sbi-sample-row:last-child{border-bottom:none;}
  .sbi-sample-name{color:#0b1b2e;font-weight:500;}
  .sbi-sample-id{color:#64748b;font-variant-numeric:tabular-nums;}
  .sbi-more{padding:7px 12px;font-size:11.5px;color:#8a93a3;}
  .sbi-errlist{margin-top:1rem;background:#fdf3e2;border:1px solid #f0dcae;padding:.7rem .85rem;}
  .sbi-errlist-h{font-size:12px;font-weight:700;color:#8a6a12;display:flex;align-items:center;gap:6px;margin-bottom:5px;}
  .sbi-errline{font-size:11.5px;color:#8a6a12;line-height:1.5;}

  .sbi-foot{display:flex;justify-content:flex-end;gap:.6rem;padding:1rem 1.4rem;border-top:1px solid #eef0f4;background:#fafbfd;}
`;
