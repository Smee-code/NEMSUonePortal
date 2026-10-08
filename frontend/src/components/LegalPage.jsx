import { useEffect, useRef, useState } from 'react';
import PublicPageShell from './PublicPageShell';

/* Shared layout + prose styling for the Privacy, Terms and Cookie pages.
   A sticky "Contents" rail is generated automatically from the <h2> sections
   in `children`, so the content pages stay plain prose. */
export default function LegalPage({ eyebrow, title, updated, children }) {
  const articleRef = useRef(null);
  const [toc, setToc] = useState([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const art = articleRef.current;
    if (!art) return;
    const heads = Array.from(art.querySelectorAll('h2'));
    const items = heads.map(h => {
      if (!h.id) {
        h.id = (h.textContent || '')
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      return { id: h.id, text: h.textContent || '' };
    });
    setToc(items);

    // Scroll-spy: highlight the section nearest the top of the viewport.
    const obs = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );
    heads.forEach(h => obs.observe(h));
    return () => obs.disconnect();
  }, [children]);

  const jump = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  };

  return (
    <PublicPageShell eyebrow={eyebrow} title={title} subtitle={updated ? `Last updated ${updated}` : undefined}>
      <style>{PROSE}</style>

      <div className="legal-draft">
        <i className="ti ti-shield-lock" />
        <span>
          This is a working draft prepared for review. It is not legal advice. Before publication,
          the final text must be reviewed and approved by the University's Data Protection Officer and
          the Office of Legal Affairs.
        </span>
      </div>

      <div className="lg-layout">
        {toc.length > 0 && (
          <aside className="lg-toc" aria-label="Contents">
            <div className="lg-toc-head">On this page</div>
            <nav className="lg-toc-nav">
              {toc.map(t => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className={`lg-toc-link${activeId === t.id ? ' is-active' : ''}`}
                  onClick={e => jump(e, t.id)}
                >
                  {t.text}
                </a>
              ))}
            </nav>
          </aside>
        )}

        <div className="lg-main">
          {toc.length > 0 && (
            <details className="lg-toc-m">
              <summary>On this page</summary>
              <nav>
                {toc.map(t => (
                  <a key={t.id} href={`#${t.id}`} onClick={e => jump(e, t.id)}>{t.text}</a>
                ))}
              </nav>
            </details>
          )}
          <article ref={articleRef} className="legal-prose">{children}</article>
        </div>
      </div>
    </PublicPageShell>
  );
}

const INK = '#0B1B2E';
const GOLD = '#b17f1e';

const PROSE = `
  .legal-draft{display:flex;gap:11px;align-items:flex-start;background:#fbf5e6;border:1px solid #e7d3a1;
    border-left:3px solid ${GOLD};color:#7a5c16;padding:13px 16px;font-size:13px;line-height:1.55;margin-bottom:2.25rem;max-width:960px;}
  .legal-draft i{font-size:18px;flex-shrink:0;margin-top:1px;color:${GOLD};}

  .lg-layout{display:grid;grid-template-columns:232px minmax(0,1fr);gap:3.25rem;align-items:start;}

  /* Sticky contents rail */
  .lg-toc{position:sticky;top:92px;max-height:calc(100vh - 120px);overflow:auto;}
  .lg-toc-head{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8a93a3;font-weight:700;margin-bottom:.9rem;padding-left:14px;}
  .lg-toc-nav{display:flex;flex-direction:column;border-left:1px solid #e3e7ee;}
  .lg-toc-link{position:relative;display:block;padding:7px 14px;font-size:12.5px;line-height:1.4;color:#5a6478;
    text-decoration:none;border-left:2px solid transparent;margin-left:-1px;transition:color .14s,border-color .14s;}
  .lg-toc-link:hover{color:${INK};}
  .lg-toc-link.is-active{color:${INK};font-weight:600;border-left-color:${GOLD};}

  /* Mobile contents (collapsible) */
  .lg-toc-m{display:none;background:#fff;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:1.25rem;}
  .lg-toc-m summary{cursor:pointer;padding:12px 16px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5a6478;list-style:none;}
  .lg-toc-m summary::-webkit-details-marker{display:none;}
  .lg-toc-m summary::after{content:'\\203A';float:right;transform:rotate(90deg);color:#8a93a3;}
  .lg-toc-m[open] summary::after{transform:rotate(-90deg);}
  .lg-toc-m nav{display:flex;flex-direction:column;padding:0 6px 8px;}
  .lg-toc-m nav a{padding:8px 12px;font-size:13px;color:#5a6478;text-decoration:none;border-top:1px solid #f0f2f6;}
  .lg-toc-m nav a:hover{color:${INK};}

  /* Reading column */
  .lg-main{min-width:0;}
  .legal-prose{background:#fff;border:1px solid #e5e7eb;border-top:3px solid ${INK};border-radius:2px;
    padding:2.75rem 3rem;line-height:1.8;color:#2a3444;font-size:15.5px;max-width:720px;
    box-shadow:0 1px 2px rgba(10,22,40,.03);}
  .legal-prose > p:first-child{font-size:16.5px;color:#3a4556;line-height:1.75;margin:0 0 .5rem;}
  .legal-prose h2{font-size:18px;font-weight:700;color:${INK};margin:2.4rem 0 .85rem;letter-spacing:-.01em;
    padding-top:2.4rem;border-top:1px solid #eef0f4;scroll-margin-top:92px;}
  .legal-prose h2:first-of-type{margin-top:2rem;}
  .legal-prose h3{font-size:14.5px;font-weight:600;color:${INK};margin:1.5rem 0 .4rem;}
  .legal-prose p{margin:.7rem 0;}
  .legal-prose ul{margin:.7rem 0;padding-left:1.25rem;list-style:none;}
  .legal-prose li{position:relative;margin:.5rem 0;padding-left:1.1rem;}
  .legal-prose li::before{content:'';position:absolute;left:0;top:.62em;width:5px;height:5px;border-radius:50%;background:${GOLD};}
  .legal-prose a{color:${GOLD};text-underline-offset:2px;}
  .legal-prose strong{color:${INK};font-weight:600;}

  @media(max-width:860px){
    .lg-layout{grid-template-columns:1fr;gap:0;}
    .lg-toc{display:none;}
    .lg-toc-m{display:block;}
  }
  @media(max-width:560px){
    .legal-prose{padding:1.5rem 1.25rem;font-size:15px;}
    .legal-prose h2{padding-top:1.6rem;margin:1.6rem 0 .6rem;}
  }
`;
