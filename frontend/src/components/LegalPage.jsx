import PublicPageShell from './PublicPageShell';

/* Shared layout + prose styling for the Privacy, Terms and Cookie pages. */
export default function LegalPage({ eyebrow, title, updated, children }) {
  return (
    <PublicPageShell eyebrow={eyebrow} title={title} subtitle={updated ? `Last updated ${updated}` : undefined}>
      <style>{PROSE}</style>
      <div className="legal-draft">
        <i className="ti ti-info-circle" />
        <span>
          This is a working draft prepared for review. It is not legal advice. Before publication,
          the final text must be reviewed and approved by the University's Data Protection Officer and
          the Office of Legal Affairs.
        </span>
      </div>
      <article className="legal-prose">{children}</article>
    </PublicPageShell>
  );
}

const PROSE = `
  .legal-draft{display:flex;gap:10px;align-items:flex-start;background:#fdf6e6;border:1px solid #e7d3a1;color:#7a5c16;padding:12px 16px;font-size:13px;line-height:1.5;margin-bottom:2rem;}
  .legal-draft i{font-size:18px;flex-shrink:0;margin-top:1px;}
  .legal-prose{background:#fff;border:1px solid #e5e7eb;padding:2.25rem 2.5rem;max-width:820px;line-height:1.7;color:#2a3444;font-size:15px;}
  .legal-prose h2{font-size:20px;font-weight:600;color:#0B1B2E;margin:2rem 0 .75rem;letter-spacing:-.01em;}
  .legal-prose h2:first-child{margin-top:0;}
  .legal-prose h3{font-size:15px;font-weight:600;color:#0B1B2E;margin:1.4rem 0 .4rem;}
  .legal-prose p{margin:.6rem 0;}
  .legal-prose ul{margin:.6rem 0;padding-left:1.3rem;}
  .legal-prose li{margin:.35rem 0;}
  .legal-prose a{color:#b17f1e;}
  .legal-prose strong{color:#0B1B2E;}
  @media(max-width:560px){.legal-prose{padding:1.5rem 1.25rem;}}
`;
