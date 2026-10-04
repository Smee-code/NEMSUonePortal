import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';

const CSS = `
.blk-alert { padding: .65rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: .84rem; cursor: pointer; }
.blk-alert.success { background: var(--reg-green-tint); color: #065f46; border: 1px solid #a7f3d0; }
.blk-alert.error   { background: var(--reg-red-tint);   color: #991b1b; border: 1px solid #fca5a5; }

.blk-prog-card { background: #fff; border: 1px solid var(--reg-line); border-radius: 10px; overflow: hidden; margin-bottom: 1rem; }
.blk-prog-hdr  { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .85rem 1.1rem; border-bottom: 1px solid var(--reg-faint); background: #fafbfc; flex-wrap: wrap; }
.blk-prog-code { font-size: .82rem; font-weight: 700; color: var(--reg-cool); margin-right: .6rem; font-family: ui-monospace,monospace; }
.blk-prog-name { font-size: .82rem; color: var(--reg-ink-2); }
.blk-prog-chips { display: flex; gap: .4rem; flex-wrap: wrap; }
.blk-chip      { font-size: .7rem; font-weight: 500; border-radius: 6px; padding: .2rem .55rem; background: var(--reg-faint); color: var(--reg-muted); white-space: nowrap; }
.blk-chip.full { background: var(--reg-red-tint); color: var(--reg-red); }

.blk-year-cell  { padding: .65rem 1rem; vertical-align: top; padding-top: .85rem; font-size: .78rem; font-weight: 700; color: var(--reg-ink-2); border-right: 1px solid var(--reg-faint); white-space: nowrap; width: 90px; }
.blk-block-name { font-weight: 600; font-size: .84rem; color: var(--reg-ink); }
.blk-fill-wrap  { display: flex; align-items: center; gap: .6rem; min-width: 0; flex: 1; }
.blk-fill-track { flex: 1; height: 5px; background: var(--reg-faint); border-radius: 9999px; overflow: hidden; min-width: 80px; }
.blk-fill-fill  { height: 100%; border-radius: 9999px; transition: width .3s; }
.blk-fill-pct   { font-size: .75rem; color: var(--reg-muted); white-space: nowrap; }
.blk-slots-val  { font-size: .8rem; font-weight: 600; }
.blk-status-open { font-size: .7rem; font-weight: 600; border-radius: 6px; padding: .2rem .55rem; background: var(--reg-green-tint); color: var(--reg-green); }
.blk-status-full { font-size: .7rem; font-weight: 600; border-radius: 6px; padding: .2rem .55rem; background: var(--reg-red-tint);   color: var(--reg-red);   }
.blk-btn-view   { background: var(--reg-faint); color: var(--reg-ink-2); border: 1px solid var(--reg-line);  border-radius: 6px; padding: .3rem .7rem; font-size: .75rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
.blk-btn-expand { background: #eff6ff;           color: #1d4ed8;          border: 1px solid #bfdbfe;          border-radius: 6px; padding: .3rem .7rem; font-size: .75rem; font-weight: 600; cursor: pointer; white-space: nowrap; }

.blk-req-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: .75rem; }
.blk-req-ttl { font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--reg-muted); }

.blk-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.blk-modal           { background: #fff; border-radius: 12px; padding: 1.5rem; width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,.15); }
.blk-modal.wide      { max-width: 580px; }
.blk-modal-hdr       { margin-bottom: 1.1rem; }
.blk-modal-title     { font-size: 1rem; font-weight: 700; color: var(--reg-ink); margin: 0 0 .2rem; }
.blk-modal-sub       { font-size: .8rem; color: var(--reg-muted); margin: 0; }
.blk-modal-stats     { display: flex; gap: 1rem; margin-bottom: 1.25rem; padding: .75rem 1rem; background: var(--reg-faint); border-radius: 8px; border: 1px solid var(--reg-line); }
.blk-modal-stat      { display: flex; flex-direction: column; gap: .2rem; }
.blk-modal-stat-div  { width: 1px; background: var(--reg-line); }
.blk-modal-stat-lbl  { font-size: .68rem; color: var(--reg-muted); font-weight: 500; text-transform: uppercase; letter-spacing: .05em; }
.blk-modal-stat-val  { font-size: 1.25rem; font-weight: 700; color: var(--reg-ink); line-height: 1; }
.blk-modal-stat-val.green { color: var(--reg-green); }
.blk-modal-stat-val.red   { color: var(--reg-red);   }

.blk-form-row      { display: flex; flex-direction: column; gap: .3rem; margin-bottom: .85rem; }
.blk-form-lbl      { font-size: .8rem; font-weight: 600; color: var(--reg-ink-2); }
.blk-form-input    { border: 1px solid var(--reg-line); border-radius: 7px; padding: .45rem .75rem; font-size: .85rem; outline: none; color: var(--reg-ink); width: 100%; box-sizing: border-box; }
.blk-form-textarea { border: 1px solid var(--reg-line); border-radius: 7px; padding: .45rem .75rem; font-size: .85rem; outline: none; color: var(--reg-ink); width: 100%; box-sizing: border-box; height: 80px; resize: vertical; }
.blk-modal-actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1rem; }
.blk-cancel        { background: var(--reg-faint); color: var(--reg-ink-2); border: 1px solid var(--reg-line); border-radius: 7px; padding: .45rem 1rem; font-size: .84rem; font-weight: 600; cursor: pointer; }
`;

const YEAR_LABELS = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year' };

function fillColor(pct) {
  if (pct >= 100) return 'var(--reg-red)';
  if (pct >= 85)  return 'var(--reg-amber)';
  return 'var(--reg-green)';
}

function FillBar({ pct }) {
  return (
    <div className="blk-fill-wrap">
      <div className="blk-fill-track">
        <div className="blk-fill-fill" style={{ width: `${Math.min(pct, 100)}%`, background: fillColor(pct) }} />
      </div>
      <span className="blk-fill-pct">{pct}%</span>
    </div>
  );
}

export default function RegistrarBlocks() {
  const toast = useToast();
  const [terms, setTerms]               = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [blocks, setBlocks]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [dataLoading, setDataLoading]   = useState(false);

  const [showExpand, setShowExpand]     = useState(false);
  const [expandBlock, setExpandBlock]   = useState(null);
  const [expandForm, setExpandForm]     = useState({ requested_capacity: '', reason: '' });
  const [expandSaving, setExpandSaving] = useState(false);
  const [expandError, setExpandError]   = useState('');
  const [myRequests, setMyRequests]     = useState([]);

  const [detailBlock, setDetailBlock]       = useState(null);
  const [detailStudents, setDetailStudents] = useState([]);
  const [detailLoading, setDetailLoading]   = useState(false);

  useEffect(() => {
    api.get('/enrollment/terms/')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
        setTerms(list);
        setSelectedTerm(list.find(t => t.is_active) ?? list[0] ?? null);
      })
      .catch(() => toast('Failed to load terms.', { type: 'error' }))
      .finally(() => setLoading(false));
    fetchMyRequests();
  }, []);

  useEffect(() => {
    if (!selectedTerm) return;
    setDataLoading(true);
    api.get(`/enrollment/blocks/?term=${selectedTerm.id}`)
      .then(res => setBlocks(Array.isArray(res.data) ? res.data : (res.data.results ?? [])))
      .catch(() => toast('Failed to load blocks.', { type: 'error' }))
      .finally(() => setDataLoading(false));
  }, [selectedTerm]);

  function fetchMyRequests() {
    api.get('/enrollment/block-expansion-requests/')
      .then(res => setMyRequests(Array.isArray(res.data) ? res.data : (res.data.results ?? [])))
      .catch(() => {});
  }

  function openExpand(block) {
    setExpandBlock(block);
    setExpandForm({ requested_capacity: block.capacity + 5, reason: '' });
    setExpandError('');
    setShowExpand(true);
  }

  async function submitExpansion(e) {
    e.preventDefault();
    const cap = parseInt(expandForm.requested_capacity);
    if (!cap || cap <= expandBlock.capacity) {
      setExpandError('Requested capacity must be greater than current capacity.');
      return;
    }
    setExpandSaving(true);
    try {
      await api.post('/enrollment/block-expansion-requests/', {
        block: expandBlock.id,
        requested_capacity: cap,
        reason: expandForm.reason,
      });
      toast(`Expansion request submitted for ${expandBlock.name}.`, { type: 'success' });
      setShowExpand(false);
      fetchMyRequests();
    } catch (err) {
      const d = err.response?.data;
      toast(
        (d && typeof d === 'object') ? Object.values(d).flat().join(' ') : 'Failed to submit request.',
        { type: 'error' }
      );
    } finally {
      setExpandSaving(false);
    }
  }

  async function openDetail(block) {
    setDetailBlock(block);
    setDetailStudents([]);
    setDetailLoading(true);
    try {
      const res = await api.get(`/enrollment/blocks/${block.id}/`);
      setDetailStudents(res.data.students ?? []);
    } catch {
      setDetailStudents([]);
    } finally {
      setDetailLoading(false);
    }
  }

  // Group blocks by program → year_level
  const grouped = {};
  for (const b of blocks) {
    const prog = b.program_code;
    if (!grouped[prog]) grouped[prog] = { name: b.program_name, yearGroups: {} };
    const yl = b.year_level;
    if (!grouped[prog].yearGroups[yl]) grouped[prog].yearGroups[yl] = [];
    grouped[prog].yearGroups[yl].push(b);
  }

  const totalCapacity = blocks.reduce((s, b) => s + b.capacity, 0);
  const totalEnrolled = blocks.reduce((s, b) => s + b.enrolled_count, 0);
  const avgFill       = totalCapacity > 0 ? Math.round(totalEnrolled / totalCapacity * 100) : 0;
  const fullBlocks    = blocks.filter(b => b.is_full).length;

  const statusPill = st => ({
    pending:  { cls: 'tag pending',  label: 'Pending'  },
    approved: { cls: 'tag approved', label: 'Approved' },
    rejected: { cls: 'tag rejected', label: 'Rejected' },
  }[st] ?? { cls: 'tag outline', label: st });

  return (
    <>
      <style>{CSS}</style>

      {/* ── Page head ── */}
      <div className="page-head">
        <div className="page-head-l">
          <div className="eyebrow">Manage · {blocks.length} block{blocks.length !== 1 ? 's' : ''}</div>
          <h2>Class <em>blocks</em></h2>
          <div className="sub">
            View enrollment fill rates, manage block capacities, and submit expansion requests per academic term.
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="toolbar">
        <label className="label">Academic Term</label>
        <select
          className="form-select"
          value={selectedTerm?.id ?? ''}
          onChange={e => setSelectedTerm(terms.find(t => t.id === parseInt(e.target.value)) ?? null)}
        >
          {terms.map(t => (
            <option key={t.id} value={t.id}>
              {t.semester_display} {t.year}{t.is_active ? ' (Active)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* ── Stat row ── */}
      {selectedTerm && !dataLoading && blocks.length > 0 && (
        <div className="stat-row">
          <div className="stat">
            <div className="num">{blocks.length}</div>
            <div className="lbl">Total blocks</div>
          </div>
          <div className="stat">
            <div className="num">{totalCapacity}</div>
            <div className="lbl">Total capacity</div>
          </div>
          <div className="stat">
            <div className="num green">{totalEnrolled}</div>
            <div className="lbl">Enrolled</div>
          </div>
          <div className="stat">
            <div className="num amber">{avgFill}%</div>
            <div className="lbl">Avg fill rate</div>
          </div>
          <div className="stat">
            <div className="num red">{fullBlocks}</div>
            <div className="lbl">Full blocks</div>
          </div>
        </div>
      )}

      {/* ── Block tables ── */}
      {loading || dataLoading ? (
        <div className="empty">
          <i className="ti ti-loader" />
          <div className="t">Loading blocks…</div>
        </div>
      ) : blocks.length === 0 ? (
        <div className="empty">
          <i className="ti ti-layout-grid-remove" />
          <div className="t">No blocks found</div>
          <div className="d">Blocks are created automatically when enrollments are approved for this term.</div>
        </div>
      ) : (
        Object.entries(grouped).map(([code, prog]) => {
          const progBlocks      = blocks.filter(b => b.program_code === code);
          const enrolledProg    = progBlocks.reduce((s, b) => s + b.enrolled_count, 0);
          const capProg         = progBlocks.reduce((s, b) => s + b.capacity, 0);
          const fullCount       = progBlocks.filter(b => b.is_full).length;

          return (
            <div key={code} className="blk-prog-card">
              <div className="blk-prog-hdr">
                <div style={{ minWidth: 0 }}>
                  <span className="blk-prog-code">{code}</span>
                  <span className="blk-prog-name">{prog.name}</span>
                </div>
                <div className="blk-prog-chips">
                  <span className="blk-chip">{progBlocks.length} block{progBlocks.length !== 1 ? 's' : ''}</span>
                  <span className="blk-chip">{enrolledProg} / {capProg} enrolled</span>
                  {fullCount > 0 && <span className="blk-chip full">{fullCount} full</span>}
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 90 }}>Year</th>
                      <th style={{ width: 90 }}>Block</th>
                      <th>Enrollment</th>
                      <th style={{ width: 80, textAlign: 'center' }}>Slots Left</th>
                      <th style={{ width: 70, textAlign: 'center' }}>Status</th>
                      <th style={{ width: 170, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(prog.yearGroups)
                      .sort(([a], [b]) => a - b)
                      .flatMap(([yl, yearBlocks]) =>
                        yearBlocks.map((b, bIdx) => (
                          <tr key={b.id}>
                            {bIdx === 0 && (
                              <td rowSpan={yearBlocks.length} className="blk-year-cell">
                                {YEAR_LABELS[yl] ?? `Year ${yl}`}
                              </td>
                            )}
                            <td>
                              <span className="blk-block-name">{b.name}</span>
                            </td>
                            <td style={{ minWidth: 200 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                                <FillBar pct={b.fill_pct} />
                                <span style={{ fontSize: '.8rem', color: 'var(--reg-ink-2)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                                  {b.enrolled_count} / {b.capacity}
                                </span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                className="blk-slots-val"
                                style={{ color: b.available_slots === 0 ? 'var(--reg-red)' : 'var(--reg-ink)' }}
                              >
                                {b.available_slots}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {b.is_full
                                ? <span className="blk-status-full">Full</span>
                                : <span className="blk-status-open">Open</span>}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.4rem' }}>
                                <button className="blk-btn-view"   onClick={() => openDetail(b)}>View Students</button>
                                <button className="blk-btn-expand" onClick={() => openExpand(b)}>+ Expand</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* ── My expansion requests ── */}
      {myRequests.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div className="blk-req-hdr">
            <span className="blk-req-ttl">My Expansion Requests</span>
            <span className="blk-chip">{myRequests.length} request{myRequests.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {['Block', 'Program', 'Year', 'Current Cap', 'Requested', 'Reason', 'Status', 'Submitted'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myRequests.map(r => {
                  const pill = statusPill(r.status);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.block_name}</td>
                      <td>{r.block_program_code}</td>
                      <td>{r.block_year_level_display}</td>
                      <td>{r.current_capacity}</td>
                      <td style={{ fontWeight: 700, color: 'var(--reg-ink)' }}>{r.requested_capacity}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--reg-muted)' }}>
                        {r.reason || '-'}
                      </td>
                      <td><span className={pill.cls}>{pill.label}</span></td>
                      <td style={{ fontSize: '.77rem', color: 'var(--reg-muted)' }}>
                        {new Date(r.created_at).toLocaleDateString('en-PH')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Expansion request modal ── */}
      {showExpand && expandBlock && (
        <div className="blk-modal-backdrop" onClick={() => setShowExpand(false)}>
          <div className="blk-modal" onClick={e => e.stopPropagation()}>
            <div className="blk-modal-hdr">
              <h3 className="blk-modal-title">Request Block Expansion</h3>
              <p className="blk-modal-sub">
                {expandBlock.name} · {expandBlock.program_code} · {expandBlock.year_level_display}
              </p>
            </div>
            <div className="blk-modal-stats">
              <div className="blk-modal-stat">
                <div className="blk-modal-stat-lbl">Current Capacity</div>
                <div className="blk-modal-stat-val">{expandBlock.capacity}</div>
              </div>
              <div className="blk-modal-stat-div" />
              <div className="blk-modal-stat">
                <div className="blk-modal-stat-lbl">Enrolled</div>
                <div className="blk-modal-stat-val">{expandBlock.enrolled_count}</div>
              </div>
              <div className="blk-modal-stat-div" />
              <div className="blk-modal-stat">
                <div className="blk-modal-stat-lbl">Available</div>
                <div className={`blk-modal-stat-val ${expandBlock.available_slots === 0 ? 'red' : 'green'}`}>
                  {expandBlock.available_slots}
                </div>
              </div>
            </div>
            {expandError && <div className="blk-alert error">{expandError}</div>}
            <form onSubmit={submitExpansion}>
              <div className="blk-form-row">
                <label className="blk-form-lbl">New Capacity</label>
                <input
                  className="blk-form-input"
                  type="number"
                  min={expandBlock.capacity + 1}
                  max={200}
                  value={expandForm.requested_capacity}
                  onChange={e => setExpandForm(f => ({ ...f, requested_capacity: e.target.value }))}
                  required
                />
              </div>
              <div className="blk-form-row">
                <label className="blk-form-lbl">Reason</label>
                <textarea
                  className="blk-form-textarea"
                  placeholder="Briefly explain why this expansion is needed…"
                  value={expandForm.reason}
                  onChange={e => setExpandForm(f => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <div className="blk-modal-actions">
                <button type="button" className="blk-cancel" onClick={() => setShowExpand(false)}>Cancel</button>
                <button type="submit" className="btn-pri" disabled={expandSaving}>
                  {expandSaving ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Student detail modal ── */}
      {detailBlock && (
        <div className="blk-modal-backdrop" onClick={() => setDetailBlock(null)}>
          <div className="blk-modal wide" onClick={e => e.stopPropagation()}>
            <div className="blk-modal-hdr">
              <h3 className="blk-modal-title">{detailBlock.name}: Enrolled Students</h3>
              <p className="blk-modal-sub">
                {detailBlock.program_code} · {detailBlock.year_level_display} · {detailBlock.enrolled_count} / {detailBlock.capacity} slots used
              </p>
            </div>
            {detailLoading ? (
              <div className="empty" style={{ background: 'none', boxShadow: 'none', padding: '1rem 0' }}>
                <i className="ti ti-loader" />
                <div className="t">Loading…</div>
              </div>
            ) : detailStudents.length === 0 ? (
              <div className="empty" style={{ background: 'none', boxShadow: 'none', padding: '1rem 0' }}>
                <i className="ti ti-users-off" />
                <div className="t">No enrolled students in this block.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: '.5rem' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Year Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailStudents.map((s, i) => (
                      <tr key={s.enrollment_id}>
                        <td style={{ color: 'var(--reg-muted)' }}>{i + 1}</td>
                        <td style={{ fontFamily: 'ui-monospace,monospace', fontSize: 12, color: 'var(--reg-muted)' }}>
                          {s.student_id || '-'}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--reg-ink)' }}>{s.student_name}</td>
                        <td>{s.year_level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="blk-modal-actions">
              <button className="blk-cancel" onClick={() => setDetailBlock(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
