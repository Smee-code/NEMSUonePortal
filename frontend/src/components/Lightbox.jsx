import { useEffect, useState } from 'react';

/* Full-screen image viewer with next/prev, counter and dots. Reusable. */
export default function Lightbox({ images = [], title, startIndex = 0, onClose }) {
  const [i, setI] = useState(startIndex);
  const n = images.length;

  const prev = () => setI(x => (x - 1 + n) % n);
  const next = () => setI(x => (x + 1) % n);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && n > 1) prev();
      else if (e.key === 'ArrowRight' && n > 1) next();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!n) return null;

  return (
    <div className="lb-back" onClick={onClose}>
      <style>{CSS}</style>
      <button className="lb-x" onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>

      <div className="lb-stage" onClick={e => e.stopPropagation()}>
        <img className="lb-img" src={images[i]} alt={title ? `${title} (image ${i + 1})` : `Image ${i + 1}`} />

        {n > 1 && (
          <>
            <button className="lb-nav lb-prev" onClick={prev} aria-label="Previous"><i className="ti ti-chevron-left" /></button>
            <button className="lb-nav lb-next" onClick={next} aria-label="Next"><i className="ti ti-chevron-right" /></button>
          </>
        )}
      </div>

      <div className="lb-foot" onClick={e => e.stopPropagation()}>
        {title && <div className="lb-title">{title}</div>}
        {n > 1 && (
          <div className="lb-controls">
            <div className="lb-dots">
              {images.map((_, k) => (
                <button key={k} className={`lb-dot${k === i ? ' on' : ''}`} onClick={() => setI(k)} aria-label={`Image ${k + 1}`} />
              ))}
            </div>
            <div className="lb-count">{i + 1} / {n}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
  .lb-back{position:fixed;inset:0;z-index:2000;background:rgba(8,12,20,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3.5rem 1rem 2rem;animation:lb-fade .18s ease}
  @keyframes lb-fade{from{opacity:0}to{opacity:1}}
  .lb-x{position:absolute;top:16px;right:16px;width:42px;height:42px;border:none;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;z-index:3}
  .lb-x:hover{background:rgba(255,255,255,.22)}
  .lb-stage{position:relative;flex:1;min-height:0;width:100%;max-width:1100px;display:flex;align-items:center;justify-content:center}
  .lb-img{max-width:100%;max-height:100%;object-fit:contain;display:block;box-shadow:0 20px 60px -20px rgba(0,0,0,.6)}
  .lb-nav{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:48px;border:none;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:26px}
  .lb-nav:hover{background:rgba(255,255,255,.26)}
  .lb-prev{left:6px}.lb-next{right:6px}
  .lb-foot{width:100%;max-width:1100px;padding-top:1rem;display:flex;flex-direction:column;align-items:center;gap:.75rem;color:#fff}
  .lb-title{font-size:15px;font-weight:500;text-align:center;color:rgba(255,255,255,.92)}
  .lb-controls{display:flex;align-items:center;gap:1rem}
  .lb-dots{display:flex;gap:7px}
  .lb-dot{width:8px;height:8px;border-radius:50%;border:none;background:rgba(255,255,255,.35);cursor:pointer;padding:0}
  .lb-dot.on{background:#fff}
  .lb-count{font-size:12px;letter-spacing:.08em;color:rgba(255,255,255,.7);font-variant-numeric:tabular-nums}
  @media(max-width:560px){.lb-nav{width:40px;height:40px;font-size:22px}.lb-back{padding:3rem .5rem 1.5rem}}
`;
