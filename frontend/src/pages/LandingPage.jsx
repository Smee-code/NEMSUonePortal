import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Lightbox from '../components/Lightbox';

/* ══════════════════════════════════════════════════════════════
   CSS — ported from landing-redesign.html
══════════════════════════════════════════════════════════════ */
const CSS = `
  :root{
    --ink:#0a1628;--ink-2:#1e3a5f;--ink-3:#0f1f3a;
    --muted:#5a6478;--faint:#8a93a3;
    --paper:#ffffff;--warm:#f8f7f3;--cool:#f4f6fa;
    --line:#e5e7eb;--line-soft:#eef0f4;
    --line-dark:rgba(255,255,255,.10);--line-dark-2:rgba(255,255,255,.20);
    --gold:#b89043;--gold-soft:#d9b96b;
    --on-dark:#e8ecf2;--on-dark-mute:rgba(232,236,242,.65);--on-dark-faint:rgba(232,236,242,.42);
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
  body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--paper);color:var(--ink);line-height:1.5;font-size:15px;}
  .serif{font-weight:500;letter-spacing:-.005em}
  a{color:inherit}
  img{display:block;max-width:100%}

  /* ── Reusable ── */
  .lp-wrap{max-width:1280px;margin:0 auto;padding:0 2rem}
  .eyebrow{font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);display:inline-flex;align-items:center;gap:10px;}
  .eyebrow::before{content:"";width:24px;height:1px;background:var(--gold);display:inline-block}
  .eyebrow.on-dark{color:var(--gold-soft)}
  .eyebrow.on-dark::before{background:var(--gold-soft)}
  .h-display{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:500;line-height:1.02;letter-spacing:-.025em;color:var(--ink);font-size:clamp(56px,7.5vw,108px);}
  .h-display em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-weight:400}
  .h-section{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:500;line-height:1.05;letter-spacing:-.022em;color:var(--ink);font-size:clamp(36px,4.2vw,54px);}
  .h-section em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-weight:400;color:var(--ink-2)}
  .h-section.on-dark{color:#fff}
  .h-section.on-dark em{color:var(--gold-soft)}
  .lead{font-size:17px;line-height:1.7;color:var(--muted);max-width:640px}
  .micro{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--faint);font-weight:600}

  /* ── Buttons ── */
  .btn{display:inline-flex;align-items:center;gap:8px;padding:13px 22px;border-radius:0;clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px);font-size:13px;font-weight:500;letter-spacing:.02em;cursor:pointer;border:1px solid transparent;transition:background .2s,border-color .2s,color .2s,transform .15s;text-decoration:none;font-family:inherit;}
  .btn i{font-size:15px}
  .btn-primary{background:var(--ink);color:#fff;border-color:var(--ink)}
  .btn-primary:hover{background:#000;border-color:#000}
  .btn-gold{background:var(--gold);color:#fff;border-color:var(--gold)}
  .btn-gold:hover{background:#a07c33;border-color:#a07c33}
  .btn-ghost{background:transparent;color:var(--ink);border-color:var(--line)}
  .btn-ghost:hover{border-color:var(--ink);background:var(--ink);color:#fff}
  .btn-onDark{background:#fff;color:var(--ink);border-color:#fff}
  .btn-onDark:hover{background:transparent;color:#fff}
  .btn-onDark-ghost{background:transparent;color:#fff;border-color:var(--line-dark-2)}
  .btn-onDark-ghost:hover{border-color:#fff;background:rgba(255,255,255,.06)}
  .btn-link{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--ink);text-decoration:none;padding:0 0 4px;background:none;border:0;border-bottom:1px solid var(--ink);cursor:pointer;font-family:inherit;transition:gap .2s;}
  .btn-link:hover{gap:14px}
  .btn-link.on-dark{color:#fff;border-bottom-color:rgba(255,255,255,.4)}
  .btn-link.on-dark:hover{border-bottom-color:#fff}

  /* ── Topbar ── */
  .topbar{background:var(--ink);color:var(--on-dark-mute);font-size:12px;}
  .topbar-inner{max-width:1280px;margin:0 auto;padding:9px 2rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;}
  .topbar-info{display:flex;gap:1.5rem;flex-wrap:wrap}
  .topbar-info span{display:inline-flex;align-items:center;gap:6px}
  .topbar-info i{font-size:13px;color:var(--gold-soft)}
  .topbar-auth{display:flex;gap:1.25rem;flex-shrink:0;align-items:center}
  .topbar-auth a{color:var(--on-dark-mute);text-decoration:none;transition:color .15s}
  .topbar-auth a:hover{color:#fff}
  .topbar-auth .divider{color:var(--on-dark-faint)}
  .topbar-portal-pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold-soft);border:1px solid rgba(217,185,107,.3);border-radius:99px;font-weight:600;}

  /* ── Navbar ── */
  .nav{background:#fff;position:sticky;top:0;z-index:100;border-bottom:1px solid var(--line);}
  .nav.scrolled{box-shadow:0 1px 0 var(--line),0 8px 24px -16px rgba(10,22,40,.18)}
  .nav-inner{max-width:1280px;margin:0 auto;padding:0 2rem;display:flex;align-items:center;height:82px;gap:1.5rem;}
  .brand{display:flex;align-items:center;gap:14px;text-decoration:none;flex-shrink:0}
  .brand-logo{width:48px;height:48px;border-radius:50%;object-fit:contain;background:var(--cool);padding:3px;}
  .brand-text{line-height:1.2}
  .brand-name{font-family:'Instrument Serif',serif;font-size:24px;font-weight:400;color:var(--ink);letter-spacing:-.01em;}
  .brand-sub{font-size:11px;color:var(--muted);letter-spacing:.04em;margin-top:1px;font-weight:500}
  .nav-links{display:flex;margin-left:auto;gap:.125rem}
  .nav-link{padding:0 16px;height:82px;display:flex;align-items:center;font-size:13px;font-weight:500;color:var(--muted);text-decoration:none;border-bottom:2px solid transparent;transition:color .15s,border-color .15s;white-space:nowrap;}
  .nav-link:hover{color:var(--ink)}
  .nav-link.active{color:var(--ink);border-bottom-color:var(--ink)}
  .nav-cta{margin-left:.75rem}
  .burger{display:none}
  @media(max-width:980px){
    .topbar-info{display:none}
    .nav-links{display:none}
    .nav-cta{display:none}
    .brand{flex-shrink:1;min-width:0}
    .brand-text{min-width:0}
    .brand-sub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .burger{display:flex;margin-left:auto;flex-shrink:0;width:42px;height:42px;border-radius:2px;border:1px solid var(--line);background:#fff;align-items:center;justify-content:center;cursor:pointer;color:var(--ink);}
    .burger i{font-size:20px}
  }

  /* ── Hero ── */
  .hero{position:relative;min-height:88vh;background:var(--ink-3);color:#fff;overflow:hidden;display:flex;flex-direction:column;}
  .hero-photo{position:absolute;inset:0;z-index:0;}
  .hero-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;filter:blur(3px);transform:scale(1.06);}
  .hero-photo::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(180deg,rgba(10,22,40,.5) 0%,rgba(10,22,40,.32) 35%,rgba(10,22,40,.78) 100%),linear-gradient(90deg,rgba(10,22,40,.9) 0%,rgba(10,22,40,.74) 40%,rgba(10,22,40,.55) 70%,rgba(10,22,40,.32) 100%);}
  .hero-content{position:relative;z-index:3;flex:1;max-width:1280px;margin:0 auto;width:100%;padding:5rem 2rem 3rem;display:flex;flex-direction:column;justify-content:flex-end;}
  .hero-eyebrow{display:inline-flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--gold-soft);margin-bottom:2rem;}
  .hero-eyebrow::before{content:"";width:36px;height:1px;background:var(--gold-soft)}
  .hero-status-pill{display:inline-flex;align-items:center;gap:8px;padding:5px 12px;font-size:11px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:rgba(255,255,255,.08);backdrop-filter:blur(8px);border:1px solid var(--line-dark-2);border-radius:99px;}
  .hero-status-pill .dot{width:7px;height:7px;border-radius:50%;background:#5dd6a1;box-shadow:0 0 0 4px rgba(93,214,161,.18);}
  .hero h1{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:500;color:#fff;font-size:clamp(54px,8vw,124px);line-height:.98;letter-spacing:-.025em;margin-bottom:1.75rem;max-width:1100px;text-shadow:0 2px 18px rgba(10,22,40,.55);}
  .hero h1 em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--gold-soft);font-weight:400;text-shadow:0 2px 14px rgba(10,22,40,.7),0 1px 3px rgba(10,22,40,.55)}
  .hero-sub{font-size:18px;line-height:1.6;color:rgba(255,255,255,.82);max-width:580px;margin-bottom:2.5rem;font-weight:400;}
  .hero-actions{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
  .hero-scroll{position:absolute;left:50%;bottom:24px;z-index:4;transform:translateX(-50%);color:rgba(255,255,255,.6);font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:8px;}
  .hero-scroll i{font-size:14px;animation:lp-bounce 2s ease-in-out infinite}
  @keyframes lp-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
  @media(max-width:880px){
    .hero{min-height:76vh}
    .hero-content{padding:4rem 1.25rem 3rem}
    .hero-scroll{display:none}
  }

  /* ── Audience portals ── */
  .portals{background:var(--ink);color:#fff;border-top:1px solid var(--line-dark)}
  .portals-inner{max-width:1280px;margin:0 auto;padding:0 2rem;display:grid;grid-template-columns:auto repeat(4,1fr);gap:0;}
  .portals-label{padding:1.5rem 2rem 1.5rem 0;border-right:1px solid var(--line-dark);display:flex;flex-direction:column;justify-content:center;}
  .portals-label .micro{color:var(--on-dark-faint);margin-bottom:4px}
  .portals-label .lbl{font-family:'Instrument Serif',serif;font-size:22px;color:#fff;letter-spacing:-.01em;line-height:1;}
  .portal{padding:1.75rem 1.5rem;display:flex;justify-content:space-between;align-items:center;border-right:1px solid var(--line-dark);text-decoration:none;color:#fff;transition:background .25s,padding-left .25s;}
  .portal:last-child{border-right:none}
  .portal:hover{background:rgba(255,255,255,.04);padding-left:1.75rem}
  .portal-text .micro{color:var(--gold-soft);margin-bottom:6px;font-size:10px}
  .portal-text .name{font-size:16px;font-weight:500;color:#fff;line-height:1.2}
  .portal i{font-size:18px;color:var(--on-dark-mute);transition:transform .25s,color .25s;}
  .portal:hover i{transform:translateX(4px);color:#fff}
  @media(max-width:980px){
    .portals-inner{grid-template-columns:1fr 1fr}
    .portals-label{grid-column:1/-1;border-right:none;border-bottom:1px solid var(--line-dark);padding:1.25rem 0}
    .portal:nth-child(2),.portal:nth-child(4){border-right:none}
    .portal:nth-child(2),.portal:nth-child(3){border-bottom:1px solid var(--line-dark)}
  }
  @media(max-width:560px){
    .portals-inner{grid-template-columns:1fr}
    .portal{border-right:none;border-bottom:1px solid var(--line-dark)}
    .portal:last-child{border-bottom:none}
  }

  /* ── Spotlight ── */
  .spot{background:#fff;padding:7rem 0}
  .spot-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:3rem;gap:2rem;flex-wrap:wrap;}
  .spot-head .eyebrow{margin-bottom:1rem}
  .spot-grid{display:grid;grid-template-columns:1.3fr 1fr;gap:0;border-top:1px solid var(--line);}
  .spot-image{position:relative;border-right:1px solid var(--line);border-bottom:1px solid var(--line);min-height:520px;background:var(--cool);}
  .spot-image img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
  .spot-image::after{content:"";position:absolute;left:24px;top:24px;z-index:3;pointer-events:none;font:600 10px/1 'Inter',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#fff;background:rgba(10,22,40,.75);backdrop-filter:blur(4px);padding:6px 10px;}
  .spot-image[data-tag]::after{content:attr(data-tag)}
  .spot-body{padding:3.5rem 3rem;border-bottom:1px solid var(--line);display:flex;flex-direction:column;justify-content:center;}
  .spot-meta{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:1.5rem;}
  .spot-body h3{font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(32px,3vw,42px);line-height:1.08;color:var(--ink);margin-bottom:1.5rem;letter-spacing:-.015em;}
  .spot-body h3 em{font-style:italic;color:var(--ink-2);font-weight:400}
  .spot-body p{font-size:15px;line-height:1.8;color:var(--muted);margin-bottom:2rem}
  .spot-byline{font-size:12px;letter-spacing:.06em;color:var(--faint);margin-bottom:2rem;padding-top:1.5rem;border-top:1px solid var(--line);}
  @media(max-width:880px){
    .spot{padding:5rem 0}
    .spot-grid{grid-template-columns:1fr}
    .spot-image{min-height:340px;border-right:none}
    .spot-body{padding:2.5rem 1.5rem}
  }

  /* ── Info strip ── */
  .info-strip{background:var(--warm);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .info-inner{max-width:1280px;margin:0 auto;padding:0 2rem;display:grid;grid-template-columns:repeat(4,1fr);}
  .info-cell{padding:1.5rem 1.5rem;border-right:1px solid var(--line);display:flex;align-items:flex-start;gap:14px;}
  .info-cell:last-child{border-right:none}
  .info-cell i{font-size:20px;color:var(--gold);flex-shrink:0;margin-top:2px}
  .info-cell .micro{margin-bottom:4px;color:var(--muted)}
  .info-cell .val{font-size:14px;color:var(--ink);font-weight:500;line-height:1.4}
  @media(max-width:760px){
    .info-inner{grid-template-columns:1fr 1fr}
    .info-cell:nth-child(2){border-right:none}
    .info-cell:nth-child(-n+2){border-bottom:1px solid var(--line)}
  }
  @media(max-width:520px){
    .info-inner{grid-template-columns:1fr}
    .info-cell{border-right:none;padding:1.25rem 1rem}
    .info-cell:nth-child(-n+3){border-bottom:1px solid var(--line)}
  }

  /* ── About ── */
  .about{background:#fff;padding:7rem 0}
  .about-grid{display:grid;grid-template-columns:1fr 1.3fr;gap:5rem;align-items:start;}
  .about-visual{position:relative;aspect-ratio:4/5;max-width:440px}
  .about-visual img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
  .about-visual::after{content:"";position:absolute;left:-24px;bottom:-24px;width:140px;height:140px;background:var(--gold);z-index:-1;}
  .about-badge{position:absolute;left:-16px;top:24px;z-index:3;background:#fff;padding:14px 18px;border:1px solid var(--line);box-shadow:0 4px 16px rgba(10,22,40,.06);}
  .about-badge .micro{font-size:10px;color:var(--gold);margin-bottom:2px}
  .about-badge .v{font-family:'Instrument Serif',serif;font-size:18px;color:var(--ink);line-height:1}
  .about-copy .eyebrow{margin-bottom:1.5rem}
  .about-copy h2{margin-bottom:1.5rem}
  .about-copy p{font-size:16px;line-height:1.8;color:var(--muted);margin-bottom:1.25rem;max-width:580px}
  .pillars{display:grid;grid-template-columns:repeat(2,1fr);gap:0;margin-top:2.5rem;border-top:1px solid var(--line);}
  .pillar{padding:1.5rem 1.5rem 1.5rem 0;border-bottom:1px solid var(--line);border-right:1px solid var(--line);}
  .pillar:nth-child(2n){padding-right:0;padding-left:1.5rem;border-right:none}
  .pillar:nth-last-child(-n+2){border-bottom:none}
  .pillar .num{font-family:'Instrument Serif',serif;font-size:18px;color:var(--gold);margin-bottom:.5rem;display:block}
  .pillar .title{font-size:15px;font-weight:600;color:var(--ink);margin-bottom:4px}
  .pillar .desc{font-size:13px;color:var(--muted);line-height:1.55}
  @media(max-width:880px){
    .about{padding:5rem 0}
    .about-grid{grid-template-columns:1fr;gap:3rem}
    .about-visual{max-width:none}
    .about-visual::after{display:none}
  }

  /* ── Stats ── */
  .stats{background:var(--ink-3);color:#fff;padding:6rem 0;position:relative;overflow:hidden}
  .stats::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 90% 10%,rgba(184,144,67,.10),transparent 50%);}
  .stats-inner{position:relative;z-index:2;max-width:1280px;margin:0 auto;padding:0 2rem}
  .stats-head{margin-bottom:3rem;max-width:680px}
  .stats-head .eyebrow{margin-bottom:1.25rem}
  .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line-dark-2);}
  .stat-cell{padding:2.5rem 2rem 2.5rem 0;border-right:1px solid var(--line-dark);}
  .stat-cell:last-child{border-right:none}
  .stat-cell:not(:first-child){padding-left:2rem}
  .stat-num{font-family:'Instrument Serif',serif;font-weight:400;font-size:72px;line-height:1;color:#fff;letter-spacing:-.025em;}
  .stat-num sup{font-size:.4em;color:var(--gold-soft);margin-left:2px;top:-.8em}
  .stat-lbl{margin-top:14px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--on-dark-mute);}
  .stat-desc{margin-top:8px;font-size:13px;color:var(--on-dark-faint);line-height:1.5}
  @media(max-width:880px){
    .stats{padding:4rem 0}
    .stats-grid{grid-template-columns:1fr 1fr}
    .stat-cell{padding:1.75rem 1rem!important;border-right:none;border-bottom:1px solid var(--line-dark)}
    .stat-cell:nth-child(odd){border-right:1px solid var(--line-dark)}
    .stat-cell:nth-last-child(-n+2){border-bottom:none}
    .stat-num{font-size:48px}
  }

  /* ── Vision/Mission ── */
  .vm{background:var(--warm);padding:7rem 0}
  .vm-head{text-align:center;margin-bottom:4rem}
  .vm-head .eyebrow{margin-bottom:1.25rem}
  .vm-head h2{max-width:780px;margin:0 auto}
  .vm-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;max-width:1120px;margin:0 auto;border-top:1px solid var(--line);border-bottom:1px solid var(--line);}
  .vm-card{padding:3rem 3.5rem}
  .vm-card:first-child{border-right:1px solid var(--line)}
  .vm-num{font-family:'Instrument Serif',serif;font-size:13px;color:var(--gold);letter-spacing:.16em;text-transform:uppercase;font-weight:400;margin-bottom:1.25rem;display:block;}
  .vm-card h3{font-family:'Instrument Serif',serif;font-weight:400;font-size:30px;line-height:1.15;color:var(--ink);margin-bottom:1rem;letter-spacing:-.01em;}
  .vm-card h3 em{font-style:italic}
  .vm-card p{font-size:15px;line-height:1.8;color:var(--muted)}
  @media(max-width:760px){
    .vm{padding:4rem 0}
    .vm-grid{grid-template-columns:1fr}
    .vm-card{padding:2.5rem 1.5rem;border-right:none!important}
    .vm-card:first-child{border-bottom:1px solid var(--line)}
  }

  /* ── Programs ── */
  .progs{background:#fff;padding:7rem 0}
  .progs-head{display:grid;grid-template-columns:1fr auto;gap:2rem;align-items:end;margin-bottom:3.5rem;}
  .progs-head h2{max-width:640px}
  .progs-head .eyebrow{margin-bottom:1rem}
  .progs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--line);}
  .prog{padding:2.5rem 2rem 2.25rem;border-bottom:1px solid var(--line);border-right:1px solid var(--line);position:relative;transition:background .25s;cursor:pointer;display:flex;flex-direction:column;min-height:300px;}
  .prog:nth-child(3n){border-right:none}
  .prog:hover{background:var(--cool)}
  .prog-num{font-family:'Instrument Serif',serif;font-size:13px;color:var(--faint);letter-spacing:.1em;font-weight:400;margin-bottom:1.5rem;}
  .prog h4{font-family:'Instrument Serif',serif;font-weight:400;font-size:26px;line-height:1.15;color:var(--ink);letter-spacing:-.008em;margin-bottom:.75rem;}
  .prog .dept{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:1rem;}
  .prog p{font-size:14px;line-height:1.65;color:var(--muted);margin-top:auto;padding-top:1.25rem;border-top:1px solid var(--line-soft);}
  .prog .arrow{position:absolute;top:2.5rem;right:2rem;opacity:0;transform:translateX(-6px);transition:opacity .25s,transform .25s;color:var(--ink);font-size:22px;}
  .prog:hover .arrow{opacity:1;transform:translateX(0)}
  @media(max-width:980px){
    .progs{padding:5rem 0}
    .progs-head{grid-template-columns:1fr;margin-bottom:2.5rem}
    .progs-grid{grid-template-columns:repeat(2,1fr)}
    .prog{padding:2rem 1.5rem;min-height:240px}
    .prog:nth-child(3n){border-right:1px solid var(--line)}
    .prog:nth-child(2n){border-right:none}
  }
  @media(max-width:600px){
    .progs-grid{grid-template-columns:1fr}
    .prog{border-right:none!important}
  }

  /* ── Life ── */
  .life{background:#fff;padding:7rem 0;border-top:1px solid var(--line)}
  .life-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:3rem;gap:2rem;flex-wrap:wrap;}
  .life-head .eyebrow{margin-bottom:1rem}
  .life-head h2{max-width:560px}
  .life-grid{display:grid;grid-template-columns:repeat(12,1fr);grid-auto-rows:160px;gap:1.5rem;}
  .life-item{position:relative;overflow:hidden;display:block;text-decoration:none;color:#fff}
  .life-item img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
  .life-item::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(180deg,transparent 40%,rgba(10,22,40,.78) 100%);}
  .life-item .meta{position:absolute;left:1.25rem;right:1.25rem;bottom:1.25rem;z-index:3;}
  .life-item .micro{color:var(--gold-soft);margin-bottom:6px;font-size:10px;}
  .life-item .title{font-family:'Instrument Serif',serif;font-weight:400;font-size:22px;line-height:1.15;color:#fff;letter-spacing:-.01em;}
  .life-count{position:absolute;top:.9rem;right:.9rem;z-index:3;display:inline-flex;align-items:center;gap:5px;background:rgba(10,22,40,.62);color:#fff;font-size:11px;font-weight:600;padding:4px 9px;border-radius:999px;backdrop-filter:blur(4px);}
  .life-item:hover img{transform:scale(1.04);transition:transform .5s ease}
  .life-a{grid-column:span 7;grid-row:span 3}
  .life-b{grid-column:span 5;grid-row:span 2}
  .life-c{grid-column:span 5;grid-row:span 2}
  .life-d{grid-column:span 4;grid-row:span 2}
  .life-e{grid-column:span 4;grid-row:span 2}
  .life-f{grid-column:span 4;grid-row:span 2}
  @media(max-width:880px){
    .life{padding:5rem 0}
    .life-grid{grid-template-columns:1fr 1fr;grid-auto-rows:140px}
    .life-a,.life-b,.life-c,.life-d,.life-e,.life-f{grid-column:span 1;grid-row:span 2}
    .life-a{grid-column:span 2}
  }

  /* ── Facilities ── */
  .facs{background:var(--ink);color:#fff;padding:7rem 0}
  .facs-head{margin-bottom:3.5rem;max-width:720px}
  .facs-head .eyebrow{color:var(--gold-soft);margin-bottom:1.25rem}
  .facs-head .eyebrow::before{background:var(--gold-soft)}
  .facs-head h2{color:#fff;margin-bottom:1.25rem}
  .facs-head h2 em{color:var(--gold-soft);font-style:italic}
  .facs-head p{color:var(--on-dark-mute);font-size:17px;line-height:1.7}
  .facs-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid var(--line-dark-2);}
  .fac{padding:2.5rem 1.75rem;border-bottom:1px solid var(--line-dark);border-right:1px solid var(--line-dark);transition:background .25s;}
  .fac:nth-child(4n){border-right:none}
  .fac:hover{background:rgba(255,255,255,.03)}
  .fac i{font-size:32px;color:var(--gold-soft);display:block;margin-bottom:1.5rem;}
  .fac h4{font-family:'Instrument Serif',serif;font-weight:400;font-size:24px;line-height:1.2;color:#fff;margin-bottom:.5rem;}
  .fac p{font-size:13px;line-height:1.6;color:var(--on-dark-mute)}
  @media(max-width:880px){
    .facs{padding:5rem 0}
    .facs-grid{grid-template-columns:repeat(2,1fr)}
    .fac:nth-child(4n){border-right:1px solid var(--line-dark)}
    .fac:nth-child(2n){border-right:none}
  }
  @media(max-width:520px){
    .facs-grid{grid-template-columns:1fr}
    .fac{border-right:none!important}
  }

  /* ── News ── */
  .news{background:var(--warm);padding:7rem 0}
  .news-head{display:grid;grid-template-columns:1fr auto;gap:2rem;align-items:end;margin-bottom:3.5rem;}
  .news-head h2{max-width:600px}
  .news-head .eyebrow{margin-bottom:1.25rem}
  .news-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;}
  .news-card{background:#fff;border:1px solid var(--line);transition:transform .25s,box-shadow .25s,border-color .25s;display:flex;flex-direction:column;cursor:pointer;text-decoration:none;color:inherit;}
  .news-card:hover{transform:translateY(-4px);box-shadow:0 12px 28px -12px rgba(10,22,40,.18);border-color:var(--ink-2)}
  .news-card-image{position:relative;aspect-ratio:16/10;background:var(--cool);overflow:hidden;}
  .news-card-image img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
  .news-card-tag{position:absolute;left:14px;top:14px;z-index:3;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#fff;background:rgba(10,22,40,.78);backdrop-filter:blur(4px);padding:5px 10px;font-weight:600;}
  .news-card-body{padding:1.75rem 1.75rem 2rem;display:flex;flex-direction:column;flex:1}
  .news-card-date{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);margin-bottom:.75rem;font-weight:600;}
  .news-card h3{font-family:'Instrument Serif',serif;font-weight:400;font-size:22px;line-height:1.2;color:var(--ink);margin-bottom:.75rem;letter-spacing:-.008em;}
  .news-card p{font-size:14px;line-height:1.65;color:var(--muted);margin-bottom:1.25rem}
  .news-card .read{margin-top:auto;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink);font-weight:600;display:inline-flex;align-items:center;gap:6px;}
  @media(max-width:880px){
    .news{padding:5rem 0}
    .news-head{grid-template-columns:1fr;margin-bottom:2.5rem}
    .news-grid{grid-template-columns:1fr}
  }

  /* ── CTA ── */
  .cta{background:var(--ink-3);color:#fff;padding:6rem 0;position:relative;overflow:hidden;}
  .cta::after{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold-soft) 50%,transparent);opacity:.4;}
  .cta-inner{max-width:1280px;margin:0 auto;padding:0 2rem;display:grid;grid-template-columns:1fr auto;gap:4rem;align-items:center;}
  .cta h2{color:#fff;max-width:680px}
  .cta h2 em{color:var(--gold-soft);font-style:italic}
  .cta p{color:var(--on-dark-mute);font-size:16px;line-height:1.7;margin-top:1rem;max-width:540px}
  .cta-actions{display:flex;gap:14px;flex-wrap:wrap}
  @media(max-width:880px){.cta-inner{grid-template-columns:1fr;gap:2rem}}

  /* ── Footer ── */
  .footer{background:var(--ink);color:var(--on-dark-mute);padding:5rem 0 0;border-top:1px solid var(--line-dark);}
  .footer-grid{display:grid;grid-template-columns:2.2fr 1fr 1fr 1fr;gap:4rem;padding-bottom:3rem;border-bottom:1px solid var(--line-dark);}
  .footer-brand{display:flex;align-items:center;gap:14px;margin-bottom:1.5rem}
  .footer-brand img{width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.04);padding:3px}
  .footer-brand-name{font-family:'Instrument Serif',serif;font-size:24px;color:#fff}
  .footer-brand-sub{font-size:11px;color:var(--on-dark-faint);letter-spacing:.06em;margin-top:2px}
  .footer-tagline{font-size:14px;color:var(--on-dark-mute);line-height:1.7;max-width:380px;margin-bottom:1.5rem}
  .footer-contact{display:flex;flex-direction:column;gap:8px;font-size:13px}
  .footer-contact span{display:flex;align-items:center;gap:10px}
  .footer-contact i{color:var(--gold-soft);font-size:14px}
  .footer h5{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#fff;margin-bottom:1.5rem;font-weight:600;}
  .footer-links{display:flex;flex-direction:column;gap:10px;font-size:13px}
  .footer-links a{color:var(--on-dark-mute);text-decoration:none;transition:color .15s}
  .footer-links a:hover{color:#fff}
  .footer-bottom{padding:1.5rem 0;display:flex;justify-content:space-between;font-size:12px;color:var(--on-dark-faint);}
  .footer-bottom a{color:var(--on-dark-faint);text-decoration:none;margin-left:1.5rem}
  .footer-bottom a:hover{color:#fff}
  @media(max-width:880px){
    .footer{padding:3.5rem 0 0}
    .footer-grid{grid-template-columns:1fr 1fr;gap:2.5rem}
    .footer-bottom{flex-direction:column;gap:.75rem;text-align:center}
    .footer-bottom a{margin:0 .75rem}
  }
  @media(max-width:520px){.footer-grid{grid-template-columns:1fr}}

  /* ── Modal system ── */
  .modal-back{position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(8px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1.5rem;animation:lp-fadeIn .2s ease;overflow-y:auto;}
  @keyframes lp-fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes lp-slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .modal{background:#fff;max-width:520px;width:100%;border:1px solid var(--line);animation:lp-slideUp .25s cubic-bezier(.4,0,.2,1);overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 3rem);}
  .modal--wide{max-width:880px}
  /* Detail / read-more modal */
  .lp-dtl{background:#fff;max-width:620px;width:100%;border:1px solid var(--line);animation:lp-slideUp .25s cubic-bezier(.4,0,.2,1);position:relative;max-height:calc(100vh - 3rem);overflow-y:auto;}
  .lp-dtl-x{position:absolute;top:12px;right:12px;z-index:2;width:36px;height:36px;border:none;background:rgba(255,255,255,.9);color:var(--ink);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;}
  .lp-dtl-x:hover{background:#fff}
  .lp-dtl-img{aspect-ratio:16/9;overflow:hidden;background:var(--cool);}
  .lp-dtl-img img{width:100%;height:100%;object-fit:cover;display:block;}
  .lp-dtl-body{padding:1.75rem 2rem 2rem;}
  .lp-dtl-meta{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:.75rem;}
  .lp-dtl-body h3{font-size:26px;line-height:1.15;color:var(--ink);letter-spacing:-.01em;margin-bottom:.5rem;font-weight:500;}
  .lp-dtl-sub{font-size:12px;color:var(--muted);margin-bottom:1rem;}
  .lp-dtl-body p{font-size:15px;line-height:1.75;color:var(--muted);}
  /* All programs modal */
  .lp-progmodal{background:#fff;max-width:760px;width:100%;border:1px solid var(--line);animation:lp-slideUp .25s cubic-bezier(.4,0,.2,1);max-height:calc(100vh - 3rem);display:flex;flex-direction:column;}
  .lp-progmodal-head{display:flex;justify-content:space-between;align-items:flex-start;padding:1.5rem 1.75rem;border-bottom:1px solid var(--line);}
  .lp-progmodal-head h3{font-size:22px;color:var(--ink);font-weight:500;margin-top:4px;}
  .lp-progmodal-head .lp-dtl-x{position:static;background:none;}
  .lp-progmodal-body{padding:1.5rem 1.75rem;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem 2rem;}
  .lp-progdept-name{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);font-weight:700;padding-bottom:.5rem;margin-bottom:.75rem;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;}
  .lp-progdept-name span{color:var(--faint);}
  .lp-progdept ul{list-style:none;display:flex;flex-direction:column;gap:8px;}
  .lp-progdept li{display:flex;align-items:flex-start;gap:9px;font-size:14px;color:var(--ink);line-height:1.4;}
  .lp-progdot{width:5px;height:5px;background:var(--gold);border-radius:50%;margin-top:7px;flex-shrink:0;}
  /* Campus life gallery modal */
  .lp-gallery{background:#fff;max-width:960px;width:100%;border:1px solid var(--line);animation:lp-slideUp .25s cubic-bezier(.4,0,.2,1);max-height:calc(100vh - 3rem);display:flex;flex-direction:column;}
  .lp-gallery-head{display:flex;justify-content:space-between;align-items:center;padding:1.25rem 1.75rem;border-bottom:1px solid var(--line);}
  .lp-gallery-head h3{font-size:22px;color:var(--ink);font-weight:500;}
  .lp-gallery-head .lp-dtl-x{position:static;background:none;}
  .lp-gallery-grid{padding:1.5rem 1.75rem;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;}
  .lp-gallery-item{position:relative;aspect-ratio:4/3;overflow:hidden;background:var(--cool);}
  .lp-gallery-item img{width:100%;height:100%;object-fit:cover;display:block;}
  .lp-gallery-meta{position:absolute;inset:auto 0 0 0;padding:.9rem 1rem;background:linear-gradient(transparent,rgba(10,22,40,.85));color:#fff;}
  .lp-gallery-tag{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-soft);font-weight:600;}
  .lp-gallery-title{font-size:14px;font-weight:500;margin-top:2px;line-height:1.3;}
  /* Cards that became <button> — keep original look, fix button defaults */
  .news-card{font-family:inherit;text-align:left;width:100%;padding:0;}
  .life-item{font-family:inherit;text-align:left;width:100%;padding:0;cursor:pointer;}
  @media(max-width:640px){.lp-progmodal-body{grid-template-columns:1fr}}
  .modal--med{max-width:640px}
  .modal-head{padding:1.75rem 2.5rem 0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
  .modal-head-brand{display:flex;align-items:center;gap:12px}
  .modal-head-brand img{width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--cool);padding:2px}
  .modal-head-brand .name{font-family:'Instrument Serif',serif;font-size:18px;color:var(--ink);line-height:1}
  .modal-head-brand .sub{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-top:4px}
  .modal-close{width:36px;height:36px;border:1px solid var(--line);background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:border-color .15s,background .15s;}
  .modal-close:hover{border-color:var(--ink);background:var(--ink);color:#fff}
  .modal-close i{font-size:16px}
  .modal-body{padding:2rem 2.5rem 2.25rem;overflow-y:auto;flex:1}
  .modal-body--center{text-align:center}
  .modal-body h3{font-family:'Instrument Serif',serif;font-weight:400;font-size:30px;color:var(--ink);line-height:1.15;letter-spacing:-.012em;margin-bottom:.5rem;}
  .modal-body h3 em{font-style:italic;color:var(--ink-2);font-weight:400}
  .modal-body > p.lead{font-size:14px;color:var(--muted);line-height:1.65;margin-bottom:2rem;max-width:480px}
  .modal-body--center > p.lead{margin-left:auto;margin-right:auto}
  .modal-choices{display:flex;flex-direction:column;gap:12px;text-align:left}
  /* Freshman admission intro modal */
  .adm-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--gold);background:var(--gold-tint,#f5edd9);padding:5px 11px;}
  .adm-steps{display:flex;flex-direction:column;gap:.75rem;}
  .adm-step{display:flex;gap:14px;align-items:flex-start;}
  .adm-step-ico{width:38px;height:38px;flex-shrink:0;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;}
  .adm-step-t{font-size:14px;font-weight:600;color:var(--ink);}
  .adm-step-d{font-size:12.5px;color:var(--muted);line-height:1.55;margin-top:2px;}
  /* Document upload rows */
  .doc-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line-soft);flex-wrap:wrap;}
  .doc-info{display:flex;align-items:center;gap:8px;min-width:0;flex:1;}
  .doc-label{font-size:13px;color:var(--ink);}
  .doc-upload{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid var(--line);background:#fff;cursor:pointer;font-size:12px;font-weight:600;color:var(--ink);white-space:nowrap;flex-shrink:0;}
  .doc-upload:hover{border-color:var(--ink);}
  .doc-upload.has-file{border-color:var(--green,#0a7c52);color:var(--green,#0a7c52);}
  .doc-upload i{font-size:15px;}
  .modal-choice{display:flex;align-items:center;gap:1rem;padding:1.25rem 1.5rem;cursor:pointer;background:#fff;border:1px solid var(--line);transition:border-color .2s,background .2s,padding-left .2s;width:100%;text-align:left;font-family:inherit;}
  .modal-choice:hover{border-color:var(--ink);background:var(--cool);padding-left:1.75rem}
  .modal-choice-icon{width:46px;height:46px;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--cool);}
  .modal-choice-icon i{font-size:20px;color:var(--ink)}
  .modal-choice-body{flex:1;min-width:0}
  .modal-choice-body .t{font-size:15px;font-weight:600;color:var(--ink);margin-bottom:2px}
  .modal-choice-body .d{font-size:12px;color:var(--muted);line-height:1.5}
  .modal-foot{padding:1.25rem 2.5rem;border-top:1px solid var(--line);font-size:13px;color:var(--muted);text-align:center;background:var(--warm);flex-shrink:0;}
  .modal-foot a{color:var(--ink);font-weight:500;text-decoration:none;border-bottom:1px solid var(--ink);padding-bottom:1px;cursor:pointer}
  .modal-foot a:hover{color:var(--ink-2)}
  @media(max-width:680px){
    .modal-head,.modal-body,.modal-foot{padding-left:1.5rem;padding-right:1.5rem}
  }

  /* ── Reveal ── */
  .reveal{opacity:0;transform:translateY(24px);transition:opacity .8s cubic-bezier(.4,0,.2,1),transform .8s cubic-bezier(.4,0,.2,1)}
  .reveal.in{opacity:1;transform:none}

  /* ── Flow forms ── */
  .flow-form{display:flex;flex-direction:column;gap:1.25rem}
  .flow-field{display:flex;flex-direction:column;gap:6px}
  .flow-field-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .flow-label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:600}
  .flow-input,.flow-select{width:100%;padding:12px 14px;font-size:14px;border:1px solid var(--line);background:#fff;color:var(--ink);font-family:inherit;outline:none;transition:border-color .15s,box-shadow .15s;border-radius:0;box-sizing:border-box}
  .flow-input:focus,.flow-select:focus{border-color:var(--ink);box-shadow:0 0 0 3px rgba(10,22,40,.06)}
  .flow-input::placeholder{color:var(--faint)}
  .flow-input:disabled{background:var(--cool);color:var(--muted)}
  .flow-helper{font-size:12px;color:var(--muted);display:flex;justify-content:space-between;align-items:center}
  .flow-check{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);cursor:pointer;user-select:none}
  .flow-check input{appearance:none;width:16px;height:16px;border:1px solid var(--line);cursor:pointer;display:grid;place-items:center;background:#fff;flex-shrink:0}
  .flow-check input:checked{background:var(--ink);border-color:var(--ink)}
  .flow-check input:checked::after{content:"\\2713";color:#fff;font-size:11px;font-weight:700;line-height:1}
  .flow-actions{display:flex;flex-direction:column;gap:12px;margin-top:.5rem}
  .flow-btn-primary{width:100%;padding:14px;background:var(--ink);color:#fff;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:background .15s}
  .flow-btn-primary:hover{background:#000}
  .flow-btn-primary:disabled{opacity:.5;cursor:not-allowed}

  /* ── Wizard ── */
  .wiz{display:grid;grid-template-columns:220px 1fr;min-height:480px}
  .wiz-side{background:var(--warm);border-right:1px solid var(--line);padding:2rem 1.5rem;display:flex;flex-direction:column}
  .wiz-side-head{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:1.25rem}
  .wiz-steps{display:flex;flex-direction:column;gap:6px;flex:1}
  .wiz-step{display:flex;align-items:center;gap:10px;padding:9px 12px;font-size:13px;color:var(--muted);transition:color .2s,background .2s}
  .wiz-step.active{background:#fff;color:var(--ink);font-weight:500;border:1px solid var(--line)}
  .wiz-step.done{color:var(--ink)}
  .wiz-step-num{width:22px;height:22px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;border:1px solid var(--line);background:#fff;color:var(--muted)}
  .wiz-step.active .wiz-step-num{background:var(--ink);color:#fff;border-color:var(--ink)}
  .wiz-step.done .wiz-step-num{background:var(--gold);color:#fff;border-color:var(--gold)}
  .wiz-side-foot{font-size:11px;color:var(--muted);line-height:1.6;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--line)}
  .wiz-side-foot a{color:var(--ink);text-decoration:none;display:block;margin-top:4px;font-weight:500}
  .wiz-main{padding:2rem 2.25rem;display:flex;flex-direction:column;overflow-y:auto}
  .wiz-main h4{font-family:'Instrument Serif',serif;font-weight:400;font-size:24px;color:var(--ink);letter-spacing:-.01em;margin-bottom:.4rem}
  .wiz-main .wiz-sub{font-size:13px;color:var(--muted);line-height:1.65;margin-bottom:1.5rem;max-width:440px}
  .wiz-progress{height:2px;background:var(--line-soft);margin-bottom:1.5rem}
  .wiz-progress > div{height:100%;background:var(--ink);transition:width .35s cubic-bezier(.4,0,.2,1)}
  .type-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:1rem}
  .type-card{padding:1.25rem;border:1px solid var(--line);cursor:pointer;background:#fff;text-align:left;font-family:inherit;transition:border-color .15s,background .15s}
  .type-card:hover{border-color:var(--muted)}
  .type-card.selected{border-color:var(--ink);background:var(--cool)}
  .type-card i{font-size:22px;color:var(--ink);margin-bottom:10px;display:block}
  .type-card .t{font-size:14px;font-weight:600;color:var(--ink)}
  .type-card .d{font-size:11px;color:var(--muted);margin-top:3px;line-height:1.5}
  .wiz-actions{display:flex;justify-content:space-between;gap:12px;margin-top:auto;padding-top:1.5rem;border-top:1px solid var(--line-soft)}
  .wiz-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;border:1px solid var(--line);background:#fff;color:var(--ink);transition:border-color .15s,background .15s,color .15s}
  .wiz-btn:hover{border-color:var(--ink)}
  .wiz-btn.primary{background:var(--ink);color:#fff;border-color:var(--ink)}
  .wiz-btn.primary:hover{background:#000;border-color:#000}
  .wiz-btn:disabled{opacity:.4;cursor:not-allowed}
  .success-icon{width:64px;height:64px;border-radius:50%;background:#e8f4ec;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem}
  .success-icon i{font-size:32px;color:#0a7c52}
  @keyframes lp-slideInRight{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
  @keyframes lp-slideInLeft{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:none}}
  @media(max-width:680px){
    .wiz{grid-template-columns:1fr}
    .wiz-side{display:none}
    .modal-head,.modal-body,.modal-foot{padding-left:1.5rem;padding-right:1.5rem}
  }
`;

/* ══════════════════════════════════════════════════════════════
   DATA — Design
══════════════════════════════════════════════════════════════ */
const UNSPLASH = (id, w = 1600) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

const PHOTO = {
  hero:  '/campus-hero.jpg',
  spot:  UNSPLASH('photo-1532094349884-543bc11b234d', 1400),
  about: UNSPLASH('photo-1523580494863-6f3031224c94', 1200),
  lifeA: UNSPLASH('photo-1541339907198-e08756dedf3f', 1600),
  lifeB: UNSPLASH('photo-1523240795612-9a054b0db644', 1000),
  lifeC: UNSPLASH('photo-1571260899304-425eee4c7efc', 1000),
  lifeD: UNSPLASH('photo-1554475901-4538ddfbccc2', 1000),
  lifeE: UNSPLASH('photo-1494178270175-e96de2971df9', 1000),
  lifeF: UNSPLASH('photo-1607237138185-eedd9c632b0b', 1000),
  news1: UNSPLASH('photo-1434030216411-0b793f4b4173', 1000),
  news2: UNSPLASH('photo-1456513080510-7bf3a84b82f8', 1000),
  news3: UNSPLASH('photo-1562774053-701939374585', 1000),
};

const PROGRAMS_STATIC = [
  { num:'01', name:'BS Computer Science',        dept:'Computer Studies',      desc:'Computing principles, algorithms, software development, and emerging technologies.' },
  { num:'02', name:'BS Information Technology',  dept:'Computer Studies',      desc:'Information systems, networking, database management, and IT infrastructure.' },
  { num:'03', name:'BS Education',               dept:'Teacher Education',     desc:'Future teachers in secondary and elementary education with strong pedagogical foundations.' },
  { num:'04', name:'BS Business Administration', dept:'Business & Management', desc:'Business acumen in marketing, finance, management, and entrepreneurship.' },
  { num:'05', name:'BS Nursing',                 dept:'Allied Health',         desc:'Competent nurses equipped with clinical skills, critical thinking, and compassionate care.' },
  { num:'06', name:'BS Agriculture',             dept:'Agricultural Sciences', desc:'Modern agricultural practices, crop science, and sustainable food systems.' },
];

const FACILITIES = [
  { icon:'ti-books',         name:'Library',             desc:'Extensive collection of academic resources and digital subscriptions.' },
  { icon:'ti-cpu',           name:'Computer Laboratory', desc:'State-of-the-art computing facilities for IT and CS students.' },
  { icon:'ti-flask',         name:'Science Laboratory',  desc:'Fully equipped labs for nursing, biology, and chemistry programs.' },
  { icon:'ti-ball-football', name:'Sports Complex',      desc:'Basketball courts, open fields, and recreational areas for students.' },
];

const NEWS = [
  { id:'news-1', day:'28', my:'May 2025', tag:'Enrollment',     photoKey:'news1', title:'Online Enrollment Now Open for A.Y. 2025–2026',         body:'All students of NEMSU Cantilan Campus (incoming freshmen, transferees, shiftees, and regular students) may now enroll online.' },
  { id:'news-2', day:'20', my:'May 2025', tag:'Scholarship',    photoKey:'news2', title:'Scholarship Applications Open for 1st Semester',         body:'CHED, DOST, LGU, and institutional scholarship applications are now being accepted at the OSAS office. Deadline is June 15, 2025.' },
  { id:'news-3', day:'10', my:'May 2025', tag:'Accreditation',  photoKey:'news3', title:'NEMSU Cantilan Achieves AACCUP Level II Accreditation',  body:"Several programs in the Cantilan Campus have achieved Level II accreditation, reflecting the campus's commitment to quality." },
];

const STATS = [
  { num:5000, suffix:'+', lbl:'Students enrolled',  desc:'Active learners across all programs' },
  { num:20,   suffix:'+', lbl:'Academic programs',   desc:'Undergraduate degrees offered' },
  { num:6,    suffix:'',  lbl:'Departments',          desc:'Spanning technology to health' },
  { num:50,   suffix:'+', lbl:'Years of service',    desc:'Serving the Caraga region' },
];

const NAV_LINKS = [
  { label:'Home',        href:'#home'     },
  { label:'About',       href:'#about'    },
  { label:'Programs',    href:'#programs' },
  { label:'Campus life', href:'#life'     },
  { label:'News',        href:'#news'     },
];

const LIFE = [
  { id:'life-a', cls:'life-a', tag:'Campus',       title:'A campus that grows with its community',    photoKey:'lifeA' },
  { id:'life-b', cls:'life-b', tag:'Academics',    title:'Hands-on learning, beyond the classroom',   photoKey:'lifeB' },
  { id:'life-c', cls:'life-c', tag:'Student life', title:'From orgs to sports: find your community', photoKey:'lifeC' },
  { id:'life-d', cls:'life-d', tag:'Research',     title:'Applied science for the Caraga region',     photoKey:'lifeD' },
  { id:'life-e', cls:'life-e', tag:'Faculty',      title:'Mentors invested in your growth',           photoKey:'lifeE' },
  { id:'life-f', cls:'life-f', tag:'Events',       title:'Tradition meets contemporary culture',      photoKey:'lifeF' },
];

const PORTALS = [
  { kind:'For students',    name:'Student Portal',    action:'login'  },
  { kind:'For faculty',     name:'Faculty Portal',    action:'login'  },
  { kind:'For registrar',   name:'Registrar Console', action:'login'  },
  { kind:'Future students', name:'Apply & Enroll',    action:'enroll' },
];

const PILLARS = [
  { num:'01', title:'Instruction', desc:'Quality academic delivery across undergraduate programs.' },
  { num:'02', title:'Research',    desc:'Innovation, discovery and applied scholarship.' },
  { num:'03', title:'Extension',   desc:'Community engagement and outreach programs.' },
  { num:'04', title:'Production',  desc:'Sustainable enterprise and partnerships.' },
];

const SPOTLIGHT_KEY      = 'nemsu:spotlight-posts';
const SPOTLIGHT_FALLBACK = {
  title:    'Documenting coastal biodiversity along the Surigao del Sur seaboard.',
  body:     'A multi-year initiative by the College of Agriculture & Allied Sciences partners with local fishing communities to catalog reef species, monitor coastal erosion, and develop sustainable aquaculture practices for the Caraga region.',
  category: 'Research · Caraga marine biodiversity',
  tag:      'Research spotlight',
  byline:   'Featured · NEMSU Cantilan Research Office',
  imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1400&q=80&auto=format&fit=crop',
  createdAt:'May 2025',
};

/* ══════════════════════════════════════════════════════════════
   DATA — Enrollment modal (existing, preserved unchanged)
══════════════════════════════════════════════════════════════ */
const TYPE_HINTS = {
  freshman:   'Freshmen must submit their SHS Form 138, PSA Birth Certificate, and other admission documents.',
  regular:    'Regular students need their previous COR, student ID, and clearance from the previous semester.',
  shiftee:    "Shiftees must secure clearance from their current department and the dean's endorsement letter.",
  transferee: 'Transferees must provide their Transcript of Records (TOR) and Honorable Dismissal from their previous school.',
};
const TYPE_LABELS = { freshman:'Freshman', regular:'Regular', shiftee:'Shiftee', transferee:'Transferee' };
const TYPE_ICONS  = { freshman:'ti-school', regular:'ti-refresh', shiftee:'ti-arrows-exchange', transferee:'ti-building-community' };
const TYPE_DESCS  = { freshman:'Incoming first-year student from SHS', regular:'Continuing or returning student', shiftee:'Changing program within NEMSU Cantilan', transferee:'Coming from another institution' };

const ALL_REQUIREMENTS = {
  freshman: [
    { group:'Basic documents', items:[
      { id:'r1', label:'SHS Form 138 / Report Card',              tag:'Required'    },
      { id:'r2', label:'PSA Birth Certificate',                   tag:'Required'    },
      { id:'r3', label:'Good Moral Certificate',                  tag:'Required'    },
      { id:'r4', label:'SHS Diploma / Certificate of Completion', tag:'Required'    },
      { id:'r5', label:'2x2 ID photos (4 copies)',                tag:'Required'    },
      { id:'r6', label:'Medical Certificate',                     tag:'Required'    },
    ]},
    { group:'Admission', items:[
      { id:'r7', label:'Entrance Exam Result / Admission Slip',   tag:'If required' },
      { id:'r8', label:'Accomplished Application Form',           tag:'Required'    },
    ]},
  ],
  regular: [{ group:'Documents', items:[
    { id:'r1', label:'Previous Certificate of Registration (COR)', tag:'Required'      },
    { id:'r2', label:'Student ID (current)',                        tag:'Required'      },
    { id:'r3', label:'Clearance from previous semester',            tag:'Required'      },
    { id:'r4', label:'Proof of payment or scholarship form',        tag:'If applicable' },
  ]}],
  shiftee: [{ group:'Shifting requirements', items:[
    { id:'r1', label:'Shifting Application Form',         tag:'Required' },
    { id:'r2', label:'Clearance from current department', tag:'Required' },
    { id:'r3', label:"Dean's Endorsement Letter",         tag:'Required' },
    { id:'r4', label:'Transcript of Records (internal)',  tag:'Required' },
    { id:'r5', label:'Acceptance from target department', tag:'Required' },
  ]}],
  transferee: [
    { group:'Admission documents', items:[
      { id:'r1', label:'Transcript of Records (TOR)', tag:'Required'    },
      { id:'r2', label:'Honorable Dismissal',         tag:'Required'    },
      { id:'r3', label:'Good Moral Certificate',      tag:'Required'    },
      { id:'r4', label:'PSA Birth Certificate',       tag:'Required'    },
      { id:'r5', label:'2x2 ID photos (4 copies)',    tag:'Required'    },
      { id:'r6', label:'Medical Certificate',         tag:'Required'    },
    ]},
    { group:'Additional', items:[
      { id:'r7', label:'Entrance Exam Result',         tag:'If required' },
      { id:'r8', label:'Application / Admission Form', tag:'Required'    },
    ]},
  ],
};

const SUBJECTS = [
  { code:'CC 101',   name:'Introduction to Computing',         units:3 },
  { code:'CC 102',   name:'Computer Programming 1',            units:3 },
  { code:'MATH 101', name:'Mathematics in the Modern World',   units:3 },
  { code:'ENG 101',  name:'Purposive Communication',           units:3 },
  { code:'STS 101',  name:'Science, Technology & Society',     units:3 },
  { code:'NSTP 1',   name:'National Service Training Program', units:3 },
  { code:'PE 1',     name:'Physical Education 1',              units:2 },
  { code:'HUM 101',  name:'Art Appreciation',                  units:3 },
];

const WIZARD_STEPS = ['Student type', 'Personal info', 'Requirements', 'Subjects', 'Review & confirm'];
const FRESHMAN_STEPS = ['Personal information', 'Required documents', 'Review & confirm'];

/* ══════════════════════════════════════════════════════════════
   HOOKS & HELPERS
══════════════════════════════════════════════════════════════ */
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return [ref, v];
}

function useCountUp(end, duration = 1600) {
  const ref = useRef(null);
  const [val, setVal]       = useState(0);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect(); } }, { threshold: 0.4 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!active) return;
    let start = null;
    const tick = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * end));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, end, duration]);
  return [ref, val];
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, v] = useInView();
  return (
    <div ref={ref} className={`reveal${v ? ' in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

function Img({ src, alt = '' }) {
  return <img src={src} alt={alt} loading="lazy" />;
}

function StatCell({ num, suffix, lbl, desc }) {
  const [ref, val] = useCountUp(num);
  return (
    <div className="stat-cell" ref={ref}>
      <div className="stat-num">{val.toLocaleString()}<sup>{suffix}</sup></div>
      <div className="stat-lbl">{lbl}</div>
      <div className="stat-desc">{desc}</div>
    </div>
  );
}

/* ── Date helpers (existing, preserved) ── */
function fmtDateRange(start, end) {
  const f = d => new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month:'short', day:'numeric' });
  return `${f(start)} – ${f(end)}`;
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
}

/* ── Spotlight loader ── */
function loadActiveSpotlight() {
  try {
    const raw = localStorage.getItem(SPOTLIGHT_KEY);
    if (!raw) return SPOTLIGHT_FALLBACK;
    const posts = JSON.parse(raw);
    if (!Array.isArray(posts) || posts.length === 0) return SPOTLIGHT_FALLBACK;
    return posts.find(p => p.active) || posts[0] || SPOTLIGHT_FALLBACK;
  } catch { return SPOTLIGHT_FALLBACK; }
}

/* ══════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [screen,      setScreen]      = useState(null);   // 'picker' | null
  const [enrollOpen,  setEnrollOpen]  = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const [landingData, setLandingData] = useState(null);
  const [activeNav,   setActiveNav]   = useState('#home');

  function openEnroll()          { setScreen('admission'); document.body.style.overflow = 'hidden'; }
  function openLogin()           { navigate('/login');  }
  function openSignup()          { navigate('/signup'); }
  function startApplication()    { setScreen(null); setEnrollOpen(true); }
  function goLogin()             { setScreen(null); document.body.style.overflow = ''; navigate('/login'); }
  function closeEnroll()         { setEnrollOpen(false); document.body.style.overflow = ''; }
  function closeModal()          { setScreen(null); document.body.style.overflow = ''; }

  useEffect(() => () => { document.body.style.overflow = ''; }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4);
    fn(); window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const sectionIds = NAV_LINKS.map(l => l.href.slice(1));
    const observers = sectionIds.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveNav('#' + id); },
        { threshold: 0.2, rootMargin: '-82px 0px -40% 0px' }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, []);

  useEffect(() => {
    if (!screen && !enrollOpen) return;
    const k = e => {
      if (e.key !== 'Escape') return;
      enrollOpen ? closeEnroll() : closeModal();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [screen, enrollOpen]);

  useEffect(() => {
    api.get('/enrollment/public/landing/').then(r => setLandingData(r.data)).catch(() => {});
  }, []);

  const [site, setSite] = useState(null);
  useEffect(() => {
    api.get('/enrollment/public/site-content/').then(r => setSite(r.data)).catch(() => {});
  }, []);
  const c = site || {};

  return (
    <>
      <style>{CSS}</style>
      <Topbar onLogin={openLogin} onSignup={openSignup} />
      <Navbar scrolled={scrolled} onEnroll={openEnroll} activeNav={activeNav} onNavClick={setActiveNav} />
      <Hero onEnroll={openEnroll} term={landingData?.term} />
      <AudiencePortals onLogin={openLogin} onEnroll={openEnroll} />
      <Spotlight content={c.in_focus} />
      <InfoStrip />
      <About content={c.about} />
      <Stats content={c.stats} />
      <VisionMission content={c.purpose} />
      <Programs programs={landingData?.programs} content={c.programs_intro} />
      <Life content={c.campus_life} />
      <Facilities content={c.facilities} />
      <News content={c.news} />
      <CtaBand onEnroll={openEnroll} onLogin={openLogin} />
      <Footer onEnroll={openEnroll} onLogin={openLogin} onSignup={openSignup} />
      {screen === 'admission' && (
        <AdmissionIntroModal
          onClose={closeModal}
          onStart={startApplication}
          onLogin={goLogin}
        />
      )}
      {enrollOpen && (
        <EnrollmentModal
          onClose={closeEnroll}
          term={landingData?.term}
          programs={landingData?.programs ?? []}
        />
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   SECTION STUBS — replaced one at a time
══════════════════════════════════════════════════════════════ */
function Topbar() {
  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="topbar-info">
          <span><i className="ti ti-map-pin" />Cantilan, Surigao del Sur, Philippines</span>
          <span><i className="ti ti-phone" />(086) 211-3000</span>
          <span><i className="ti ti-mail" />cantilan@nemsu.edu.ph</span>
        </div>
        <div className="topbar-auth">
          <span className="topbar-portal-pill">
            <i className="ti ti-lock" style={{ fontSize: 10 }} /> Portal access
          </span>
          <Link to="/login">Log in</Link>
          <span className="divider">·</span>
          <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
function Navbar({ scrolled, onEnroll, activeNav, onNavClick }) {
  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
      <div className="nav-inner">
        <a href="#home" className="brand" onClick={() => onNavClick('#home')}>
          <img src="/logo.png" alt="NEMSU" className="brand-logo" />
          <div className="brand-text">
            <div className="brand-name">NEMSUonePortal</div>
            <div className="brand-sub">Cantilan Campus · North Eastern Mindanao State University</div>
          </div>
        </a>
        <div className="nav-links">
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href} className={`nav-link${activeNav === l.href ? ' active' : ''}`}
              onClick={() => onNavClick(l.href)}>
              {l.label}
            </a>
          ))}
        </div>
        <button className="btn btn-primary nav-cta" onClick={onEnroll}>
          Apply now <i className="ti ti-arrow-right" />
        </button>
        <button className="burger" aria-label="Menu">
          <i className="ti ti-menu-2" />
        </button>
      </div>
    </nav>
  );
}
function Hero({ onEnroll, term }) {
  const isOpen = term != null ? term.enrollment_open : null;
  const year   = term?.year ?? '2025 – 2026';
  return (
    <section id="home" className="hero">
      <div className="hero-photo">
        <Img src={PHOTO.hero} alt="NEMSU Cantilan Campus" />
      </div>
      <div className="hero-content">
        <div className="hero-eyebrow">
          A.Y. {year}
          <span className="hero-status-pill">
            <span
              className="dot"
              style={isOpen === false
                ? { background:'#f87171', boxShadow:'0 0 0 4px rgba(248,113,113,.18)' }
                : {}}
            />
            {isOpen === false ? 'Enrollment closed' : 'Enrollment open'}
          </span>
        </div>
        <h1>
          A regional <em>university</em><br />
          built for the next<br />
          generation.
        </h1>
        <p className="hero-sub">
          NEMSU Cantilan Campus delivers quality higher education, applied research,
          and meaningful community service to northeastern Mindanao.
        </p>
        <div className="hero-actions">
          <button className="btn btn-onDark" onClick={onEnroll}>
            Apply for admission <i className="ti ti-arrow-right" />
          </button>
          <a href="#news" className="btn btn-onDark-ghost">
            Latest news &amp; updates
          </a>
        </div>
      </div>
      <div className="hero-scroll">
        <span>Scroll</span>
        <i className="ti ti-chevron-down" />
      </div>
    </section>
  );
}
function AudiencePortals({ onLogin, onEnroll }) {
  return (
    <section className="portals">
      <div className="portals-inner">
        <div className="portals-label">
          <div className="micro">Find your portal</div>
          <div className="lbl">I am a…</div>
        </div>
        {PORTALS.map(p => (
          <a
            key={p.name}
            href="#"
            onClick={e => { e.preventDefault(); (p.action === 'enroll' ? onEnroll : onLogin)(); }}
            className="portal"
          >
            <div className="portal-text">
              <div className="micro">{p.kind}</div>
              <div className="name">{p.name}</div>
            </div>
            <i className="ti ti-arrow-up-right" />
          </a>
        ))}
      </div>
    </section>
  );
}

function Spotlight({ content }) {
  const post = content || SPOTLIGHT_FALLBACK;
  const dateLabel = post.date || post.createdAt || '';

  return (
    <section className="spot">
      <div className="lp-wrap">
        <Reveal>
          <div className="spot-head">
            <div>
              <div className="eyebrow">In focus</div>
              <h2 className="h-section" style={{ marginTop: '1rem' }}>From the <em>Cantilan</em> Campus.</h2>
            </div>
          </div>
        </Reveal>
        <div className="spot-grid">
          <Reveal>
            <div className="spot-image" data-tag={post.tag}>
              <Img src={post.imageUrl} alt={post.title} />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="spot-body">
              <div className="spot-meta">{post.category}</div>
              <h3>{post.title}</h3>
              <p>{post.body}</p>
              <div className="spot-byline">{post.byline}{dateLabel ? ` · ${dateLabel}` : ''}</div>
              <Link to="/in-focus" className="btn-link" style={{ alignSelf: 'flex-start' }}>
                Read the full story <i className="ti ti-arrow-right" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
function InfoStrip() {
  const cells = [
    { icon: 'ti-calendar-event', label: 'Enrollment period', val: 'Jun 2 – Jun 20, 2025' },
    { icon: 'ti-building',       label: 'Registrar office',  val: 'Mon – Fri · 8:00 AM – 5:00 PM' },
    { icon: 'ti-map-pin',        label: 'Campus location',   val: 'Cantilan, Surigao del Sur' },
    { icon: 'ti-mail',           label: 'Contact',           val: 'cantilan@nemsu.edu.ph' },
  ];
  return (
    <div className="info-strip">
      <div className="info-inner">
        {cells.map(c => (
          <div key={c.label} className="info-cell">
            <i className={`ti ${c.icon}`} />
            <div>
              <div className="micro">{c.label}</div>
              <div className="val">{c.val}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function About({ content }) {
  const paragraphs = content?.paragraphs ?? [
    "The NEMSU Cantilan Campus is one of the key campuses of North Eastern Mindanao State University, located in the municipality of Cantilan in the province of Surigao del Sur. It serves students from Cantilan and surrounding municipalities, providing accessible and quality higher education to the community.",
    "The campus offers a wide range of undergraduate programs in technology, education, business, health sciences, and the arts, aligned with NEMSU's vision of producing globally competitive and morally upright graduates.",
  ];
  const pillars = content?.pillars ?? PILLARS;
  return (
    <section id="about" className="about">
      <div className="lp-wrap">
        <div className="about-grid">
          <Reveal>
            <div className="about-visual">
              <Img src={content?.imageUrl || PHOTO.about} alt="About NEMSU Cantilan" />
              <div className="about-badge">
                <div className="micro">{content?.badge_label || 'Accredited'}</div>
                <div className="v">{content?.badge_value || 'AACCUP Level II'}</div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="about-copy">
              <div className="eyebrow">{content?.eyebrow || 'About the campus'}</div>
              <h2 className="h-section">{content?.heading || <>A regional institution rooted in <em>community</em>, oriented toward <em>excellence</em>.</>}</h2>
              {paragraphs.map((para, i) => <p key={i}>{para}</p>)}
              <div className="pillars">
                {pillars.map(p => (
                  <div key={p.title} className="pillar">
                    <span className="num">- {p.num}</span>
                    <div className="title">{p.title}</div>
                    <div className="desc">{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
function Stats({ content }) {
  const items = content?.items ?? STATS;
  return (
    <section className="stats">
      <div className="stats-inner">
        <Reveal>
          <div className="stats-head">
            <div className="eyebrow on-dark">{content?.eyebrow || 'By the numbers'}</div>
            <h2 className="h-section on-dark" style={{ marginTop: '1.25rem' }}>
              {content?.heading || <>A campus that <em>scales</em> with the region it serves.</>}
            </h2>
          </div>
        </Reveal>
        <div className="stats-grid">
          {items.map((s, i) => (
            <StatCell key={s.lbl || i} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function VisionMission({ content }) {
  return (
    <section className="vm">
      <div className="lp-wrap">
        <Reveal>
          <div className="vm-head">
            <div className="eyebrow">{content?.eyebrow || 'Our purpose'}</div>
            <h2 className="h-section" style={{ marginTop: '1.25rem' }}>
              {content?.heading || <>Guided by a clear <em>vision</em> and a steady <em>mission</em>.</>}
            </h2>
          </div>
        </Reveal>
        <div className="vm-grid">
          <Reveal>
            <div className="vm-card">
              <span className="vm-num">- Vision</span>
              <h3>{content?.vision_title || <>A premier state university producing <em>globally competitive</em> graduates.</>}</h3>
              <p>{content?.vision_text || 'To produce morally upright graduates who are agents of change for sustainable national development, equipped with the knowledge and values to serve the community and the country.'}</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="vm-card">
              <span className="vm-num">- Mission</span>
              <h3>{content?.mission_title || <>Quality education, advanced research, and <em>community engagement</em>.</>}</h3>
              <p>{content?.mission_text || 'To provide quality higher technological and professional education, advance research and development, and render extension and production services responsive to the needs of the community in northeastern Mindanao.'}</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Programs({ programs, content }) {
  const PREVIEW_COUNT = 6;

  const list = programs?.length
    ? programs.map((p, i) => ({
        num:  String(i + 1).padStart(2, '0'),
        name: p.name,
        dept: p.department_name ?? p.department ?? p.dept ?? '',
        desc: p.description ?? p.desc ?? '',
      }))
    : PROGRAMS_STATIC;

  const visible = list.slice(0, PREVIEW_COUNT);
  const hasMore = list.length > PREVIEW_COUNT;

  return (
    <section id="programs" className="progs">
      <div className="lp-wrap">
        <Reveal>
          <div className="progs-head">
            <div>
              <div className="eyebrow">{content?.eyebrow || 'Academic programs'}</div>
              <h2 className="h-section" style={{ marginTop: '1rem' }}>
                {content?.heading || <>Undergraduate programs at <em>Cantilan Campus</em>.</>}
              </h2>
            </div>
            <Link to="/programs" className="btn-link">
              All programs{hasMore ? ` (${list.length})` : ''} <i className="ti ti-arrow-right" />
            </Link>
          </div>
        </Reveal>
        <div className="progs-grid">
          {visible.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.04}>
              <article className="prog">
                <div className="prog-num">- {p.num}</div>
                <i className="ti ti-arrow-up-right arrow" />
                <h4>{p.name}</h4>
                <div className="dept">{p.dept}</div>
                <p>{p.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
const LIFE_CLS  = ['life-a', 'life-b', 'life-c', 'life-d', 'life-e', 'life-f'];
const LIFE_KEYS = ['lifeA', 'lifeB', 'lifeC', 'lifeD', 'lifeE', 'lifeF'];
function lifeImages(l) {
  if (Array.isArray(l.images) && l.images.length) return l.images.filter(Boolean);
  if (l.imageUrl) return [l.imageUrl];
  return [];
}
function Life({ content }) {
  const [box, setBox] = useState(null); // { images, title }
  const items = (content?.items ?? LIFE).map((l, i) => {
    const imgs = lifeImages(l);
    return {
      ...l,
      cls: l.cls || LIFE_CLS[i % 6],
      images: imgs,
      src: imgs[0] || PHOTO[l.photoKey] || PHOTO[LIFE_KEYS[i % 6]],
    };
  });
  return (
    <section id="life" className="life">
      <div className="lp-wrap">
        <Reveal>
          <div className="life-head">
            <div>
              <div className="eyebrow">{content?.eyebrow || 'Campus life'}</div>
              <h2 className="h-section" style={{ marginTop: '1rem' }}>{content?.heading || <>Life at <em>Cantilan</em>.</>}</h2>
            </div>
            <Link to="/campus-life" className="btn-link">Explore campus <i className="ti ti-arrow-right" /></Link>
          </div>
        </Reveal>
        <div className="life-grid">
          {items.map((l, i) => (
            <button key={l.id || i} type="button" className={`life-item ${l.cls}`}
              onClick={() => l.images.length ? setBox({ images: l.images, title: l.title }) : null}>
              <Img src={l.src} alt={l.title} />
              {l.images.length > 1 && <span className="life-count"><i className="ti ti-photo" /> {l.images.length}</span>}
              <div className="meta">
                <div className="micro">{l.tag}</div>
                <div className="title">{l.title}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      {box && <Lightbox images={box.images} title={box.title} onClose={() => setBox(null)} />}
    </section>
  );
}

function Facilities({ content }) {
  const items = content?.items ?? FACILITIES;
  return (
    <section id="facilities" className="facs">
      <div className="lp-wrap">
        <Reveal>
          <div className="facs-head">
            <div className="eyebrow on-dark">{content?.eyebrow || 'Campus facilities'}</div>
            <h2 className="h-section on-dark" style={{ marginTop: '1.25rem' }}>
              {content?.heading || <>Built for <em>student success</em>.</>}
            </h2>
            <p>The Cantilan Campus provides modern facilities to support academic, research, and extracurricular activities, accessible to every student across all programs.</p>
          </div>
        </Reveal>
        <div className="facs-grid">
          {items.map((f, i) => (
            <Reveal key={f.name} delay={i * 0.05}>
              <article className="fac">
                <i className={`ti ${f.icon}`} />
                <h4>{f.name}</h4>
                <p>{f.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function newsToItem(n) {
  return {
    image: n.imageUrl || PHOTO[n.photoKey],
    meta: `${n.tag}${n.my ? ` · ${n.my.split(' ')[0]} ${n.day}, ${n.my.split(' ')[1]}` : ''}`,
    title: n.title,
    body: n.body,
  };
}

function News({ content }) {
  const items = content?.items ?? NEWS;
  const [active, setActive] = useState(null);
  return (
    <section id="news" className="news">
      <div className="lp-wrap">
        <Reveal>
          <div className="news-head">
            <div>
              <div className="eyebrow">{content?.eyebrow || 'News & updates'}</div>
              <h2 className="h-section" style={{ marginTop: '1rem' }}>
                {content?.heading || <>What's happening on <em>campus</em>.</>}
              </h2>
            </div>
            <Link to="/news" className="btn-link">All news <i className="ti ti-arrow-right" /></Link>
          </div>
        </Reveal>
        <div className="news-grid">
          {items.map((n, i) => (
            <Reveal key={n.id || i} delay={i * 0.06}>
              <button type="button" className="news-card" onClick={() => setActive(n)}>
                <div className="news-card-image">
                  <Img src={n.imageUrl || PHOTO[n.photoKey]} alt={n.title} />
                  <div className="news-card-tag">{n.tag}</div>
                </div>
                <div className="news-card-body">
                  <div className="news-card-date">{n.my?.split(' ')[0]} {n.day}, {n.my?.split(' ')[1]}</div>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                  <span className="read">Read more <i className="ti ti-arrow-right" /></span>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
      {active && <DetailModal onClose={() => setActive(null)} item={newsToItem(active)} />}
    </section>
  );
}
function CtaBand({ onEnroll, onLogin }) {
  return (
    <section className="cta">
      <div className="cta-inner">
        <div>
          <h2 className="h-section">Ready to begin your <em>journey</em>?</h2>
          <p>Submit your enrollment online for A.Y. 2025–2026. Whether you're an incoming freshman, transferee, shiftee, or returning student, you can apply in minutes.</p>
        </div>
        <div className="cta-actions">
          <button className="btn btn-gold" onClick={onEnroll}>
            Apply for admission <i className="ti ti-arrow-right" />
          </button>
          <button className="btn btn-onDark-ghost" onClick={onLogin}>
            <i className="ti ti-login" /> Student login
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer({ onEnroll, onLogin, onSignup }) {
  return (
    <footer className="footer">
      <div className="lp-wrap">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <img src="/logo.png" alt="NEMSU" />
              <div>
                <div className="footer-brand-name">NEMSUonePortal</div>
                <div className="footer-brand-sub">Cantilan Campus · NEMSU</div>
              </div>
            </div>
            <p className="footer-tagline">
              The official student portal of North Eastern Mindanao State University, Cantilan Campus.
              Centralized academic services for students, faculty, and staff.
            </p>
            <div className="footer-contact">
              <span><i className="ti ti-map-pin" />Cantilan, Surigao del Sur, Philippines</span>
              <span><i className="ti ti-phone" />(086) 211-3000</span>
              <span><i className="ti ti-mail" />cantilan@nemsu.edu.ph</span>
            </div>
          </div>
          <div>
            <h5>Portal</h5>
            <div className="footer-links">
              <a onClick={onLogin} style={{ cursor: 'pointer' }}>Log in</a>
              <a onClick={onSignup} style={{ cursor: 'pointer' }}>Sign up</a>
              <a onClick={onEnroll} style={{ cursor: 'pointer' }}>Apply for admission</a>
              <a href="#news">News &amp; updates</a>
            </div>
          </div>
          <div>
            <h5>About</h5>
            <div className="footer-links">
              <a href="#about">The campus</a>
              <a href="#programs">Programs</a>
              <a href="#facilities">Facilities</a>
              <a href="#life">Campus life</a>
            </div>
          </div>
          <div>
            <h5>Office hours</h5>
            <div className="footer-links">
              <span>Mon – Fri</span>
              <span>8:00 AM – 5:00 PM</span>
              <span>Closed on holidays</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 NEMSUonePortal · NEMSU Cantilan Campus. All rights reserved.</span>
          <div>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms &amp; Conditions</Link>
            <Link to="/cookies">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function DetailModal({ item, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!item) return null;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="lp-dtl" onClick={e => e.stopPropagation()}>
        <button className="lp-dtl-x" onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>
        {item.image && <div className="lp-dtl-img"><img src={item.image} alt={item.title || ''} /></div>}
        <div className="lp-dtl-body">
          {item.meta && <div className="lp-dtl-meta">{item.meta}</div>}
          {item.title && <h3>{item.title}</h3>}
          {item.sub && <div className="lp-dtl-sub">{item.sub}</div>}
          {item.body && <p>{item.body}</p>}
        </div>
      </div>
    </div>
  );
}

function AdmissionIntroModal({ onClose, onStart, onLogin }) {
  const steps = [
    { icon: 'ti-folder', t: 'Gather & upload your documents', d: 'Prepare your admission requirements (Form 138, PSA birth certificate, good moral, etc.) and upload them in the application.' },
    { icon: 'ti-checklist', t: 'We validate your documents', d: "The campus reviews your submission to confirm you're eligible for admission." },
    { icon: 'ti-mail-check', t: 'Get your entrance-exam invite', d: "You'll receive an email letting you know if you qualified for the next step: the college entrance examination." },
  ];
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-head-brand">
            <img src="/logo.png" alt="NEMSU" />
            <div>
              <div className="name">NEMSUonePortal</div>
              <div className="sub">Freshman admission</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="modal-body">
          <span className="adm-badge"><i className="ti ti-school" /> For incoming 1st-year college students</span>
          <h3 style={{ marginTop: '.9rem' }}>Apply for <em>admission</em> to NEMSU Cantilan.</h3>
          <p className="lead" style={{ marginBottom: '1.25rem' }}>
            This is for <strong>incoming first-year college students</strong> who want to enroll at the university.
            Here's how it works:
          </p>
          <div className="adm-steps">
            {steps.map((s, i) => (
              <div key={i} className="adm-step">
                <div className="adm-step-ico"><i className={`ti ${s.icon}`} /></div>
                <div>
                  <div className="adm-step-t">{s.t}</div>
                  <div className="adm-step-d">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="flow-btn-primary" style={{ marginTop: '1.5rem' }} onClick={onStart}>
            Start application <i className="ti ti-arrow-right" />
          </button>
          <p className="lead" style={{ fontSize: 12, marginTop: '1rem', textAlign: 'center' }}>
            Already a student with an account?{' '}
            <a onClick={onLogin} style={{ color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Log in instead</a>
          </p>
        </div>
        <div className="modal-foot">
          Need help? Contact <a href="mailto:cantilan@nemsu.edu.ph">cantilan@nemsu.edu.ph</a>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ENROLLMENT MODAL — 5-step pre-enrollment wizard (Section 17)
══════════════════════════════════════════════════════════════ */
function EnrollmentModal({ onClose, term, programs }) {
  const [step, setStep]       = useState(1);
  const [dir, setDir]         = useState('fwd');
  const type = 'freshman';    // this application is for incoming freshmen only
  const [done, setDone]       = useState(false);
  const [submitting, setSub]  = useState(false);
  const [refNum, setRefNum]   = useState('');
  const [files, setFiles]     = useState({});   // { itemId: File } — uploaded PDFs
  const [uploadErr, setUpErr] = useState('');
  const [checked, setChecked] = useState({});
  const [selSubj, setSelSubj] = useState(
    () => SUBJECTS.reduce((a, s) => ({ ...a, [s.code]: true }), {})
  );
  const [form, setForm] = useState({
    first: '', last: '', email: '', contact: '', dob: '', sex: 'Male',
    program: PROGRAMS_STATIC[0].name, year: '1st Year',
  });

  const progList = programs?.length
    ? programs.map(p => p.name)
    : PROGRAMS_STATIC.map(p => p.name);

  // Keep the selected program a valid, real program name so it maps to a
  // department (and reaches that department's encoder) on submit.
  useEffect(() => {
    if (progList.length && !progList.includes(form.program)) {
      setForm(p => ({ ...p, program: progList[0] }));
    }
  }, [programs]); // eslint-disable-line react-hooks/exhaustive-deps

  const update  = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggle  = id   => setChecked(p => ({ ...p, [id]: !p[id] }));
  const toggleS = code => setSelSubj(p => ({ ...p, [code]: !p[code] }));
  const totalUnits = SUBJECTS.filter(s => selSubj[s.code]).reduce((a, s) => a + s.units, 0);

  const go = n => { setDir(n > step ? 'fwd' : 'back'); setStep(n); };
  const back = () => step > 1 ? go(step - 1) : onClose();
  const next = () => step < 3 ? go(step + 1) : handleSubmit();

  const handleSubmit = async () => {
    setSub(true);
    let ref = `NEMSU-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000)).slice(0, 5)}`;
    try {
      const res = await api.post('/enrollment/public/pre-enroll/', {
        student_type: type, first_name: form.first, last_name: form.last,
        email: form.email, contact_number: form.contact,
        date_of_birth: form.dob || null, sex: form.sex,
        program_name: form.program, year_level: YEAR_LEVEL_MAP[form.year] || 1,
      });
      if (res.data?.reference_number) ref = res.data.reference_number;
      // Attach the uploaded document PDFs to the new application.
      const pid = res.data?.pending_id;
      if (pid) {
        for (const { file, label } of Object.values(files)) {
          const fd = new FormData();
          fd.append('requirement_label', label);
          fd.append('file', file);
          try { await api.post(`/enrollment/public/pre-enroll/${pid}/upload/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); }
          catch (_) {}
        }
      }
    } catch (_) {}
    setRefNum(ref);
    setSub(false);
    setDone(true);
  };

  const reqs = ALL_REQUIREMENTS[type] || [];

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        className={done ? 'modal' : 'modal modal--wide'}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-head-brand">
            <img src="/logo.png" alt="NEMSU" />
            <div>
              <div className="name">NEMSUonePortal</div>
              <div className="sub">{done ? 'Application received' : 'Freshman admission'}</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <i className="ti ti-x" />
          </button>
        </div>

        {done ? (
          <div className="modal-body modal-body--center">
            <div className="success-icon"><i className="ti ti-check" /></div>
            <h3>Application <em>received</em>.</h3>
            <p className="lead">Thank you for applying to NEMSU Cantilan Campus. The campus will now validate your uploaded documents.</p>
            <div style={{ display:'inline-block', margin:'1rem 0 1.5rem', padding:'1rem 2rem', background:'var(--warm)', border:'1px solid var(--line)' }}>
              <div style={{ fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--gold)', fontWeight:600, marginBottom:4 }}>Reference number</div>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:'var(--ink)' }}>{refNum}</div>
            </div>
            <p className="lead" style={{ fontSize:12, marginBottom:'1.5rem' }}>
              You'll receive an email at <strong>{form.email || 'your email address'}</strong> letting you know if you qualified for the next step: the college entrance examination. Keep this reference number for your records.
            </p>
            <button className="flow-btn-primary" style={{ maxWidth:220, margin:'0 auto' }} onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <div className="wiz">
            <aside className="wiz-side">
              <div className="wiz-side-head">Steps · {step}/3</div>
              <div className="wiz-steps">
                {FRESHMAN_STEPS.map((label, i) => {
                  const n = i + 1, active = n === step, done = n < step;
                  return (
                    <div key={n} className={`wiz-step${active ? ' active' : ''}${done ? ' done' : ''}`}>
                      <div className="wiz-step-num">
                        {done ? <i className="ti ti-check" style={{ fontSize: 11 }} /> : n}
                      </div>
                      <span>{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="wiz-side-foot">
                Need help with your application?
                <a href="mailto:cantilan@nemsu.edu.ph">cantilan@nemsu.edu.ph</a>
              </div>
            </aside>

            <main className="wiz-main">
              <div className="wiz-progress">
                <div style={{ width: `${(step / 3) * 100}%` }} />
              </div>

              <div style={panel(dir)}>
                {/* Step 1 — Personal info */}
                {step === 1 && (
                  <>
                    <h4>Personal information</h4>
                    <p className="wiz-sub">Enter your details as they appear on official documents.</p>
                    <div className="flow-form" style={{ gap: '1rem' }}>
                      <div style={fRow}>
                        <div className="flow-field">
                          <label style={fLabel}>First name</label>
                          <input style={fInput} value={form.first} onChange={e => update('first', e.target.value)} placeholder="Juan" />
                        </div>
                        <div className="flow-field">
                          <label style={fLabel}>Last name</label>
                          <input style={fInput} value={form.last} onChange={e => update('last', e.target.value)} placeholder="Dela Cruz" />
                        </div>
                      </div>
                      <div className="flow-field">
                        <label style={fLabel}>Email address</label>
                        <input style={fInput} type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="juan.delacruz@nemsu.edu.ph" />
                      </div>
                      <div style={fRow}>
                        <div className="flow-field">
                          <label style={fLabel}>Contact number</label>
                          <input style={fInput} value={form.contact} onChange={e => update('contact', e.target.value)} placeholder="09171234567" />
                        </div>
                        <div className="flow-field">
                          <label style={fLabel}>Date of birth</label>
                          <input style={fInput} type="date" value={form.dob} onChange={e => update('dob', e.target.value)} />
                        </div>
                      </div>
                      <div style={fRow}>
                        <div className="flow-field">
                          <label style={fLabel}>Sex</label>
                          <select style={fInput} value={form.sex} onChange={e => update('sex', e.target.value)}>
                            <option>Male</option>
                            <option>Female</option>
                          </select>
                        </div>
                        <div className="flow-field">
                          <label style={fLabel}>Year level</label>
                          <select style={fInput} value={form.year} onChange={e => update('year', e.target.value)}>
                            {Object.keys(YEAR_LEVEL_MAP).map(y => <option key={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flow-field">
                        <label style={fLabel}>Program / course</label>
                        <select style={fInput} value={form.program} onChange={e => update('program', e.target.value)}>
                          {progList.map(n => <option key={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* Step 2 — Document uploads */}
                {step === 2 && (
                  <>
                    <h4>Upload your documents</h4>
                    <p className="wiz-sub">Upload a clear <strong>PDF</strong> of each document (max 10&nbsp;MB each). The campus will validate them for admission.</p>
                    {uploadErr && (
                      <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', color:'#dc2626', fontSize:12, padding:'8px 12px', marginBottom:12 }}>{uploadErr}</div>
                    )}
                    {reqs.map(group => (
                      <div key={group.group} style={{ marginBottom: '1.25rem' }}>
                        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--muted)', marginBottom:8 }}>
                          {group.group}
                        </div>
                        {group.items.map(item => {
                          const f = files[item.id];
                          return (
                            <div key={item.id} className="doc-row">
                              <div className="doc-info">
                                <span className="doc-label">{item.label}</span>
                                <span style={unitPill}>{item.tag}</span>
                              </div>
                              <label className={`doc-upload${f ? ' has-file' : ''}`}>
                                <input
                                  type="file" accept="application/pdf" style={{ display:'none' }}
                                  onChange={e => {
                                    const file = e.target.files?.[0]; if (e.target) e.target.value = '';
                                    if (!file) return;
                                    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setUpErr(`${item.label}: only PDF files are accepted.`); return; }
                                    if (file.size > 10 * 1024 * 1024) { setUpErr(`${item.label}: file must be under 10 MB.`); return; }
                                    setUpErr('');
                                    setFiles(p => ({ ...p, [item.id]: { file, label: item.label } }));
                                  }}
                                />
                                {f
                                  ? <><i className="ti ti-file-check" /> {f.file.name.length > 24 ? f.file.name.slice(0, 22) + '…' : f.file.name}</>
                                  : <><i className="ti ti-upload" /> Upload PDF</>}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </>
                )}

                {/* Step 3 — Review & confirm */}
                {step === 3 && (
                  <>
                    <h4>Review &amp; confirm</h4>
                    <p className="wiz-sub">Verify your details before submitting. Go back to edit any field.</p>
                    <div style={{ border:'1px solid var(--line)', background:'var(--warm)', marginBottom:12 }}>
                      {[
                        ['Applying as',   'Incoming freshman'],
                        ['Full name',     `${form.first} ${form.last}`.trim() || '-'],
                        ['Email',         form.email  || '-'],
                        ['Contact',       form.contact || '-'],
                        ['Date of birth', form.dob    || '-'],
                        ['Sex',           form.sex],
                        ['Program',       form.program],
                        ['Year level',    form.year],
                        ['Campus',        'NEMSU Cantilan Campus'],
                        ['Academic year', `${term?.year ?? '2025–2026'}, 1st Semester`],
                      ].map((r, i, arr) => (
                        <div key={r[0]} style={{ display:'flex', justifyContent:'space-between', padding:'10px 16px', fontSize:13, borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                          <span style={{ color:'var(--muted)' }}>{r[0]}</span>
                          <span style={{ color:'var(--ink)', fontWeight:500 }}>{r[1]}</span>
                        </div>
                      ))}
                    </div>
                    <div style={hintBox}>
                      <i className="ti ti-info-circle" style={{ fontSize:16, flexShrink:0, marginTop:1 }} />
                      <span style={{ fontSize:12 }}>After submitting, the campus validates your documents and emails you if you qualify for the entrance examination.</span>
                    </div>
                  </>
                )}
              </div>

              <div className="wiz-actions">
                <button className="wiz-btn" onClick={back}>
                  <i className="ti ti-arrow-left" /> {step === 1 ? 'Cancel' : 'Back'}
                </button>
                <button className="wiz-btn primary" onClick={next} disabled={submitting}>
                  {step === 3
                    ? (submitting ? 'Submitting…' : <><i className="ti ti-check" /> Submit application</>)
                    : <>Continue <i className="ti ti-arrow-right" /></>}
                </button>
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SHARED STYLE TOKENS — enrollment modal micro-components
══════════════════════════════════════════════════════════════ */
const YEAR_LEVEL_MAP = { '1st Year':1, '2nd Year':2, '3rd Year':3, '4th Year':4 };
const panel      = dir => ({ display:'flex', flexDirection:'column', flex:1, animation:`${dir === 'back' ? 'lp-slideInLeft' : 'lp-slideInRight'} .22s cubic-bezier(.4,0,.2,1)` });
const fRow       = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 };
const fLabel     = { fontSize:11, fontWeight:700, color:'#5a7a9a', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'.05em' };
const fInput     = { width:'100%', padding:'9px 12px', border:'1px solid #d0dcea', borderRadius:8, fontSize:13, background:'#fff', color:'#0a1628', outline:'none', boxSizing:'border-box' };
const hintBox    = { padding:'12px 14px', border:'1px solid #c8d8f0', borderRadius:8, background:'#f0f6ff', fontSize:12, color:'#2a4a6e', display:'flex', gap:8, alignItems:'flex-start' };
const unitPill   = { fontSize:12, padding:'4px 12px', borderRadius:99, background:'#eef3fb', border:'.5px solid #c8d8f0', color:'#5a7a9a' };
