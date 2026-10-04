/* Feather-style SVG icons — stroke="currentColor", viewBox="0 0 24 24" */

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' };

export function IcoDashboard()    { return <svg {...P}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>; }
export function IcoUsers()        { return <svg {...P}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
export function IcoBook()         { return <svg {...P}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>; }
export function IcoCalendar()     { return <svg {...P}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
export function IcoBriefcase()    { return <svg {...P}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>; }
export function IcoBarChart()     { return <svg {...P}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6"  y1="20" x2="6"  y2="14"/></svg>; }
export function IcoClock()        { return <svg {...P}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
export function IcoBell()         { return <svg {...P}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
export function IcoSettings()     { return <svg {...P}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
export function IcoClipboard()    { return <svg {...P}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>; }
export function IcoClipboardCheck() { return <svg {...P}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><polyline points="9 14 11 16 15 12"/></svg>; }
export function IcoFileText()     { return <svg {...P}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>; }
export function IcoUser()         { return <svg {...P}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
export function IcoDatabase()     { return <svg {...P}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>; }
export function IcoPencil()       { return <svg {...P}><line x1="18" y1="2" x2="22" y2="6"/><path d="M7.5 20.5 19 9l-4-4L3.5 16.5 2 22z"/></svg>; }
export function IcoTrendingUp()   { return <svg {...P}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>; }
export function IcoGraduationCap(){ return <svg {...P}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>; }
export function IcoMapPin()       { return <svg {...P}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
export function IcoChevronDown()  { return <svg {...P}><polyline points="6 9 12 15 18 9"/></svg>; }
export function IcoGrid()         { return <svg {...P}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>; }
export function IcoAward()        { return <svg {...P}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>; }
export function IcoMegaphone()    { return <svg {...P}><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>; }
export function IcoSchool()       { return <svg {...P}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>; }

/* Building illustration for welcome card */
export function BuildingIllustration() {
  return (
    <svg viewBox="0 0 220 160" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
      {/* Ground */}
      <line x1="5" y1="148" x2="215" y2="148" stroke="#1e3a5f" strokeWidth="1.5" strokeOpacity="0.35"/>

      {/* Trees — far left */}
      <circle cx="18" cy="122" r="13" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.2" strokeOpacity="0.7"/>
      <line x1="18" y1="135" x2="18" y2="148" stroke="#92400e" strokeWidth="1.5" strokeOpacity="0.6"/>

      {/* Trees — far right */}
      <circle cx="202" cy="122" r="13" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.2" strokeOpacity="0.7"/>
      <line x1="202" y1="135" x2="202" y2="148" stroke="#92400e" strokeWidth="1.5" strokeOpacity="0.6"/>

      {/* Steps */}
      <rect x="38" y="140" width="144" height="8" rx="1" fill="#dce3ee" stroke="#1e3a5f" strokeWidth="1" strokeOpacity="0.45"/>
      <rect x="46" y="133" width="128" height="7" rx="1" fill="#e4eaf5" stroke="#1e3a5f" strokeWidth="1" strokeOpacity="0.4"/>

      {/* Main building body */}
      <rect x="52" y="64" width="116" height="69" fill="#edf1f8" stroke="#1e3a5f" strokeWidth="1.3" strokeOpacity="0.55"/>

      {/* Columns */}
      {[65, 82, 110, 138, 155].map(x => (
        <line key={x} x1={x} y1="65" x2={x} y2="133" stroke="#1e3a5f" strokeWidth="1.2" strokeOpacity="0.45"/>
      ))}

      {/* Column entablature */}
      <line x1="52" y1="65" x2="168" y2="65" stroke="#1e3a5f" strokeWidth="1.5" strokeOpacity="0.55"/>

      {/* Pediment */}
      <polyline points="40,65 110,26 180,65" fill="#dce6f4" fillOpacity="0.7" stroke="#1e3a5f" strokeWidth="1.4" strokeOpacity="0.55"/>

      {/* Dome */}
      <ellipse cx="110" cy="26" rx="16" ry="8" fill="#c7d7f0" stroke="#1e3a5f" strokeWidth="1.2" strokeOpacity="0.6"/>
      <line x1="110" y1="18" x2="110" y2="10" stroke="#1e3a5f" strokeWidth="1.2" strokeOpacity="0.6"/>
      <circle cx="110" cy="9" r="2.5" fill="#c9a94b" stroke="none"/>

      {/* Windows */}
      {[58, 88, 124, 148].map(x => (
        <rect key={x} x={x} y={75} width={14} height={18} rx="1.5" fill="#a5c0e8" stroke="#1e3a5f" strokeWidth="1" strokeOpacity="0.5"/>
      ))}

      {/* Door */}
      <path d="M101 133 L101 108 Q110 104 119 108 L119 133" fill="#b3c9e0" stroke="#1e3a5f" strokeWidth="1.2" strokeOpacity="0.6"/>

      {/* NEMSU text on pediment */}
      <text x="110" y="50" textAnchor="middle" fill="#1e3a5f" fillOpacity="0.5" fontSize="7" fontWeight="700" letterSpacing="1">NEMSU</text>

      {/* Small trees near building */}
      <circle cx="40" cy="128" r="9" fill="#dcfce7" stroke="#16a34a" strokeWidth="1" strokeOpacity="0.6"/>
      <line x1="40" y1="137" x2="40" y2="148" stroke="#92400e" strokeWidth="1.2" strokeOpacity="0.55"/>
      <circle cx="180" cy="128" r="9" fill="#dcfce7" stroke="#16a34a" strokeWidth="1" strokeOpacity="0.6"/>
      <line x1="180" y1="137" x2="180" y2="148" stroke="#92400e" strokeWidth="1.2" strokeOpacity="0.55"/>
    </svg>
  );
}
