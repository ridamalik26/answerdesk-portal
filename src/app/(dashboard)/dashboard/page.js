'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function StatusBadge({ status }) {
  const map = {
    answered: { bg: 'var(--green-soft)', color: 'var(--green)', label: 'Answered' },
    missed:   { bg: 'var(--red-soft)',   color: 'var(--red)',   label: 'Missed'   },
    voicemail:{ bg: 'var(--blue-soft)',  color: 'var(--blue)',  label: 'Voicemail'},
  };
  const c = map[status] ?? map.answered;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:99, background:c.bg, color:c.color, fontSize:12, fontWeight:500 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.color, flexShrink:0 }} />{c.label}
    </span>
  );
}

function RingChart({ percent, used, total }) {
  const r = 52, circ = 2 * Math.PI * r;
  const dash = Math.min(percent / 100, 1) * circ;
  return (
    <div style={{ position:'relative', width:128, height:128, flexShrink:0 }}>
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--line)" strokeWidth="10"/>
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--accent)" strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 64 64)"/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:600, color:'var(--ink)' }}>{used}</span>
        <span style={{ fontSize:11, color:'var(--ink-3)', marginTop:1 }}>of {total}</span>
      </div>
    </div>
  );
}

function Skeleton({ w = '100%', h = 18, r = 6 }) {
  return <div style={{ width:w, height:h, borderRadius:r, background:'var(--line)', animation:'pulse 1.5s ease-in-out infinite' }} />;
}

export default function DashboardPage() {
  const [client, setClient]       = useState(null);
  const [calls, setCalls]         = useState([]);
  const [recentCalls, setRecent]  = useState([]);
  const [invoice, setInvoice]     = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [clientRes, callsRes, recentRes, invoiceRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', user.id).single(),
        supabase.from('calls').select('status,duration_seconds,created_at').eq('client_id', user.id).gte('created_at', startOfMonth()),
        supabase.from('calls').select('*').eq('client_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('invoices').select('*').eq('client_id', user.id).in('status', ['pending','overdue']).order('created_at', { ascending: false }).limit(1),
      ]);

      if (clientRes.data)  setClient(clientRes.data);
      if (callsRes.data)   setCalls(callsRes.data);
      if (recentRes.data)  setRecent(recentRes.data);
      if (invoiceRes.data?.length) setInvoice(invoiceRes.data[0]);
      setLoading(false);
    }
    load();
  }, []);

  const totalMinutes  = Math.round(calls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60);
  const limit         = client?.minutes_limit ?? 500;
  const percent       = Math.round((totalMinutes / limit) * 100);
  const remaining     = Math.max(0, limit - totalMinutes);
  const answered      = calls.filter(c => c.status === 'answered').length;
  const missed        = calls.filter(c => c.status === 'missed').length;
  const voicemail     = calls.filter(c => c.status === 'voicemail').length;

  // 7-day bar chart
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });
  const weeklyData = weekDays.map(d => {
    const label = d.toLocaleDateString([], { weekday: 'short' });
    const dayCalls = recentCalls.filter(c => {
      const cd = new Date(c.created_at);
      return cd.toDateString() === d.toDateString();
    });
    const minutes = Math.round(dayCalls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60);
    return { day: label, minutes };
  });
  const maxMin = Math.max(...weeklyData.map(d => d.minutes), 1);

  return (
    <div style={{ padding:'32px 36px', maxWidth:1100 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.03em' }}>
          {loading ? 'Loading…' : `Good morning, ${client?.business_name ?? 'there'}`}
        </h1>
        <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>Here's what's happening with your account today.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
        {/* Minutes */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:'20px 20px 16px' }}>
          <div style={{ fontSize:12, fontWeight:500, color:'var(--ink-3)', marginBottom:14, textTransform:'uppercase', letterSpacing:'0.06em' }}>Minutes Used</div>
          {loading ? <Skeleton h={120} /> : (
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <RingChart percent={percent} used={totalMinutes} total={limit} />
              <div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:28, fontWeight:700, color:'var(--ink)', lineHeight:1 }}>{percent}%</div>
                <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:4 }}>{remaining} remaining</div>
                <div style={{ marginTop:10, fontSize:11, color:'var(--amber)', background:'var(--amber-soft)', padding:'2px 8px', borderRadius:99, display:'inline-block', fontWeight:500 }}>
                  Resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString([], { month:'short', day:'numeric' })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Calls */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:'20px 20px 16px' }}>
          <div style={{ fontSize:12, fontWeight:500, color:'var(--ink-3)', marginBottom:14, textTransform:'uppercase', letterSpacing:'0.06em' }}>Calls This Month</div>
          {loading ? <Skeleton h={60} /> : (
            <>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:40, fontWeight:700, color:'var(--ink)', lineHeight:1 }}>{calls.length}</div>
              <div style={{ marginTop:8, display:'flex', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:12, color:'var(--green)' }}>{answered} answered</span>
                <span style={{ fontSize:12, color:'var(--ink-3)' }}>·</span>
                <span style={{ fontSize:12, color:'var(--red)' }}>{missed} missed</span>
                <span style={{ fontSize:12, color:'var(--ink-3)' }}>·</span>
                <span style={{ fontSize:12, color:'var(--blue)' }}>{voicemail} vm</span>
              </div>
            </>
          )}
        </div>

        {/* Next invoice */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:'20px 20px 16px' }}>
          <div style={{ fontSize:12, fontWeight:500, color:'var(--ink-3)', marginBottom:14, textTransform:'uppercase', letterSpacing:'0.06em' }}>Next Invoice</div>
          {loading ? <Skeleton h={60} /> : (
            <>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:40, fontWeight:700, color:'var(--ink)', lineHeight:1 }}>
                {invoice ? `$${Number(invoice.total_amount).toFixed(0)}` : `$${Number(client?.monthly_price ?? 0).toFixed(0)}`}
              </div>
              <div style={{ marginTop:8, fontSize:12, color:'var(--ink-3)' }}>
                {client?.plan_name ?? '—'} · Due {invoice ? new Date(invoice.created_at).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' }) : 'next month'}
              </div>
            </>
          )}
        </div>

        {/* Overage risk */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:'20px 20px 16px' }}>
          <div style={{ fontSize:12, fontWeight:500, color:'var(--ink-3)', marginBottom:14, textTransform:'uppercase', letterSpacing:'0.06em' }}>Overage Risk</div>
          {loading ? <Skeleton h={60} /> : (
            <>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:40, fontWeight:700, color: percent >= 90 ? 'var(--red)' : percent >= 70 ? 'var(--amber)' : 'var(--green)', lineHeight:1 }}>
                {percent >= 90 ? 'High' : percent >= 70 ? 'Med' : 'Low'}
              </div>
              <div style={{ marginTop:8, fontSize:12, color:'var(--ink-3)' }}>At current pace: ~{Math.round(totalMinutes * (limit / Math.max(totalMinutes, 1)))} min</div>
              <div style={{ marginTop:10 }}>
                <div style={{ height:5, background:'var(--line)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ width:`${Math.min(percent, 100)}%`, height:'100%', background: percent >= 90 ? 'var(--red)' : percent >= 70 ? 'var(--accent)' : 'var(--green)', borderRadius:99 }} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:20, marginBottom:24 }}>
        {/* Recent calls */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>Recent Calls</span>
            <a href="/calls" style={{ fontSize:12, color:'var(--accent)', textDecoration:'none', fontWeight:500 }}>View all →</a>
          </div>
          {loading ? (
            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
              {[1,2,3,4,5].map(i => <Skeleton key={i} h={36} />)}
            </div>
          ) : recentCalls.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--ink-3)', fontSize:14 }}>No calls yet</div>
          ) : recentCalls.map((call, i) => (
            <div key={call.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', borderBottom: i < recentCalls.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, background: call.status === 'missed' ? 'var(--red-soft)' : call.status === 'voicemail' ? 'var(--blue-soft)' : 'var(--green-soft)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1.5 2.5A1 1 0 012.5 1.5h1a.5.5 0 01.47.333l.79 2.37a.5.5 0 01-.114.524L3.9 5.476a7.502 7.502 0 003.624 3.624l.75-.75a.5.5 0 01.524-.114l2.37.79A.5.5 0 0111.5 9.5v1a1 1 0 01-1 1C4.701 11.5 1.5 8.299 1.5 2.5z"
                    fill={call.status === 'missed' ? 'var(--red)' : call.status === 'voicemail' ? 'var(--blue)' : 'var(--green)'} />
                </svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {call.caller_name || 'Unknown Caller'}
                </div>
                <div style={{ fontSize:11, color:'var(--ink-3)', fontFamily:"'JetBrains Mono',monospace", marginTop:1 }}>{call.caller_number}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:12, fontFamily:"'JetBrains Mono',monospace", color:'var(--ink-2)', fontWeight:500 }}>{formatDuration(call.duration_seconds)}</div>
                <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:1 }}>{formatTime(call.created_at)}</div>
              </div>
              <StatusBadge status={call.status} />
            </div>
          ))}
        </div>

        {/* Weekly bar chart */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)' }}>
            <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>Weekly Minutes</span>
            <span style={{ fontSize:12, color:'var(--ink-3)', marginLeft:8 }}>Last 7 days</span>
          </div>
          <div style={{ padding:'20px 20px 16px' }}>
            {loading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} h={20} />)}
              </div>
            ) : weeklyData.map(d => (
              <div key={d.day} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <span style={{ fontSize:11, color:'var(--ink-3)', width:26, flexShrink:0 }}>{d.day}</span>
                <div style={{ flex:1, height:20, background:'var(--paper-2)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ width:`${(d.minutes / maxMin) * 100}%`, height:'100%', background: d.minutes >= (maxMin * 0.85) ? 'var(--accent)' : 'var(--ink)', borderRadius:4, opacity: d.minutes > 0 ? 0.85 : 0, transition:'width 0.3s' }} />
                </div>
                <span style={{ fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:'var(--ink-2)', width:24, textAlign:'right', flexShrink:0 }}>{d.minutes}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account snapshot */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:'16px 24px', display:'flex', gap:40, flexWrap:'wrap' }}>
        {loading ? [1,2,3,4,5].map(i => <Skeleton key={i} w={120} h={36} />) : [
          { label:'Plan',           value: client?.plan_name ?? '—',   mono:false },
          { label:'Account Status', value: client?.status ?? '—',      badge: client?.status === 'active' },
          { label:'Minutes Limit',  value: `${client?.minutes_limit ?? '—'} min`, mono:true },
          { label:'Overage Rate',   value: client ? `$${client.overage_rate}/min` : '—', mono:true },
          { label:'Monthly Price',  value: client ? `$${client.monthly_price}/mo` : '—', mono:true },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{item.label}</div>
            {item.badge ? (
              <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600, color:'var(--green)' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)' }} />{item.value}
              </span>
            ) : (
              <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', fontFamily: item.mono ? "'JetBrains Mono',monospace" : 'inherit' }}>{item.value}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
