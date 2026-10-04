import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default function FacultyProfile() {
  const { user } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ department: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/auth/academic-profile/'),
      api.get('/auth/departments/'),
    ]).then(([profileRes, deptRes]) => {
      const p = profileRes.data;
      setProfile(p);
      setDepartments(deptRes.data);
      setForm({ department: p.department_id ?? '' });
    }).catch(() => toast('Failed to load profile data.', { type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/auth/academic-profile/', {
        department: form.department || null,
      });
      setProfile(res.data);
      toast('Department updated successfully.', { type: 'success' });
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        toast(Object.values(data).flat().join(' '), { type: 'error' });
      } else {
        toast('Failed to save changes.', { type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const verified = !!profile?.is_verified;
  const facts = [
    profile?.student_id     && { k: 'Faculty No.', v: profile.student_id, mono: true },
    { k: 'Department', v: profile?.department_code || profile?.department_name || '—' },
    profile?.is_gec_faculty && { k: 'Classification', v: 'General Education' },
  ].filter(Boolean);

  return (
    <>
      <style>{CSS}</style>

      {/* ── Page head ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow">Faculty · My account</div>
          <h2>My <em>Profile</em></h2>
          <div className="sub">Your faculty record and the department you’re assigned to.</div>
        </div>
      </div>

      {loading ? (
        <div className="fp-loading">Loading profile…</div>
      ) : (
        <>
          {/* ── Identity hero ── */}
          <div className="fp-hero">
            <div className="fp-av">{initials(profile?.full_name || user?.full_name)}</div>
            <div className="fp-idmain">
              <div className="fp-name">{profile?.full_name || '—'}</div>
              <div className="fp-email">{profile?.institutional_email || '—'}</div>
              <div className="fp-badges">
                <span className="fp-badge fp-badge--role"><i className="ti ti-chalkboard" /> Faculty</span>
                <span className={`fp-badge ${verified ? 'fp-badge--ok' : 'fp-badge--warn'}`}>
                  <i className={`ti ${verified ? 'ti-rosette-discount-check' : 'ti-clock'}`} />
                  {verified ? 'Verified' : 'Pending verification'}
                </span>
              </div>
            </div>
            {facts.length > 0 && (
              <div className="fp-facts">
                {facts.map(f => (
                  <div key={f.k} className="fp-fact">
                    <div className="k">{f.k}</div>
                    <div className={`v${f.mono ? ' mono' : ''}`}>{f.v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="fp-grid">
            {/* ── Left: details + editable academics ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="fp-section">
                <div className="fp-section-head">Account details</div>
                {[
                  ['Full name',     profile?.full_name],
                  ['Faculty ID',    profile?.student_id, true],
                  ['Email address', profile?.institutional_email],
                  ['Role',          'Faculty'],
                  ['Email status',  verified ? 'Verified' : 'Pending verification'],
                ].map(([lbl, val, mono]) => (
                  <div key={lbl} className="fp-row">
                    <span className="fp-row-l">{lbl}</span>
                    <span className={`fp-row-v${mono ? ' mono' : ''}`}>{val ?? '—'}</span>
                  </div>
                ))}
              </div>

              <div className="fp-card">
                <div className="fp-card-head">
                  <h4>Academic information<span>The department you belong to</span></h4>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="fp-field">
                    <label className="fp-label" htmlFor="department">Department</label>
                    <select
                      id="department"
                      className="fp-input"
                      value={form.department}
                      onChange={e => setForm({ department: e.target.value })}
                    >
                      <option value="">Not set</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fp-hint">
                    <i className="ti ti-info-circle" />
                    Your department groups you with your college and routes department-level announcements to you.
                  </div>
                  <button type="submit" className="btn-pri" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </form>
              </div>
            </div>

            {/* ── Right: status ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className={`fp-status fp-status--${verified ? 'ok' : 'warn'}`}>
                <i className={`ti ${verified ? 'ti-shield-check' : 'ti-shield-exclamation'}`} />
                <div>
                  <div className="fp-status-t">{verified ? 'Your account is verified' : 'Verify your email'}</div>
                  <div className="fp-status-d">
                    {verified
                      ? 'Campus announcements and grade-related notices are sent to your institutional email.'
                      : 'Check your institutional email for the verification link to secure your account.'}
                  </div>
                </div>
              </div>

              <div className="fp-note">
                Need to correct your name or faculty number? Those are kept by the registrar —
                contact the registrar’s office to have them updated.
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const CSS = `
  .fp-loading { color: var(--muted); font-size: 13px; padding: 2rem 0; }

  /* Identity hero */
  .fp-hero{position:relative;overflow:hidden;background:var(--ink);color:#fff;
    padding:1.9rem 2rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:1.75rem;flex-wrap:wrap;
    border-top:3px solid var(--gold);}
  .fp-hero::after{content:'';position:absolute;top:-45%;right:-4%;width:300px;height:300px;border-radius:50%;
    background:radial-gradient(circle,rgba(184,144,67,.22),transparent 70%);pointer-events:none;}
  .fp-av{width:86px;height:86px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
    font-size:30px;font-weight:600;letter-spacing:.04em;color:var(--ink);position:relative;z-index:1;
    font-family:'Inter',sans-serif;background:linear-gradient(135deg,var(--gold-soft),var(--gold));}
  .fp-idmain{min-width:0;position:relative;z-index:1;}
  .fp-name{font-family:'Inter',sans-serif;font-weight:500;font-size:26px;letter-spacing:-.015em;line-height:1.1;}
  .fp-email{color:rgba(232,236,242,.72);font-size:13px;margin-top:5px;overflow-wrap:anywhere;}
  .fp-badges{display:flex;gap:8px;margin-top:13px;flex-wrap:wrap;}
  .fp-badge{font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;padding:5px 11px;
    display:inline-flex;align-items:center;gap:6px;}
  .fp-badge i{font-size:13px;}
  .fp-badge--role{background:rgba(255,255,255,.12);color:#fff;}
  .fp-badge--ok{background:rgba(93,214,161,.16);color:#5dd6a1;}
  .fp-badge--warn{background:rgba(240,200,120,.16);color:#f0c878;}
  .fp-facts{margin-left:auto;display:flex;gap:2.25rem;flex-wrap:wrap;position:relative;z-index:1;}
  .fp-fact .k{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-soft);font-weight:700;}
  .fp-fact .v{font-size:15px;color:#fff;margin-top:5px;font-weight:500;}
  .fp-fact .v.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.03em;}

  /* Grid */
  .fp-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:1.25rem;align-items:start;}
  @media(max-width:860px){.fp-grid{grid-template-columns:1fr;}}

  /* Read-only account details */
  .fp-section{background:#fff;border:1px solid var(--line);}
  .fp-section-head{padding:1rem 1.35rem;border-bottom:1px solid var(--line);background:var(--warm);
    font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink);font-weight:700;}
  .fp-row{display:grid;grid-template-columns:160px 1fr;gap:1rem;padding:14px 1.35rem;
    border-bottom:1px solid var(--line-soft);font-size:13px;min-width:0;}
  .fp-row:last-child{border-bottom:none;}
  .fp-row-l{color:var(--muted);}
  .fp-row-v{color:var(--ink);font-weight:500;overflow-wrap:anywhere;}
  .fp-row-v.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;}
  @media(max-width:560px){.fp-row{grid-template-columns:1fr;gap:3px;}}

  /* Editable card */
  .fp-card{background:#fff;border:1px solid var(--line);padding:1.5rem;}
  .fp-card-head{margin-bottom:1.25rem;}
  .fp-card-head h4{font-family:'Inter',sans-serif;font-weight:500;font-size:18px;color:var(--ink);letter-spacing:-.01em;}
  .fp-card-head h4 span{display:block;font-size:11px;color:var(--muted);font-weight:400;margin-top:3px;}
  .fp-field{margin-bottom:1rem;}
  .fp-label{display:block;font-weight:600;font-size:13px;color:var(--ink);margin-bottom:5px;}
  .fp-input{width:100%;padding:.55rem .7rem;border:1px solid var(--line);background:#fff;color:var(--ink);
    font:14px/1.4 'Inter',sans-serif;outline:none;box-sizing:border-box;transition:border-color .15s;}
  .fp-input:focus{border-color:var(--ink);}
  .fp-hint{display:flex;gap:9px;align-items:flex-start;background:var(--warm);border:1px solid var(--line-soft);
    padding:.7rem .9rem;margin-bottom:1.1rem;font-size:12.5px;color:var(--muted);line-height:1.5;}
  .fp-hint i{color:var(--gold);font-size:15px;margin-top:1px;flex-shrink:0;}

  /* Status card */
  .fp-status{display:flex;gap:13px;align-items:flex-start;padding:1.1rem 1.25rem;border:1px solid var(--line);}
  .fp-status i{font-size:22px;flex-shrink:0;margin-top:1px;}
  .fp-status--ok{background:var(--green-tint);border-color:rgba(5,150,105,.3);}
  .fp-status--ok i{color:var(--green);}
  .fp-status--warn{background:var(--amber-tint);border-color:rgba(217,119,6,.3);}
  .fp-status--warn i{color:var(--amber);}
  .fp-status-t{font-weight:600;font-size:14px;color:var(--ink);}
  .fp-status-d{font-size:12.5px;color:var(--muted);line-height:1.55;margin-top:3px;}

  .fp-note{font-size:12px;color:var(--faint);line-height:1.6;padding:0 .25rem;}

  @media(max-width:640px){
    .fp-hero{padding:1.5rem 1.25rem;gap:1.25rem;}
    .fp-facts{margin-left:0;gap:1.5rem;width:100%;}
    .fp-name{font-size:22px;}
  }
`;
