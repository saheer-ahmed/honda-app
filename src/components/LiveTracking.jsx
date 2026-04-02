// src/components/LiveTracking.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import { driversApi, jobsApi } from '../lib/api';

const RED='#E40521',DARK='#0A0A0A',CARD='#111111',BORD='#1F1F1F',TEXT='#F9FAFB',TEXT2='#9CA3AF',TEXT3='#4B5563',GREEN='#22C55E',AMBER='#F59E0B',BLUE='#3B82F6';

const ROLE_COLORS = {
  online:  '#22C55E',
  offline: '#6B7280',
  pickup:  '#E40521',
  delivery:'#3B82F6',
};

// Dubai center coordinates
const DUBAI_CENTER = [25.2048, 55.2708];

export default function LiveTracking({ onClose }) {
  const mapRef        = useRef(null);
  const leafletMap    = useRef(null);
  const markersRef    = useRef({});
  const [drivers,     setDrivers]     = useState([]);
  const [activeJobs,  setActiveJobs]  = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [mapLoaded,   setMapLoaded]   = useState(false);
  const [driverLocs,  setDriverLocs]  = useState({});
  const [driverStatus,setDriverStatus]= useState({});

  // Load Leaflet CSS + JS dynamically
  useEffect(() => {
    if (document.getElementById('leaflet-css')) {
      initMap(); return;
    }
    const link = document.createElement('link');
    link.id   = 'leaflet-css';
    link.rel  = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => { setMapLoaded(true); };
    document.head.appendChild(script);

    return () => {};
  }, []);

  useEffect(() => {
    if (mapLoaded) initMap();
  }, [mapLoaded]);

  const initMap = () => {
    if (leafletMap.current || !mapRef.current || !window.L) return;

    const L = window.L;
    const map = L.map(mapRef.current, {
      center: DUBAI_CENTER,
      zoom:   11,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Honda Service Centers
    const centers = [
      { name: 'Honda Al Quoz',   lat: 25.1350, lng: 55.2250 },
      { name: 'Honda DAFZA',     lat: 25.2532, lng: 55.3657 },
    ];

    centers.forEach(c => {
      const icon = L.divIcon({
        html: `<div style="background:#E40521;color:#fff;padding:4px 8px;border-radius:6px;font-size:10px;font-weight:800;white-space:nowrap;font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3)">H ${c.name.split(' ')[1]}</div>`,
        className: '',
        iconAnchor: [40, 12],
      });
      L.marker([c.lat, c.lng], { icon }).addTo(map).bindPopup(`<b>${c.name}</b>`);
    });

    leafletMap.current = map;
  };

  // Load drivers and active jobs
  const loadData = useCallback(async () => {
    try {
      const [driversRes, jobsRes] = await Promise.all([
        driversApi.list(),
        jobsApi.list({ status: 'out_delivery' }),
      ]);
      setDrivers(driversRes);
      setActiveJobs(jobsRes.jobs || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { loadData(); }, []);

  // Update marker on map
  const updateMarker = useCallback((driverId, lat, lng, name, status) => {
    if (!leafletMap.current || !window.L) return;
    const L = window.L;
    const color = status === 'online' ? GREEN : status === 'pickup' ? RED : BLUE;

    const icon = L.divIcon({
      html: `
        <div style="position:relative">
          <div style="background:${color};color:#fff;padding:5px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;font-family:sans-serif;box-shadow:0 3px 10px rgba(0,0,0,0.4);border:2px solid #fff">
            🚗 ${name.split(' ')[0]}
          </div>
          <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};margin:0 auto"></div>
        </div>
      `,
      className: '',
      iconAnchor: [40, 36],
    });

    if (markersRef.current[driverId]) {
      markersRef.current[driverId].setLatLng([lat, lng]).setIcon(icon);
    } else {
      const marker = L.marker([lat, lng], { icon })
        .addTo(leafletMap.current)
        .bindPopup(`<b>${name}</b><br>Last update: just now`);
      markersRef.current[driverId] = marker;
    }
  }, []);

  // Real-time location updates via socket
  useSocket({
    'driver:location': ({ driverId, lat, lng, name }) => {
      setDriverLocs(prev => ({ ...prev, [driverId]: { lat, lng, ts: Date.now() } }));
      const driver = drivers.find(d => d.id === driverId);
      if (driver) updateMarker(driverId, lat, lng, driver.name, 'online');
    },
    'driver:status': ({ driverId, name, status }) => {
      setDriverStatus(prev => ({ ...prev, [driverId]: status }));
    },
  });

  // Simulate positions for seeded drivers (demo mode)
  useEffect(() => {
    if (!drivers.length) return;
    // Place drivers around Dubai for demo
    const positions = [
      { lat: 25.2048, lng: 55.2708 },
      { lat: 25.1850, lng: 55.2450 },
      { lat: 25.2300, lng: 55.3100 },
    ];
    drivers.forEach((driver, i) => {
      const pos = positions[i % positions.length];
      setTimeout(() => {
        updateMarker(driver.id, pos.lat, pos.lng, driver.name, 'online');
        setDriverLocs(prev => ({ ...prev, [driver.id]: { lat: pos.lat, lng: pos.lng, ts: Date.now() } }));
      }, i * 300);
    });
  }, [drivers, updateMarker]);

  const focusDriver = (driver) => {
    setSelected(driver);
    const loc = driverLocs[driver.id];
    if (loc && leafletMap.current) {
      leafletMap.current.flyTo([loc.lat, loc.lng], 14, { duration: 1 });
      markersRef.current[driver.id]?.openPopup();
    }
  };

  const getLastSeen = (driverId) => {
    const loc = driverLocs[driverId];
    if (!loc) return 'No location';
    const secs = Math.floor((Date.now() - loc.ts) / 1000);
    if (secs < 60)  return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs/60)}m ago`;
    return `${Math.floor(secs/3600)}h ago`;
  };

  const onlineCount = drivers.filter(d => driverLocs[d.id]).length;

  return (
    <div style={{ position:'fixed', inset:0, background:DARK, zIndex:300, display:'flex', flexDirection:'column', fontFamily:"'Barlow',sans-serif" }}>
      {/* Header */}
      <div style={{ background:'#0D0D0D', borderBottom:`1px solid ${BORD}`, padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height:60, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <button onClick={onClose} style={{ background:'transparent', border:`1px solid ${BORD}`, borderRadius:8, padding:'6px 12px', color:TEXT3, cursor:'pointer', fontSize:12 }}>← Back</button>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ background:RED, borderRadius:6, padding:'4px 10px' }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:16, color:'#fff' }}>HONDA</span>
            </div>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:700, color:TEXT }}>Live Driver Tracking</div>
              <div style={{ fontSize:11, color:TEXT3 }}>Real-time · Dubai, UAE</div>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:GREEN, display:'inline-block', animation:'pulse 2s infinite' }} />
            <span style={{ fontSize:12, color:GREEN, fontWeight:700 }}>{onlineCount} Online</span>
          </div>
          <div style={{ fontSize:12, color:TEXT3 }}>{drivers.length} Total Drivers</div>
          <button onClick={loadData} style={{ background:'transparent', border:`1px solid ${BORD}`, borderRadius:8, padding:'6px 12px', color:TEXT2, cursor:'pointer', fontSize:12 }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {/* Sidebar */}
        <div style={{ width:300, background:'#0D0D0D', borderRight:`1px solid ${BORD}`, display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
          {/* Stats */}
          <div style={{ padding:'16px', borderBottom:`1px solid ${BORD}`, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              ['Active Jobs', activeJobs.length, BLUE],
              ['Drivers Online', onlineCount, GREEN],
            ].map(([l,v,c]) => (
              <div key={l} style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:TEXT3, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4 }}>{l}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:700, color:c }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Driver list */}
          <div style={{ flex:1, overflowY:'auto' }}>
            <div style={{ padding:'12px 16px', fontSize:10, fontWeight:700, color:TEXT3, letterSpacing:'0.08em', textTransform:'uppercase' }}>Drivers</div>
            {drivers.map(driver => {
              const loc     = driverLocs[driver.id];
              const status  = driverStatus[driver.id] || (loc ? 'online' : 'offline');
              const isOnline = !!loc;
              const isSel   = selected?.id === driver.id;
              const activeJob = activeJobs.find(j => j.driver_id === driver.id);

              return (
                <div key={driver.id} onClick={() => focusDriver(driver)}
                  style={{ padding:'12px 16px', borderBottom:`1px solid ${BORD}`, cursor:'pointer', background: isSel ? '#161616' : 'transparent', borderLeft: isSel ? `3px solid ${RED}` : '3px solid transparent', transition:'all 0.15s' }}
                  onMouseOver={e => !isSel && (e.currentTarget.style.background='#141414')}
                  onMouseOut={e  => !isSel && (e.currentTarget.style.background='transparent')}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background: isOnline ? '#0A1A0A' : '#1A1A1A', border:`2px solid ${isOnline ? GREEN : BORD}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color: isOnline ? GREEN : TEXT3, flexShrink:0 }}>
                      {driver.name?.[0]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:TEXT, display:'flex', alignItems:'center', gap:6 }}>
                        {driver.name}
                        <span style={{ width:6, height:6, borderRadius:'50%', background: isOnline ? GREEN : '#6B7280', display:'inline-block', flexShrink:0 }} />
                      </div>
                      <div style={{ fontSize:11, color:TEXT3 }}>{driver.phone}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:10, color: isOnline ? GREEN : TEXT3, fontWeight:600 }}>
                      {isOnline ? `📍 ${getLastSeen(driver.id)}` : '⚫ Offline'}
                    </span>
                    {parseInt(driver.active_jobs) > 0 && (
                      <span style={{ fontSize:10, background:'#0A0D1A', color:BLUE, padding:'2px 7px', borderRadius:10, fontWeight:700 }}>
                        {driver.active_jobs} job{driver.active_jobs > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {activeJob && (
                    <div style={{ marginTop:6, padding:'6px 8px', background:'#0A0D1A', borderRadius:6, fontSize:10, color:BLUE }}>
                      🚗 {activeJob.customer_name} · {activeJob.plate}
                    </div>
                  )}
                </div>
              );
            })}
            {drivers.length === 0 && (
              <div style={{ padding:'40px 20px', textAlign:'center', color:TEXT3, fontSize:13 }}>No drivers found</div>
            )}
          </div>

          {/* Active deliveries */}
          {activeJobs.length > 0 && (
            <div style={{ borderTop:`1px solid ${BORD}`, padding:'12px 16px', maxHeight:200, overflowY:'auto' }}>
              <div style={{ fontSize:10, fontWeight:700, color:TEXT3, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Out for Delivery</div>
              {activeJobs.map(job => (
                <div key={job.id} style={{ padding:'8px 10px', background:CARD, border:`1px solid ${BORD}`, borderRadius:8, marginBottom:6 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:BLUE, marginBottom:2 }}>{job.id}</div>
                  <div style={{ fontSize:11, color:TEXT }}>{job.customer_name}</div>
                  <div style={{ fontSize:10, color:TEXT3 }}>{job.model} · {job.plate}</div>
                  {job.driver_name && <div style={{ fontSize:10, color:GREEN, marginTop:2 }}>Driver: {job.driver_name}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div style={{ flex:1, position:'relative' }}>
          <div ref={mapRef} style={{ width:'100%', height:'100%' }} />

          {/* Map legend */}
          <div style={{ position:'absolute', bottom:20, right:20, background:'rgba(10,10,10,0.9)', border:`1px solid ${BORD}`, borderRadius:10, padding:'12px 16px', zIndex:1000 }}>
            <div style={{ fontSize:10, fontWeight:700, color:TEXT3, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Legend</div>
            {[
              ['🚗', GREEN,  'Driver Online'],
              ['🚗', RED,    'On Pickup'],
              ['🚗', BLUE,   'On Delivery'],
              ['H',  RED,    'Service Center'],
            ].map(([icon, color, label]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontSize:14 }}>{icon}</span>
                <span style={{ fontSize:11, color:TEXT2 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Loading overlay */}
          {!mapLoaded && (
            <div style={{ position:'absolute', inset:0, background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ background:RED, borderRadius:8, padding:'6px 14px', display:'inline-block', marginBottom:12 }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:18, color:'#fff' }}>HONDA</span>
                </div>
                <div style={{ fontSize:13, color:TEXT3 }}>Loading map...</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        .leaflet-container { background: #1A1A1A; }
        .leaflet-popup-content-wrapper { background: #111; border: 1px solid #1F1F1F; border-radius: 8px; color: #F9FAFB; }
        .leaflet-popup-tip { background: #111; }
        .leaflet-popup-content { color: #F9FAFB; font-family: 'Barlow', sans-serif; }
        .leaflet-control-zoom a { background: #111 !important; color: #F9FAFB !important; border-color: #1F1F1F !important; }
        .leaflet-control-attribution { background: rgba(10,10,10,0.7) !important; color: #4B5563 !important; font-size: 9px !important; }
        .leaflet-control-attribution a { color: #6B7280 !important; }
      `}</style>
    </div>
  );
}
