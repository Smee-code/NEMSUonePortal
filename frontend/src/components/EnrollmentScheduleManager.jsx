import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useConfirm } from './ConfirmDialog';

const STUDENT_TYPES = [
  { value: 'freshman',   label: 'Freshmen'        },
  { value: 'transferee', label: 'Transferees'      },
  { value: 'shiftee',    label: 'Shiftees'         },
  { value: 'regular',    label: 'Regular Students' },
];

const EMPTY_FORM = { student_type: 'freshman', start_date: '', end_date: '', display_order: 0 };

export default function EnrollmentScheduleManager() {
  const confirm = useConfirm();
  const [terms,        setTerms]        = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [schedules,    setSchedules]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [editId,       setEditId]       = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [toggling,     setToggling]     = useState(false);

  useEffect(() => {
    fetchTerms();
  }, []);

  function fetchTerms(keepSelected) {
    return api.get('/enrollment/terms/')
      .then(res => {
        setTerms(res.data);
        if (!keepSelected) {
          const open  = res.data.find(t => t.enrollment_open);
          const first = res.data[0];
          const active = open || first;
          if (active) setSelectedTerm(String(active.id));
        }
      })
      .catch(() => setError('Failed to load academic terms.'));
  }

  useEffect(() => {
    if (selectedTerm) fetchSchedules();
  }, [selectedTerm]);

  function fetchSchedules() {
    setLoading(true);
    setError('');
    api.get(`/enrollment/schedules/?term=${selectedTerm}`)
      .then(res => setSchedules(res.data))
      .catch(() => setError('Failed to load enrollment schedules.'))
      .finally(() => setLoading(false));
  }

  async function handleToggle() {
    if (!activeTerm) return;
    setToggling(true);
    setError('');
    setSuccess('');
    try {
      await api.patch(`/enrollment/terms/${activeTerm.id}/enrollment/`, {
        enrollment_open: !activeTerm.enrollment_open,
      });
      await fetchTerms(true);
      setSuccess(`Enrollment ${!activeTerm.enrollment_open ? 'opened' : 'closed'} for ${activeTerm.semester_display} ${activeTerm.year}.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update enrollment status.');
    } finally {
      setToggling(false);
    }
  }

  function usedTypes() {
    return schedules.filter(s => s.id !== editId).map(s => s.student_type);
  }

  async function handleSave() {
    if (!form.student_type || !form.start_date || !form.end_date) {
      setError('Student type, start date, and end date are required.');
      return;
    }
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/enrollment/schedules/${editId}/`, {
          student_type:  form.student_type,
          start_date:    form.start_date,
          end_date:      form.end_date,
          display_order: Number(form.display_order),
        });
        setSuccess('Schedule entry updated.');
      } else {
        await api.post('/enrollment/schedules/', {
          term:          Number(selectedTerm),
          student_type:  form.student_type,
          start_date:    form.start_date,
          end_date:      form.end_date,
          display_order: Number(form.display_order),
        });
        setSuccess('Schedule entry added.');
      }
      setForm(EMPTY_FORM);
      setEditId(null);
      fetchSchedules();
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.end_date?.[0] || d?.non_field_errors?.[0] || d?.detail || 'Failed to save entry.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!await confirm({ title: 'Delete schedule entry?', message: 'It will no longer appear on the landing page.', confirmText: 'Delete' })) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/enrollment/schedules/${id}/`);
      setSuccess('Entry deleted.');
      fetchSchedules();
    } catch {
      setError('Failed to delete entry.');
    }
  }

  function startEdit(s) {
    setEditId(s.id);
    setForm({ student_type: s.student_type, start_date: s.start_date, end_date: s.end_date, display_order: s.display_order });
    setError('');
    setSuccess('');
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  const availableTypes = STUDENT_TYPES.filter(
    t => !usedTypes().includes(t.value) || t.value === form.student_type
  );

  const activeTerm = terms.find(t => String(t.id) === selectedTerm);
  const isOpen     = activeTerm?.enrollment_open ?? false;

  return (
    <div>
      {/* ── Term selector + status control ── */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
          <i className="ti ti-calendar-event" style={{ marginRight: 5 }} />Academic Term
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={selectedTerm}
            onChange={e => { setSelectedTerm(e.target.value); setEditId(null); setForm(EMPTY_FORM); }}
            style={{ ...inp, flex: '1 1 200px', maxWidth: 320 }}
          >
            {terms.length === 0 && <option value="">No terms available</option>}
            {terms.map(t => (
              <option key={t.id} value={String(t.id)}>
                {t.semester_display}, {t.year}
                {t.enrollment_open ? '  ✓ Open' : ''}
              </option>
            ))}
          </select>

          {activeTerm && (
            <>
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 700, whiteSpace: 'nowrap',
                background: isOpen ? '#dcfce7' : '#fee2e2',
                color:      isOpen ? '#15803d' : '#dc2626',
                border:     `1px solid ${isOpen ? '#86efac' : '#fca5a5'}`,
              }}>
                {isOpen ? '● Enrollment Open' : '● Enrollment Closed'}
              </span>

              <button
                onClick={handleToggle}
                disabled={toggling}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: toggling ? 'not-allowed' : 'pointer',
                  border: isOpen ? '1px solid #fca5a5' : '1px solid #86efac',
                  background: isOpen ? '#fee2e2' : '#dcfce7',
                  color:      isOpen ? '#dc2626'  : '#15803d',
                  opacity: toggling ? 0.6 : 1,
                }}
              >
                <i className={`ti ${isOpen ? 'ti-lock' : 'ti-lock-open'}`} style={{ fontSize: 13 }} />
                {toggling ? 'Updating…' : isOpen ? 'Close Enrollment' : 'Open Enrollment'}
              </button>
            </>
          )}
        </div>

        {activeTerm && (
          <div style={{ marginTop: 10, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <InfoChip icon="ti-school"        label="Academic Year" value={activeTerm.year} />
            <InfoChip icon="ti-book"          label="Semester"      value={activeTerm.semester_display} />
            <InfoChip icon="ti-calendar"      label="Term Period"   value={`${fmtDate(activeTerm.start_date)} – ${fmtDate(activeTerm.end_date)}`} />
          </div>
        )}
      </div>

      {error   && <Banner type="error">{error}</Banner>}
      {success && <Banner type="success">{success}</Banner>}

      {/* ── Enrollment schedule table ── */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
          <i className="ti ti-users" style={{ marginRight: 5 }} />Enrollment Schedule by Student Type
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 16px' }}>Loading schedules…</p>
      ) : schedules.length === 0 ? (
        <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', margin: '8px 0 16px' }}>
          No schedule entries for this term yet.
        </p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <Th>Student type</Th>
                <Th>Start date</Th>
                <Th>End date</Th>
                <Th>Order</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6', background: editId === s.id ? '#eff6ff' : 'transparent' }}>
                  <Td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <i className="ti ti-users" style={{ color: '#6b7280', fontSize: 14 }} />
                      {s.student_type_display}
                    </span>
                  </Td>
                  <Td>{s.start_date}</Td>
                  <Td>{s.end_date}</Td>
                  <Td>{s.display_order}</Td>
                  <Td>
                    <button onClick={() => startEdit(s)} style={secBtn}>
                      <i className="ti ti-edit" style={{ fontSize: 13 }} /> Edit
                    </button>
                    <button onClick={() => handleDelete(s.id)} style={{ ...secBtn, marginLeft: 6, color: '#dc2626', borderColor: '#fca5a5' }}>
                      <i className="ti ti-trash" style={{ fontSize: 13 }} /> Delete
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add / Edit form ── */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 18px' }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>
          <i className={`ti ${editId ? 'ti-edit' : 'ti-plus'}`} style={{ marginRight: 6 }} />
          {editId ? 'Edit Entry' : 'Add Entry'}
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={lbl}>Student type</label>
            <select value={form.student_type} onChange={e => setForm(p => ({ ...p, student_type: e.target.value }))} style={inp}>
              {availableTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Start date</label>
            <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={lbl}>End date</label>
            <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={lbl}>Display order</label>
            <input type="number" min="0" value={form.display_order} onChange={e => setForm(p => ({ ...p, display_order: e.target.value }))} style={inp} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={saving || !selectedTerm} style={primBtn}>
            {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Entry'}
          </button>
          {editId && <button onClick={cancelEdit} style={secBtn}>Cancel</button>}
        </div>
      </div>

      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 10, marginBottom: 0 }}>
        Changes are reflected on the public landing page immediately.
      </p>
    </div>
  );
}

function fmtDate(iso) {
  return iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
}

function InfoChip({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
      <i className={`ti ${icon}`} style={{ color: '#6b7280', fontSize: 14 }} />
      <span style={{ color: '#9ca3af' }}>{label}:</span>
      <strong>{value}</strong>
    </div>
  );
}

function Banner({ type, children }) {
  const styles = type === 'error'
    ? { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }
    : { background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d' };
  return (
    <div style={{ ...styles, borderRadius: 6, padding: '8px 12px', fontSize: 12, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function Th({ children }) {
  return <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em' }}>{children}</th>;
}
function Td({ children }) {
  return <td style={{ padding: '10px 12px', color: '#374151' }}>{children}</td>;
}

const lbl     = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' };
const inp     = { width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: '#fff' };
const primBtn = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 16px', background: '#1d4ed8', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' };
const secBtn  = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, color: '#374151', fontSize: 12, cursor: 'pointer' };
