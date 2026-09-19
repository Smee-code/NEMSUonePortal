/* Reusable loading indicators. <Spinner/> is an inline ring; <PageLoader/>
   centers a spinner with an optional label for full-panel loading states. */

export function Spinner({ size = 18, stroke = 2.5, color = '#C79A3B' }) {
  return (
    <span
      className="nemsu-spin"
      style={{ width: size, height: size, borderWidth: stroke, borderTopColor: color }}
      role="status"
      aria-label="Loading"
    >
      <style>{`.nemsu-spin{display:inline-block;box-sizing:border-box;border-style:solid;
        border-color:rgba(120,130,150,.25);border-radius:50%;animation:nemsu-spin .7s linear infinite;vertical-align:middle;}
        @keyframes nemsu-spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="nemsu-pageloader">
      <style>{`.nemsu-pageloader{display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:14px;padding:3rem;color:#5a6478;font-size:13px;min-height:180px;}`}</style>
      <Spinner size={30} stroke={3} />
      <span>{label}</span>
    </div>
  );
}

export default Spinner;
