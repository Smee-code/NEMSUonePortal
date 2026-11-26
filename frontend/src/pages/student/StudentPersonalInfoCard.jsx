import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';
import { titleCase } from '../../utils/text';
import { openPdf } from '../../utils/openPdf';
import { lookupZip } from '../../utils/zipLookup';

const MAX_CERT_BYTES = 2 * 1024 * 1024;

// Name / place fields that auto-capitalize each word.
const CAP_FIELDS = new Set([
  'birthplace', 'citizenship', 'religion', 'ethnicity',
  'addr_brgy', 'addr_town', 'addr_province',
  'spouse_name', 'spouse_address', 'father', 'mother', 'parent_address',
  'elem_school', 'jhs_school', 'shs_school',
]);

const CIVIL = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled'];
const EMPTY = {
  birthplace: '', sex: '', civil_status: 'Single', citizenship: '', religion: '', ethnicity: '',
  addr_brgy: '', addr_town: '', addr_province: '', zip: '',
  spouse_name: '', spouse_address: '',
  father: '', mother: '', parent_address: '',
  elem_school: '', elem_year: '', jhs_school: '', jhs_year: '', shs_school: '', shs_year: '',
};

function toForm(d = {}) {
  const a = d.address || {}, p = d.parents || {}, e = d.education || {}, sp = d.spouse || {};
  const el = e.elementary || {}, jh = e.junior_high || {}, sh = e.senior_high || {};
  return {
    birthplace: d.birthplace || '', sex: d.sex || '', civil_status: d.civil_status || 'Single',
    citizenship: d.citizenship || '', religion: d.religion || '', ethnicity: d.ethnicity || '',
    addr_brgy: a.brgy || '', addr_town: a.town || '', addr_province: a.province || '', zip: a.zip || '',
    spouse_name: sp.name || '', spouse_address: sp.address || '',
    father: p.father || '', mother: p.mother || '', parent_address: p.address || '',
    elem_school: el.school || '', elem_year: el.year_graduated || '',
    jhs_school: jh.school || '', jhs_year: jh.year_graduated || '',
    shs_school: sh.school || '', shs_year: sh.year_graduated || '',
  };
}
function toDetails(f, prev = {}) {
  return {
    ...prev,
    birthplace: f.birthplace, sex: f.sex, civil_status: f.civil_status,
    citizenship: f.citizenship, religion: f.religion, ethnicity: f.ethnicity,
    address: { brgy: f.addr_brgy, town: f.addr_town, province: f.addr_province, zip: f.zip },
    spouse: f.civil_status === 'Married' ? { name: f.spouse_name, address: f.spouse_address } : null,
    parents: { father: f.father, mother: f.mother, address: f.parent_address },
    education: {
      ...(prev.education || {}),
      elementary: { ...(prev.education?.elementary || {}), school: f.elem_school, year_graduated: f.elem_year },
      junior_high: { ...(prev.education?.junior_high || {}), school: f.jhs_school, year_graduated: f.jhs_year },
      senior_high: { ...(prev.education?.senior_high || {}), school: f.shs_school, year_graduated: f.shs_year },
    },
  };
}

export default function StudentPersonalInfoCard() {
  const toast = useToast();
  const [raw, setRaw]       = useState({});
  const [form, setForm]     = useState(EMPTY);
  const [loading, setLoad]  = useState(true);
  const [saving, setSaving] = useState(false);
  // Civil-status verification: a Married status needs a marriage certificate on
  // file. `cert` is the one already on record (from admission or an earlier
  // upload); `certFile` is a new PDF picked here, uploaded when the form is saved.
  const [studentId, setStudentId] = useState(null);
  const [cert, setCert]         = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [certErr, setCertErr]   = useState('');

  const applyPayload = (data) => {
    const d = data?.student?.details || {};
    setRaw(d); setForm(toForm(d));
    setStudentId(data?.student?.id || null);
    setCert(data?.student?.marriage_certificate || null);
  };

  useEffect(() => {
    api.get('/auth/my/details/')
      .then(r => applyPayload(r.data))
      .catch(() => {})
      .finally(() => setLoad(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: CAP_FIELDS.has(k) ? titleCase(v) : v }));

  // ZIP code: filled in from the province and town when the town has exactly
  // one. `zipAuto` remembers the value we filled, so a ZIP the student typed
  // themselves is never overwritten.
  const [zipAuto, setZipAuto] = useState('');
  const fillZip = () => {
    // Runs on blur, after the last keystroke has rendered, so `form` is current.
    const { addr_province, addr_town, zip } = form;
    if (zip && zip !== zipAuto) return;                 // typed by the student: keep it
    lookupZip(addr_province, addr_town).then(found => {
      if (!found) return;
      setForm(f => ({ ...f, zip: found }));
      setZipAuto(found);
    });
  };

  const pickCert = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setCertErr('Only PDF files are accepted.'); return; }
    if (file.size > MAX_CERT_BYTES) { setCertErr('The file must be under 2 MB.'); return; }
    setCertErr('');
    setCertFile(file);
  };

  const save = async (e) => {
    e.preventDefault();
    const married = form.civil_status === 'Married';
    if (married && !cert && !certFile) {
      setCertErr('Upload your marriage certificate to set your civil status to Married.');
      toast('Upload your marriage certificate before saving.', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      // Send the certificate first: the server only accepts a Married status
      // once the certificate is on file.
      if (married && certFile) {
        const fd = new FormData();
        fd.append('file', certFile);
        const up = await api.post('/auth/my/documents/marriage-certificate/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setCert(up.data);
        setCertFile(null);
      }
      const res = await api.patch('/auth/my/details/', { details: toDetails(form, raw) });
      applyPayload(res.data);
      setCertErr('');
      toast('Personal information saved.', { type: 'success' });
    } catch (err) {
      const msg = err.response?.data?.error;
      if (err.response?.data?.code === 'marriage_certificate_required') setCertErr(msg);
      toast(msg || 'Couldn’t save your information. Please try again.', { type: 'error' });
    } finally { setSaving(false); }
  };

  const viewCert = () => {
    if (!studentId) return;
    openPdf(`/auth/students/${studentId}/documents/marriage-certificate/`)
      .catch(() => toast('Couldn’t open the certificate. Please try again.', { type: 'error' }));
  };

  if (loading) return null;

  // One labelled text field. A plain function, not a component: a component
  // defined here would be a new type on every render, so React would rebuild the
  // input on each keystroke and the cursor would drop out of it.
  const field = (label, k, extra = {}) => (
    <div className="pi-field" key={k}>
      <label className="pi-label" htmlFor={`pi-${k}`}>{label}</label>
      <input id={`pi-${k}`} className="pi-input" type="text" value={form[k]} onChange={e => set(k, e.target.value)} {...extra} />
    </div>
  );

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <style>{CSS}</style>
      <div className="card-head">
        <h4>Personal information<span>Your address, family & education — editable</span></h4>
      </div>
      <form onSubmit={save}>
        <div className="pi-grid">
          {field('Birthplace', 'birthplace')}
          <div className="pi-field">
            <label className="pi-label">Sex</label>
            <select className="pi-input" value={form.sex} onChange={e => set('sex', e.target.value)}>
              <option value="">Not set</option><option>Male</option><option>Female</option>
            </select>
          </div>
          <div className="pi-field">
            <label className="pi-label">Civil status</label>
            <select className="pi-input" value={form.civil_status} onChange={e => set('civil_status', e.target.value)}>
              {CIVIL.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {field('Citizenship', 'citizenship')}
          {field('Religion', 'religion')}
          {field('Ethnicity', 'ethnicity')}
        </div>

        <div className="pi-sec">Current address</div>
        <div className="pi-grid">
          {field('Province', 'addr_province', { onBlur: fillZip })}
          {field('Town / City', 'addr_town', { onBlur: fillZip })}
          {field('Barangay', 'addr_brgy')}
          <div className="pi-field">
            <label className="pi-label" htmlFor="pi-zip">ZIP code</label>
            <input id="pi-zip" className="pi-input" type="text" inputMode="numeric" value={form.zip}
              aria-describedby="pi-zip-help"
              onChange={e => { set('zip', e.target.value.replace(/\D/g, '').slice(0, 4)); setZipAuto(''); }} />
            <span id="pi-zip-help" className="pi-hint">
              {zipAuto && form.zip === zipAuto ? 'Filled in from your town. Change it if yours is different.' : 'Fills in automatically from your province and town.'}
            </span>
          </div>
        </div>

        {form.civil_status === 'Married' && (
          <>
            <div className="pi-sec">Spouse</div>
            <div className="pi-grid">
              {field('Spouse name', 'spouse_name')}
              {field('Spouse address', 'spouse_address')}
            </div>

            <div className={`pi-cert${certErr ? ' is-invalid' : ''}`}>
              <div className="pi-cert-head">
                Marriage certificate <span className="pi-cert-star" aria-hidden="true">*</span>
              </div>
              <p className="pi-cert-note">
                Required to verify a Married civil status. PDF only, up to 2 MB. The registrar can view it.
              </p>
              <div className="pi-cert-row">
                {certFile ? (
                  <span className="pi-cert-file"><i className="ti ti-file-check" /> {certFile.name} <em>(uploads when you save)</em></span>
                ) : cert ? (
                  <span className="pi-cert-file"><i className="ti ti-file-check" /> {cert.file_name} <em>on file</em></span>
                ) : (
                  <span className="pi-cert-file none"><i className="ti ti-file-alert" /> No certificate on file</span>
                )}
                {cert && !certFile && (
                  <button type="button" className="pi-cert-btn" onClick={viewCert}>View</button>
                )}
                <label className="pi-cert-btn">
                  <input type="file" accept="application/pdf" onChange={pickCert} style={{ display: 'none' }} aria-label="Choose marriage certificate PDF" />
                  {cert || certFile ? 'Replace' : 'Choose PDF'}
                </label>
              </div>
              {certErr && <p className="pi-cert-err" role="alert">{certErr}</p>}
            </div>
          </>
        )}

        <div className="pi-sec">Parent / Guardian</div>
        <div className="pi-grid">
          {field('Father’s name', 'father')}
          {field('Mother’s name', 'mother')}
        </div>
        {field('Parent / Guardian address', 'parent_address')}

        <div className="pi-sec">Educational background</div>
        <div className="pi-grid">
          {field('Elementary school', 'elem_school')}
          {field('Year graduated', 'elem_year')}
          {field('Junior high school', 'jhs_school')}
          {field('Year graduated', 'jhs_year')}
          {field('Senior high school', 'shs_school')}
          {field('Year graduated', 'shs_year')}
        </div>

        <button type="submit" className="btn-pri" disabled={saving} style={{ marginTop: '1rem', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save personal information'}
        </button>
      </form>
    </div>
  );
}

const CSS = `
  .pi-grid{display:grid;grid-template-columns:1fr 1fr;gap:.85rem 1rem;}
  .pi-field{display:flex;flex-direction:column;gap:5px;margin-bottom:.4rem;}
  .pi-label{font-weight:600;font-size:12.5px;color:var(--ink);}
  .pi-hint{font-size:11.5px;color:var(--muted);}
  .pi-opt{font-weight:400;color:var(--muted);}
  .pi-input{width:100%;padding:.5rem .7rem;border:1px solid var(--line);background:#fff;color:var(--ink);font:14px/1.4 'Inter',sans-serif;outline:none;box-sizing:border-box;}
  .pi-input:focus{border-color:var(--ink);}
  .pi-sec{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin:1.1rem 0 .5rem;}
  .pi-cert{border:1px solid var(--line);background:#f8fafc;padding:.75rem .9rem;margin-top:.6rem;}
  .pi-cert.is-invalid{border-color:#dc2626;background:#fef2f2;}
  .pi-cert-head{font-weight:600;font-size:12.5px;color:var(--ink);}
  .pi-cert-star{color:#dc2626;font-weight:700;}
  .pi-cert-note{font-size:12px;color:var(--muted);margin:2px 0 .6rem;line-height:1.5;}
  .pi-cert-row{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;}
  .pi-cert-file{flex:1;min-width:180px;font-size:13px;color:var(--ink);display:flex;align-items:center;gap:6px;overflow-wrap:anywhere;}
  .pi-cert-file em{font-style:normal;color:var(--muted);font-size:12px;}
  .pi-cert-file.none{color:var(--muted);}
  .pi-cert-btn{display:inline-flex;align-items:center;padding:.45rem .8rem;border:1px solid var(--line);background:#fff;color:var(--ink);font:600 12.5px 'Inter',sans-serif;cursor:pointer;min-height:36px;}
  .pi-cert-btn:hover{border-color:var(--ink);}
  .pi-cert-btn:focus-within,.pi-cert-btn:focus-visible{outline:2px solid var(--ink);outline-offset:2px;}
  .pi-cert-err{color:#dc2626;font-size:12px;font-weight:500;margin:.5rem 0 0;}
  @media(max-width:600px){ .pi-grid{grid-template-columns:1fr;} .pi-input{font-size:16px;} }
`;
