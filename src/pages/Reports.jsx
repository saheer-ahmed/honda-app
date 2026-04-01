// src/pages/Reports.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api }     from '../lib/api';

const RED='#E40521',DARK='#0A0A0A',CARD='#111111',BORD='#1F1F1F',TEXT='#F9FAFB',TEXT2='#9CA3AF',TEXT3='#4B5563',GREEN='#22C55E',AMBER='#F59E0B',BLUE='#3B82F6';

const STATUS_COLORS = {
  booking_confirmed:'#3B82F6', driver_assigned:'#8B5CF6', vehicle_picked_up:'#F59E0B',
  inspection_done:'#F97316', at_workshop:'#EF4444', in_progress:'#F97316',
  waiting_approval:'#EAB308', service_completed:'#22C55E', ready_delivery:'#10B981',
  out_delivery:'#3B82F6', delivered:'#6B7280',
};
const STATUS_LABELS = {
  booking_confirmed:'Booking Confirmed', driver_assigned:'Driver Assigned',
  vehicle_picked_up:'Picked Up', inspection_done:'Inspection Done',
  at_workshop:'At Workshop', in_progress:'In Progress',
  waiting_approval:'Awaiting Approval', service_completed:'Service Completed',
  ready_delivery:'Ready for Delivery', out_delivery:'Out for Delivery',
  delivered:'Delivered',
};

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ height:6, background:'#2A2A2A', borderRadius:3, overflow:'hidden', flex:1 }}>
      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, transition:'width 0.4s' }} />
    </div>
  );
}

function StatCard({ label, value, sub, color, prefix='', suffix='' }) {
  return (
    <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:12, padding:'18px 20px', borderTop:`3px solid ${color}` }}>
      <div style={{ fontSize:10, fontWeight:700, color:TEXT3, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10 }}>{label}</div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:36, fontWeight:700, color:TEXT, lineHeight:1 }}>
        {prefix}{value !== null && value !== undefined ? value : '—'}{suffix}
      </div>
      {sub && <div style={{ fontSize:11, color:TEXT3, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

function SparkLine({ data, color }) {
  if (!data?.length) return null;
  const vals = data.map(d => parseInt(d.total) || 0);
  const max  = Math.max(...vals, 1);
  const W = 200, H = 50;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - (v / max) * H}`).join(' ');
  return (
    <svg width={W} height={H} style={{ display:'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {vals.map((v, i) => (
        <circle key={i} cx={(i / (vals.length - 1)) * W} cy={H - (v / max) * H} r="3" fill={color} />
      ))}
    </svg>
  );
}

export default function Reports({ onBack }) {
  const { user } = useAuth();
  const [data,    setData]    = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range,   setRange]   = useState('30');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const from = new Date(Date.now() - parseInt(range) * 24 * 60 * 60 * 1000).toISOString().slice(0,10);
        const [overview, mon] = await Promise.all([
          api.get('/reports/overview', { from }),
          api.get('/reports/monthly'),
        ]);
        setData(overview);
        setMonthly(mon);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [range]);

  if (loading) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:TEXT3 }}>Loading reports...</div>
  );
  if (!data) return null;

  const { summary, byStatus, daily, topDrivers, ratings, revenue } = data;
  const maxStatus = Math.max(...(byStatus.map(s => parseInt(s.count)) || [1]));
  const maxDriver = Math.max(...(topDrivers.map(d => parseInt(d.total_jobs)) || [1]));
  const approvalRate = revenue.total_quoted > 0 ? Math.round((revenue.approved_revenue / revenue.total_quoted) * 100) : 0;

  return (
    <div style={{ flex:1, overflowY:'auto', background:'#0D0D0D', fontFamily:"'Barlow',sans-serif" }}>
      {/* Header */}
      <div style={{ padding:'20px 28px', borderBottom:`1px solid ${BORD}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:DARK }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <button onClick={onBack} style={{ background:'transparent', border:`1px solid ${BORD}`, borderRadius:8, padding:'6px 12px', color:TEXT3, cursor:'pointer', fontSize:12 }}>← Dashboard</button>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:700, color:TEXT }}>Analytics & Reports</div>
            <div style={{ fontSize:12, color:TEXT3 }}>Period: {data.period.from} → {data.period.to}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:0, background:CARD, border:`1px solid ${BORD}`, borderRadius:8, overflow:'hidden' }}>
          {[['7','7 days'],['30','30 days'],['90','90 days']].map(([v,l]) => (
            <button key={v} onClick={() => setRange(v)} style={{ padding:'8px 16px', fontSize:12, fontWeight:700, cursor:'pointer', border:'none', background: range===v ? RED : 'transparent', color: range===v ? '#fff' : TEXT3 }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:24 }}>
        {/* KPI row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <StatCard label="Total Jobs"       value={summary.total_jobs}     sub={`${summary.completed} completed`}   color={BLUE} />
          <StatCard label="Revenue (AED)"    value={parseFloat(revenue.approved_revenue).toLocaleString()} sub={`${approvalRate}% approval rate`} color={GREEN} prefix="AED " />
          <StatCard label="Avg Rating"       value={summary.avg_rating||'—'} sub={`${summary.rated_count} reviews`} color={AMBER} suffix=" ★" />
          <StatCard label="Avg Turnaround"   value={summary.avg_turnaround_hours||'—'} sub="Hours per job"          color='#8B5CF6' suffix="h" />
        </div>

        {/* Daily trend + Monthly */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:12, padding:'20px' }}>
            <div style={{ fontSize:13, fontWeight:700, color:TEXT, marginBottom:4 }}>Daily Job Trend</div>
            <div style={{ fontSize:11, color:TEXT3, marginBottom:16 }}>Last {range} days</div>
            <SparkLine data={daily} color={RED} />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:10, color:TEXT3 }}>
              <span>{daily[0]?.date?.slice(5)}</span>
              <span>{daily[daily.length-1]?.date?.slice(5)}</span>
            </div>
          </div>
          <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:12, padding:'20px' }}>
            <div style={{ fontSize:13, fontWeight:700, color:TEXT, marginBottom:4 }}>Monthly Revenue</div>
            <div style={{ fontSize:11, color:TEXT3, marginBottom:16 }}>Last 12 months</div>
            {monthly.slice(-6).map((m, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ fontSize:11, color:TEXT3, width:60, flexShrink:0 }}>{m.month?.slice(0,7)}</div>
                <MiniBar value={parseFloat(m.revenue)} max={Math.max(...monthly.map(x=>parseFloat(x.revenue)||0),1)} color={GREEN} />
                <div style={{ fontSize:11, fontWeight:700, color:TEXT, width:70, textAlign:'right', flexShrink:0 }}>AED {parseFloat(m.revenue).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Status breakdown + Ratings */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:12, padding:'20px' }}>
            <div style={{ fontSize:13, fontWeight:700, color:TEXT, marginBottom:16 }}>Jobs by Status</div>
            {byStatus.map(s => (
              <div key={s.status} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:11, color:TEXT2 }}>{STATUS_LABELS[s.status]||s.status}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:STATUS_COLORS[s.status]||TEXT }}>{s.count}</span>
                </div>
                <MiniBar value={parseInt(s.count)} max={maxStatus} color={STATUS_COLORS[s.status]||BLUE} />
              </div>
            ))}
          </div>
          <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:12, padding:'20px' }}>
            <div style={{ fontSize:13, fontWeight:700, color:TEXT, marginBottom:16 }}>Customer Ratings</div>
            {[5,4,3,2,1].map(star => {
              const row   = ratings.find(r => parseInt(r.rating) === star);
              const count = parseInt(row?.count || 0);
              const total = ratings.reduce((s,r) => s + parseInt(r.count||0), 0);
              return (
                <div key={star} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{ fontSize:12, color:AMBER, width:30, flexShrink:0 }}>{'★'.repeat(star)}</div>
                  <MiniBar value={count} max={Math.max(total,1)} color={AMBER} />
                  <div style={{ fontSize:11, color:TEXT2, width:24, textAlign:'right', flexShrink:0 }}>{count}</div>
                </div>
              );
            })}
            <div style={{ marginTop:16, padding:'12px', background:'#1A1A0A', borderRadius:8, textAlign:'center' }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:700, color:AMBER }}>{summary.avg_rating||'—'} ★</div>
              <div style={{ fontSize:11, color:TEXT3, marginTop:2 }}>Average from {summary.rated_count} reviews</div>
            </div>
          </div>
        </div>

        {/* Top Drivers */}
        <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:12, padding:'20px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:TEXT, marginBottom:16 }}>Driver Performance</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {topDrivers.filter(d => parseInt(d.total_jobs) > 0).map((driver, i) => (
              <div key={driver.driver_id} style={{ background:'#0D0D0D', border:`1px solid ${BORD}`, borderRadius:10, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background: i===0 ? AMBER : i===1 ? '#9CA3AF' : '#CD7C2F', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff', flexShrink:0 }}>
                    {i+1}
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:TEXT }}>{driver.driver_name}</div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {[['Jobs',driver.total_jobs,BLUE],['Done',driver.completed,GREEN],['Rating',driver.avg_rating||'—',AMBER]].map(([l,v,c]) => (
                    <div key={l} style={{ textAlign:'center' }}>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, color:c }}>{v}</div>
                      <div style={{ fontSize:9, color:TEXT3, textTransform:'uppercase', letterSpacing:'0.08em' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {topDrivers.filter(d=>parseInt(d.total_jobs)>0).length===0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'30px', color:TEXT3, fontSize:13 }}>No driver data for this period</div>
            )}
          </div>
        </div>

        {/* Quotation metrics */}
        <div style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:12, padding:'20px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:TEXT, marginBottom:16 }}>Quotation Performance</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {[
              ['Total Quoted',    `AED ${parseFloat(revenue.total_quoted).toLocaleString()}`,  BLUE],
              ['Approved Revenue',`AED ${parseFloat(revenue.approved_revenue).toLocaleString()}`, GREEN],
              ['Approval Rate',   `${approvalRate}%`,  AMBER],
              ['Pending',         revenue.pending_quotes, RED],
            ].map(([l,v,c]) => (
              <div key={l} style={{ background:'#0D0D0D', border:`1px solid ${BORD}`, borderRadius:10, padding:'14px 16px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:TEXT3, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>{l}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:700, color:c }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
