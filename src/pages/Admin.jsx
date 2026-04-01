// src/pages/Admin.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const RED='#E40521',DARK='#0A0A0A',CARD='#111111',BORD='#1F1F1F',TEXT='#F9FAFB',TEXT2='#9CA3AF',TEXT3='#4B5563',GREEN='#22C55E',AMBER='#F59E0B',BLUE='#3B82F6',BG='#0D0D0D';

const ROLE_CONFIG = {
  admin:       { label:'Admin',       color:'#EF4444', bg:'#1A0A0A' },
  coordinator: { label:'Coordinator', color:'#8B5CF6', bg:'#0F0A1A' },
  driver:      { label:'Driver',      color:BLUE,      bg:'#0A0D1A' },
  customer:    { label:'Customer',    color:GREEN,     bg:'#0A1A0A' },
};

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { label: role, color: TEXT2, bg: CARD };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:cfg.bg, border:`1px solid ${cfg.color}40`, fontSize:11, fontWeight:700, color:cfg.color }}>
      {cfg.label}
    </span>
  );
}

function StatusDot({ active }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color: active ? GREEN : '#EF4444' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background: active ? GREEN : '#EF4444', display:'inline-block' }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function UserFormModal({ user, onClose, onSaved }) {
  const isEdit = !!user?.id;
  const [form, setForm] = useState({
    name:     user?.name     || '',
    email:    user?.email    || '',
    phone:    user?.phone    || '',
    role:     user?.role     || 'customer',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.email || !form.phone) return setError('Name, email and phone are required');
    if (!isEdit && !form.password) return setError('Password is required for new users');
    setSaving(true); setError('');
    try {
      if (isEdit) {
        await api.patch(`/admin/users/${user.id}`, { name: form.name, email: form.email, phone: form.phone, role: form.role });
      } else {
        await api.post('/admin/users', form);
      }
      onSaved();
      onClose();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:299 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:440, background:'#111', border:`1px solid ${BORD}`, borderRadius:16, zIndex:300, overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${BORD}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, color:TEXT }}>{isEdit ? 'Edit User' : 'Create New User'}</div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:TEXT3, cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        <div style={{ padding:'20px 24px' }}>
          {error && <div style={{ background:'#1A0505', border:'1px solid #7F1D1D', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#FCA5A5' }}>{error}</div>}
          {[
            { label:'Full Name *',    key:'name',     type:'text',     ph:'e.g. Ahmed Al Mansouri' },
            { label:'Email *',        key:'email',    type:'email',    ph:'email@example.com' },
            { label:'Phone *',        key:'phone',    type:'text',     ph:'+971 50 123 4567' },
            ...(!isEdit ? [{ label:'Password *', key:'password', type:'password', ph:'Min 8 characters' }] : []),
          ].map(f => (
            <div key={f.key} style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:TEXT3, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.ph}
                style={{ width:'100%', padding:'10px 12px', background:'#1A1A1A', border:`1px solid ${BORD}`, borderRadius:8, fontSize:13, color:TEXT, fontFamily:"'Barlow',sans-serif", boxSizing:'border-box' }} />
            </div>
          ))}
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:TEXT3, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Role *</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {Object.entries(ROLE_CONFIG).map(([r, cfg]) => (
                <button key={r} onClick={() => set('role', r)} style={{
                  padding:'10px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700,
                  background: form.role === r ? cfg.bg : CARD,
                  border: `2px solid ${form.role === r ? cfg.color : BORD}`,
                  color: form.role === r ? cfg.color : TEXT3,
                }}>{cfg.label}</button>
              ))}
            </div>
          </div>
          <button onClick={submit} disabled={saving}
            style={{ width:'100%', padding:'12px', background:saving?'#7F0010':RED, border:'none', borderRadius:8, fontSize:14, fontWeight:700, color:'#fff', cursor:saving?'not-allowed':'pointer', fontFamily:"'Barlow',sans-serif" }}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User & Send Welcome Email'}
          </button>
        </div>
      </div>
    </>
  );
}

function UserDrawer({ user, onClose, onRefresh }) {
  const { user: me } = useAuth();
  const [loading,    setLoading]    = useState(false);
  const [showReset,  setShowReset]  = useState(false);
  const [newPw,      setNewPw]      = useState('');
  const [resetDone,  setResetDone]  = useState('');
  const [showEdit,   setShowEdit]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleToggle = async () => {
    if (!confirm(`${user.is_active ? 'Deactivate' : 'Activate'} ${user.name}?`)) return;
    setLoading(true);
    try {
      await api.patch(`/admin/users/${user.id}/status`);
      onRefresh(); onClose();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/admin/users/${user.id}/reset-password`, { newPassword: newPw || undefined });
      setResetDone(res.tempPassword);
      setShowReset(false);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.del(`/admin/users/${user.id}`);
      onRefresh(); onClose();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  if (!user) return null;
  const isSelf = user.id === me?.id;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:199 }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:420, background:'#111', borderLeft:`1px solid ${BORD}`, zIndex:200, display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${BORD}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:10 }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:ROLE_CONFIG[user.role]?.color||RED, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#fff', flexShrink:0 }}>
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:TEXT, fontFamily:"'Barlow Condensed',sans-serif" }}>{user.name}</div>
                <div style={{ fontSize:12, color:TEXT3 }}>{user.email}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <RoleBadge role={user.role} />
              <StatusDot active={user.is_active} />
            </div>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:TEXT3, cursor:'pointer', fontSize:20 }}>✕</button>
        </div>

        {/* Info */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:10, padding:'16px', marginBottom:14 }}>
            {[
              ['Phone',      user.phone],
              ['Role',       user.role],
              ['Joined',     user.created_at?.slice(0,10)],
              ['Last Login', user.last_login_at ? user.last_login_at.slice(0,16).replace('T',' ') : 'Never'],
              ['Active Jobs', user.active_jobs || 0],
              ['Total Jobs',  user.total_jobs  || 0],
              ...(user.avg_rating ? [['Avg Rating', `${user.avg_rating} ★`]] : []),
            ].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${BORD}`, fontSize:13 }}>
                <span style={{ color:TEXT3 }}>{l}</span>
                <span style={{ color:TEXT, fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Recent jobs */}
          {user.recentJobs?.length > 0 && (
            <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:TEXT3, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>Recent Jobs</div>
              {user.recentJobs.slice(0,5).map(j => (
                <div key={j.id} style={{ padding:'8px 0', borderBottom:`1px solid ${BORD}`, fontSize:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontFamily:"'DM Mono',monospace", color:RED, fontWeight:700, fontSize:10 }}>{j.id}</span>
                    <span style={{ color:TEXT3, fontSize:10 }}>{j.created_at?.slice(0,10)}</span>
                  </div>
                  <div style={{ color:TEXT, marginTop:2 }}>{j.service_type}</div>
                  <div style={{ color:TEXT3 }}>{j.model} · {j.plate}</div>
                </div>
              ))}
            </div>
          )}

          {/* Reset password result */}
          {resetDone && (
            <div style={{ background:'#0A1A0A', border:'1px solid #166534', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:GREEN, marginBottom:6 }}>✓ Password Reset — Email Sent</div>
              <div style={{ fontSize:11, color:TEXT2 }}>Temp password: <code style={{ background:'#1A2A1A', padding:'2px 6px', borderRadius:4, color:GREEN }}>{resetDone}</code></div>
            </div>
          )}

          {/* Reset password form */}
          {showReset && (
            <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:TEXT2, marginBottom:10 }}>SET NEW PASSWORD</div>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Leave blank to auto-generate"
                style={{ width:'100%', padding:'9px 12px', background:'#1A1A1A', border:`1px solid ${BORD}`, borderRadius:8, fontSize:13, color:TEXT, fontFamily:"'Barlow',sans-serif", marginBottom:8, boxSizing:'border-box' }} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <button onClick={handleReset} disabled={loading}
                  style={{ padding:'9px', background:RED, border:'none', borderRadius:8, fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:"'Barlow',sans-serif" }}>
                  {loading ? '...' : 'Reset & Email'}
                </button>
                <button onClick={() => setShowReset(false)}
                  style={{ padding:'9px', background:'transparent', border:`1px solid ${BORD}`, borderRadius:8, fontSize:12, fontWeight:700, color:TEXT3, cursor:'pointer', fontFamily:"'Barlow',sans-serif" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Delete confirm */}
          {showDelete && (
            <div style={{ background:'#1A0505', border:'1px solid #7F1D1D', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#FCA5A5', marginBottom:8 }}>⚠️ Delete {user.name}?</div>
              <div style={{ fontSize:12, color:'#EF4444', marginBottom:12 }}>This is permanent. The user must have no active jobs.</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <button onClick={handleDelete} disabled={loading}
                  style={{ padding:'9px', background:'#7F1D1D', border:'none', borderRadius:8, fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:"'Barlow',sans-serif" }}>
                  {loading ? '...' : 'Yes, Delete'}
                </button>
                <button onClick={() => setShowDelete(false)}
                  style={{ padding:'9px', background:'transparent', border:`1px solid ${BORD}`, borderRadius:8, fontSize:12, fontWeight:700, color:TEXT3, cursor:'pointer', fontFamily:"'Barlow',sans-serif" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding:'14px 24px', borderTop:`1px solid ${BORD}`, display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button onClick={() => setShowEdit(true)}
              style={{ padding:'10px', background:CARD, border:`1px solid ${BORD}`, borderRadius:8, fontSize:12, fontWeight:700, color:TEXT, cursor:'pointer', fontFamily:"'Barlow',sans-serif" }}>
              ✏️ Edit Details
            </button>
            <button onClick={() => { setShowReset(!showReset); setShowDelete(false); }}
              style={{ padding:'10px', background:CARD, border:`1px solid ${BORD}`, borderRadius:8, fontSize:12, fontWeight:700, color:AMBER, cursor:'pointer', fontFamily:"'Barlow',sans-serif" }}>
              🔑 Reset Password
            </button>
          </div>
          {!isSelf && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <button onClick={handleToggle} disabled={loading}
                style={{ padding:'10px', background: user.is_active ? '#1A0A0A' : '#0A1A0A', border:`1px solid ${user.is_active ? '#7F1D1D' : '#166534'}`, borderRadius:8, fontSize:12, fontWeight:700, color: user.is_active ? '#EF4444' : GREEN, cursor:'pointer', fontFamily:"'Barlow',sans-serif" }}>
                {loading ? '...' : user.is_active ? '🚫 Deactivate' : '✓ Activate'}
              </button>
              <button onClick={() => { setShowDelete(!showDelete); setShowReset(false); }}
                style={{ padding:'10px', background:'#1A0505', border:`1px solid #7F1D1D`, borderRadius:8, fontSize:12, fontWeight:700, color:'#EF4444', cursor:'pointer', fontFamily:"'Barlow',sans-serif" }}>
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {showEdit && <UserFormModal user={user} onClose={() => setShowEdit(false)} onSaved={() => { onRefresh(); onClose(); }} />}
    </>
  );
}

export default function Admin({ onBack }) {
  const [users,       setUsers]       = useState([]);
  const [stats,       setStats]       = useState({});
  const [loading,     setLoading]     = useState(true);
  const [selectedUser,setSelectedUser]= useState(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [filterRole,  setFilterRole]  = useState('all');
  const [filterActive,setFilterActive]= useState('all');
  const [search,      setSearch]      = useState('');
  const [detailUser,  setDetailUser]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterRole   !== 'all') params.role      = filterRole;
      if (filterActive !== 'all') params.is_active = filterActive;
      if (search)                 params.search    = search;

      const [usersRes, statsRes] = await Promise.all([
        api.get('/admin/users', params),
        api.get('/admin/stats'),
      ]);
      setUsers(usersRes.users || []);
      setStats(statsRes);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterRole, filterActive, search]);

  useEffect(() => { load(); }, [load]);

  const openUser = async (user) => {
    try {
      const full = await api.get(`/admin/users/${user.id}`);
      setDetailUser(full);
    } catch (err) { console.error(err); }
  };

  const ROLE_FILTERS = [
    { id:'all',         label:'All Users',    count: (parseInt(stats.customers||0)+parseInt(stats.drivers||0)+parseInt(stats.coordinators||0)+parseInt(stats.admins||0)) },
    { id:'customer',    label:'Customers',    count: stats.customers    || 0 },
    { id:'driver',      label:'Drivers',      count: stats.drivers      || 0 },
    { id:'coordinator', label:'Coordinators', count: stats.coordinators || 0 },
    { id:'admin',       label:'Admins',       count: stats.admins       || 0 },
  ];

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:BG, fontFamily:"'Barlow',sans-serif", overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'20px 28px', borderBottom:`1px solid ${BORD}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:DARK, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <button onClick={onBack} style={{ background:'transparent', border:`1px solid ${BORD}`, borderRadius:8, padding:'6px 12px', color:TEXT3, cursor:'pointer', fontSize:12 }}>← Dashboard</button>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:700, color:TEXT }}>User Management</div>
            <div style={{ fontSize:12, color:TEXT3 }}>Manage coordinators, drivers and customers</div>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ background:RED, border:'none', borderRadius:8, padding:'10px 20px', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:"'Barlow',sans-serif", display:'flex', alignItems:'center', gap:6 }}>
          + Create User
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ padding:'20px 28px 0', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, flexShrink:0 }}>
        {[
          ['Customers',    stats.customers    || 0, GREEN],
          ['Drivers',      stats.drivers      || 0, BLUE],
          ['Coordinators', stats.coordinators || 0, '#8B5CF6'],
          ['Deactivated',  stats.deactivated  || 0, '#EF4444'],
          ['New This Week',stats.new_this_week|| 0, AMBER],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:10, padding:'14px 16px', borderTop:`3px solid ${c}` }}>
            <div style={{ fontSize:10, fontWeight:700, color:TEXT3, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>{l}</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:30, fontWeight:700, color:TEXT }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div style={{ padding:'16px 28px', display:'flex', gap:12, alignItems:'center', flexShrink:0 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone..."
          style={{ flex:1, padding:'9px 14px', background:CARD, border:`1px solid ${BORD}`, borderRadius:8, fontSize:13, color:TEXT, fontFamily:"'Barlow',sans-serif" }} />
        <div style={{ display:'flex', background:CARD, border:`1px solid ${BORD}`, borderRadius:8, overflow:'hidden' }}>
          {ROLE_FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilterRole(f.id)} style={{
              padding:'9px 12px', fontSize:11, fontWeight:700, cursor:'pointer', border:'none',
              background: filterRole===f.id ? RED : 'transparent',
              color: filterRole===f.id ? '#fff' : TEXT3,
            }}>{f.label} <span style={{ opacity:0.7 }}>{f.count}</span></button>
          ))}
        </div>
        <div style={{ display:'flex', background:CARD, border:`1px solid ${BORD}`, borderRadius:8, overflow:'hidden' }}>
          {[['all','All'],['true','Active'],['false','Inactive']].map(([v,l]) => (
            <button key={v} onClick={() => setFilterActive(v)} style={{
              padding:'9px 12px', fontSize:11, fontWeight:700, cursor:'pointer', border:'none',
              background: filterActive===v ? '#1A1A1A' : 'transparent',
              color: filterActive===v ? TEXT : TEXT3,
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 28px 28px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 160px 140px 100px 120px 80px', padding:'8px 16px', gap:12, marginBottom:4 }}>
          {['User','Role','Email / Phone','Status','Last Login',''].map(h => (
            <div key={h} style={{ fontSize:10, fontWeight:700, color:TEXT3, letterSpacing:'0.08em', textTransform:'uppercase' }}>{h}</div>
          ))}
        </div>
        <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:12, overflow:'hidden' }}>
          {loading ? (
            <div style={{ padding:'40px', textAlign:'center', color:TEXT3 }}>Loading users...</div>
          ) : users.length === 0 ? (
            <div style={{ padding:'60px', textAlign:'center', color:TEXT3 }}>No users found</div>
          ) : users.map((user, i) => (
            <div key={user.id} onClick={() => openUser(user)}
              style={{ display:'grid', gridTemplateColumns:'1fr 160px 140px 100px 120px 80px', padding:'13px 16px', gap:12, alignItems:'center', borderBottom: i < users.length-1 ? `1px solid ${BORD}` : 'none', cursor:'pointer' }}
              onMouseOver={e => e.currentTarget.style.background='#161616'}
              onMouseOut={e  => e.currentTarget.style.background='transparent'}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:ROLE_CONFIG[user.role]?.color||RED, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff', flexShrink:0, opacity: user.is_active ? 1 : 0.4 }}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color: user.is_active ? TEXT : TEXT3 }}>{user.name}</div>
                  <div style={{ fontSize:10, color:TEXT3, fontFamily:"'DM Mono',monospace" }}>{user.id.slice(0,8)}...</div>
                </div>
              </div>
              <div><RoleBadge role={user.role} /></div>
              <div>
                <div style={{ fontSize:12, color:TEXT2 }}>{user.email}</div>
                <div style={{ fontSize:11, color:TEXT3 }}>{user.phone}</div>
              </div>
              <div><StatusDot active={user.is_active} /></div>
              <div style={{ fontSize:11, color:TEXT3, fontFamily:"'DM Mono',monospace" }}>
                {user.last_login_at ? user.last_login_at.slice(0,10) : 'Never'}
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                {parseInt(user.active_jobs) > 0 && (
                  <span style={{ fontSize:10, background:'#0A0D1A', color:BLUE, padding:'2px 6px', borderRadius:10, fontWeight:700 }}>{user.active_jobs}</span>
                )}
                <span style={{ fontSize:16, color:TEXT3 }}>›</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {detailUser && <UserDrawer user={detailUser} onClose={() => setDetailUser(null)} onRefresh={load} />}
      {showCreate  && <UserFormModal onClose={() => setShowCreate(false)} onSaved={load} />}
    </div>
  );
}
