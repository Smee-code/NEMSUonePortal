import { useState, useCallback, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import ScrollMemory from '../ScrollMemory';
import { useSupport, requestSelfPasswordReset } from '../SupportModal';
import { useAuth } from '../../context/AuthContext';
import { FacultyShellCtx } from '../../context/FacultyShellContext';
import api from '../../api/axios';
import useNotifications from '../../hooks/useNotifications';
import NotificationList from '../NotificationList';

/* ── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
  /* Faculty design tokens */
  :root{
    --ink:#0a1628;--ink-2:#1e3a5f;--gold:#b89043;--gold-soft:#d9b96b;
    --gold-tint:rgba(184,144,67,.12);--green:#059669;--green-tint:rgba(5,150,105,.1);
    --red:#dc2626;--red-tint:rgba(220,38,38,.1);--amber:#d97706;
    --amber-tint:rgba(251,191,36,.15);--muted:#64748b;--faint:#94a3b8;
    --line:#e2e8f0;--line-soft:#f1f5f9;--warm:#fafaf9;--cool:#f0f4f8;
    /* aliases so shared components using --adm-* tokens still resolve */
    --adm-ink:#0a1628;--adm-ink-2:#1e3a5f;--adm-gold:#b89043;
    --adm-gold-soft:#d9b96b;--adm-gold-tint:#f5edd9;
    --adm-muted:#64748b;--adm-faint:#94a3b8;
    --adm-line:#e2e8f0;--adm-line-soft:#f1f5f9;
    --adm-warm:#fafaf9;--adm-cool:#f0f4f8;--adm-cool-2:#eef1f7;
    --adm-paper:#ffffff;--adm-green:#059669;--adm-green-tint:rgba(5,150,105,.1);
    --adm-red:#dc2626;--adm-red-tint:rgba(220,38,38,.1);
    --adm-amber:#d97706;--adm-amber-tint:rgba(251,191,36,.15);
  }

  /* Shell */
  .fac-shell{display:flex;height:100vh;overflow:hidden;background:var(--warm);
    font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}

  /* Sidebar */
  .fac-sb{width:232px;flex-shrink:0;background:var(--ink);color:#fff;display:flex;
    flex-direction:column;height:100%;overflow:hidden}
  .fac-sb-brand{padding:1.5rem 1.25rem 1.25rem;border-bottom:1px solid rgba(255,255,255,.08);
    display:flex;align-items:center;gap:.875rem;flex-shrink:0}
  .fac-sb-brand img{width:36px;height:36px;border-radius:4px;object-fit:contain;
    background:rgba(255,255,255,.06);padding:2px}
  .fac-sb-brand-name{font-size:15px;font-weight:600;color:#fff;letter-spacing:-.01em;line-height:1.2;white-space:nowrap}
  .fac-sb-brand-sub{font-size:9px;letter-spacing:.18em;text-transform:uppercase;
    color:var(--gold-soft);margin-top:3px;font-weight:600}
  .fac-sb-nav{flex:1;padding:.75rem 0;overflow-y:auto}
  .fac-sb-nav::-webkit-scrollbar{width:4px}
  .fac-sb-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
  .fac-sb-group-label{font-size:9px;letter-spacing:.18em;text-transform:uppercase;
    color:rgba(255,255,255,.38);font-weight:600;padding:1.25rem 1.25rem .4rem}
  .fac-sb-link{display:flex;align-items:center;gap:10px;padding:9px 1.25rem;font-size:13px;
    color:rgba(255,255,255,.62);cursor:pointer;border-left:2px solid transparent;
    text-decoration:none;transition:background .15s,color .15s,border-color .15s;
    font-family:inherit;font-weight:500}
  .fac-sb-link:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.88)}
  .fac-sb-link.active{background:rgba(184,144,67,.12);color:#fff;
    border-left-color:var(--gold);font-weight:600}
  .fac-sb-link i{font-size:16px;flex-shrink:0}
  .fac-sb-badge{margin-left:auto;font-size:10px;background:var(--gold);color:#fff;
    padding:1px 7px;font-weight:700;letter-spacing:.06em}
  .fac-sb-foot{padding:1rem 1.25rem;border-top:1px solid rgba(255,255,255,.08);
    display:flex;align-items:center;gap:8px;font-size:11px;flex-shrink:0}
  .fac-sb-foot i{color:var(--gold-soft);font-size:13px}
  .fac-sb-foot-campus{color:#fff;font-weight:500}
  .fac-sb-foot-loc{font-size:10px;color:rgba(255,255,255,.38)}

  /* Main area */
  .fac-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;
    background:var(--warm)}

  /* Topbar */
  .fac-topbar{height:54px;background:#fff;border-bottom:1px solid var(--line);
    display:flex;align-items:center;padding:0 2rem;gap:1rem;flex-shrink:0}
  .fac-crumbs{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:8px}
  .fac-crumbs i{font-size:10px}
  .fac-crumbs .here{color:var(--ink);font-weight:500}
  .fac-topbar-search{flex:1;max-width:320px;position:relative;display:flex;align-items:center}
  .fac-topbar-search i{position:absolute;left:12px;font-size:15px;color:var(--faint);pointer-events:none}
  .fac-topbar-search input{width:100%;padding:8px 14px 8px 36px;background:var(--cool);
    border:1px solid transparent;font:13px/1.4 'Inter',sans-serif;color:var(--ink);outline:none}
  .fac-topbar-search input:focus{border-color:var(--line);background:#fff}
  .fac-topbar-search input::placeholder{color:var(--faint)}
  .fac-topbar-actions{display:flex;align-items:center;gap:.75rem;margin-left:auto}
  .fac-term-chip{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;
    font-size:12px;color:var(--ink);border:1px solid var(--line);font-weight:500;white-space:nowrap}
  .fac-term-chip i{color:var(--gold);font-size:13px}
  .fac-icon-btn{width:34px;height:34px;display:flex;align-items:center;justify-content:center;
    border:1px solid var(--line);background:#fff;cursor:pointer;color:var(--ink);position:relative;
    transition:border-color .15s}
  .fac-icon-btn i{font-size:17px}
  .fac-icon-btn:hover{border-color:var(--ink)}
  .fac-icon-btn .fac-dot{position:absolute;top:6px;right:6px;width:6px;height:6px;
    border-radius:50%;background:var(--red)}
  .fac-user-chip{display:flex;align-items:center;gap:9px;padding:4px 12px 4px 4px;
    border:1px solid var(--line);background:#fff;cursor:pointer;transition:border-color .15s}
  .fac-user-chip:hover{border-color:var(--ink)}
  .fac-user-avatar{width:28px;height:28px;background:var(--ink);color:#fff;display:flex;
    align-items:center;justify-content:center;font-size:10px;font-weight:600;
    letter-spacing:.04em;flex-shrink:0}
  .fac-user-name{font-size:12px;font-weight:600;color:var(--ink);max-width:110px;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fac-user-role{font-size:10px;color:var(--muted);text-transform:capitalize;letter-spacing:.04em}
  .fac-user-chip > i{font-size:12px;color:var(--faint)}

  /* Body / scroll area */
  .fac-body{flex:1;overflow-y:auto;padding:1.75rem 2rem 2.5rem}

  /* Toast */
  .fac-toast-host{position:fixed;bottom:1.5rem;right:1.5rem;z-index:1100;
    display:flex;flex-direction:column;gap:8px;pointer-events:none}
  .fac-toast{pointer-events:auto;background:var(--ink);color:#fff;padding:12px 16px 12px 12px;
    min-width:280px;max-width:380px;display:flex;align-items:flex-start;gap:12px;
    border-left:3px solid var(--gold);animation:fac-toast-in .25s cubic-bezier(.4,0,.2,1)}
  .fac-toast.success{border-left-color:var(--green)}
  .fac-toast.warn{border-left-color:var(--amber)}
  .fac-toast.error{border-left-color:var(--red)}
  .fac-toast-icon{width:28px;height:28px;display:flex;align-items:center;justify-content:center;
    background:rgba(255,255,255,.08);flex-shrink:0;color:var(--gold-soft)}
  .fac-toast.success .fac-toast-icon{color:#5dd6a1}
  .fac-toast.warn .fac-toast-icon{color:#f0c878}
  .fac-toast.error .fac-toast-icon{color:#e88b78}
  .fac-toast-icon i{font-size:14px}
  .fac-toast-body{flex:1;min-width:0;line-height:1.45}
  .fac-toast-msg{font-size:13px;font-weight:500}
  .fac-toast-sub{font-size:11px;color:rgba(255,255,255,.6);margin-top:2px}
  @keyframes fac-toast-in{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}

  /* Drawer */
  .fac-drawer-back{position:fixed;inset:0;background:rgba(10,22,40,.55);
    backdrop-filter:blur(6px);z-index:1050;animation:fac-fade-in .2s ease}
  @keyframes fac-fade-in{from{opacity:0}to{opacity:1}}
  @keyframes fac-drawer-in{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}
  .fac-drawer{position:fixed;top:0;right:0;bottom:0;width:480px;max-width:92vw;
    background:#fff;z-index:1051;display:flex;flex-direction:column;
    animation:fac-drawer-in .28s cubic-bezier(.4,0,.2,1);
    box-shadow:-20px 0 40px -20px rgba(10,22,40,.25)}
  .fac-drawer-head{padding:1.5rem 1.75rem;border-bottom:1px solid var(--line);
    display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0}
  .fac-drawer-head h3{font-weight:500;font-size:24px;letter-spacing:-.015em;color:var(--ink)}
  .fac-drawer-sub{font-size:12px;color:var(--muted);margin-top:4px}
  .fac-drawer-body{padding:1.5rem 1.75rem;overflow-y:auto;flex:1;
    display:flex;flex-direction:column;gap:1.25rem}
  .fac-drawer-foot{padding:1rem 1.75rem;border-top:1px solid var(--line);
    background:var(--warm);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0}
  .fac-notif-row{display:grid;grid-template-columns:auto 1fr auto;gap:12px;
    align-items:flex-start;padding:14px 0;border-bottom:1px solid var(--line-soft)}
  .fac-notif-row:last-child{border-bottom:none}
  .fac-notif-dot{width:8px;height:8px;background:var(--gold);border-radius:50%;margin-top:6px;flex-shrink:0}
  .fac-notif-dot.read{background:var(--line)}
  .fac-notif-msg{font-size:13px;color:var(--ink);line-height:1.55}
  .fac-notif-meta{font-size:11px;color:var(--muted);margin-top:2px}
  .fac-notif-time{font-size:11px;color:var(--faint);white-space:nowrap}
  .fac-menu{display:flex;flex-direction:column}
  .fac-menu-item{display:flex;align-items:center;gap:12px;padding:12px 0;font-size:13px;
    color:var(--ink);cursor:pointer;border-bottom:1px solid var(--line-soft);
    transition:padding-left .15s;background:none;border-left:0;border-right:0;border-top:0;
    font-family:inherit;text-align:left;width:100%}
  .fac-menu-item:hover{padding-left:8px;color:var(--ink-2)}
  .fac-menu-item:last-child{border-bottom:none}
  .fac-menu-item i{font-size:16px;color:var(--muted);width:18px;text-align:center;flex-shrink:0}
  .fac-menu-item.danger{color:var(--red)}
  .fac-menu-item.danger i{color:var(--red)}
  .fac-avatar-lg{width:48px;height:48px;background:var(--gold);color:#fff;display:flex;
    align-items:center;justify-content:center;font-size:14px;font-weight:600;
    flex-shrink:0;letter-spacing:.04em}

  /* ── Shared page primitives ─────────────────────────────────────────────── */
  .page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;
    padding-bottom:1.5rem;border-bottom:1px solid var(--line);margin-bottom:1.5rem;flex-wrap:wrap}
  .page-head .eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;
    color:var(--gold);font-weight:600;margin-bottom:.5rem;display:inline-flex;
    align-items:center;gap:10px}
  .page-head .eyebrow::before{content:"";width:24px;height:1px;background:var(--gold)}
  .page-head h2{font-family:'Inter',-apple-system,sans-serif;font-weight:500;font-size:38px;
    letter-spacing:-.02em;line-height:1.05;color:var(--ink)}
  .page-head h2 em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--ink-2);font-weight:400}
  .page-head .sub{font-size:14px;color:var(--muted);margin-top:6px;max-width:540px;line-height:1.55}
  .page-head .actions{display:flex;gap:8px;flex-shrink:0;align-self:flex-start;margin-top:.5rem}
  .sec-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:1rem}
  .sec-head h3{font-family:'Inter',sans-serif;font-weight:500;font-size:22px;
    letter-spacing:-.01em;color:var(--ink)}
  .sec-head h3 em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--ink-2);font-weight:400}
  .sec-head .sub{font-size:12px;color:var(--muted);margin-top:4px}
  .sec-action{display:inline-flex;align-items:center;font-size:12px;font-weight:600;
    color:var(--ink);background:none;border:1px solid var(--line);cursor:pointer;
    padding:6px 12px;font-family:inherit;gap:5px;transition:border-color .15s}
  .sec-action:hover{border-color:var(--ink)}
  /* Buttons */
  .btn-pri{padding:9px 16px;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);background:var(--ink);color:#fff;border:1px solid var(--ink);
    font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;
    display:inline-flex;align-items:center;gap:6px;font-family:inherit;transition:background .15s}
  .btn-pri:hover{background:#000}
  .btn-pri:disabled{opacity:.5;cursor:not-allowed}
  .btn-pri i{font-size:14px}
  .btn-sec{padding:9px 14px;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);background:#fff;color:var(--ink);border:1px solid var(--line);
    font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;
    display:inline-flex;align-items:center;gap:6px;font-family:inherit;transition:border-color .15s}
  .btn-sec:hover{border-color:var(--ink)}
  .btn-sec:disabled{opacity:.5;cursor:not-allowed}
  .btn-sec i{font-size:14px}
  .btn-ghost{padding:5px 8px;background:transparent;color:var(--muted);border:none;
    cursor:pointer;font-family:inherit;font-size:12px;display:inline-flex;
    align-items:center;gap:4px}
  .btn-ghost:hover{color:var(--ink)}
  /* Toolbar */
  .toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:1.25rem}
  .toolbar-search{flex:1;max-width:380px;min-width:220px;position:relative;
    display:flex;align-items:center}
  .toolbar-search i{position:absolute;left:12px;color:var(--faint);font-size:15px;pointer-events:none}
  .toolbar-search input{width:100%;padding:9px 14px 9px 34px;background:#fff;
    border:1px solid var(--line);outline:none;font:13px/1.4 'Inter',sans-serif;color:var(--ink)}
  .toolbar-search input:focus{border-color:var(--ink)}
  .toolbar select{padding:9px 12px;background:#fff;border:1px solid var(--line);outline:none;
    font:13px/1.4 'Inter',sans-serif;color:var(--ink);font-family:inherit}
  .toolbar .label{font-size:11px;color:var(--muted);font-weight:500;letter-spacing:.04em;margin-right:4px}
  /* Stat row */
  .stat-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0;
    background:#fff;border:1px solid var(--line);margin-bottom:1.5rem}
  .stat-row .stat{padding:1.25rem 1.5rem;border-right:1px solid var(--line)}
  .stat-row .stat:last-child{border-right:none}
  .stat-row .stat .num{font-family:'Inter',sans-serif;font-weight:500;font-size:32px;
    line-height:1;color:var(--ink);letter-spacing:-.02em}
  .stat-row .stat .num.green{color:var(--green)}
  .stat-row .stat .num.amber{color:var(--amber)}
  .stat-row .stat .num.red{color:var(--red)}
  .stat-row .stat .lbl{font-size:11px;letter-spacing:.12em;text-transform:uppercase;
    color:var(--muted);font-weight:600;margin-top:8px}
  /* Table */
  .table-wrap{border:1px solid var(--line);overflow-x:auto;-webkit-overflow-scrolling:touch}
  .table{width:100%;border-collapse:collapse;background:#fff}
  .table thead th{font-size:10px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--muted);font-weight:600;text-align:left;padding:14px 18px;
    border-bottom:1px solid var(--line);background:var(--warm)}
  .table tbody td{padding:14px 18px;font-size:13px;color:var(--ink);
    border-bottom:1px solid var(--line-soft);vertical-align:middle}
  .table tbody tr:last-child td{border-bottom:none}
  .table tbody tr:hover{background:var(--warm)}
  .table .num,.table td.num{font-variant-numeric:tabular-nums}
  .table td.muted{color:var(--muted);font-size:12px}
  /* Tags */
  .tag{display:inline-flex;align-items:center;gap:5px;font-size:10px;letter-spacing:.1em;
    text-transform:uppercase;font-weight:600;padding:3px 8px}
  .tag.status-active{background:var(--green-tint);color:var(--green)}
  .tag.status-unverified{background:#f3f4f6;color:var(--muted)}
  .tag.pending{background:var(--amber-tint);color:var(--amber)}
  .tag.outline{background:transparent;border:1px solid var(--line);color:var(--muted)}
  /* Avatar */
  .avatar{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;
    background:var(--ink);color:#fff;font-size:11px;font-weight:600;
    flex-shrink:0;letter-spacing:.04em}
  .avatar.sm{width:26px;height:26px;font-size:10px}
  .avatar.gold{background:var(--gold)}
  .row-user{display:flex;align-items:center;gap:12px}
  .row-user .meta{min-width:0}
  .row-user .name{font-size:13px;font-weight:500;color:var(--ink);line-height:1.3}
  /* Health bar */
  .health-bar{height:4px;background:var(--line);overflow:hidden}
  .health-bar-fill{height:100%;transition:width .4s ease}
  /* Pagination */
  .pagination{display:flex;justify-content:space-between;align-items:center;
    padding:14px 18px;background:var(--warm);border-top:1px solid var(--line)}
  .pagination .count{font-size:12px;color:var(--muted)}
  .pagination .controls{display:flex;gap:6px}
  .pagination button{padding:6px 10px;font-size:12px;border:1px solid var(--line);
    background:#fff;cursor:pointer;color:var(--ink);font-family:inherit;transition:border-color .15s}
  .pagination button:hover:not(:disabled){border-color:var(--ink)}
  .pagination button:disabled{opacity:.4;cursor:not-allowed}
  /* Info section */
  .info-section{background:#fff;border:1px solid var(--line);margin-bottom:1.5rem}
  .info-section-head{padding:1rem 1.5rem;border-bottom:1px solid var(--line);
    background:var(--warm);display:flex;justify-content:space-between;align-items:center}
  .info-section-head h4{font-size:11px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--ink);font-weight:600}
  .info-row{display:flex;justify-content:space-between;align-items:baseline;
    padding:.75rem 1.5rem;border-bottom:1px solid var(--line-soft)}
  .info-row:last-child{border-bottom:none}
  .info-row .lbl{font-size:12px;color:var(--muted)}
  .info-row .val{font-size:13px;color:var(--ink);font-weight:500}
  /* Empty state */
  .empty-state{text-align:center;padding:4rem 2rem;background:#fff;border:1px solid var(--line)}
  .empty-state i{font-size:48px;color:var(--faint);display:block;margin-bottom:1rem}
  .empty-state .t{font-size:16px;font-weight:600;color:var(--ink);margin-bottom:.5rem}
  .empty-state .d{font-size:13px;color:var(--muted);max-width:320px;margin:0 auto;line-height:1.55}
  /* Card */
  .card{background:#fff;border:1px solid var(--line);padding:1.5rem}
  .card-head{display:flex;justify-content:space-between;align-items:center;
    margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--line-soft)}
  .card-head h4{font-family:'Inter',sans-serif;font-weight:500;font-size:18px;
    color:var(--ink);letter-spacing:-.005em}
  .card-head h4 span{display:block;font-size:11px;color:var(--muted);font-weight:400;
    letter-spacing:.04em;margin-top:3px}
  /* Row layout */
  .row-21{display:grid;grid-template-columns:2fr 1fr;gap:1.5rem}
  /* Welcome banner */
  .welcome{background:var(--ink);color:#fff;padding:2rem 2.5rem;margin-bottom:1.75rem;
    display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1.5rem}
  .welcome-name{font-size:11px;letter-spacing:.16em;text-transform:uppercase;
    color:var(--gold-soft);font-weight:600;margin-bottom:10px}
  .welcome-greeting{font-family:'Inter',sans-serif;font-weight:500;font-size:32px;
    letter-spacing:-.02em;line-height:1.15;color:#fff}
  .welcome-greeting em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--gold);font-weight:400}
  .welcome-sub{font-size:13px;color:rgba(255,255,255,.6);margin-top:8px;line-height:1.5}
  .welcome-stats{display:flex;gap:2rem;flex-shrink:0}
  .welcome-stat .n{font-family:'Inter',sans-serif;font-weight:500;font-size:32px;
    color:#fff;letter-spacing:-.02em;line-height:1}
  .welcome-stat .l{font-size:11px;color:rgba(255,255,255,.5);margin-top:4px;
    letter-spacing:.08em;text-transform:uppercase}
  .welcome-stat .l em{color:var(--gold-soft);font-style:normal}
  /* KPI strip */
  .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:0;background:#fff;
    border:1px solid var(--line);margin-bottom:1.75rem}
  .kpi{padding:1.25rem 1.5rem;border-right:1px solid var(--line);position:relative;overflow:hidden}
  .kpi:last-child{border-right:none}
  .kpi-eyebrow{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);
    font-weight:600;margin-bottom:.75rem;display:flex;align-items:center;gap:6px}
  .kpi-icon{width:28px;height:28px;background:var(--cool);display:flex;
    align-items:center;justify-content:center;flex-shrink:0}
  .kpi-icon i{font-size:14px;color:var(--ink)}
  .kpi-val{font-family:'Inter',sans-serif;font-weight:500;font-size:36px;
    color:var(--ink);letter-spacing:-.02em;line-height:1}
  .kpi-sub{font-size:11px;color:var(--muted);margin-top:6px}
  .kpi-corner{position:absolute;bottom:-20px;right:-16px;font-size:80px;color:var(--line)}
  /* Quick actions */
  .quick-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;
    background:var(--line);border:1px solid var(--line);margin-bottom:1.75rem}
  .quick-action{background:#fff;padding:1.5rem;display:flex;flex-direction:column;
    gap:.75rem;cursor:pointer;transition:background .15s;text-decoration:none;color:inherit}
  .quick-action:hover{background:var(--warm)}
  .quick-action-icon{width:44px;height:44px;background:var(--cool);display:flex;
    align-items:center;justify-content:center}
  .quick-action-icon i{font-size:22px;color:var(--ink)}
  .quick-action-label{font-size:13px;font-weight:600;color:var(--ink)}
  .quick-action-sub{font-size:11px;color:var(--muted);line-height:1.4}
  /* Footer note */
  .foot-note{display:flex;justify-content:space-between;align-items:center;font-size:11px;
    color:var(--faint);padding:.75rem 0;border-top:1px solid var(--line-soft)}
  .foot-note .live{display:flex;align-items:center;gap:6px}
  .foot-note .dot{width:6px;height:6px;border-radius:50%;background:var(--green);
    animation:fac-pulse 2s ease-in-out infinite}
  @keyframes fac-pulse{0%,100%{opacity:1}50%{opacity:.4}}
  /* Form inputs (for grade encoding) */
  .form-input{padding:9px 12px;font:13px/1.4 'Inter',sans-serif;color:var(--ink);
    background:#fff;border:1px solid var(--line);outline:none;font-family:inherit}
  .form-input:focus{border-color:var(--ink)}
  /* Dropdown */
  .dropdown{position:relative;display:inline-block}
  .dropdown-menu{position:absolute;top:100%;right:0;margin-top:4px;z-index:50;
    background:#fff;border:1px solid var(--line);min-width:180px;
    box-shadow:0 8px 24px -8px rgba(10,22,40,.18)}
  .dropdown-item{display:flex;align-items:center;gap:10px;padding:10px 14px;font-size:13px;
    color:var(--ink);background:none;border:none;width:100%;text-align:left;
    cursor:pointer;font-family:inherit}
  .dropdown-item:hover{background:var(--warm)}
  .dropdown-item.danger{color:var(--red)}
  .dropdown-item i{font-size:14px;color:var(--muted)}
  .dropdown-sep{height:1px;background:var(--line-soft);margin:4px 0}
  /* ── Responsive: mobile navigation + layout collapse ───────────────────── */
  .fac-navtoggle{display:none;align-items:center;justify-content:center;width:38px;height:38px;flex-shrink:0;border:1px solid var(--line,#e5e7eb);background:#fff;border-radius:10px;color:inherit;font-size:19px;cursor:pointer;}
  .fac-navback{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:60;}

  @media(max-width:980px){
    .fac-sb{position:fixed;top:0;left:0;bottom:0;z-index:70;width:232px;height:100dvh;transform:translateX(-100%);transition:transform .22s ease;}
    .fac-sb.is-open{transform:none;}
    .fac-navtoggle{display:inline-flex;}
    .fac-body{padding:1.25rem 1rem 2.5rem;}
    .fac-topbar{padding:0 1rem;gap:.75rem;}
    .fac-topbar-search,.fac-search{display:none;}
  }

  @media(max-width:560px){
    .fac-body{padding:1rem .85rem 2rem;}
    .fac-crumbs{font-size:11px;min-width:0;overflow:hidden;}
    .fac-crumbs .here{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .fac-toast-host{left:.75rem;right:.75rem;bottom:.75rem;}
  }

  @media(max-width:700px){
    .fac-user-name,.fac-user-role,.fac-user-meta{display:none;}
    .fac-user-chip{padding:4px;gap:0;}
    .fac-user-chip .ti-chevron-down{display:none;}
    .fac-term-chip,.fac-topbar-term{display:none;}
    .fac-topbar-actions{gap:.4rem;min-width:0;}
  }

  @media(max-width:620px){
    /* Stat tiles: let content shrink and wrap instead of forcing the page wide */
    .stat-row{grid-template-columns:repeat(auto-fit,minmax(140px,1fr));}
    .stat-row .stat{padding:1rem .9rem;min-width:0;}
    .stat-row .stat .num{font-size:24px;min-width:0;overflow-wrap:anywhere;}
    .stat-row .stat .lbl{min-width:0;overflow-wrap:anywhere;}
    .tag{white-space:normal;overflow-wrap:anywhere;letter-spacing:.05em;max-width:100%;}
  }

  /* Narrow laptops/tablets: the docked sidebar leaves the main column tight,
     so compact the topbar and let wide tables scroll inside their own box. */
  @media(max-width:1100px){
    .fac-topbar{gap:.6rem;}
    .fac-topbar-actions,.fac-ta{min-width:0;gap:.45rem;}
    .fac-user-chip,.stu-uc{min-width:0;}
    .fac-user-name,.fac-user-role,.fac-user-meta,.stu-um{display:none;}
    .fac-term-chip,.fac-topbar-term,.term-chip{display:none;}
    .fac-topbar-search,.fac-search,.stu-ts{display:none;}
    .fac-body table{display:block;width:100%;max-width:100%;overflow-x:auto;}
    .fac-body .page,.fac-body .db-card{min-width:0;max-width:100%;}
  }

`;

/* ── Static data ─────────────────────────────────────────────────────────── */
const SB_GROUPS = [
  { id: 'overview', label: 'Overview'  },
  { id: 'teaching', label: 'Teaching'  },
  { id: 'campus',   label: 'Campus'    },
];

const SB_ITEMS = [
  { key: 'dashboard',     icon: 'ti-layout-dashboard', label: 'Dashboard',      section: 'overview', to: '/faculty/dashboard'     },
  { key: 'grades',        icon: 'ti-pencil',           label: 'Grade Encoding', section: 'teaching', to: '/faculty/grades'        },
  { key: 'schedule',      icon: 'ti-calendar',         label: 'Teaching Load',  section: 'teaching', to: '/faculty/schedule'      },
  { key: 'roster',        icon: 'ti-users',            label: 'Class Roster',   section: 'teaching', to: '/faculty/roster'        },
  { key: 'announcements', icon: 'ti-bell',             label: 'Announcements',  section: 'campus',   to: '/faculty/announcements' },
  { key: 'profile',       icon: 'ti-user',             label: 'My Profile',     section: 'campus',   to: '/faculty/profile'       },
];

const PAGE_LABELS = {
  dashboard:     'Dashboard',
  grades:        'Grade Encoding',
  schedule:      'Teaching Load',
  roster:        'Class Roster',
  announcements: 'Announcements',
  profile:       'My Profile',
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function activeKey(pathname) {
  const seg = pathname.replace('/faculty/', '').split('/')[0];
  return seg || 'dashboard';
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
function FacSidebar({ active, navOpen, closeNav }) {
  return (
    <aside className={`fac-sb${navOpen ? ' is-open' : ''}`} onClick={closeNav}>
      <div className="fac-sb-brand">
        <img src="/logo.png" alt="NEMSU" />
        <div>
          <div className="fac-sb-brand-name">NEMSUonePortal</div>
          <div className="fac-sb-brand-sub">Faculty · Cantilan</div>
        </div>
      </div>

      <nav className="fac-sb-nav">
        {SB_GROUPS.map(g => (
          <div key={g.id}>
            <div className="fac-sb-group-label">{g.label}</div>
            {SB_ITEMS.filter(l => l.section === g.id).map(l => (
              <Link
                key={l.key}
                to={l.to}
                className={`fac-sb-link${active === l.key ? ' active' : ''}`}
              >
                <i className={`ti ${l.icon}`} />
                <span>{l.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="fac-sb-foot">
        <i className="ti ti-map-pin" />
        <div>
          <div className="fac-sb-foot-campus">Cantilan Campus</div>
          <div className="fac-sb-foot-loc">Cantilan, Surigao del Sur</div>
        </div>
      </div>
    </aside>
  );
}

/* ── Topbar ──────────────────────────────────────────────────────────────── */
function FacTopbar({ active, openDrawer, openNav, unread = 0, onBell }) {
  const { user } = useAuth();
  const [term, setTerm] = useState(null);

  useEffect(() => {
    api.get('/enrollment/current-term/').then(r => setTerm(r.data)).catch(() => {});
  }, []);

  const termLabel = term ? `${term.semester_display} · ${term.year}` : 'No active term';
  const pageLabel = PAGE_LABELS[active] || 'Dashboard';

  return (
    <div className="fac-topbar">
      <button className="fac-navtoggle" onClick={openNav} aria-label="Open navigation"><i className="ti ti-menu-2" /></button>
      <div className="fac-crumbs">
        <i className="ti ti-home" />
        <span>Faculty</span>
        <i className="ti ti-chevron-right" />
        <span className="here">{pageLabel}</span>
      </div>

      <div className="fac-topbar-actions">
        <div className="fac-term-chip">
          <i className="ti ti-calendar" />
          {termLabel}
        </div>

        <button className="fac-icon-btn" aria-label="Notifications" onClick={onBell || (() => openDrawer('notifications'))}>
          <i className="ti ti-bell" />
          {unread > 0 && <span className="fac-dot" />}
        </button>

        <div className="fac-user-chip" onClick={() => openDrawer('account')}>
          <div className="fac-user-avatar">{initials(user?.full_name)}</div>
          <div>
            <div className="fac-user-name">{user?.full_name || 'Faculty'}</div>
            <div className="fac-user-role">Faculty</div>
          </div>
          <i className="ti ti-chevron-down" />
        </div>
      </div>
    </div>
  );
}

/* ── Toast host ──────────────────────────────────────────────────────────── */
function ToastHost({ toasts }) {
  return (
    <div className="fac-toast-host">
      {toasts.map(t => {
        const icon = t.icon || (
          t.type === 'success' ? 'ti-check' :
          t.type === 'error'   ? 'ti-alert-triangle' :
          t.type === 'warn'    ? 'ti-alert-circle' :
          'ti-info-circle'
        );
        return (
          <div key={t.id} className={`fac-toast${t.type ? ' ' + t.type : ''}`}>
            <div className="fac-toast-icon"><i className={`ti ${icon}`} /></div>
            <div className="fac-toast-body">
              <div className="fac-toast-msg">{t.msg}</div>
              {t.sub && <div className="fac-toast-sub">{t.sub}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Drawer host ─────────────────────────────────────────────────────────── */
function DrawerHost({ drawer, closeDrawer, toast, notifs = [], unreadCount = 0 }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!drawer) return;
    const k = e => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [drawer, closeDrawer]);

  if (!drawer) return null;

  return (
    <>
      <div className="fac-drawer-back" onClick={closeDrawer} />
      <div className="fac-drawer">
        {drawer.kind === 'notifications' && (
          <DrawerNotifications close={closeDrawer} notifs={notifs} unreadCount={unreadCount} />
        )}
        {drawer.kind === 'account' && (
          <DrawerAccount close={closeDrawer} logout={logout} navigate={navigate} toast={toast} />
        )}
      </div>
    </>
  );
}

function DrawerNotifications({ close, notifs = [], unreadCount = 0 }) {
  return (
    <>
      <div className="fac-drawer-head">
        <div>
          <h3>Notifications</h3>
          <div className="fac-drawer-sub">
            {unreadCount > 0 ? `${unreadCount} new announcement${unreadCount !== 1 ? 's' : ''}` : 'Announcements'}
          </div>
        </div>
        <button className="fac-icon-btn" onClick={close}><i className="ti ti-x" /></button>
      </div>
      <div className="fac-drawer-body">
        <NotificationList items={notifs} unreadCount={unreadCount} />
      </div>
      <div className="fac-drawer-foot">
        <button className="btn-pri" onClick={close}><i className="ti ti-check" /> Done</button>
      </div>
    </>
  );
}

function DrawerAccount({ close, logout, navigate, toast }) {
  const { user } = useAuth();
  const openSupport = useSupport();
  const changePassword = async () => {
    close();
    const r = await requestSelfPasswordReset();
    if (r.ok) toast('Password reset link sent to your email.', { type: 'success', sub: r.email });
    else toast(r.error, { type: 'error' });
  };
  const items = [
    { icon: 'ti-user',     label: 'My profile',       act: () => { navigate('/faculty/profile'); close(); } },
    { icon: 'ti-key',      label: 'Change password',  act: changePassword },
    { icon: 'ti-help',     label: 'Help & support',   act: () => { close(); openSupport(); } },
  ];
  const handleLogout = () => { close(); logout(); navigate('/login'); };
  return (
    <>
      <div className="fac-drawer-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="fac-avatar-lg">{initials(user?.full_name)}</div>
          <div>
            <h3 style={{ fontSize: 20 }}>{user?.full_name || 'Faculty'}</h3>
            <div className="fac-drawer-sub">Faculty · NEMSU Cantilan</div>
          </div>
        </div>
        <button className="fac-icon-btn" onClick={close}><i className="ti ti-x" /></button>
      </div>
      <div className="fac-drawer-body">
        <div className="fac-menu">
          {items.map(it => (
            <button key={it.label} className="fac-menu-item" onClick={it.act}>
              <i className={`ti ${it.icon}`} />
              {it.label}
              <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', color: 'var(--faint)' }} />
            </button>
          ))}
          <button className="fac-menu-item danger" onClick={handleLogout}>
            <i className="ti ti-logout" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Shell ───────────────────────────────────────────────────────────────── */
export default function FacultyShell() {
  const location = useLocation();
  const active = activeKey(location.pathname);
  const { user } = useAuth();
  const { items: notifs, unreadCount, markSeen } = useNotifications(user?.id);

  // Close the mobile nav whenever the route changes
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  const [toasts, setToasts]   = useState([]);
  const [navOpen, setNavOpen] = useState(false);
  const [drawer, setDrawer]   = useState(null);

  const toast = useCallback((msg, opts = {}) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, ...opts }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), opts.duration || 3200);
  }, []);

  const openDrawer = useCallback((kind) => {
    setDrawer({ kind });
    document.body.style.overflow = 'hidden';
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
    document.body.style.overflow = '';
  }, []);

  useEffect(() => () => { document.body.style.overflow = ''; }, []);

  return (
    <FacultyShellCtx.Provider value={{ toast }}>
      <style>{CSS}</style>
      <div className="fac-shell">
        <FacSidebar active={active} navOpen={navOpen} closeNav={() => setNavOpen(false)} />
        {navOpen && <div className="fac-navback" onClick={() => setNavOpen(false)} />}
        <div className="fac-main">
          <FacTopbar active={active} openDrawer={openDrawer} openNav={() => setNavOpen(true)}
            unread={unreadCount} onBell={() => { openDrawer('notifications'); markSeen(); }} />
          <div className="fac-body">
            <ScrollMemory />
            <Outlet />
          </div>
        </div>
      </div>
      <ToastHost toasts={toasts} />
      <DrawerHost drawer={drawer} closeDrawer={closeDrawer} toast={toast} notifs={notifs} unreadCount={unreadCount} />
    </FacultyShellCtx.Provider>
  );
}
