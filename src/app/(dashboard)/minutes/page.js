'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

function startOfMonth() {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString();
}
function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getWeekLabel(iso) {
  const d = new Date(iso);
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - d.getDay());
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const fmt = dt => dt.toLocaleDateString([], { month:'short', day:'numeric' });
  return `${fmt(weekStart)}–${fmt(weekEnd)}`;
}

export default function MinutesPage() {
  const [client, setClient]   = useState(null);
  const [calls, setCalls]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [clientRes, callsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', user.id).single(),
        supabase.from('calls').select('duration_seconds,created_at,status').eq('client_id', user.id).gte('created_at', startOfMonth()).order('created_at', { ascending: false }),
      ]);

      if (clientRes.data) setClient(clientRes.data);
      setCalls(callsRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const limit      = client?.minutes_limit ?? 500;
  const totalSecs  = calls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0);
  const used       = Math.round(totalSecs / 60);
  const remaining  = Math.max(0, limit - used);
  const percent    = Math.round((used / limit) * 100);

  // Weekly breakdown — group calls by ISO week
  const weekMap = {};
  calls.forEach(c => {
    const label = getWeekLabel(c.created_at);
    if (!weekMap[label]) weekMap[label] = { calls: 0, seconds: 0 };
    weekMap[label].calls++;
    weekMap[label].seconds += c.duration_seconds ?? 0;
  });
  const weeklyRows = Object.entries(weekMap).slice(0, 6).map(([week, v]) => ({
    week, calls: v.calls, minutes: Math.round(v.seconds / 60),
  }));

  // Daily usage — last 7 days
  const today = new Date();
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (6 - i));
    const label = d.toLocaleDateString([], { weekday:'short', day:'numeric' });
    const mins = Math.round(
      calls.filter(c => new Date(c.created_at).toDateString() === d.toDateString())
           .reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60
    );
    return { day: label, minutes: mins };
  });
  const maxDaily = Math.max(...dailyData.map(d => d.minutes), 1);

  const r = 80, circ = 2 * Math.PI * r;
  const dash = Math.min(percent / 100, 1) * circ;

  const nextReset = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    .toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' });

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.03em' }}>Minute Tracker</h1>
        <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>Monitor your plan usage and overage risk in real time.</p>
      </div>

      {/* Hero card */}
      <div style={{ background:'var(--ink)', borderRadius:14, padding:'36px 40px', marginBottom:24, display:'flex', gap:48, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ position:'relative', width:196, height:196, flexShrink:0 }}>
          {loading ? (
            <svg width="196" height="196" viewBox="0 0 196 196">
              <circle cx="98" cy="98" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14"/>
            </svg>
          ) : (
            <svg width="196" height="196" viewBox="0 0 196 196">
              <circle cx="98" cy="98" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="14"/>
              <circle cx="98" cy="98" r={r} fill="none" stroke="var(--accent)" strokeWidth="14"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 98 98)"/>
            </svg>
          )}
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:40, fontWeight:700, color:'white', lineHeight:1 }}>
              {loading ? '…' : `${percent}%`}
            </span>
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginTop:4 }}>used</span>
          </div>
        </div>

        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:28, color:'white', marginBottom:28, lineHeight:1.2 }}>
            {loading ? 'Loading your usage…' : `${remaining} minutes remaining this cycle`}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24 }}>
            {[
              { label:'Plan Limit',  value: loading ? '…' : `${limit} min` },
              { label:'Used',        value: loading ? '…' : `${used} min` },
              { label:'Remaining',   value: loading ? '…' : `${remaining} min` },
              { label:'Cycle End',   value: loading ? '…' : nextReset },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{s.label}</div>
                <div style={{ fontSize:18, fontWeight:700, color:'white', fontFamily:"'JetBrains Mono',monospace" }}>{s.value}</div>
              </div>
            ))}
          </div>
          {!loading && percent >= 70 && (
            <div style={{ marginTop:20, padding:'10px 16px', background:'rgba(255,255,255,0.07)', borderRadius:8, fontSize:13, color:'rgba(255,255,255,0.6)', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>⚠</span>
              At current pace, you may exceed your {limit}-minute plan.{' '}
              <strong style={{ color:'var(--amber-soft)' }}>Consider upgrading.</strong>
            </div>
          )}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Weekly breakdown */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)' }}>
            <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>Weekly Breakdown</span>
          </div>
          {loading ? (
            <div style={{ padding:24, color:'var(--ink-3)', fontSize:14, textAlign:'center' }}>Loading…</div>
          ) : weeklyRows.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--ink-3)', fontSize:14 }}>No calls this month</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--paper-2)' }}>
                  {['Week','Calls','Minutes'].map(h => (
                    <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeklyRows.map(row => (
                  <tr key={row.week} style={{ borderTop:'1px solid var(--line)' }}>
                    <td style={{ padding:'11px 16px', color:'var(--ink-2)' }}>{row.week}</td>
                    <td style={{ padding:'11px 16px', fontFamily:"'JetBrains Mono',monospace", color:'var(--ink)' }}>{row.calls}</td>
                    <td style={{ padding:'11px 16px', fontFamily:"'JetBrains Mono',monospace", color:'var(--ink)', fontWeight:600 }}>{row.minutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Daily chart */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)' }}>
            <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>Daily Usage</span>
            <span style={{ fontSize:12, color:'var(--ink-3)', marginLeft:8 }}>Last 7 days</span>
          </div>
          <div style={{ padding:'20px' }}>
            {dailyData.map(d => (
              <div key={d.day} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:11 }}>
                <span style={{ fontSize:11, color:'var(--ink-3)', width:52, flexShrink:0 }}>{d.day}</span>
                <div style={{ flex:1, height:22, background:'var(--paper-2)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ width: loading ? '0%' : `${(d.minutes / maxDaily) * 100}%`, height:'100%', background: d.minutes >= maxDaily * 0.8 ? 'var(--accent)' : 'var(--ink)', borderRadius:4, opacity: d.minutes > 0 ? 0.8 : 0, transition:'width 0.4s' }} />
                </div>
                <span style={{ fontSize:12, fontFamily:"'JetBrains Mono',monospace", color:'var(--ink-2)', width:28, textAlign:'right', flexShrink:0 }}>{d.minutes}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plan info strip */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:'16px 24px', display:'flex', gap:40, flexWrap:'wrap' }}>
        {[
          { label:'Plan',           value: loading ? '…' : (client?.plan_name ?? '—') },
          { label:'Minute Limit',   value: loading ? '…' : `${limit} min` },
          { label:'Overage Rate',   value: loading ? '…' : (client ? `$${client.overage_rate}/min` : '—') },
          { label:'Projected Use',  value: loading ? '…' : `${used} min` },
          { label:'Overage Risk',   value: loading ? '…' : (percent >= 90 ? 'High ⚠' : percent >= 70 ? 'Medium' : 'Low ✓') },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{item.label}</div>
            <div style={{ fontSize:13, fontWeight:600, color: item.label === 'Overage Risk' && percent >= 90 ? 'var(--red)' : item.label === 'Overage Risk' && percent >= 70 ? 'var(--amber)' : 'var(--ink)', fontFamily:"'JetBrains Mono',monospace" }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
