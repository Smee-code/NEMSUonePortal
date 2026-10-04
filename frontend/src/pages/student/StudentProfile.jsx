import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

const YEAR_LABELS = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default function StudentProfile() {
  const { user } = useAuth();
  const toast = useToast();

  const [profile, setProfile]         = useState(null);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms]       = useState([]);
  const [form, setForm]               = useState({ department: '', program: '', year_level: '' });
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [enrollmentStats, setEnrollmentStats] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/auth/academic-profile/'),
      api.get('/auth/departments/'),
      api.get('/enrollment/programs/'),
      api.get('/enrollment/my/'),
    ]).then(([profileRes, deptRes, progRes, enrollRes]) => {
      const p = profileRes.data;
      setProfile(p);
      setDepartments(deptRes.data);
      setPrograms(progRes.data);
      setForm({
        department: p.department_id ?? '',
        program:    p.program_id ?? '',
        year_level: p.year_level ?? '',
      });
      const enrollments = Array.isArray(enrollRes.data) ? enrollRes.data : (enrollRes.data.results ?? []);
      setEnrollmentStats({
        totalTerms:  enrollments.length,
        approved:    enrollments.filter(e => e.status === 'approved').length,
        totalUnits:  enrollments.filter(e => e.status === 'approved').reduce((s, e) => s + parseFloat(e.total_units || 0), 0),
      });
    }).catch(() => toast('Failed to load profile data.', { type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/auth/academic-profile/', {
        department: form.department || null,
        program:    form.program    || null,
        year_level: form.year_level !== '' ? Number(form.year_level) : null,
      });
      setProfile(res.data);
      toast('Academic information updated successfully.', { type: 'success' });
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

  if (loading) return <div className="page"><p style={{ color: 'var(--muted)' }}>Loading profile…</p></div>;

  const programsForDept = form.department
    ? programs.filter(p => String(p.department) === String(form.department))
    : programs;

  const verified = !!profile?.is_verified;
  const facts = [
    profile?.student_id   && { k: 'Student No.', v: profile.student_id, mono: true },
    profile?.program_name && { k: 'Program',     v: profile.program_code || profile.program_name },
    profile?.year_level   && { k: 'Year level',  v: YEAR_LABELS[profile.year_level] },
    profile?.department_name && { k: 'Department', v: profile.department_code || profile.department_name },
  ].filter(Boolean);

  return (
    <div className="page">
      <style>{CSS}</style>

      {/* ── Page head ──────────────────────────────────────── */}
      <div className="page-head">
        <div>
          <div className="eyebrow">Campus · My account</div>
          <h2>My <em>profile</em></h2>
          <div className="sub">Your student record, and the academic details that drive your enrollment.</div>
        </div>
      </div>

      {/* ── Identity hero ──────────────────────────────────── */}
      <div className="pf-hero">
        <div className="pf-av">{initials(profile?.full_name)}</div>
        <div className="pf-idmain">
          <div className="pf-name">{profile?.full_name ?? user?.full_name}</div>
          <div className="pf-email">{profile?.institutional_email}</div>
          <div className="pf-badges">
            <span className="pf-badge pf-badge--role"><i className="ti ti-school" /> Student</span>
            <span className={`pf-badge ${verified ? 'pf-badge--ok' : 'pf-badge--warn'}`}>
              <i className={`ti ${verified ? 'ti-rosette-discount-check' : 'ti-clock'}`} />
              {verified ? 'Verified' : 'Pending verification'}
            </span>
          </div>
        </div>
        {facts.length > 0 && (
          <div className="pf-facts">
            {facts.map(f => (
              <div key={f.k} className="pf-fact">
                <div className="k">{f.k}</div>
                <div className={`v${f.mono ? ' mono' : ''}`}>{f.v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pf-grid">

        {/* ── Left: details + editable academics ─────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Account details (read-only) */}
          <div className="info-section" style={{ marginBottom: 0 }}>
            <div className="info-section-head"><h4>Account details</h4></div>
            {[
              ['Full name',      profile?.full_name],
              ['Student ID',     profile?.student_id, true],
              ['Email address',  profile?.institutional_email],
              ['Role',           'Student'],
              ['Email status',   verified ? 'Verified' : 'Pending verification'],
            ].map(([lbl, val, mono]) => (
              <div key={lbl} className="info-row">
                <span className="lbl">{lbl}</span>
                <span className={`val${mono ? ' mono' : ''}`}>{val ?? '—'}</span>
              </div>
            ))}
          </div>

          {/* Academic information (editable — the single source) */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-head">
              <h4>Academic information<span>Department, program, and year level</span></h4>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="pf-field">
                <label className="pf-label">Department</label>
                <select className="pf-input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value, program: '' }))}>
                  <option value="">Not set</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
                </select>
              </div>
              <div className="pf-field">
                <label className="pf-label">Program</label>
                <select className="pf-input" value={form.program} onChange={e => setForm(f => ({ ...f, program: e.target.value }))}>
                  <option value="">Not set</option>
                  {programsForDept.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              <div className="pf-field">
                <label className="pf-label">Year level</label>
                <select className="pf-input" value={form.year_level} onChange={e => setForm(f => ({ ...f, year_level: e.target.value }))}>
                  <option value="">Not set</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              <div className="pf-hint">
                <i className="ti ti-info-circle" />
                Your program and year level determine the courses offered to you during enrollment.
              </div>

              <button type="submit" className="btn-pri" disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right: summary + status ────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {enrollmentStats && (
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-head"><h4>Enrollment summary<span>Across your record</span></h4></div>
              {[
                { label: 'Terms enrolled',         value: enrollmentStats.totalTerms },
                { label: 'Approved terms',         value: enrollmentStats.approved },
                { label: 'Total units (approved)', value: enrollmentStats.totalUnits },
              ].map(({ label, value }) => (
                <div key={label} className="pf-sum-row">
                  <span className="pf-sum-l">{label}</span>
                  <span className="pf-sum-v">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Verification / account status */}
          <div className={`pf-status pf-status--${verified ? 'ok' : 'warn'}`}>
            <i className={`ti ${verified ? 'ti-shield-check' : 'ti-shield-exclamation'}`} />
            <div>
              <div className="pf-status-t">{verified ? 'Your account is verified' : 'Verify your email'}</div>
              <div className="pf-status-d">
                {verified
                  ? 'Notices about enrollment, grades, and document requests are sent to your institutional email.'
                  : 'Check your institutional email for the verification link to secure your account.'}
              </div>
            </div>
          </div>

          <div className="pf-note">
            Need to correct your name or student number? Those are kept by the registrar — visit the
            registrar’s office to have them updated.
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  /* Identity hero */
  .pf-hero{position:relative;overflow:hidden;background:var(--ink);color:#fff;
    padding:1.9rem 2rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:1.75rem;flex-wrap:wrap;
    border-top:3px solid var(--gold);}
  .pf-hero::after{content:'';position:absolute;top:-45%;right:-4%;width:300px;height:300px;border-radius:50%;
    background:radial-gradient(circle,rgba(184,144,67,.22),transparent 70%);pointer-events:none;}
  .pf-av{width:86px;height:86px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
    font-size:30px;font-weight:600;letter-spacing:.04em;color:var(--ink);position:relative;z-index:1;
    background:linear-gradient(135deg,var(--gold-soft),var(--gold));}
  .pf-idmain{min-width:0;position:relative;z-index:1;}
  .pf-name{font-family:'Inter',sans-serif;font-weight:500;font-size:26px;letter-spacing:-.015em;line-height:1.1;}
  .pf-email{color:rgba(232,236,242,.72);font-size:13px;margin-top:5px;overflow-wrap:anywhere;}
  .pf-badges{display:flex;gap:8px;margin-top:13px;flex-wrap:wrap;}
  .pf-badge{font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;padding:5px 11px;
    display:inline-flex;align-items:center;gap:6px;}
  .pf-badge i{font-size:13px;}
  .pf-badge--role{background:rgba(255,255,255,.12);color:#fff;}
  .pf-badge--ok{background:rgba(93,214,161,.16);color:#5dd6a1;}
  .pf-badge--warn{background:rgba(240,200,120,.16);color:#f0c878;}
  .pf-facts{margin-left:auto;display:flex;gap:2.25rem;flex-wrap:wrap;position:relative;z-index:1;}
  .pf-fact .k{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-soft);font-weight:700;}
  .pf-fact .v{font-size:15px;color:#fff;margin-top:5px;font-weight:500;}
  .pf-fact .v.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.03em;}

  /* Academic edit form */
  .pf-field{margin-bottom:1rem;}
  .pf-label{display:block;font-weight:600;font-size:13px;color:var(--ink);margin-bottom:5px;}
  .pf-input{width:100%;padding:.55rem .7rem;border:1px solid var(--line);background:#fff;color:var(--ink);
    font:14px/1.4 'Inter',sans-serif;outline:none;box-sizing:border-box;transition:border-color .15s;}
  .pf-input:focus{border-color:var(--ink);}
  .pf-hint{display:flex;gap:9px;align-items:flex-start;background:var(--warm);border:1px solid var(--line-soft);
    padding:.7rem .9rem;margin-bottom:1.1rem;font-size:12.5px;color:var(--muted);line-height:1.5;}
  .pf-hint i{color:var(--gold);font-size:15px;margin-top:1px;flex-shrink:0;}

  /* Enrollment summary rows */
  .pf-sum-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;
    padding:14px 0;border-bottom:1px solid var(--line-soft);}
  .pf-sum-row:last-child{border-bottom:none;}
  .pf-sum-l{font-size:13px;color:var(--muted);}
  .pf-sum-v{font-size:22px;font-weight:500;color:var(--ink);letter-spacing:-.015em;font-variant-numeric:tabular-nums;}

  /* Status card */
  .pf-status{display:flex;gap:13px;align-items:flex-start;padding:1.1rem 1.25rem;border:1px solid var(--line);}
  .pf-status i{font-size:22px;flex-shrink:0;margin-top:1px;}
  .pf-status--ok{background:var(--green-tint);border-color:#a7f3d0;}
  .pf-status--ok i{color:var(--green);}
  .pf-status--warn{background:var(--amber-tint);border-color:#f3e0b0;}
  .pf-status--warn i{color:var(--amber);}
  .pf-status-t{font-weight:600;font-size:14px;color:var(--ink);}
  .pf-status-d{font-size:12.5px;color:var(--muted);line-height:1.55;margin-top:3px;}

  .pf-note{font-size:12px;color:var(--faint);line-height:1.6;padding:0 .25rem;}

  @media(max-width:640px){
    .pf-hero{padding:1.5rem 1.25rem;gap:1.25rem;}
    .pf-facts{margin-left:0;gap:1.5rem;width:100%;}
    .pf-name{font-size:22px;}
  }
`;
