import { useEffect, useState } from 'react';
import api from '../../api/axios';

const TARGET_META = {
  all:     { label: 'All users',     color: '#1e40af', bg: '#dbeafe' },
  student: { label: 'Students',      color: '#065f46', bg: '#d1fae5' },
  faculty: { label: 'Faculty',       color: '#92400e', bg: '#fef3c7' },
  public:  { label: 'Public',        color: '#6b21a8', bg: '#f3e8ff' },
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function StudentAnnouncements() {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [activeSearch, setActive]   = useState('');
  const [expandedId, setExpanded]   = useState(null);

  function fetchAnnouncements(q = '') {
    setLoading(true);
    setError('');
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    api.get(`/announcements/${params}`)
      .then(res => setItems(res.data.results ?? res.data))
      .catch(() => setError('Failed to load announcements.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchAnnouncements(); }, []);

  function handleSearch(e) {
    e.preventDefault();
    const q = search.trim();
    setActive(q);
    fetchAnnouncements(q);
  }

  function clearSearch() {
    setSearch('');
    setActive('');
    fetchAnnouncements('');
  }

  const pinned  = items.filter(a => a.is_pinned);
  const regular = items.filter(a => !a.is_pinned);
  const ordered = [...pinned, ...regular];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Announcements</h1>
          <p className="sub">School-wide notices and updates</p>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem' }}>
        <div style={{ position:'relative', flex:1, maxWidth:420 }}>
          <i className="ti ti-search" style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:'var(--muted)', pointerEvents:'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search announcements…"
            style={{
              width:'100%', padding:'0.55rem 2.5rem 0.55rem 2.25rem',
              border:'1.5px solid var(--rule)', borderRadius:8,
              fontSize:'0.875rem', background:'#fff', color:'var(--ink)',
              outline:'none', boxSizing:'border-box',
            }}
          />
          {activeSearch && (
            <button type="button" onClick={clearSearch} style={{
              position:'absolute', right:'0.6rem', top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', cursor:'pointer', color:'var(--muted)', padding:0,
            }}>
              <i className="ti ti-x" />
            </button>
          )}
        </div>
        <button type="submit" className="btn-pri">Search</button>
      </form>

      {activeSearch && (
        <p style={{ fontSize:'0.85rem', color:'var(--muted)', marginBottom:'1rem' }}>
          Showing results for <strong>"{activeSearch}"</strong>: {ordered.length} found
        </p>
      )}

      {loading && <p style={{ color:'var(--muted)' }}>Loading…</p>}
      {error   && <p style={{ color:'#dc2626' }}>{error}</p>}

      {!loading && !error && ordered.length === 0 && (
        <div className="stu-empty">
          <i className="ti ti-speakerphone" />
          <p>{activeSearch ? 'No announcements match your search.' : 'No announcements yet.'}</p>
        </div>
      )}

      {!loading && !error && ordered.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {ordered.map(ann => {
            const meta = TARGET_META[ann.target_audience] ?? TARGET_META.all;
            const isOpen = expandedId === ann.id;
            return (
              <div
                key={ann.id}
                className="card"
                style={{
                  borderLeft: ann.is_pinned ? '4px solid var(--gold)' : '4px solid transparent',
                  cursor:'pointer',
                }}
                onClick={() => setExpanded(isOpen ? null : ann.id)}
              >
                <div style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem' }}>
                  {ann.is_pinned && (
                    <i className="ti ti-pin" style={{ color:'var(--gold)', fontSize:'1.1rem', marginTop:2, flexShrink:0 }} />
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:'0.5rem', marginBottom:'0.35rem' }}>
                      <span style={{ fontWeight:600, fontSize:'0.975rem', color:'var(--ink)' }}>{ann.title}</span>
                      {ann.is_pinned && (
                        <span className="tag" style={{ background:'#fef9ec', color:'#92400e', border:'1px solid #fbbf24' }}>Pinned</span>
                      )}
                      <span className="tag" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                    </div>
                    <p style={{ fontSize:'0.8rem', color:'var(--muted)', margin:0 }}>
                      {ann.author_name ?? 'Administration'} · {formatDate(ann.created_at)}
                    </p>
                    {isOpen && (
                      <p style={{ marginTop:'0.75rem', fontSize:'0.9rem', color:'var(--ink-2)', lineHeight:1.65, whiteSpace:'pre-wrap' }}>
                        {ann.body}
                      </p>
                    )}
                  </div>
                  <i className={`ti ti-chevron-${isOpen ? 'up' : 'down'}`} style={{ color:'var(--muted)', flexShrink:0 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
