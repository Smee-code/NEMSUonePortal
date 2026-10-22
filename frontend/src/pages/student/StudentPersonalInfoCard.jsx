import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';

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

  useEffect(() => {
    api.get('/auth/my/details/')
      .then(r => { const d = r.data?.student?.details || {}; setRaw(d); setForm(toForm(d)); })
      .catch(() => {})
      .finally(() => setLoad(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/auth/my/details/', { details: toDetails(form, raw) });
      const d = res.data?.student?.details || {};
      setRaw(d); setForm(toForm(d));
      toast('Personal information saved.', { type: 'success' });
    } catch {
      toast('Couldn’t save your information. Please try again.', { type: 'error' });
    } finally { setSaving(false); }
  };

  if (loading) return null;

  const F = ({ label, k, type = 'text', opt }) => (
    <div className="pi-field">
      <label className="pi-label">{label}{opt && <span className="pi-opt"> (optional)</span>}</label>
      <input className="pi-input" type={type} value={form[k]} onChange={e => set(k, e.target.value)} />
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
          <F label="Birthplace" k="birthplace" />
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
          <F label="Citizenship" k="citizenship" />
          <F label="Religion" k="religion" />
          <F label="Ethnicity" k="ethnicity" />
        </div>

        <div className="pi-sec">Current address</div>
        <div className="pi-grid">
          <F label="Province" k="addr_province" />
          <F label="Town / City" k="addr_town" />
          <F label="Barangay" k="addr_brgy" />
          <F label="ZIP code" k="zip" />
        </div>

        {form.civil_status === 'Married' && (
          <>
            <div className="pi-sec">Spouse</div>
            <div className="pi-grid">
              <F label="Spouse name" k="spouse_name" />
              <F label="Spouse address" k="spouse_address" />
            </div>
          </>
        )}

        <div className="pi-sec">Parent / Guardian</div>
        <div className="pi-grid">
          <F label="Father’s name" k="father" />
          <F label="Mother’s name" k="mother" />
        </div>
        <F label="Parent / Guardian address" k="parent_address" />

        <div className="pi-sec">Education background</div>
        <div className="pi-grid">
          <F label="Elementary school" k="elem_school" />
          <F label="Year graduated" k="elem_year" />
          <F label="Junior High school" k="jhs_school" />
          <F label="Year graduated" k="jhs_year" />
          <F label="Senior High school" k="shs_school" />
          <F label="Year graduated" k="shs_year" />
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
  .pi-opt{font-weight:400;color:var(--muted);}
  .pi-input{width:100%;padding:.5rem .7rem;border:1px solid var(--line);background:#fff;color:var(--ink);font:14px/1.4 'Inter',sans-serif;outline:none;box-sizing:border-box;}
  .pi-input:focus{border-color:var(--ink);}
  .pi-sec{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin:1.1rem 0 .5rem;}
  @media(max-width:600px){ .pi-grid{grid-template-columns:1fr;} .pi-input{font-size:16px;} }
`;
