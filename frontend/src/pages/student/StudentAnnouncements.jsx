import { useEffect, useState } from 'react';
import api from '../../api/axios';
import AnnouncementCard, { AnnouncementOverview, AnnouncementStyles, CATEGORY_META } from '../../components/AnnouncementCard';

export default function StudentAnnouncements() {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [activeSearch, setActive]   = useState('');
  const [category, setCategory]     = useState('');   // '' = all

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
    setCategory('');
    fetchAnnouncements(q);
  }

  function clearSearch() {
    setSearch('');
    setActive('');
    fetchAnnouncements('');
  }

  // Pinned first (the server already sorts this way; kept explicit for clarity).
  const ordered = [...items.filter(a => a.is_pinned), ...items.filter(a => !a.is_pinned)];
  const shown = category ? ordered.filter(a => (a.category || 'general') === category) : ordered;

  return (
    <div className="page">
      <AnnouncementStyles />
      <div className="page-head">
        <div>
          <h1>Announcements</h1>
          <p className="sub">School-wide notices, events, and deadlines</p>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem' }}>
        <div style={{ position:'relative', flex:1, maxWidth:420 }}>
          <i className="ti ti-search" aria-hidden="true" style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:'var(--muted)', pointerEvents:'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search announcements…"
            aria-label="Search announcements"
            style={{
              width:'100%', padding:'0.55rem 2.5rem 0.55rem 2.25rem',
              border:'1.5px solid var(--rule)', borderRadius:8,
              fontSize:'0.875rem', background:'#fff', color:'var(--ink)',
              outline:'none', boxSizing:'border-box',
            }}
          />
          {activeSearch && (
            <button type="button" onClick={clearSearch} aria-label="Clear search" style={{
              position:'absolute', right:'0.6rem', top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', cursor:'pointer', color:'var(--muted)', padding:0,
            }}>
              <i className="ti ti-x" aria-hidden="true" />
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
        <>
          <AnnouncementOverview items={ordered} active={category} onChange={setCategory} />
          {shown.length === 0 ? (
            <div className="stu-empty">
              <i className="ti ti-filter-off" />
              <p>No {(CATEGORY_META[category]?.label || '').toLowerCase()} announcements right now.</p>
            </div>
          ) : (
            <div className="anc-grid">
              {shown.map(ann => <AnnouncementCard key={ann.id} ann={ann} showAudience={false} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
