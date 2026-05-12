import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
};

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function StudentSchedule() {
  const { user, logout } = useAuth();
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/enrollment/terms/').then(res => {
      setTerms(res.data);
      const active = res.data.find(t => t.is_active);
      if (active) setSelectedTerm(String(active.id));
    }).catch(() => setError('Failed to load terms.'));
  }, []);

  useEffect(() => {
    if (!selectedTerm) return;
    setLoading(true);
    setError('');
    api.get(`/schedules/student/?term_id=${selectedTerm}`)
      .then(res => setSchedule(res.data))
      .catch(() => setError('Failed to load schedule.'))
      .finally(() => setLoading(false));
  }, [selectedTerm]);

  // Group all slots by day
  const byDay = {};
  DAY_ORDER.forEach(d => { byDay[d] = []; });
  schedule.forEach(subj => {
    subj.slots.forEach(slot => {
      byDay[slot.day_of_week]?.push({ ...slot, subject_code: subj.subject_code, subject_name: subj.subject_name, faculty_name: subj.faculty_name });
    });
  });
  DAY_ORDER.forEach(d => byDay[d].sort((a, b) => a.start_time.localeCompare(b.start_time)));

  const hasSlots = schedule.some(s => s.slots.length > 0);
  const selectedTermLabel = (() => {
    const t = terms.find(t => String(t.id) === selectedTerm);
    return t ? `${t.semester_display} ${t.year}` : '';
  })();

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/logo.png" alt="NEMSU" className="sidebar-logo" />NEMSUonePortal</div>
        <Link className="sidebar-link" to="/student/dashboard">Dashboard</Link>
        <Link className="sidebar-link" to="/student/enrollment">Enrollment</Link>
        <Link className="sidebar-link" to="/student/courses">My Courses</Link>
        <Link className="sidebar-link" to="/student/grades">My Grades</Link>
        <Link className="sidebar-link active" to="/student/schedule">Schedule</Link>
        <Link className="sidebar-link" to="/student/documents">Document Requests</Link>
        <Link className="sidebar-link" to="/student/announcements">Announcements</Link>
        <Link className="sidebar-link" to="/student/profile">My Profile</Link>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Class Schedule</h1>
            <span className="badge">{user?.role}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign Out</button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={styles.label}>Academic Term</label>
          <select
            value={selectedTerm}
            onChange={e => setSelectedTerm(e.target.value)}
            style={styles.select}
          >
            <option value="">— Select term —</option>
            {terms.map(t => (
              <option key={t.id} value={t.id}>{t.semester_display} {t.year}</option>
            ))}
          </select>
        </div>

        {error && <div style={styles.alertError}>{error}</div>}

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading schedule…</p>
        ) : selectedTerm && schedule.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ fontWeight: 600 }}>No approved enrollment found for {selectedTermLabel}.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Submit an enrollment request to see your class schedule.
            </p>
          </div>
        ) : selectedTerm && !hasSlots && schedule.length > 0 ? (
          <>
            <div style={styles.emptyState}>
              <p style={{ fontWeight: 600 }}>Schedule not yet posted for {selectedTermLabel}.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                You are enrolled in {schedule.length} subject(s). Check back once the registrar has posted class schedules.
              </p>
            </div>
            <h3 style={styles.sectionTitle}>Enrolled Subjects</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Code', 'Subject', 'Units', 'Faculty', 'Schedule'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map(s => (
                    <tr key={s.subject_code}>
                      <td style={styles.td}>{s.subject_code}</td>
                      <td style={styles.td}>{s.subject_name}</td>
                      <td style={styles.td}>{s.subject_units}</td>
                      <td style={styles.td}>{s.faculty_name}</td>
                      <td style={{ ...styles.td, color: '#6b7280', fontStyle: 'italic' }}>TBA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : hasSlots ? (
          <>
            {/* Subject summary cards */}
            <h3 style={styles.sectionTitle}>Enrolled Subjects — {selectedTermLabel}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
              {schedule.map(s => (
                <div key={s.subject_code} style={styles.subjectCard}>
                  <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.9rem' }}>{s.subject_code}</div>
                  <div style={{ fontSize: '0.82rem', color: '#374151', marginTop: '0.1rem' }}>{s.subject_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    {s.subject_units} units · {s.faculty_name}
                  </div>
                </div>
              ))}
            </div>

            {/* Weekly schedule by day */}
            <h3 style={styles.sectionTitle}>Weekly Schedule</h3>
            {DAY_ORDER.map(day => {
              const slots = byDay[day];
              if (!slots.length) return null;
              return (
                <div key={day} style={{ marginBottom: '1.25rem' }}>
                  <div style={styles.dayHeader}>{DAY_LABELS[day]}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', paddingTop: '0.5rem' }}>
                    {slots.map(slot => (
                      <div key={slot.id} style={styles.slotCard}>
                        <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.88rem' }}>
                          {slot.subject_code}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#374151' }}>{slot.subject_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, marginTop: '0.3rem' }}>
                          {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{slot.room}</div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                          {slot.faculty_name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        ) : null}
      </main>
    </div>
  );
}

const styles = {
  label: { display: 'block', fontWeight: 600, fontSize: '0.9rem', color: '#374151', marginBottom: '0.4rem' },
  select: { width: '100%', maxWidth: 420, padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.95rem' },
  alertError: { background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' },
  emptyState: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.5rem', textAlign: 'center', color: '#6b7280', marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#374151', marginBottom: '0.75rem' },
  subjectCard: { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '0.75rem 1rem', minWidth: 160, maxWidth: 230 },
  dayHeader: { fontWeight: 700, color: '#1e3a5f', fontSize: '0.88rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.3rem' },
  slotCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem 1rem', minWidth: 170, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' },
  th: { textAlign: 'left', padding: '0.5rem 0.75rem', background: '#f9fafb', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: '0.82rem' },
  td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6', color: '#1f2937' },
};
