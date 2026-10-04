import RegistrarSchedule from '../registrar/RegistrarSchedule';

/*
 * Admin Class Schedules.
 *
 * Reuses the registrar's schedule manager verbatim (same /schedules/ API,
 * create + edit + delete + room/instructor conflict validation) so there's
 * a single source of truth. The registrar page is styled with `--reg-*`
 * tokens and a couple of shared classes the admin shell doesn't define
 * (`.form-*`, `.card-head`, `.empty`); this wrapper supplies both, scoped,
 * mapped onto the admin palette — so it renders natively inside AdminShell.
 */
const SHIM = `
.adm-sched-scope{
  --reg-ink:var(--adm-ink);
  --reg-ink-2:var(--adm-ink-2);
  --reg-ink-3:var(--adm-ink);
  --reg-muted:var(--adm-muted);
  --reg-faint:var(--adm-faint);
  --reg-line:var(--adm-line);
  --reg-line-soft:var(--adm-line-soft);
  --reg-warm:var(--adm-warm);
  --reg-cool:var(--adm-ink);            /* subject-code text — keep readable */
  --reg-green:var(--adm-green);
  --reg-green-tint:var(--adm-green-tint);
  --reg-red:var(--adm-red);
  --reg-red-tint:var(--adm-red-tint);
}
.adm-sched-scope .form-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--adm-muted);font-weight:600}
.adm-sched-scope .form-input,.adm-sched-scope .form-select{padding:10px 12px;font-size:13px;background:#fff;border:1px solid var(--adm-line);outline:none;color:var(--adm-ink);font-family:inherit}
.adm-sched-scope .form-input:focus,.adm-sched-scope .form-select:focus{border-color:var(--adm-ink)}
.adm-sched-scope .card-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--adm-line-soft)}
.adm-sched-scope .card-head h4{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--adm-muted);font-weight:600;line-height:1.3}
.adm-sched-scope .card-head h4 span{display:block;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:400;font-size:20px;color:var(--adm-ink);text-transform:none;letter-spacing:-.01em;margin-top:4px}
.adm-sched-scope .empty{text-align:center;padding:4rem 2rem;background:#fff;border:1px solid var(--adm-line)}
.adm-sched-scope .empty i{font-size:48px;color:var(--adm-faint);display:block;margin-bottom:1rem}
.adm-sched-scope .empty .t{font-size:16px;font-weight:600;color:var(--adm-ink);margin-bottom:.5rem}
.adm-sched-scope .empty .d{font-size:13px;color:var(--adm-muted);max-width:320px;margin:0 auto;line-height:1.55}
`;

export default function AdminSchedule() {
  return (
    <div className="adm-sched-scope">
      <style>{SHIM}</style>
      <RegistrarSchedule />
    </div>
  );
}
