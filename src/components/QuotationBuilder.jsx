// src/components/QuotationBuilder.jsx
import { useState, useEffect } from 'react';
import { quotApi } from '../lib/api';

const RED='#E40521',CARD='#111111',BORD='#1F1F1F',TEXT='#F9FAFB',TEXT2='#9CA3AF',TEXT3='#4B5563',GREEN='#22C55E',AMBER='#F59E0B';

const CATALOG = {
  Engine:     [{name:'Engine Oil Change (0W-20 Synthetic)',price:280},{name:'Engine Oil Change (5W-30 Standard)',price:200},{name:'Oil Filter Replacement',price:45},{name:'Air Filter',price:120},{name:'Spark Plugs (set of 4)',price:320}],
  Brakes:     [{name:'Brake Fluid Flush',price:180},{name:'Front Brake Pads',price:380},{name:'Rear Brake Pads',price:320},{name:'Front Brake Discs',price:580}],
  Tires:      [{name:'Tire Rotation',price:100},{name:'Wheel Balancing (4 wheels)',price:160},{name:'Wheel Alignment',price:220}],
  Cooling:    [{name:'Coolant Top-up',price:60},{name:'Coolant Flush & Refill',price:220}],
  AC:         [{name:'AC Gas Refill (R134a)',price:350},{name:'AC Full Service',price:450},{name:'AC Condenser Cleaning',price:180}],
  Electrical: [{name:'Battery Test & Check',price:0},{name:'Battery Replacement (55Ah)',price:420}],
  Exterior:   [{name:'Wiper Blades (pair)',price:120},{name:'Cabin Air Filter',price:95}],
  General:    [{name:'Multi-Point Inspection',price:0},{name:'Fluid Top-up (all)',price:80}],
  Labor:      [{name:'Labor (Standard)',price:315},{name:'Labor (Major Service)',price:450},{name:'Labor (Custom)',price:0}],
};

export default function QuotationBuilder({ jobId, jobInfo, onClose, onSaved }) {
  const [items,    setItems]    = useState([]);
  const [notes,    setNotes]    = useState('');
  const [discount, setDiscount] = useState(0);
  const [saving,   setSaving]   = useState(false);
  const [tab,      setTab]      = useState('Engine');

  const addItem = (item) => {
    const exists = items.findIndex(i => i.name === item.name);
    if (exists >= 0) return; // already added
    setItems(prev => [...prev, { ...item, quantity: 1, unit_price: item.price }]);
  };

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.unit_price || 0) * (parseInt(i.quantity) || 1)), 0);
  const total    = Math.max(0, subtotal - parseFloat(discount || 0));

  const save = async () => {
    if (!items.length) return alert('Add at least one item');
    setSaving(true);
    try {
      await quotApi.create({ job_id: jobId, items, notes, discount });
      onSaved();
      onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:199 }} />
      <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20, pointerEvents:'none' }}>
        <div style={{ background:'#0D0D0D', border:`1px solid ${BORD}`, borderRadius:16, width:'100%', maxWidth:900, maxHeight:'90vh', display:'flex', flexDirection:'column', pointerEvents:'all' }}>
          {/* Header */}
          <div style={{ padding:'20px 24px', borderBottom:`1px solid ${BORD}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:TEXT, fontFamily:"'Barlow Condensed',sans-serif" }}>Build Service Quotation</div>
              <div style={{ fontSize:12, color:TEXT3, marginTop:2 }}>{jobInfo?.customer_name} · {jobInfo?.year} {jobInfo?.model} · {jobInfo?.plate}</div>
            </div>
            <button onClick={onClose} style={{ background:'transparent', border:'none', color:TEXT3, cursor:'pointer', fontSize:20 }}>✕</button>
          </div>

          <div style={{ flex:1, overflow:'hidden', display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
            {/* Left — catalog */}
            <div style={{ borderRight:`1px solid ${BORD}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${BORD}` }}>
                <div style={{ fontSize:11, fontWeight:700, color:TEXT3, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Service Catalog</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {Object.keys(CATALOG).map(cat => (
                    <button key={cat} onClick={() => setTab(cat)} style={{ padding:'4px 10px', fontSize:11, fontWeight:700, cursor:'pointer', border:'none', borderRadius:12, background: tab===cat ? RED : BORD, color: tab===cat ? '#fff' : TEXT3 }}>{cat}</button>
                  ))}
                </div>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'8px 12px' }}>
                {(CATALOG[tab] || []).map(item => {
                  const added = items.some(i => i.name === item.name);
                  return (
                    <div key={item.name} onClick={() => !added && addItem(item)}
                      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderRadius:8, marginBottom:4, cursor: added ? 'default' : 'pointer', background: added ? '#0A1A0A' : CARD, border:`1px solid ${added ? '#166534' : BORD}`, opacity: added ? 0.7 : 1 }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color: added ? GREEN : TEXT }}>{item.name}</div>
                        {item.price === 0 && <div style={{ fontSize:10, color:GREEN, fontWeight:700 }}>FREE</div>}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {item.price > 0 && <span style={{ fontSize:12, fontWeight:700, color:TEXT2 }}>AED {item.price}</span>}
                        <span style={{ fontSize:14, color: added ? GREEN : TEXT3 }}>{added ? '✓' : '+'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right — selected items */}
            <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${BORD}` }}>
                <div style={{ fontSize:11, fontWeight:700, color:TEXT3, letterSpacing:'0.08em', textTransform:'uppercase' }}>Selected Items ({items.length})</div>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'8px 12px' }}>
                {items.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px 20px', color:TEXT3, fontSize:13 }}>← Select items from the catalog</div>
                ) : items.map((item, idx) => (
                  <div key={idx} style={{ background:CARD, border:`1px solid ${BORD}`, borderRadius:8, padding:'10px 12px', marginBottom:6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:TEXT, flex:1, marginRight:8 }}>{item.name}</div>
                      <button onClick={() => removeItem(idx)} style={{ background:'transparent', border:'none', color:'#EF4444', cursor:'pointer', fontSize:14, flexShrink:0 }}>✕</button>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      <div>
                        <div style={{ fontSize:10, color:TEXT3, marginBottom:3 }}>UNIT PRICE (AED)</div>
                        <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                          style={{ width:'100%', padding:'6px 8px', background:'#1A1A1A', border:`1px solid ${BORD}`, borderRadius:6, fontSize:12, color:TEXT, fontFamily:"'Barlow',sans-serif", boxSizing:'border-box' }} />
                      </div>
                      <div>
                        <div style={{ fontSize:10, color:TEXT3, marginBottom:3 }}>QTY</div>
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)}
                          style={{ width:'100%', padding:'6px 8px', background:'#1A1A1A', border:`1px solid ${BORD}`, borderRadius:6, fontSize:12, color:TEXT, fontFamily:"'Barlow',sans-serif", boxSizing:'border-box' }} />
                      </div>
                    </div>
                    <div style={{ textAlign:'right', marginTop:4, fontSize:12, fontWeight:700, color:AMBER }}>
                      AED {(parseFloat(item.unit_price||0) * (parseInt(item.quantity)||1)).toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals & save */}
              <div style={{ borderTop:`1px solid ${BORD}`, padding:'14px 16px' }}>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:TEXT3, letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:6 }}>Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Service notes..."
                    style={{ width:'100%', padding:'8px 10px', background:'#1A1A1A', border:`1px solid ${BORD}`, borderRadius:6, fontSize:12, color:TEXT, fontFamily:"'Barlow',sans-serif", resize:'none', marginBottom:10, boxSizing:'border-box' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:TEXT2 }}>Subtotal</span>
                  <span style={{ fontSize:13, color:TEXT }}>AED {subtotal.toFixed(0)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontSize:12, color:TEXT2 }}>Discount</span>
                  <input type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)}
                    style={{ width:90, padding:'4px 8px', background:'#1A1A1A', border:`1px solid ${BORD}`, borderRadius:6, fontSize:12, color:TEXT, textAlign:'right', fontFamily:"'Barlow',sans-serif" }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, borderTop:`2px solid ${TEXT}`, paddingTop:10 }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, color:TEXT }}>TOTAL</span>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:24, fontWeight:700, color:RED }}>AED {total.toFixed(0)}</span>
                </div>
                <button onClick={save} disabled={saving || !items.length}
                  style={{ width:'100%', padding:'12px', background: items.length ? RED : '#2A2A2A', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color: items.length ? '#fff' : TEXT3, cursor: items.length ? 'pointer' : 'not-allowed', fontFamily:"'Barlow',sans-serif" }}>
                  {saving ? 'Sending...' : `Send Quotation to Customer →`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
