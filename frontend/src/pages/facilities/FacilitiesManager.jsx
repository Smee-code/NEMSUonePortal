import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';

/*
 * Rooms & Buildings — registrar + admin.
 * Master–detail: pick a department in the left rail, manage its buildings and
 * rooms on the right. Rooms are type-coded (lecture vs laboratory). Stays in
 * the portal's navy + gold system; self-contained styling so it renders the
 * same inside either shell.
 */
const ROOM_TYPES = [
  { value: 'lecture',    label: 'Lecture',    icon: 'ti-presentation' },
  { value: 'laboratory', label: 'Laboratory', icon: 'ti-flask' },
];
const TYPE_META = {
  lecture:    { icon: 'ti-presentation', label: 'Lecture room' },
  laboratory: { icon: 'ti-flask',        label: 'Laboratory' },
};

const CSS = `
  .fx{--fx-ink:#0f1f3a;--fx-ink-2:#33455f;--fx-muted:#5a6478;--fx-faint:#8a93a3;
      --fx-line:#e6e9ef;--fx-line-soft:#eef0f4;--fx-gold:#b89043;--fx-band:#f6f8fc;color:var(--fx-ink);}

  .fx-top{display:flex;justify-content:space-between;align-items:flex-end;gap:1.5rem;
    padding-bottom:1.1rem;margin-bottom:1.35rem;border-bottom:1px solid var(--fx-line);flex-wrap:wrap;}
  .fx-top h1{font-size:26px;font-weight:600;letter-spacing:-.02em;line-height:1.1;}
  .fx-top p{font-size:13.5px;color:var(--fx-muted);margin-top:.4rem;max-width:60ch;line-height:1.55;}
  .fx-tot{display:flex;gap:1.75rem;align-items:baseline;}
  .fx-tot b{font-size:24px;font-weight:600;letter-spacing:-.02em;}
  .fx-tot span{display:block;font-size:11px;color:var(--fx-faint);font-weight:600;margin-top:3px;}

  .fx-loading{padding:2rem;color:var(--fx-muted);font-size:13px;}

  /* Master–detail shell */
  .fx-shell{display:grid;grid-template-columns:264px 1fr;gap:1.5rem;align-items:start;}
  .fx-rail{position:sticky;top:1rem;display:flex;flex-direction:column;gap:.6rem;}
  .fx-rail-h{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--fx-faint);padding:0 .25rem;}
  .fx-rail-search{position:relative;}
  .fx-rail-search i{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--fx-faint);font-size:14px;pointer-events:none;}
  .fx-rail-search input{width:100%;box-sizing:border-box;border:1px solid #d4dae4;border-radius:8px;
    padding:8px 11px 8px 32px;font-size:12.5px;font-family:inherit;outline:none;color:var(--fx-ink);}
  .fx-rail-search input:focus{border-color:var(--fx-ink);}
  .fx-rail-list{display:flex;flex-direction:column;gap:2px;}
  .fx-rail-item{text-align:left;background:none;border:1px solid transparent;border-left:3px solid transparent;
    border-radius:9px;padding:.55rem .7rem;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;gap:2px;}
  .fx-rail-item:hover{background:#f3f6fb;}
  .fx-rail-item.on{background:#eaf0f9;border-left-color:var(--fx-gold);}
  .fx-rail-top{display:flex;align-items:center;gap:8px;justify-content:space-between;}
  .fx-rail-name{font-size:13.5px;font-weight:600;color:var(--fx-ink-2);line-height:1.25;}
  .fx-rail-item.on .fx-rail-name{color:var(--fx-ink);}
  .fx-rail-code{font-size:10px;font-weight:700;color:var(--fx-gold);flex-shrink:0;}
  .fx-rail-meta{font-size:11.5px;color:var(--fx-faint);}

  /* Detail pane */
  .fx-pane{min-width:0;}
  .fx-pane-head{display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;margin-bottom:1.1rem;flex-wrap:wrap;}
  .fx-pane-title{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}
  .fx-pane-title h2{font-size:20px;font-weight:600;letter-spacing:-.01em;}
  .fx-pane-code{font-size:11px;font-weight:700;color:var(--fx-gold);
    border:1px solid #e7dcc0;background:#fbf7ec;padding:1px 8px;border-radius:5px;}
  .fx-pane-sub{font-size:12.5px;color:var(--fx-faint);margin-top:5px;}

  .fx-add-bld{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;
    background:var(--fx-band);border:1px solid var(--fx-line);border-radius:10px;padding:.85rem 1rem;margin-bottom:1rem;}
  .fx-input{border:1px solid #d4dae4;border-radius:7px;padding:8px 11px;font-size:13px;
    font-family:inherit;outline:none;color:var(--fx-ink);box-sizing:border-box;}
  .fx-input:focus{border-color:var(--fx-ink);box-shadow:0 0 0 3px rgba(15,31,58,.07);}
  .fx-input-grow{flex:1;min-width:180px;}
  .fx-input-sm{width:150px;}

  .fx-bld-list{display:flex;flex-direction:column;gap:.85rem;}
  .fx-bld{border:1px solid var(--fx-line);border-radius:11px;background:#fff;
    box-shadow:0 1px 2px rgba(15,31,58,.04);overflow:hidden;}
  .fx-bld-head{display:flex;justify-content:space-between;align-items:center;gap:.75rem;
    padding:.8rem 1.1rem;border-bottom:1px solid var(--fx-line-soft);}
  .fx-bld-id{display:flex;align-items:center;gap:11px;min-width:0;}
  .fx-bld-ic{width:34px;height:34px;border-radius:8px;flex-shrink:0;display:grid;place-items:center;
    background:#f1f4f9;color:var(--fx-ink-2);font-size:18px;}
  .fx-bld-name{font-size:14.5px;font-weight:600;line-height:1.2;}
  .fx-bld-sub{font-size:11.5px;color:var(--fx-faint);margin-top:1px;}
  .fx-bld-code2{font-weight:600;color:var(--fx-muted);}

  .fx-rack{padding:.9rem 1.1rem;display:flex;flex-wrap:wrap;gap:.55rem;align-items:center;}
  .fx-room{display:inline-flex;align-items:center;gap:8px;border:1px solid;border-radius:8px;
    padding:7px 8px 7px 11px;font-size:13px;font-weight:600;line-height:1;}
  .fx-room i{font-size:15px;}
  .fx-room[data-type="lecture"]{background:#eef2f9;border-color:#dce4f1;color:#284a7a;}
  .fx-room[data-type="laboratory"]{background:#e8f3ee;border-color:#cfe7db;color:#0a6b48;}
  .fx-room-x{background:none;border:none;cursor:pointer;color:currentColor;opacity:.5;
    display:flex;padding:2px;border-radius:4px;font-size:14px;}
  .fx-room-x:hover{opacity:1;background:rgba(255,255,255,.6);}
  .fx-rack-empty{font-size:12.5px;color:var(--fx-faint);}

  .fx-room-add{display:inline-flex;align-items:center;gap:6px;background:#fff;
    border:1px dashed #c3cbd8;color:var(--fx-muted);border-radius:8px;padding:7px 12px;
    font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;}
  .fx-room-add:hover{border-color:var(--fx-ink);color:var(--fx-ink);}
  .fx-room-form{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;
    background:var(--fx-band);border:1px solid var(--fx-line);border-radius:9px;padding:.5rem .6rem;}
  .fx-typeseg{display:inline-flex;border:1px solid var(--fx-line);border-radius:7px;overflow:hidden;}
  .fx-typeseg button{padding:6px 11px;font-size:12px;font-weight:600;background:#fff;border:none;
    border-left:1px solid var(--fx-line);cursor:pointer;color:var(--fx-muted);
    display:inline-flex;align-items:center;gap:5px;font-family:inherit;}
  .fx-typeseg button:first-child{border-left:none;}
  .fx-typeseg button.on{background:var(--fx-ink);color:#fff;}
  .fx-input-room{width:150px;padding:6px 10px;font-size:12.5px;}

  .fx-btn{display:inline-flex;align-items:center;gap:6px;background:var(--fx-ink);color:#fff;
    border:1px solid var(--fx-ink);border-radius:7px;padding:8px 14px;font-size:13px;font-weight:600;
    cursor:pointer;font-family:inherit;}
  .fx-btn:hover{background:#1a2d4d;}
  .fx-btn:disabled{opacity:.55;cursor:default;}
  .fx-btn-ghost{display:inline-flex;align-items:center;gap:6px;background:#fff;color:var(--fx-ink);
    border:1px solid var(--fx-line);border-radius:7px;padding:8px 14px;font-size:13px;font-weight:600;
    cursor:pointer;font-family:inherit;}
  .fx-btn-ghost:hover{border-color:var(--fx-ink);}
  .fx-btn-sm{padding:6px 11px;font-size:12px;}
  .fx-icon-btn{background:none;border:none;cursor:pointer;color:var(--fx-faint);padding:6px;
    border-radius:6px;display:flex;flex-shrink:0;}
  .fx-icon-btn:hover{color:#a8331e;background:#f8ebe7;}

  .fx-empty{padding:2.5rem 1.5rem;text-align:center;border:1px dashed var(--fx-line);border-radius:11px;background:#fcfdfe;}
  .fx-empty i{font-size:34px;color:#c7cfdb;display:block;margin-bottom:.6rem;}
  .fx-empty .t{font-size:14.5px;font-weight:600;margin-bottom:.3rem;}
  .fx-empty .d{font-size:12.5px;color:var(--fx-muted);max-width:42ch;margin:0 auto 1rem;line-height:1.5;}

  :is(.fx-btn,.fx-btn-ghost,.fx-input,.fx-room-add,.fx-rail-item,.fx-typeseg button):focus-visible{
    outline:2px solid var(--fx-gold);outline-offset:1px;}

  @media(max-width:820px){
    .fx-shell{grid-template-columns:1fr;}
    .fx-rail{position:static;}
    .fx-rail-list{max-height:230px;overflow-y:auto;}
    .fx-add-bld,.fx-room-form{flex-direction:column;align-items:stretch;}
    .fx-input-sm,.fx-input-room{width:100%;}
    .fx-typeseg{width:100%;} .fx-typeseg button{flex:1;justify-content:center;}
  }
`;

export default function FacilitiesManager() {
  const toast = useToast();
  const confirm = useConfirm();

  const [departments, setDepartments] = useState([]);
  const [buildings,   setBuildings]   = useState([]);
  const [loading,     setLoading]     = useState(true);

  const [selected,  setSelected]  = useState(null);   // dept id | 'shared'
  const [railQuery, setRailQuery] = useState('');

  const [addingBld, setAddingBld] = useState(false);
  const [bldForm,   setBldForm]   = useState({ name: '', code: '' });
  const [savingBld, setSavingBld] = useState(false);

  const [addRoomFor, setAddRoomFor] = useState(null);
  const [roomName,   setRoomName]   = useState('');
  const [roomType,   setRoomType]   = useState('lecture');
  const [savingRoom, setSavingRoom] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [dRes, bRes] = await Promise.all([
        api.get('/enrollment/departments/'),
        api.get('/schedules/facilities/buildings/'),
      ]);
      setDepartments(dRes.data);
      setBuildings(bRes.data);
    } catch {
      toast('Couldn’t load facilities. Try refreshing.', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const groups = [
    ...departments.map(d => ({
      key: d.id, title: d.name, code: d.code,
      buildings: buildings.filter(b => b.department === d.id),
    })),
    {
      key: 'shared', title: 'Shared & general', code: '',
      buildings: buildings.filter(b => !b.department),
    },
  ];
  const roomsIn = g => g.buildings.reduce((n, b) => n + (b.room_count || 0), 0);

  const active = groups.find(g => g.key === selected) || groups[0];

  function selectGroup(key) { setSelected(key); setAddingBld(false); setAddRoomFor(null); }

  async function saveBuilding() {
    if (!bldForm.name.trim()) { toast('Give the building a name first.', { type: 'error' }); return; }
    setSavingBld(true);
    try {
      const res = await api.post('/schedules/facilities/buildings/', {
        name: bldForm.name.trim(),
        code: bldForm.code.trim(),
        department: active.key === 'shared' ? null : active.key,
      });
      setBuildings(prev => [...prev, res.data]);
      setAddingBld(false);
      setBldForm({ name: '', code: '' });
      toast('Building added.', { type: 'success' });
    } catch (e) {
      toast(e.response?.data?.error || 'Couldn’t add the building.', { type: 'error' });
    } finally {
      setSavingBld(false);
    }
  }

  async function deleteBuilding(b) {
    const ok = await confirm({
      title: 'Delete this building?',
      message: `“${b.name}” and its ${b.room_count} room${b.room_count !== 1 ? 's' : ''} will be removed. Existing class schedules keep the room they already show.`,
      confirmText: 'Delete building',
    });
    if (!ok) return;
    try {
      await api.delete(`/schedules/facilities/buildings/${b.id}/`);
      setBuildings(prev => prev.filter(x => x.id !== b.id));
      toast('Building deleted.', { type: 'success' });
    } catch {
      toast('Couldn’t delete the building.', { type: 'error' });
    }
  }

  function startAddRoom(bid) { setAddRoomFor(bid); setRoomName(''); setRoomType('lecture'); }

  async function saveRoom(b) {
    if (!roomName.trim()) return;
    setSavingRoom(true);
    try {
      const res = await api.post(`/schedules/facilities/buildings/${b.id}/rooms/`, {
        name: roomName.trim(),
        room_type: roomType,
      });
      setBuildings(prev => prev.map(x =>
        x.id === b.id ? { ...x, rooms: [...x.rooms, res.data], room_count: x.room_count + 1 } : x
      ));
      setRoomName('');
    } catch (e) {
      toast(e.response?.data?.error || 'Couldn’t add the room.', { type: 'error' });
    } finally {
      setSavingRoom(false);
    }
  }

  async function deleteRoom(b, r) {
    try {
      await api.delete(`/schedules/facilities/rooms/${r.id}/`);
      setBuildings(prev => prev.map(x =>
        x.id === b.id ? { ...x, rooms: x.rooms.filter(rr => rr.id !== r.id), room_count: x.room_count - 1 } : x
      ));
    } catch {
      toast('Couldn’t remove the room.', { type: 'error' });
    }
  }

  const railGroups = railQuery.trim()
    ? groups.filter(g =>
        g.title.toLowerCase().includes(railQuery.trim().toLowerCase()) ||
        (g.code || '').toLowerCase().includes(railQuery.trim().toLowerCase()))
    : groups;

  return (
    <div className="fx">
      <style>{CSS}</style>

      <div className="fx-top">
        <div>
          <h1>Rooms &amp; buildings</h1>
          <p>Pick a department to manage its buildings and rooms. These rooms are what you assign when scheduling classes.</p>
        </div>
        {!loading && (
          <div className="fx-tot">
            <div><b>{buildings.length}</b><span>Buildings</span></div>
            <div><b>{buildings.reduce((n, b) => n + (b.room_count || 0), 0)}</b><span>Rooms</span></div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="fx-loading">Loading facilities&hellip;</div>
      ) : (
        <div className="fx-shell">
          {/* Master: departments */}
          <aside className="fx-rail">
            <div className="fx-rail-h">Departments</div>
            <div className="fx-rail-search">
              <i className="ti ti-search" />
              <input
                placeholder="Find a department"
                value={railQuery}
                onChange={e => setRailQuery(e.target.value)}
              />
            </div>
            <div className="fx-rail-list">
              {railGroups.map(g => (
                <button
                  key={g.key}
                  className={`fx-rail-item${active.key === g.key ? ' on' : ''}`}
                  aria-current={active.key === g.key}
                  onClick={() => selectGroup(g.key)}
                >
                  <span className="fx-rail-top">
                    <span className="fx-rail-name">{g.title}</span>
                    {g.code && <span className="fx-rail-code">{g.code}</span>}
                  </span>
                  <span className="fx-rail-meta">
                    {g.buildings.length} building{g.buildings.length !== 1 ? 's' : ''}, {roomsIn(g)} room{roomsIn(g) !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
              {railGroups.length === 0 && <div className="fx-rail-meta" style={{ padding: '.5rem .7rem' }}>No match.</div>}
            </div>
          </aside>

          {/* Detail: buildings & rooms of the selected department */}
          <div className="fx-pane">
            <div className="fx-pane-head">
              <div>
                <div className="fx-pane-title">
                  <h2>{active.title}</h2>
                  {active.code && <span className="fx-pane-code">{active.code}</span>}
                </div>
                <div className="fx-pane-sub">
                  {active.buildings.length} building{active.buildings.length !== 1 ? 's' : ''}, {roomsIn(active)} room{roomsIn(active) !== 1 ? 's' : ''}
                </div>
              </div>
              {!addingBld && (
                <button className="fx-btn" onClick={() => { setAddingBld(true); setBldForm({ name: '', code: '' }); }}>
                  <i className="ti ti-plus" /> Add building
                </button>
              )}
            </div>

            {addingBld && (
              <div className="fx-add-bld">
                <input
                  className="fx-input fx-input-grow"
                  placeholder="Building name, e.g. IT Building"
                  value={bldForm.name}
                  onChange={e => setBldForm(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') saveBuilding(); if (e.key === 'Escape') setAddingBld(false); }}
                  autoFocus
                />
                <input
                  className="fx-input fx-input-sm"
                  placeholder="Short code (optional)"
                  value={bldForm.code}
                  onChange={e => setBldForm(p => ({ ...p, code: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') saveBuilding(); if (e.key === 'Escape') setAddingBld(false); }}
                />
                <button className="fx-btn" onClick={saveBuilding} disabled={savingBld}>
                  {savingBld ? 'Adding…' : 'Add building'}
                </button>
                <button className="fx-btn-ghost" onClick={() => setAddingBld(false)}>Cancel</button>
              </div>
            )}

            {active.buildings.length === 0 ? (
              <div className="fx-empty">
                <i className="ti ti-building-off" />
                <div className="t">No buildings in {active.title} yet</div>
                <div className="d">Add a building, then list the rooms inside it — those rooms become available when you schedule classes.</div>
                {!addingBld && (
                  <button className="fx-btn" onClick={() => { setAddingBld(true); setBldForm({ name: '', code: '' }); }}>
                    <i className="ti ti-plus" /> Add the first building
                  </button>
                )}
              </div>
            ) : (
              <div className="fx-bld-list">
                {active.buildings.map(b => (
                  <div className="fx-bld" key={b.id}>
                    <div className="fx-bld-head">
                      <div className="fx-bld-id">
                        <div className="fx-bld-ic"><i className="ti ti-building" /></div>
                        <div>
                          <div className="fx-bld-name">
                            {b.name}
                            {b.code && <> &middot; <span className="fx-bld-code2">{b.code}</span></>}
                          </div>
                          <div className="fx-bld-sub">{b.room_count} room{b.room_count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <button className="fx-icon-btn" title="Delete building" onClick={() => deleteBuilding(b)}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>

                    <div className="fx-rack">
                      {b.rooms.length === 0 && addRoomFor !== b.id && (
                        <span className="fx-rack-empty">No rooms yet.</span>
                      )}
                      {b.rooms.map(r => {
                        const meta = TYPE_META[r.room_type] || TYPE_META.lecture;
                        return (
                          <span className="fx-room" data-type={r.room_type} key={r.id} title={meta.label}>
                            <i className={`ti ${meta.icon}`} />
                            {r.name}
                            <button className="fx-room-x" title="Remove room" onClick={() => deleteRoom(b, r)}>
                              <i className="ti ti-x" />
                            </button>
                          </span>
                        );
                      })}

                      {addRoomFor === b.id ? (
                        <span className="fx-room-form">
                          <input
                            className="fx-input fx-input-room"
                            placeholder="Room name"
                            value={roomName}
                            onChange={e => setRoomName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveRoom(b); if (e.key === 'Escape') setAddRoomFor(null); }}
                            autoFocus
                          />
                          <span className="fx-typeseg" role="group" aria-label="Room type">
                            {ROOM_TYPES.map(t => (
                              <button
                                type="button"
                                key={t.value}
                                className={roomType === t.value ? 'on' : ''}
                                onClick={() => setRoomType(t.value)}
                                aria-pressed={roomType === t.value}
                              >
                                <i className={`ti ${t.icon}`} /> {t.label}
                              </button>
                            ))}
                          </span>
                          <button className="fx-btn fx-btn-sm" onClick={() => saveRoom(b)} disabled={savingRoom}>Add</button>
                          <button className="fx-btn-ghost fx-btn-sm" onClick={() => setAddRoomFor(null)}>Done</button>
                        </span>
                      ) : (
                        <button className="fx-room-add" onClick={() => startAddRoom(b.id)}>
                          <i className="ti ti-plus" /> Add room
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
