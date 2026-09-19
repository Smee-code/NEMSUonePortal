import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AdminShellCtx } from '../../context/AdminShellContext';
import api from '../../api/axios';

/* ── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
  /* Design tokens */
  :root{
    --adm-ink:#0a1628;--adm-ink-2:#1e3a5f;--adm-muted:#5a6478;--adm-faint:#8a93a3;
    --adm-paper:#ffffff;--adm-warm:#f8f7f3;--adm-cool:#f4f6fa;--adm-cool-2:#eef1f7;
    --adm-line:#e5e7eb;--adm-line-soft:#eef0f4;
    --adm-gold:#b89043;--adm-gold-soft:#d9b96b;--adm-gold-tint:#f5edd9;
    --adm-green:#0a7c52;--adm-green-tint:#e6f1ec;
    --adm-red:#a8331e;--adm-red-tint:#f6e8e4;
    --adm-amber:#a06b16;--adm-amber-tint:#f7eed8;
  }
  /* Shell */
  .adm-shell{display:flex;min-height:100vh;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}

  /* Sidebar */
  .adm-sb{flex:0 0 260px;background:#0a1628;color:#e8ecf2;display:flex;flex-direction:column;position:sticky;top:0;height:100vh}
  .adm-sb-brand{display:flex;align-items:center;gap:12px;padding:1.5rem 1.5rem 1.25rem;border-bottom:1px solid rgba(255,255,255,.08)}
  .adm-sb-brand img{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.04);padding:2px;object-fit:contain}
  .adm-sb-brand-name{font-size:20px;color:#fff;letter-spacing:-.01em;line-height:1.2}
  .adm-sb-brand-sub{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#d9b96b;margin-top:3px;font-weight:600}
  .adm-sb-section{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(232,236,242,.40);font-weight:600;padding:1.5rem 1.5rem .75rem}
  .adm-sb-nav{flex:1;overflow-y:auto;padding:0 .75rem .5rem}
  .adm-sb-nav::-webkit-scrollbar{width:4px}
  .adm-sb-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px}
  .adm-sb-link{display:flex;align-items:center;gap:12px;padding:10px 14px;color:rgba(232,236,242,.62);font-size:13px;font-weight:500;text-decoration:none;border-left:2px solid transparent;transition:background .15s,color .15s,border-color .15s;width:100%;background:none;border-right:0;border-top:0;border-bottom:0;text-align:left;font-family:inherit;cursor:pointer}
  .adm-sb-link i{font-size:17px;flex-shrink:0}
  .adm-sb-link:hover{color:#fff;background:rgba(255,255,255,.03)}
  .adm-sb-link.active{color:#fff;background:rgba(184,144,67,.10);border-left-color:#b89043;font-weight:600}
  .adm-sb-badge{margin-left:auto;font-size:10px;background:#b89043;color:#fff;padding:2px 7px;letter-spacing:.06em;font-weight:700}
  .adm-sb-foot{padding:1rem 1.5rem;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px;font-size:12px;flex-shrink:0}
  .adm-sb-foot i{color:#d9b96b;font-size:14px}
  .adm-sb-foot-campus{color:#fff;font-weight:500}
  .adm-sb-foot-loc{font-size:11px;color:rgba(232,236,242,.40)}

  /* Main */
  .adm-main{flex:1;min-width:0;display:flex;flex-direction:column;background:#f4f6fa}

  /* Topbar */
  .adm-topbar{background:#fff;border-bottom:1px solid #e5e7eb;padding:0 2rem;height:72px;display:flex;align-items:center;gap:1.5rem;flex-shrink:0}
  .adm-crumbs{display:flex;align-items:center;gap:10px;font-size:12px;color:#5a6478;letter-spacing:.04em}
  .adm-crumbs i{font-size:11px;color:#8a93a3}
  .adm-crumbs .here{color:#0a1628;font-weight:500}
  .adm-search{flex:1;max-width:380px;margin-left:1rem;position:relative;display:flex;align-items:center}
  .adm-search i{position:absolute;left:12px;font-size:16px;color:#8a93a3;pointer-events:none}
  .adm-search input{width:100%;padding:9px 14px 9px 36px;font:14px/1.4 'Inter',sans-serif;color:#0a1628;background:#f4f6fa;border:1px solid transparent;outline:none;transition:border-color .15s,background .15s}
  .adm-search input:focus{background:#fff;border-color:#e5e7eb}
  .adm-search input::placeholder{color:#8a93a3}
  .adm-search .adm-kbd{position:absolute;right:10px;font-size:10px;letter-spacing:.04em;padding:2px 6px;border:1px solid #e5e7eb;color:#8a93a3;background:#fff;font-weight:500}
  .adm-topbar-actions{display:flex;align-items:center;gap:.75rem;margin-left:auto}
  .adm-term-chip{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;font-size:12px;color:#0a1628;border:1px solid #e5e7eb;background:#fff;font-weight:500;cursor:pointer;white-space:nowrap}
  .adm-term-chip i{font-size:14px;color:#b89043}
  .adm-icon-btn{width:38px;height:38px;display:flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#0a1628;position:relative;transition:border-color .15s}
  .adm-icon-btn i{font-size:18px}
  .adm-icon-btn:hover{border-color:#0a1628}
  .adm-icon-btn .adm-dot{position:absolute;top:7px;right:7px;width:6px;height:6px;border-radius:50%;background:#a8331e}
  .adm-user-chip{display:flex;align-items:center;gap:10px;padding:5px 14px 5px 5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;transition:border-color .15s}
  .adm-user-chip:hover{border-color:#0a1628}
  .adm-user-avatar{width:30px;height:30px;background:#0a1628;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;letter-spacing:.05em;flex-shrink:0}
  .adm-user-meta{line-height:1.2;text-align:left}
  .adm-user-meta .adm-uname{font-size:12px;font-weight:600;color:#0a1628;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .adm-user-meta .adm-urole{font-size:10px;color:#5a6478;text-transform:capitalize;letter-spacing:.04em}
  .adm-user-chip > i{font-size:13px;color:#8a93a3}

  /* Body */
  .adm-body{flex:1;overflow-y:auto;padding:1.5rem 2rem 2rem}

  /* Toast */
  .adm-toast-host{position:fixed;bottom:1.5rem;right:1.5rem;z-index:1100;display:flex;flex-direction:column;gap:8px;pointer-events:none}
  .adm-toast{pointer-events:auto;background:#0a1628;color:#fff;padding:12px 16px 12px 12px;min-width:280px;max-width:380px;display:flex;align-items:flex-start;gap:12px;border-left:3px solid #b89043;animation:adm-toast-in .25s cubic-bezier(.4,0,.2,1)}
  .adm-toast.success{border-left-color:#0a7c52}
  .adm-toast.warn{border-left-color:#a06b16}
  .adm-toast.error{border-left-color:#a8331e}
  .adm-toast-icon{width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);flex-shrink:0;color:#d9b96b}
  .adm-toast.success .adm-toast-icon{color:#5dd6a1}
  .adm-toast.warn .adm-toast-icon{color:#f0c878}
  .adm-toast.error .adm-toast-icon{color:#e88b78}
  .adm-toast-icon i{font-size:14px}
  .adm-toast-body{flex:1;min-width:0;line-height:1.45}
  .adm-toast-msg{font-size:13px;font-weight:500}
  .adm-toast-sub{font-size:11px;color:rgba(255,255,255,.6);margin-top:2px}
  @keyframes adm-toast-in{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}

  /* Drawer */
  .adm-drawer-back{position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(6px);z-index:1050;animation:adm-fade-in .2s ease}
  @keyframes adm-fade-in{from{opacity:0}to{opacity:1}}
  @keyframes adm-drawer-in{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}
  .adm-drawer{position:fixed;top:0;right:0;bottom:0;width:520px;max-width:92vw;background:#fff;z-index:1051;display:flex;flex-direction:column;animation:adm-drawer-in .28s cubic-bezier(.4,0,.2,1);box-shadow:-20px 0 40px -20px rgba(10,22,40,.25)}
  .adm-drawer-head{padding:1.5rem 1.75rem;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0}
  .adm-drawer-head h3{font-weight:500;font-size:26px;letter-spacing:-.015em;color:#0a1628;line-height:1.1}
  .adm-drawer-head h3 em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:#1e3a5f;font-weight:400}
  .adm-drawer-head .adm-drawer-sub{font-size:13px;color:#5a6478;margin-top:6px}
  .adm-drawer-body{padding:1.5rem 1.75rem;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:1.25rem}
  .adm-drawer-foot{padding:1rem 1.75rem;border-top:1px solid #e5e7eb;background:#f8f7f3;display:flex;justify-content:flex-end;gap:8px;flex-shrink:0}

  /* Drawer — notifications */
  .adm-notif-row{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:flex-start;padding:14px 0;border-bottom:1px solid #eef0f4}
  .adm-notif-row:last-child{border-bottom:none}
  .adm-notif-dot{width:8px;height:8px;background:#b89043;border-radius:50%;margin-top:6px;flex-shrink:0}
  .adm-notif-dot.read{background:#e5e7eb}
  .adm-notif-msg{font-size:13px;color:#0a1628;line-height:1.55}
  .adm-notif-meta{font-size:11px;color:#5a6478;margin-top:2px}
  .adm-notif-time{font-size:11px;color:#8a93a3;white-space:nowrap}

  /* Drawer — account menu */
  .adm-drawer-menu{display:flex;flex-direction:column}
  .adm-drawer-menu-item{display:flex;align-items:center;gap:12px;padding:12px 0;font-size:13px;color:#0a1628;cursor:pointer;border-bottom:1px solid #eef0f4;transition:padding-left .15s;background:none;border-left:0;border-right:0;border-top:0;font-family:inherit;text-align:left;width:100%}
  .adm-drawer-menu-item:hover{padding-left:8px;color:#1e3a5f}
  .adm-drawer-menu-item:last-child{border-bottom:none}
  .adm-drawer-menu-item i{font-size:16px;color:#5a6478;width:18px;text-align:center;flex-shrink:0}
  .adm-drawer-menu-item.danger{color:#a8331e}
  .adm-drawer-menu-item.danger i{color:#a8331e}

  /* Drawer — form */
  .adm-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}
  .adm-form-field{display:flex;flex-direction:column;gap:6px}
  .adm-form-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#5a6478;font-weight:600}
  .adm-form-input,.adm-form-select,.adm-form-textarea{padding:10px 12px;font-size:13px;background:#fff;border:1px solid #e5e7eb;outline:none;color:#0a1628;font-family:inherit;border-radius:0}
  .adm-form-input:focus,.adm-form-select:focus,.adm-form-textarea:focus{border-color:#0a1628}
  .adm-form-textarea{min-height:120px;resize:vertical;line-height:1.55}
  .adm-toggle{position:relative;width:38px;height:22px;background:#e5e7eb;cursor:pointer;transition:background .15s;border:none;padding:0;flex-shrink:0}
  .adm-toggle.on{background:#0a1628}
  .adm-toggle::after{content:"";position:absolute;width:16px;height:16px;background:#fff;top:3px;left:3px;transition:left .15s}
  .adm-toggle.on::after{left:19px}

  /* Shared buttons used in drawers */
  .adm-btn-pri{padding:9px 16px;background:#0a1628;color:#fff;border:1px solid #0a1628;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit;transition:background .15s}
  .adm-btn-pri:hover{background:#000}
  .adm-btn-pri:disabled{opacity:.5;cursor:not-allowed}
  .adm-btn-pri i{font-size:14px}
  .adm-btn-sec{padding:9px 14px;background:#fff;color:#0a1628;border:1px solid #e5e7eb;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit;transition:border-color .15s}
  .adm-btn-sec:hover{border-color:#0a1628}
  .adm-btn-sec i{font-size:14px}
  .adm-avatar-lg{width:48px;height:48px;background:#b89043;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0;letter-spacing:.04em}

  /* ── Page primitives (shared across all admin pages) ── */
  .page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;padding-bottom:1.5rem;border-bottom:1px solid var(--adm-line);margin-bottom:1.5rem;flex-wrap:wrap}
  .page-head .eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--adm-gold);font-weight:600;margin-bottom:.5rem;display:inline-flex;align-items:center;gap:10px}
  .page-head .eyebrow::before{content:"";width:24px;height:1px;background:var(--adm-gold)}
  .page-head h2{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:500;font-size:38px;letter-spacing:-.02em;line-height:1.05;color:var(--adm-ink)}
  .page-head h2 em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--adm-ink-2);font-weight:400}
  .page-head .sub{font-size:14px;color:var(--adm-muted);margin-top:6px;max-width:540px;line-height:1.55}
  .page-head .actions{display:flex;gap:8px;flex-shrink:0;align-self:flex-start;margin-top:.5rem}
  /* Toolbar */
  .toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:1.25rem}
  .toolbar-search{flex:1;max-width:380px;min-width:220px;position:relative;display:flex;align-items:center}
  .toolbar-search i{position:absolute;left:12px;color:var(--adm-faint);font-size:15px;pointer-events:none}
  .toolbar-search input{width:100%;padding:9px 14px 9px 34px;background:#fff;border:1px solid var(--adm-line);outline:none;font:13px/1.4 'Inter',sans-serif;color:var(--adm-ink)}
  .toolbar-search input:focus{border-color:var(--adm-ink)}
  .toolbar select,.toolbar input[type="date"]{padding:9px 12px;background:#fff;border:1px solid var(--adm-line);outline:none;font:13px/1.4 'Inter',sans-serif;color:var(--adm-ink);font-family:inherit}
  .toolbar .label{font-size:11px;color:var(--adm-muted);font-weight:500;letter-spacing:.04em;margin-right:4px}
  .toolbar-spacer{flex:1}
  /* Page buttons */
  .btn-pri{padding:9px 16px;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);background:var(--adm-ink);color:#fff;border:1px solid var(--adm-ink);font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit;transition:background .15s}
  .btn-pri:hover{background:#000}
  .btn-pri:disabled{opacity:.5;cursor:not-allowed}
  .btn-pri i{font-size:14px}
  .btn-sec{padding:9px 14px;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);background:#fff;color:var(--adm-ink);border:1px solid var(--adm-line);font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit;transition:border-color .15s}
  .btn-sec:hover{border-color:var(--adm-ink)}
  .btn-sec i{font-size:14px}
  .btn-ghost{padding:5px 8px;background:transparent;color:var(--adm-muted);border:none;cursor:pointer;font-family:inherit;font-size:12px;display:inline-flex;align-items:center;gap:4px}
  .btn-ghost:hover{color:var(--adm-ink)}
  /* Table */
  .table-wrap{background:#fff;border:1px solid var(--adm-line);overflow:hidden}
  .table{width:100%;border-collapse:collapse}
  .table thead th{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--adm-muted);font-weight:600;text-align:left;padding:14px 18px;border-bottom:1px solid var(--adm-line);background:var(--adm-warm)}
  .table tbody td{padding:14px 18px;font-size:13px;color:var(--adm-ink);border-bottom:1px solid var(--adm-line-soft);vertical-align:middle}
  .table tbody tr:last-child td{border-bottom:none}
  .table tbody tr:hover{background:var(--adm-warm)}
  .table .num,.table td.num{font-variant-numeric:tabular-nums}
  .table td.muted{color:var(--adm-muted);font-size:12px}
  /* Tags */
  .tag{display:inline-flex;align-items:center;gap:5px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;padding:3px 8px}
  .tag.role-student{background:#eef2fa;color:#1e3a5f}
  .tag.role-faculty{background:#f5edd9;color:#83662a}
  .tag.role-registrar{background:#e6f1ec;color:#0a7c52}
  .tag.role-admin{background:#f6e8e4;color:#a8331e}
  .tag.role-system{background:#eef2fa;color:#5a6478}
  .tag.status-active{background:#e6f1ec;color:#0a7c52}
  .tag.status-inactive{background:#f3f4f6;color:#5a6478}
  .tag.status-locked{background:#f7eed8;color:#a06b16}
  .tag.status-unverified{background:#f3f4f6;color:#5a6478}
  .tag.outline{background:transparent;border:1px solid var(--adm-line);color:var(--adm-muted)}
  .tag.success{background:#e6f1ec;color:#0a7c52}
  .tag.failure{background:#f6e8e4;color:#a8331e}
  .tag.pending{background:#f7eed8;color:#a06b16}
  /* Avatar */
  .avatar{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:var(--adm-ink);color:#fff;font-size:11px;font-weight:600;flex-shrink:0;letter-spacing:.04em}
  .avatar.sm{width:26px;height:26px;font-size:10px}
  .avatar.gold{background:var(--adm-gold)}
  .row-user{display:flex;align-items:center;gap:12px}
  .row-user .meta{min-width:0}
  .row-user .name{font-size:13px;font-weight:500;color:var(--adm-ink);line-height:1.3}
  .row-user .email{font-size:11px;color:var(--adm-muted);margin-top:2px}
  /* Pagination */
  .pagination{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:var(--adm-warm);border-top:1px solid var(--adm-line)}
  .pagination .count{font-size:12px;color:var(--adm-muted)}
  .pagination .controls{display:flex;gap:6px}
  .pagination button{padding:6px 10px;font-size:12px;border:1px solid var(--adm-line);background:#fff;cursor:pointer;color:var(--adm-ink);font-family:inherit;transition:border-color .15s}
  .pagination button:hover:not(:disabled){border-color:var(--adm-ink)}
  .pagination button:disabled{opacity:.4;cursor:not-allowed}
  .pagination button.active{background:var(--adm-ink);color:#fff;border-color:var(--adm-ink)}
  /* Sub-tabs */
  .subtabs{display:flex;gap:0;border-bottom:1px solid var(--adm-line);margin-bottom:1.5rem}
  .subtab{padding:12px 18px;font-size:13px;font-weight:500;color:var(--adm-muted);cursor:pointer;background:none;border:none;border-bottom:2px solid transparent;font-family:inherit;transition:color .15s,border-color .15s}
  .subtab:hover{color:var(--adm-ink)}
  .subtab.active{color:var(--adm-ink);border-bottom-color:var(--adm-ink);font-weight:600}
  /* Toggle */
  .toggle{position:relative;width:38px;height:22px;background:var(--adm-line);cursor:pointer;transition:background .15s;border:none;padding:0;flex-shrink:0}
  .toggle.on{background:var(--adm-ink)}
  .toggle::after{content:"";position:absolute;width:16px;height:16px;background:#fff;top:3px;left:3px;transition:left .15s}
  .toggle.on::after{left:19px}
  /* Card grid */
  .grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:0;border:1px solid var(--adm-line);background:var(--adm-line)}
  .grid-cards > *{background:#fff;padding:1.5rem;display:flex;flex-direction:column;gap:.75rem;transition:background .15s}
  .grid-cards > *:hover{background:var(--adm-warm)}
  /* Stat row */
  .stat-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0;background:#fff;border:1px solid var(--adm-line);margin-bottom:1.5rem}
  .stat-row .stat{padding:1.25rem 1.5rem;border-right:1px solid var(--adm-line)}
  .stat-row .stat:last-child{border-right:none}
  .stat-row .stat .num{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:500;font-size:32px;line-height:1;color:var(--adm-ink);letter-spacing:-.02em}
  .stat-row .stat .num.green{color:var(--adm-green)}
  .stat-row .stat .num.amber{color:var(--adm-amber)}
  .stat-row .stat .num.red{color:var(--adm-red)}
  .stat-row .stat .lbl{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--adm-muted);font-weight:600;margin-top:8px}
  .stat-row .stat .delta{font-size:11px;color:var(--adm-faint);margin-top:4px}
  /* Info section */
  .info-section{background:#fff;border:1px solid var(--adm-line);margin-bottom:1.5rem}
  .info-section-head{padding:1rem 1.5rem;border-bottom:1px solid var(--adm-line);background:var(--adm-warm);display:flex;justify-content:space-between;align-items:center}
  .info-section-head h4{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--adm-ink);font-weight:600}
  .info-row{display:flex;justify-content:space-between;align-items:baseline;padding:.75rem 1.5rem;border-bottom:1px solid var(--adm-line-soft)}
  .info-row:last-child{border-bottom:none}
  .info-row .lbl{font-size:12px;color:var(--adm-muted)}
  .info-row .val{font-size:13px;color:var(--adm-ink);font-weight:500}
  /* Empty state */
  .empty-state{text-align:center;padding:4rem 2rem;background:#fff;border:1px solid var(--adm-line)}
  .empty-state i{font-size:48px;color:var(--adm-faint);display:block;margin-bottom:1rem}
  .empty-state .t{font-size:16px;font-weight:600;color:var(--adm-ink);margin-bottom:.5rem}
  .empty-state .d{font-size:13px;color:var(--adm-muted);max-width:320px;margin:0 auto;line-height:1.55}
  /* Dropdown */
  .dropdown{position:relative;display:inline-block}
  .dropdown-menu{position:absolute;top:100%;right:0;margin-top:4px;z-index:50;background:#fff;border:1px solid var(--adm-line);min-width:180px;box-shadow:0 8px 24px -8px rgba(10,22,40,.18)}
  .dropdown-item{display:flex;align-items:center;gap:10px;padding:10px 14px;font-size:13px;color:var(--adm-ink);background:none;border:none;width:100%;text-align:left;cursor:pointer;font-family:inherit}
  .dropdown-item:hover{background:var(--adm-warm)}
  .dropdown-item.danger{color:var(--adm-red)}
  .dropdown-item i{font-size:14px;color:var(--adm-muted)}
  .dropdown-item.danger i{color:var(--adm-red)}
  .dropdown-sep{height:1px;background:var(--adm-line-soft);margin:4px 0}
  /* ── Responsive: mobile navigation + layout collapse ───────────────────── */
  .adm-navtoggle{display:none;align-items:center;justify-content:center;width:38px;height:38px;flex-shrink:0;border:1px solid var(--line,#e5e7eb);background:#fff;border-radius:10px;color:inherit;font-size:19px;cursor:pointer;}
  .adm-navback{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:60;}

  @media(max-width:980px){
    .adm-sb{position:fixed;top:0;left:0;bottom:0;z-index:70;width:262px;height:100dvh;transform:translateX(-100%);transition:transform .22s ease;}
    .adm-sb.is-open{transform:none;}
    .adm-navtoggle{display:inline-flex;}
    .adm-body{padding:1.25rem 1rem 2.5rem;}
    .adm-topbar{padding:0 1rem;gap:.75rem;}
    .adm-topbar-search,.adm-search{display:none;}
  }

  @media(max-width:560px){
    .adm-body{padding:1rem .85rem 2rem;}
    .adm-crumbs{font-size:11px;min-width:0;overflow:hidden;}
    .adm-crumbs .here{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .adm-toast-host{left:.75rem;right:.75rem;bottom:.75rem;}
  }

  @media(max-width:700px){
    .adm-user-meta{display:none;}
    .adm-user-chip{padding:4px;gap:0;}
    .adm-user-chip .ti-chevron-down{display:none;}
    .adm-term-chip,.adm-topbar-term{display:none;}
    .adm-topbar-actions{gap:.4rem;min-width:0;}
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
    .adm-topbar{gap:.6rem;}
    .adm-topbar-actions,.adm-ta{min-width:0;gap:.45rem;}
    .adm-user-chip,.stu-uc{min-width:0;}
    .adm-user-name,.adm-user-role,.adm-user-meta,.stu-um{display:none;}
    .adm-term-chip,.adm-topbar-term,.term-chip{display:none;}
    .adm-topbar-search,.adm-search,.stu-ts{display:none;}
    .adm-body table{display:block;width:100%;max-width:100%;overflow-x:auto;}
    .adm-body .page,.adm-body .db-card{min-width:0;max-width:100%;}
  }

`;

/* ── Static data ─────────────────────────────────────────────────────────── */
const SB_GROUPS = [
  { id: 'overview', label: 'Overview' },
  { id: 'manage',   label: 'Manage'   },
  { id: 'system',   label: 'System'   },
];

const SB_ITEMS = [
  { key: 'dashboard',     icon: 'ti-layout-dashboard', label: 'Dashboard',             section: 'overview', to: '/admin/dashboard'    },
  { key: 'users',         icon: 'ti-users',            label: 'User Management',       section: 'manage',   to: '/admin/users'        },
  { key: 'programs',      icon: 'ti-book-2',           label: 'Programs & Curriculum', section: 'manage',   to: '/admin/programs'     },
  { key: 'curriculum',    icon: 'ti-list-tree',        label: 'Curriculum',            section: 'manage',   to: '/admin/curriculum'   },
  { key: 'terms',         icon: 'ti-calendar',         label: 'Academic Terms',        section: 'manage',   to: '/admin/terms'        },
  { key: 'blocks',        icon: 'ti-database',         label: 'Block Management',      section: 'manage',   to: '/admin/blocks'       },
  { key: 'reports',       icon: 'ti-chart-bar',        label: 'Reports & Export',      section: 'system',   to: '/admin/reports'      },
  { key: 'audit-log',     icon: 'ti-clock-hour-4',     label: 'Audit Log',             section: 'system',   to: '/admin/audit-log'    },
  { key: 'announcements', icon: 'ti-bell',             label: 'Announcements',         section: 'system',   to: '/admin/announcements'},
  { key: 'landing',       icon: 'ti-layout-board',     label: 'Landing Content',       section: 'system',   to: '/admin/landing'      },
  { key: 'spotlight',     icon: 'ti-news',             label: 'Campus Spotlight',      section: 'system',   to: '/admin/spotlight'    },
  { key: 'settings',      icon: 'ti-settings',         label: 'System Settings',       section: 'system',   to: '/admin/settings'     },
];

const PAGE_LABELS = {
  dashboard:     'Dashboard',
  users:         'User Management',
  programs:      'Programs & Curriculum',
  curriculum:    'Curriculum',
  terms:         'Academic Terms',
  blocks:        'Block Management',
  reports:       'Reports & Export',
  'audit-log':   'Audit Log',
  announcements: 'Announcements',
  spotlight:     'Campus Spotlight',
  landing:       'Landing Content',
  settings:      'System Settings',
};

const NOTIFICATIONS = [
  { unread: true,  msg: 'Enrollment requests pending review',      sub: 'Registrar office',          time: '2m ago'  },
  { unread: true,  msg: 'New scholarship application submitted',    sub: 'OSAS · BSCS-3A',            time: '14m ago' },
  { unread: true,  msg: 'Grade submission deadline in 3 days',      sub: 'System reminder',            time: '1h ago'  },
  { unread: false, msg: 'Backup completed successfully',            sub: 'System · Daily snapshot',   time: '9h ago'  },
  { unread: false, msg: 'Account locked (3 failed attempts)',       sub: 'Security policy triggered', time: '12h ago' },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function activeKey(pathname) {
  const seg = pathname.replace('/admin/', '').split('/')[0];
  return seg || 'dashboard';
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
function AdminSidebar({ active, navOpen, closeNav }) {
  return (
    <aside className={`adm-sb${navOpen ? ' is-open' : ''}`} onClick={closeNav}>
      <div className="adm-sb-brand">
        <img src="/logo.png" alt="NEMSU" />
        <div>
          <div className="adm-sb-brand-name">NEMSUonePortal</div>
          <div className="adm-sb-brand-sub">Admin · Cantilan</div>
        </div>
      </div>

      <div className="adm-sb-nav">
        {SB_GROUPS.map(g => (
          <div key={g.id}>
            <div className="adm-sb-section">{g.label}</div>
            {SB_ITEMS.filter(l => l.section === g.id).map(l => (
              <Link
                key={l.key}
                to={l.to}
                className={`adm-sb-link${active === l.key ? ' active' : ''}`}
              >
                <i className={`ti ${l.icon}`} />
                <span>{l.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="adm-sb-foot">
        <i className="ti ti-map-pin" />
        <div>
          <div className="adm-sb-foot-campus">Cantilan Campus</div>
          <div className="adm-sb-foot-loc">Cantilan, Surigao del Sur</div>
        </div>
      </div>
    </aside>
  );
}

/* ── Topbar ──────────────────────────────────────────────────────────────── */
function AdminTopbar({ active, openDrawer, openNav }) {
  const { user } = useAuth();
  const [term, setTerm] = useState(null);

  useEffect(() => {
    api.get('/enrollment/current-term/').then(r => setTerm(r.data)).catch(() => {});
  }, []);

  const termLabel = term
    ? `${term.semester_display} · ${term.year}`
    : 'No active term';

  const pageLabel = PAGE_LABELS[active] || 'Dashboard';

  return (
    <div className="adm-topbar">
      <button className="adm-navtoggle" onClick={openNav} aria-label="Open navigation"><i className="ti ti-menu-2" /></button>
      <div className="adm-crumbs">
        <i className="ti ti-home" />
        <span>Admin</span>
        <i className="ti ti-chevron-right" />
        <span className="here">{pageLabel}</span>
      </div>

      <div className="adm-search">
        <i className="ti ti-search" />
        <input
          placeholder="Search users, programs, requests…"
          onKeyDown={e => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              e.target.blur();
              e.target.value = '';
            }
          }}
        />
        <span className="adm-kbd">⌘K</span>
      </div>

      <div className="adm-topbar-actions">
        <div className="adm-term-chip">
          <i className="ti ti-calendar" />
          {termLabel}
        </div>

        <button
          className="adm-icon-btn"
          aria-label="Notifications"
          onClick={() => openDrawer('notifications')}
        >
          <i className="ti ti-bell" />
          <span className="adm-dot" />
        </button>

        <div className="adm-user-chip" onClick={() => openDrawer('account')}>
          <div className="adm-user-avatar">{initials(user?.full_name)}</div>
          <div className="adm-user-meta">
            <div className="adm-uname">{user?.full_name || 'Admin'}</div>
            <div className="adm-urole">{user?.role || 'admin'}</div>
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
    <div className="adm-toast-host">
      {toasts.map(t => {
        const icon = t.icon || (
          t.type === 'success' ? 'ti-check' :
          t.type === 'error'   ? 'ti-alert-triangle' :
          t.type === 'warn'    ? 'ti-alert-circle' :
          'ti-info-circle'
        );
        return (
          <div key={t.id} className={`adm-toast${t.type ? ' ' + t.type : ''}`}>
            <div className="adm-toast-icon"><i className={`ti ${icon}`} /></div>
            <div className="adm-toast-body">
              <div className="adm-toast-msg">{t.msg}</div>
              {t.sub && <div className="adm-toast-sub">{t.sub}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Drawer host + variants ──────────────────────────────────────────────── */
function DrawerHost({ drawer, closeDrawer, toast }) {
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
      <div className="adm-drawer-back" onClick={closeDrawer} />
      <div className="adm-drawer">
        {drawer.kind === 'notifications' && (
          <DrawerNotifications close={closeDrawer} toast={toast} />
        )}
        {drawer.kind === 'account' && (
          <DrawerAccount close={closeDrawer} logout={logout} navigate={navigate} toast={toast} />
        )}
        {drawer.kind === 'form' && (
          <DrawerForm close={closeDrawer} toast={toast} {...drawer.props} />
        )}
      </div>
    </>
  );
}

function DrawerNotifications({ close, toast }) {
  const unreadCount = NOTIFICATIONS.filter(n => n.unread).length;
  return (
    <>
      <div className="adm-drawer-head">
        <div>
          <h3>Notifications</h3>
          <div className="adm-drawer-sub">{unreadCount} unread · last 24 hours</div>
        </div>
        <button className="adm-icon-btn" onClick={close}><i className="ti ti-x" /></button>
      </div>
      <div className="adm-drawer-body">
        {NOTIFICATIONS.map((n, i) => (
          <div key={i} className="adm-notif-row">
            <div className={`adm-notif-dot${n.unread ? '' : ' read'}`} />
            <div>
              <div className="adm-notif-msg">{n.msg}</div>
              <div className="adm-notif-meta">{n.sub}</div>
            </div>
            <div className="adm-notif-time">{n.time}</div>
          </div>
        ))}
      </div>
      <div className="adm-drawer-foot">
        <button className="adm-btn-sec" onClick={() => { toast('All notifications marked as read', { type: 'success' }); }}>
          Mark all read
        </button>
        <button className="adm-btn-pri" onClick={close}><i className="ti ti-check" /> Done</button>
      </div>
    </>
  );
}

function DrawerAccount({ close, logout, navigate, toast }) {
  const { user } = useAuth();
  const items = [
    { icon: 'ti-user',     label: 'My profile',       act: () => toast('Profile · coming soon')                            },
    { icon: 'ti-settings', label: 'Account settings', act: () => toast('Account settings · coming soon')                  },
    { icon: 'ti-key',      label: 'Change password',  act: () => toast('Password reset email sent', { type: 'success' }) },
    { icon: 'ti-help',     label: 'Help & support',   act: () => toast('Opening help center…')                            },
  ];
  const handleLogout = () => {
    close();
    logout();
    navigate('/login');
  };
  return (
    <>
      <div className="adm-drawer-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="adm-avatar-lg">{initials(user?.full_name)}</div>
          <div>
            <h3 style={{ fontSize: 22 }}>{user?.full_name || 'Administrator'}</h3>
            <div className="adm-drawer-sub">System administrator · NEMSU Cantilan</div>
          </div>
        </div>
        <button className="adm-icon-btn" onClick={close}><i className="ti ti-x" /></button>
      </div>
      <div className="adm-drawer-body">
        <div className="adm-drawer-menu">
          {items.map(it => (
            <button key={it.label} className="adm-drawer-menu-item" onClick={() => { it.act(); close(); }}>
              <i className={`ti ${it.icon}`} />
              {it.label}
              <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', color: '#8a93a3' }} />
            </button>
          ))}
          <button className="adm-drawer-menu-item danger" onClick={handleLogout}>
            <i className="ti ti-logout" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}

function ToggleField({ def }) {
  const [on, setOn] = useState(!!def);
  return (
    <button type="button" className={`adm-toggle${on ? ' on' : ''}`} onClick={() => setOn(o => !o)} />
  );
}

function DrawerForm({ close, toast, title, sub, submitLabel = 'Save', toastMsg = 'Saved', toastSub, fields = [] }) {
  const [submitting, setSubmitting] = useState(false);

  const submit = e => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast(toastMsg, { sub: toastSub, type: 'success' });
      close();
    }, 500);
  };

  const renderInner = (f, idx) => {
    if (f.type === 'select') return (
      <div key={idx} className="adm-form-field">
        <label className="adm-form-label">{f.label}</label>
        <select className="adm-form-select" defaultValue={f.options?.[0]}>
          {(f.options || []).map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
    );
    if (f.type === 'textarea') return (
      <div key={idx} className="adm-form-field">
        <label className="adm-form-label">{f.label}</label>
        <textarea className="adm-form-textarea" placeholder={f.placeholder} />
      </div>
    );
    if (f.type === 'toggle') return (
      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid #eef0f4' }}>
        <span style={{ fontSize: 13, color: '#0a1628' }}>{f.label}</span>
        <ToggleField def={f.def} />
      </div>
    );
    return (
      <div key={idx} className="adm-form-field">
        <label className="adm-form-label">{f.label}</label>
        <input className="adm-form-input" type={f.type === 'date' ? 'date' : 'text'} placeholder={f.placeholder} />
      </div>
    );
  };

  const renderField = (f, idx) => {
    if (f.type === 'split') return (
      <div key={idx} className="adm-form-grid">
        {renderInner(f.a, idx + 'a')}
        {renderInner(f.b, idx + 'b')}
      </div>
    );
    return renderInner(f, idx);
  };

  const words = title.split(' ');
  const titleEl = words.map((w, i) =>
    i === words.length - 1 ? <em key={i}>{w}</em> : w + ' '
  );

  return (
    <>
      <div className="adm-drawer-head">
        <div>
          <h3>{titleEl}</h3>
          {sub && <div className="adm-drawer-sub">{sub}</div>}
        </div>
        <button className="adm-icon-btn" onClick={close}><i className="ti ti-x" /></button>
      </div>
      <form className="adm-drawer-body" onSubmit={submit}>
        {fields.map(renderField)}
      </form>
      <div className="adm-drawer-foot">
        <button className="adm-btn-sec" type="button" onClick={close}>Cancel</button>
        <button className="adm-btn-pri" type="button" onClick={submit} disabled={submitting}>
          {submitting ? 'Saving…' : <><i className="ti ti-check" />{submitLabel}</>}
        </button>
      </div>
    </>
  );
}

/* ── Shell (layout route component) ─────────────────────────────────────── */
export default function AdminShell() {
  const location = useLocation();
  const active = activeKey(location.pathname);

  // Close the mobile nav whenever the route changes
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  const [toasts, setToasts] = useState([]);
  const [navOpen, setNavOpen] = useState(false);
  const [drawer, setDrawer] = useState(null);

  const toast = useCallback((msg, opts = {}) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, ...opts }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), opts.duration || 3200);
  }, []);

  const openDrawer = useCallback((kind, props = {}) => {
    setDrawer({ kind, props });
    document.body.style.overflow = 'hidden';
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
    document.body.style.overflow = '';
  }, []);

  useEffect(() => () => { document.body.style.overflow = ''; }, []);

  return (
    <AdminShellCtx.Provider value={{ toast, openDrawer, closeDrawer }}>
      <style>{CSS}</style>
      <div className="adm-shell">
        <AdminSidebar active={active} navOpen={navOpen} closeNav={() => setNavOpen(false)} />
        {navOpen && <div className="adm-navback" onClick={() => setNavOpen(false)} />}
        <div className="adm-main">
          <AdminTopbar active={active} openDrawer={openDrawer} openNav={() => setNavOpen(true)} />
          <div className="adm-body">
            <Outlet />
          </div>
        </div>
      </div>
      <ToastHost toasts={toasts} />
      <DrawerHost drawer={drawer} closeDrawer={closeDrawer} toast={toast} />
    </AdminShellCtx.Provider>
  );
}
