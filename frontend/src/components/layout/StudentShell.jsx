import { Link, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export const ShellCtx = createContext(null);
export const useShell = () => useContext(ShellCtx);

function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return p.length === 1 ? (p[0][0] || '?').toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

const NAV = [
  { key: 'dashboard',    path: '/student/dashboard',    icon: 'ti-layout-dashboard', label: 'Dashboard',         section: 'overview' },
  { key: 'grades',       path: '/student/grades',       icon: 'ti-school',           label: 'My Grades',         section: 'academic' },
  { key: 'schedule',     path: '/student/schedule',     icon: 'ti-calendar-event',   label: 'My Schedule',       section: 'academic' },
  { key: 'curriculum',   path: '/student/curriculum',   icon: 'ti-route',            label: 'Curriculum',        section: 'academic' },
  { key: 'documents',    path: '/student/documents',    icon: 'ti-file-text',        label: 'Document Requests', section: 'services' },
  { key: 'payments',     path: '/student/payments',     icon: 'ti-wallet',           label: 'Payments & Fees',   section: 'services' },
  { key: 'scholarships', path: '/student/scholarships', icon: 'ti-award',            label: 'Scholarships',      section: 'services' },
  { key: 'clearance',    path: '/student/clearance',    icon: 'ti-checkup-list',     label: 'Clearance',         section: 'services' },
  { key: 'announcements',path: '/student/announcements',icon: 'ti-bell',             label: 'Announcements',     section: 'campus' },
  { key: 'spotlight',    path: '/student/spotlight',    icon: 'ti-news',             label: 'Campus Spotlight',  section: 'campus' },
  { key: 'profile',      path: '/student/profile',      icon: 'ti-user',             label: 'My Profile',        section: 'campus' },
];

const GROUPS = [
  { id: 'overview', label: 'Overview' },
  { id: 'academic', label: 'Academic' },
  { id: 'services', label: 'Services' },
  { id: 'campus',   label: 'Campus'   },
];

const CRUMB = {
  dashboard: 'Dashboard', grades: 'My Grades',
  schedule: 'My Schedule', curriculum: 'Curriculum', documents: 'Document Requests',
  payments: 'Payments & Fees', scholarships: 'Scholarships', clearance: 'Clearance',
  announcements: 'Announcements', spotlight: 'Campus Spotlight', profile: 'My Profile',
};

const CSS = `
  :root {
    --ink:  #0a1628; --ink-2: #1e3a5f; --ink-3: #0f1f3a;
    --muted:#5a6478; --faint: #8a93a3;
    --warm: #f8f7f3; --cool:  #f4f6fa; --cool-2:#eef1f7;
    --line: #e5e7eb; --line-soft:#eef0f4;
    --line-dark:rgba(255,255,255,.08); --line-dark-2:rgba(255,255,255,.16);
    --gold: #b89043; --gold-soft:#d9b96b; --gold-tint:#f5edd9;
    --green:#0a7c52; --green-tint:#e6f1ec;
    --red:  #a8331e; --red-tint:  #f6e8e4;
    --amber:#a06b16; --amber-tint:#f7eed8;
    --on-dark:#e8ecf2;
    --on-dark-mute:rgba(232,236,242,.62);
    --on-dark-faint:rgba(232,236,242,.40);
  }
  .stu-shell{display:flex;min-height:100vh;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:var(--ink);-webkit-font-smoothing:antialiased;}
  .stu-sidebar{flex:0 0 260px;background:var(--ink);color:var(--on-dark);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;}
  .sb-brand{display:flex;align-items:center;gap:12px;padding:1.5rem 1.5rem 1.25rem;border-bottom:1px solid var(--line-dark);}
  .sb-brand img{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.04);padding:2px;}
  .sb-brand-text{line-height:1.2;min-width:0;}
  .sb-brand-name{font-size:20px;color:#fff;letter-spacing:-.01em;font-weight:500;}
  .sb-brand-sub{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-soft);margin-top:3px;font-weight:600;}
  .sb-section{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--on-dark-faint);font-weight:600;padding:1.5rem 1.5rem .75rem;}
  .sb-nav{flex:1;overflow-y:auto;padding:0 .75rem .5rem;}
  .sb-nav::-webkit-scrollbar{width:4px;}
  .sb-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px;}
  .sb-link{display:flex;align-items:center;gap:12px;padding:10px 14px;color:var(--on-dark-mute);font-size:13px;font-weight:500;text-decoration:none;border-left:2px solid transparent;transition:background .15s,color .15s,border-color .15s;}
  .sb-link i{font-size:17px;flex-shrink:0;}
  .sb-link:hover{color:#fff;background:rgba(255,255,255,.03);}
  .sb-link.active{color:#fff;background:rgba(184,144,67,.10);border-left-color:var(--gold);font-weight:600;}
  .sb-link .sb-badge{margin-left:auto;font-size:10px;background:var(--gold);color:#fff;padding:2px 7px;letter-spacing:.06em;font-weight:700;}
  .sb-foot{padding:1rem 1.5rem;border-top:1px solid var(--line-dark);display:flex;align-items:center;gap:10px;font-size:12px;}
  .sb-foot i{color:var(--gold-soft);font-size:14px;}
  .sb-foot .campus{color:#fff;font-weight:500;}
  .sb-foot .loc{font-size:11px;color:var(--on-dark-faint);}
  .stu-main{flex:1;min-width:0;display:flex;flex-direction:column;background:var(--cool);}
  .stu-topbar{background:#fff;border-bottom:1px solid var(--line);padding:0 2rem;height:72px;display:flex;align-items:center;gap:1.5rem;flex-shrink:0;}
  .crumbs{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--muted);letter-spacing:.04em;}
  .crumbs i{font-size:11px;color:var(--faint);}
  .crumbs .here{color:var(--ink);font-weight:500;}
  .stu-ts{flex:1;max-width:380px;margin-left:1rem;position:relative;display:flex;align-items:center;}
  .stu-ts i{position:absolute;left:12px;font-size:16px;color:var(--faint);pointer-events:none;}
  .stu-ts input{width:100%;padding:9px 14px 9px 36px;font:14px/1.4 'Inter',sans-serif;color:var(--ink);background:var(--cool);border:1px solid transparent;outline:none;transition:border-color .15s,background .15s;}
  .stu-ts input:focus{background:#fff;border-color:var(--line);}
  .stu-ts input::placeholder{color:var(--faint);}
  .stu-ts .kbd{position:absolute;right:10px;font-size:10px;letter-spacing:.04em;padding:2px 6px;border:1px solid var(--line);color:var(--faint);background:#fff;font-weight:500;}
  .stu-ta{display:flex;align-items:center;gap:.75rem;margin-left:auto;}
  .term-chip{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;font-size:12px;color:var(--ink);border:1px solid var(--line);background:#fff;font-weight:500;}
  .term-chip i{font-size:14px;color:var(--gold);}
  .icon-btn{width:38px;height:38px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);background:#fff;cursor:pointer;color:var(--ink);position:relative;transition:border-color .15s;}
  .icon-btn i{font-size:18px;}
  .icon-btn:hover{border-color:var(--ink);}
  .icon-btn .dot{position:absolute;top:7px;right:7px;width:6px;height:6px;border-radius:50%;background:var(--red);}
  .stu-uc{display:flex;align-items:center;gap:10px;padding:5px 14px 5px 5px;border:1px solid var(--line);background:#fff;cursor:pointer;transition:border-color .15s;}
  .stu-uc:hover{border-color:var(--ink);}
  .stu-av{width:30px;height:30px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;letter-spacing:.05em;flex-shrink:0;}
  .stu-um{line-height:1.2;text-align:left;}
  .stu-um .name{font-size:12px;font-weight:600;color:var(--ink);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .stu-um .role{font-size:10px;color:var(--muted);text-transform:capitalize;letter-spacing:.04em;}
  .stu-uc>i{font-size:13px;color:var(--faint);}
  .stu-content{padding:2rem 2.5rem 3rem;display:flex;flex-direction:column;gap:1.75rem;}

  /* Welcome */
  .welcome{display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;padding-bottom:1.5rem;border-bottom:1px solid var(--line);}
  .welcome-head h1{font-family:'Inter',sans-serif;font-weight:500;font-size:42px;color:var(--ink);line-height:1.05;letter-spacing:-.018em;margin-bottom:.5rem;}
  .welcome-head h1 em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--ink-2);font-weight:400;}
  .welcome-eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:.5rem;display:inline-flex;align-items:center;gap:10px;}
  .welcome-eyebrow::before{content:"";width:24px;height:1px;background:var(--gold);}
  .welcome-head p{font-size:14px;color:var(--muted);max-width:560px;line-height:1.65;}
  .welcome-side{display:flex;flex-direction:column;align-items:flex-end;gap:8px;}
  .live-indicator{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600;}
  .live-indicator .dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px rgba(10,124,82,.16);}
  .welcome-side .stamp{font-size:12px;color:var(--faint);}

  /* KPI strip */
  .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:0;background:#fff;border:1px solid var(--line);}
  .kpi{padding:1.5rem 1.5rem 1.25rem;border-right:1px solid var(--line);display:flex;flex-direction:column;justify-content:space-between;min-height:140px;position:relative;transition:background .2s;}
  .kpi:last-child{border-right:none;}
  .kpi:hover{background:var(--warm);}
  .kpi-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;}
  .kpi-label{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;line-height:1.4;}
  .kpi-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);color:var(--ink);}
  .kpi-icon i{font-size:16px;}
  .kpi-value{font-family:'Inter',sans-serif;font-weight:500;font-size:48px;line-height:1;color:var(--ink);letter-spacing:-.02em;}
  .kpi-value.green{color:var(--green);}
  .kpi-value.amber{color:var(--amber);}
  .kpi-sub{font-size:12px;color:var(--muted);margin-top:8px;display:flex;align-items:center;gap:6px;}

  /* Section heading */
  .sec-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:1rem;}
  .sec-head h3{font-family:'Inter',sans-serif;font-weight:500;font-size:22px;color:var(--ink);letter-spacing:-.008em;line-height:1.1;}
  .sec-head h3 em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--ink-2);font-weight:400;}
  .sec-head .sub{font-size:12px;color:var(--muted);margin-top:3px;}
  .sec-head .actions{display:flex;gap:8px;}
  .sec-action{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600;text-decoration:none;padding:6px 10px;border:1px solid var(--line);background:#fff;cursor:pointer;font-family:inherit;transition:border-color .15s,color .15s;}
  .sec-action:hover{border-color:var(--ink);color:var(--ink);}

  /* Card */
  .card{background:#fff;border:1px solid var(--line);padding:1.5rem 1.5rem 1.25rem;display:flex;flex-direction:column;}
  .card-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--line-soft);}
  .card-head h4{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;line-height:1.3;}
  .card-head h4 span{display:block;font-family:'Inter',sans-serif;font-weight:400;font-size:20px;color:var(--ink);text-transform:none;letter-spacing:-.01em;margin-top:4px;}

  /* Grid layouts */
  .row-2{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;}
  .row-3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;}
  .row-21{display:grid;grid-template-columns:2fr 1fr;gap:1.5rem;}

  /* Health bar */
  .health-bar{height:6px;background:var(--line-soft);position:relative;overflow:hidden;}
  .health-bar-fill{height:100%;transition:width .8s cubic-bezier(.4,0,.2,1);}

  /* Activity feed */
  .activity{display:flex;flex-direction:column;}
  .activity-row{display:grid;grid-template-columns:auto 1fr auto auto;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line-soft);}
  .activity-row:last-child{border-bottom:none;}
  .act-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:var(--cool);color:var(--ink);}
  .act-icon i{font-size:14px;}
  .act-meta{min-width:0;}
  .act-text{font-size:13px;color:var(--ink);line-height:1.4;}
  .act-text strong{font-weight:500;}
  .act-sub{font-size:11px;color:var(--muted);margin-top:2px;}
  .act-tag{font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;padding:3px 8px;}
  .act-tag.created,.act-tag.approved{background:var(--green-tint);color:var(--green);}
  .act-tag.updated{background:var(--cool);color:var(--ink-2);}
  .act-tag.rejected{background:var(--red-tint);color:var(--red);}
  .act-time{font-size:11px;color:var(--faint);font-variant-numeric:tabular-nums;}

  /* Quick actions */
  .quick{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--line);background:#fff;}
  .quick-item{padding:1.25rem 1.25rem 1.1rem;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:.5rem;cursor:pointer;text-decoration:none;color:var(--ink);transition:background .15s,padding-left .15s;}
  .quick-item:last-child{border-right:none;}
  .quick-item:hover{background:var(--warm);padding-left:1.5rem;}
  .quick-icon{width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:var(--ink);border:1px solid var(--line);background:#fff;margin-bottom:.5rem;}
  .quick-icon i{font-size:16px;}
  .quick-title{font-size:13px;font-weight:600;color:var(--ink);line-height:1.3;}
  .quick-desc{font-size:11px;color:var(--muted);line-height:1.5;}

  /* Footer note */
  .foot-note{font-size:11px;color:var(--faint);letter-spacing:.04em;padding-top:.5rem;border-top:1px solid var(--line-soft);display:flex;justify-content:space-between;}
  .foot-note .live{display:inline-flex;align-items:center;gap:6px;}
  .foot-note .live .dot{width:5px;height:5px;border-radius:50%;background:var(--green);}

  /* Toast */
  .stu-toast-host{position:fixed;bottom:1.5rem;right:1.5rem;z-index:1100;display:flex;flex-direction:column;gap:8px;pointer-events:none;}
  .stu-toast{pointer-events:auto;background:var(--ink);color:#fff;padding:12px 16px 12px 12px;min-width:280px;max-width:380px;display:flex;align-items:flex-start;gap:12px;animation:stuToastIn .25s cubic-bezier(.4,0,.2,1);border-left:3px solid var(--gold);}
  .stu-toast.success{border-left-color:var(--green);}
  .stu-toast.warn{border-left-color:var(--amber);}
  .stu-toast.error{border-left-color:var(--red);}
  .stu-t-icon{width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);flex-shrink:0;color:var(--gold-soft);}
  .stu-toast.success .stu-t-icon{color:#5dd6a1;}
  .stu-toast.warn .stu-t-icon{color:#f0c878;}
  .stu-toast.error .stu-t-icon{color:#e88b78;}
  .stu-t-icon i{font-size:14px;}
  .stu-t-body{flex:1;min-width:0;line-height:1.45;}
  .stu-t-msg{font-size:13px;font-weight:500;}
  .stu-t-sub{font-size:11px;color:rgba(255,255,255,.6);margin-top:2px;}
  @keyframes stuToastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}

  /* Drawer */
  .stu-dback{position:fixed;inset:0;background:rgba(10,22,40,.55);backdrop-filter:blur(6px);z-index:1050;animation:stuFadeIn .2s ease;}
  @keyframes stuFadeIn{from{opacity:0}to{opacity:1}}
  @keyframes stuDrawerIn{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}
  .stu-drawer{position:fixed;top:0;right:0;bottom:0;width:520px;max-width:92vw;background:#fff;z-index:1051;display:flex;flex-direction:column;animation:stuDrawerIn .28s cubic-bezier(.4,0,.2,1);box-shadow:-20px 0 40px -20px rgba(10,22,40,.25);}
  .stu-dhead{padding:1.5rem 1.75rem;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0;}
  .stu-dhead h3{font-family:'Inter',sans-serif;font-weight:500;font-size:26px;letter-spacing:-.015em;color:var(--ink);line-height:1.1;}
  .stu-dhead h3 em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--ink-2);font-weight:400;}
  .stu-dhead .sub{font-size:13px;color:var(--muted);margin-top:6px;}
  .stu-dbody{padding:1.5rem 1.75rem;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:1.25rem;}
  .stu-dfoot{padding:1rem 1.75rem;border-top:1px solid var(--line);background:var(--warm);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0;}
  .stu-dmenu{display:flex;flex-direction:column;}
  .stu-dmi{display:flex;align-items:center;gap:12px;padding:12px 0;font-size:13px;color:var(--ink);text-decoration:none;cursor:pointer;border-bottom:1px solid var(--line-soft);transition:padding-left .15s;background:none;border-left:0;border-right:0;border-top:0;font-family:inherit;text-align:left;width:100%;}
  .stu-dmi:hover{padding-left:8px;color:var(--ink-2);}
  .stu-dmi:last-child{border-bottom:none;}
  .stu-dmi i{font-size:16px;color:var(--muted);width:18px;text-align:center;}
  .stu-dmi.danger{color:var(--red);}
  .stu-dmi.danger i{color:var(--red);}

  /* Page head */
  .page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;padding-bottom:1.5rem;border-bottom:1px solid var(--line);margin-bottom:1.5rem;flex-wrap:wrap;}
  .page-head .eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:.5rem;display:inline-flex;align-items:center;gap:10px;}
  .page-head .eyebrow::before{content:"";width:24px;height:1px;background:var(--gold);}
  .page-head h2{font-family:'Inter',sans-serif;font-weight:500;font-size:38px;letter-spacing:-.02em;line-height:1.05;color:var(--ink);}
  .page-head h2 em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;color:var(--ink-2);font-weight:400;}
  .page-head .sub{font-size:14px;color:var(--muted);margin-top:6px;max-width:540px;line-height:1.55;}
  .page-head .actions{display:flex;gap:8px;flex-shrink:0;}

  /* Toolbar */
  .toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:1.25rem;}
  .toolbar-search{flex:1;max-width:380px;min-width:220px;position:relative;display:flex;align-items:center;}
  .toolbar-search i{position:absolute;left:12px;color:var(--faint);font-size:15px;pointer-events:none;}
  .toolbar-search input{width:100%;padding:9px 14px 9px 34px;background:#fff;border:1px solid var(--line);outline:none;font:13px/1.4 'Inter',sans-serif;color:var(--ink);}
  .toolbar-search input:focus{border-color:var(--ink);}
  .toolbar select,.toolbar input[type="date"]{padding:9px 12px;background:#fff;border:1px solid var(--line);outline:none;font:13px/1.4 'Inter',sans-serif;color:var(--ink);font-family:inherit;}

  /* Buttons */
  .btn-pri{padding:9px 16px;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);background:var(--ink);color:#fff;border:1px solid var(--ink);font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit;transition:background .15s;}
  .btn-pri:hover{background:#000;}
  .btn-pri i{font-size:14px;}
  .btn-sec{padding:9px 14px;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);background:#fff;color:var(--ink);border:1px solid var(--line);font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit;transition:border-color .15s;}
  .btn-sec:hover{border-color:var(--ink);}
  .btn-sec i{font-size:14px;}
  .btn-ghost{padding:5px 8px;background:transparent;color:var(--muted);border:none;cursor:pointer;font-family:inherit;font-size:12px;display:inline-flex;align-items:center;gap:4px;}
  .btn-ghost:hover{color:var(--ink);}

  /* Table */
  .table-wrap{background:#fff;border:1px solid var(--line);overflow:hidden;}
  .table-wrap .table{width:100%;border-collapse:collapse;}
  .table-wrap .table thead th{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;text-align:left;padding:14px 18px;border-bottom:1px solid var(--line);background:var(--warm);}
  .table-wrap .table tbody td{padding:14px 18px;font-size:13px;color:var(--ink);border-bottom:1px solid var(--line-soft);vertical-align:middle;}
  .table-wrap .table tbody tr:last-child td{border-bottom:none;}
  .table-wrap .table tbody tr:hover{background:var(--warm);}
  .table-wrap .table td.num,.table-wrap .table th.num{font-variant-numeric:tabular-nums;text-align:right;}
  .table-wrap .table td.muted{color:var(--muted);font-size:12px;}

  /* Tags */
  .tag{display:inline-flex;align-items:center;gap:5px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;padding:3px 8px;}
  .tag.role-student{background:#eef2fa;color:#1e3a5f;}
  .tag.role-faculty{background:#f5edd9;color:#83662a;}
  .tag.role-registrar{background:#e6f1ec;color:#0a7c52;}
  .tag.role-admin{background:#f6e8e4;color:#a8331e;}
  .tag.status-active{background:#e6f1ec;color:#0a7c52;}
  .tag.status-inactive{background:#f3f4f6;color:#5a6478;}
  .tag.status-locked{background:#f7eed8;color:#a06b16;}
  .tag.status-unverified{background:#f3f4f6;color:#5a6478;}
  .tag.outline{background:transparent;border:1px solid var(--line);color:var(--muted);}
  .tag.pending{background:#f7eed8;color:#a06b16;}
  .tag.success{background:#e6f1ec;color:#0a7c52;}
  .tag.failure,.tag.rejected-tag{background:#f6e8e4;color:#a8331e;}

  /* Avatar */
  .avatar{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:var(--ink);color:#fff;font-size:11px;font-weight:600;flex-shrink:0;letter-spacing:.04em;}
  .avatar.gold{background:var(--gold);}

  /* Stat row */
  .stat-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0;background:#fff;border:1px solid var(--line);margin-bottom:1.5rem;}
  .stat-row .stat{padding:1.25rem 1.5rem;border-right:1px solid var(--line);}
  .stat-row .stat:last-child{border-right:none;}
  .stat-row .stat .num{font-family:'Inter',sans-serif;font-weight:500;font-size:32px;line-height:1;color:var(--ink);letter-spacing:-.02em;}
  .stat-row .stat .num.green{color:var(--green);}
  .stat-row .stat .num.amber{color:var(--amber);}
  .stat-row .stat .num.red{color:var(--red);}
  .stat-row .stat .lbl{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-top:8px;}

  /* Info section */
  .info-section{background:#fff;border:1px solid var(--line);margin-bottom:1.5rem;}
  .info-section-head{padding:1rem 1.5rem;border-bottom:1px solid var(--line);background:var(--warm);display:flex;justify-content:space-between;align-items:center;}
  .info-section-head h4{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink);font-weight:600;}
  .info-row{display:grid;grid-template-columns:200px 1fr;gap:1rem;padding:14px 1.5rem;border-bottom:1px solid var(--line-soft);font-size:13px;min-width:0;}
  .info-row:last-child{border-bottom:none;}
  .info-row .lbl{color:var(--muted);min-width:0;}
  .info-row .val{color:var(--ink);font-weight:500;min-width:0;overflow-wrap:anywhere;}
  .info-row .val.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;}
  .pf-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:1.5rem;align-items:start;}
  @media(max-width:900px){.pf-grid{grid-template-columns:1fr;}}
  @media(max-width:560px){.info-row{grid-template-columns:1fr;gap:2px;}}

  /* Subtabs */
  .subtabs{display:flex;gap:0;border-bottom:1px solid var(--line);margin-bottom:1.5rem;}
  .subtab{padding:12px 18px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;background:none;border:none;border-bottom:2px solid transparent;font-family:inherit;transition:color .15s,border-color .15s;}
  .subtab:hover{color:var(--ink);}
  .subtab.active{color:var(--ink);border-bottom-color:var(--ink);font-weight:600;}

  /* Form */
  .form-input,.form-select,.form-textarea{padding:10px 12px;font-size:13px;background:#fff;border:1px solid var(--line);outline:none;color:var(--ink);font-family:inherit;border-radius:0;width:100%;box-sizing:border-box;}
  .form-input:focus,.form-select:focus,.form-textarea:focus{border-color:var(--ink);}
  .form-textarea{min-height:120px;resize:vertical;font-family:inherit;line-height:1.55;}

  /* Empty */
  .stu-empty{padding:3rem;text-align:center;background:#fff;border:1px solid var(--line);}
  .stu-empty i{font-size:32px;color:var(--faint);margin-bottom:.75rem;display:block;}
  .stu-empty .t{font-family:'Inter',sans-serif;font-weight:500;font-size:22px;color:var(--ink);margin-bottom:6px;letter-spacing:-.01em;}
  .stu-empty .d{font-size:13px;color:var(--muted);max-width:380px;margin:0 auto;line-height:1.6;}

  /* Page transition */
  @keyframes stuPageIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .page{animation:stuPageIn .25s cubic-bezier(.4,0,.2,1);}

  /* Responsive */
  @media(max-width:1280px){
    .kpis{grid-template-columns:repeat(3,1fr);}
    .kpi:nth-child(3){border-right:none;}
    .kpi:nth-child(-n+3){border-bottom:1px solid var(--line);}
  }
  .stu-navtoggle{display:none;align-items:center;justify-content:center;width:40px;height:40px;flex-shrink:0;border:1px solid var(--line);background:#fff;border-radius:10px;color:var(--ink);font-size:20px;cursor:pointer;}
  .stu-navback{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:60;}

  @media(max-width:980px){
    .stu-sidebar{position:fixed;top:0;left:0;bottom:0;z-index:70;width:262px;height:100dvh;transform:translateX(-100%);transition:transform .22s ease;}
    .stu-sidebar.is-open{transform:none;}
    .stu-navtoggle{display:inline-flex;}
    .stu-topbar{height:64px;padding:0 1rem;gap:.75rem;}
    .stu-content{padding:1.25rem 1rem 2.5rem;gap:1.25rem;}
    .row-2,.row-21{grid-template-columns:1fr;}
    .kpis{grid-template-columns:repeat(2,1fr);}
    .quick{grid-template-columns:1fr 1fr;}
    .stu-ts{display:none;}
  }

  @media(max-width:560px){
    .stu-content{padding:1rem .85rem 2rem;}
    .kpis,.quick{grid-template-columns:1fr;}
    .kpi{border-right:none!important;border-bottom:1px solid var(--line);}
    .crumbs{font-size:11px;min-width:0;overflow:hidden;}
    .crumbs .here{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .stu-toast-host{left:.75rem;right:.75rem;bottom:.75rem;}
  }
  @media(max-width:700px){
    .stu-um{display:none;}
    .stu-uc{padding:4px;gap:0;}
    .stu-uc .ti-chevron-down{display:none;}
    .term-chip{display:none;}
    .stu-ta{gap:.4rem;min-width:0;}
  }

  @media(max-width:620px){
    /* Stat tiles: let content shrink and wrap instead of forcing the page wide */
    .stat-row{grid-template-columns:repeat(auto-fit,minmax(140px,1fr));}
    .stat-row .stat{padding:1rem .9rem;min-width:0;}
    .stat-row .stat .num{font-size:24px;min-width:0;overflow-wrap:anywhere;}
    .stat-row .stat .lbl{min-width:0;overflow-wrap:anywhere;}
    .tag{white-space:normal;overflow-wrap:anywhere;letter-spacing:.05em;max-width:100%;}
  }

  /* Enrollment history card — collapses from 5 columns to a stacked card */
  .enr-hcard{display:grid;grid-template-columns:auto 1fr auto auto auto;gap:1.5rem;}
  @media(max-width:860px){
    .enr-hcard{grid-template-columns:auto 1fr;gap:.9rem 1rem;}
    .enr-hcard > :nth-child(3),.enr-hcard > :nth-child(4){grid-column:2;text-align:left;}
    .enr-hcard > .tag{grid-column:2;justify-self:start;}
  }
  @media(max-width:480px){
    .enr-hcard{grid-template-columns:1fr;}
    .enr-hcard > *{grid-column:1!important;}
  }

  /* Narrow laptops/tablets: the docked sidebar leaves the main column tight,
     so compact the topbar and let wide tables scroll inside their own box. */
  @media(max-width:1100px){
    .stu-topbar{gap:.6rem;}
    .stu-topbar-actions,.stu-ta{min-width:0;gap:.45rem;}
    .stu-user-chip,.stu-uc{min-width:0;}
    .stu-user-name,.stu-user-role,.stu-user-meta,.stu-um{display:none;}
    .stu-term-chip,.stu-topbar-term,.term-chip{display:none;}
    .stu-topbar-search,.stu-search,.stu-ts{display:none;}
    .stu-content table{display:block;width:100%;max-width:100%;overflow-x:auto;}
    .stu-content .page,.stu-content .db-card{min-width:0;max-width:100%;}
  }

`;

/* ─── Sidebar ─────────────────────────────────────────────── */
function Sidebar({ active, navOpen, closeNav }) {
  return (
    <aside className={`stu-sidebar${navOpen ? ' is-open' : ''}`} onClick={closeNav}>
      <div className="sb-brand">
        <img src="/logo.png" alt="NEMSU" />
        <div className="sb-brand-text">
          <div className="sb-brand-name">NEMSUone<span style={{ opacity: .65 }}>Portal</span></div>
          <div className="sb-brand-sub">Cantilan Campus</div>
        </div>
      </div>

      <nav className="sb-nav">
        {GROUPS.map(g => {
          const items = NAV.filter(n => n.section === g.id);
          return (
            <div key={g.id}>
              <div className="sb-section">{g.label}</div>
              {items.map(item => (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`sb-link${active === item.key ? ' active' : ''}`}
                >
                  <i className={`ti ${item.icon}`} />
                  <span>{item.label}</span>
                  {item.badge && <span className="sb-badge">{item.badge}</span>}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sb-foot">
        <i className="ti ti-map-pin" />
        <div>
          <div className="campus">Cantilan Campus</div>
          <div className="loc">Cantilan, Surigao del Sur</div>
        </div>
      </div>
    </aside>
  );
}

/* ─── Topbar ──────────────────────────────────────────────── */
function Topbar({ user, logout, currentTerm, onBell, onAccount, pathKey, openNav }) {
  return (
    <header className="stu-topbar">
      <button className="stu-navtoggle" onClick={openNav} aria-label="Open navigation">
        <i className="ti ti-menu-2" />
      </button>
      <div className="crumbs">
        <span>Student Portal</span>
        <i className="ti ti-chevron-right" />
        <span className="here">{CRUMB[pathKey] || pathKey}</span>
      </div>

      <div className="stu-ts">
        <i className="ti ti-search" />
        <input placeholder="Search…" readOnly />
        <span className="kbd">⌘K</span>
      </div>

      <div className="stu-ta">
        {currentTerm && (
          <div className="term-chip">
            <i className="ti ti-calendar" />
            {currentTerm.semester_display} {currentTerm.year}
          </div>
        )}
        <button className="icon-btn" onClick={onBell} title="Notifications">
          <i className="ti ti-bell" />
          <span className="dot" />
        </button>
        <button className="stu-uc" onClick={onAccount} title="Account">
          <div className="stu-av">{initials(user?.full_name)}</div>
          <div className="stu-um">
            <div className="name">{user?.full_name}</div>
            <div className="role">Student</div>
          </div>
          <i className="ti ti-chevron-down" />
        </button>
      </div>
    </header>
  );
}

/* ─── Toast host ──────────────────────────────────────────── */
function ToastHost({ toasts }) {
  if (!toasts.length) return null;
  const iconMap = { success: 'ti-circle-check', error: 'ti-circle-x', warn: 'ti-alert-circle' };
  return (
    <div className="stu-toast-host">
      {toasts.map(t => (
        <div key={t.id} className={`stu-toast ${t.type || ''}`}>
          <div className="stu-t-icon">
            <i className={`ti ${iconMap[t.type] || 'ti-info-circle'}`} />
          </div>
          <div className="stu-t-body">
            <div className="stu-t-msg">{t.msg}</div>
            {t.sub && <div className="stu-t-sub">{t.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Drawer host ─────────────────────────────────────────── */
function DrawerHost({ drawer, onClose, user, logout }) {
  const { type, data } = drawer;
  return (
    <>
      <div className="stu-dback" onClick={onClose} />
      <div className="stu-drawer">
        {type === 'account' && (
          <>
            <div className="stu-dhead">
              <div>
                <h3>My <em>account</em></h3>
                <div className="sub">{user?.full_name} · Student</div>
              </div>
              <button className="btn-ghost" onClick={onClose}><i className="ti ti-x" /></button>
            </div>
            <div className="stu-dbody">
              <div className="stu-dmenu">
                <Link to="/student/profile" className="stu-dmi" onClick={onClose}>
                  <i className="ti ti-user" />My Profile
                </Link>
                <button className="stu-dmi danger" onClick={() => { onClose(); logout(); }}>
                  <i className="ti ti-logout" />Sign out
                </button>
              </div>
            </div>
          </>
        )}

        {type === 'notifications' && (
          <>
            <div className="stu-dhead">
              <div><h3>Notifications</h3></div>
              <button className="btn-ghost" onClick={onClose}><i className="ti ti-x" /></button>
            </div>
            <div className="stu-dbody">
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>No new notifications.</p>
            </div>
          </>
        )}

        {type === 'row-detail' && data && (
          <>
            <div className="stu-dhead">
              <div>
                <h3>{data.kind}</h3>
                {data.label && <div className="sub">{data.label}</div>}
              </div>
              <button className="btn-ghost" onClick={onClose}><i className="ti ti-x" /></button>
            </div>
            <div className="stu-dbody">
              <div className="info-section" style={{ marginBottom: 0 }}>
                {(data.rows || []).map(([k, v]) => (
                  <div className="info-row" key={k}>
                    <span className="lbl">{k}</span>
                    <span className="val">{v ?? '-'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="stu-dfoot">
              <button className="btn-sec" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─── Shell ───────────────────────────────────────────────── */
export default function StudentShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [currentTerm, setCurrentTerm] = useState(null);
  const [toasts, setToasts]           = useState([]);
  const [drawer, setDrawer]           = useState(null);
  const [navOpen, setNavOpen]         = useState(false);

  const segments = location.pathname.split('/').filter(Boolean);
  const pathKey  = segments[segments.length - 1] || 'dashboard';

  useEffect(() => {
    api.get('/enrollment/current-term/').then(r => setCurrentTerm(r.data)).catch(() => {});
  }, []);

  // Close the mobile nav whenever the route changes
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  function toast(msg, opts = {}) {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, ...opts }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }

  function openDrawer(type, data) { setDrawer({ type, data }); }
  function closeDrawer()          { setDrawer(null); }

  return (
    <ShellCtx.Provider value={{ toast, openDrawer, closeDrawer, currentTerm }}>
      <style>{CSS}</style>
      <div className="stu-shell">
        <Sidebar active={pathKey} navOpen={navOpen} closeNav={() => setNavOpen(false)} />
        {navOpen && <div className="stu-navback" onClick={() => setNavOpen(false)} />}
        <main className="stu-main">
          <Topbar
            user={user} logout={logout} currentTerm={currentTerm}
            onBell={() => openDrawer('notifications')}
            onAccount={() => openDrawer('account')}
            pathKey={pathKey}
            openNav={() => setNavOpen(true)}
          />
          <div className="stu-content">
            <Outlet />
          </div>
        </main>
        <ToastHost toasts={toasts} />
        {drawer && (
          <DrawerHost drawer={drawer} onClose={closeDrawer} user={user} logout={logout} />
        )}
      </div>
    </ShellCtx.Provider>
  );
}
