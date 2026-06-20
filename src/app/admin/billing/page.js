'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

function IssueBadge({ type }) {
  const map = {
    overdue:  { bg:'var(--red-soft)',    color:'var(--red)',   label:'Overdue'   },
    overage:  { bg:'var(--amber-soft)',  color:'var(--amber)', label:'Overage'   },
    inactive: { bg:'var(--line)',         color:'var(--ink-3)', label:'Inactive'  },
  };
  const c = map[type] ?? map.overdue;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:99, background:c.bg, color:c.color, fontSize:12, fontWeight:500 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.color }} />{c.label}
    </span>
  );
}

export default function AdminBillingPage() {
  const [clients, setClients]   = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [clientsRes, invoicesRes] = await Promise.all([
        supabase.from('clients').select('*, calls(duration_seconds, created_at)'),
        supabase.from('invoices').select('*, clients(business_name, email, plan_name)').gte('created_at', monthStart),
      ]);

      setClients(clientsRes.data ?? []);
      setInvoices(invoicesRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function getMonthMinutes(client) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthCalls = (client.calls ?? []).filter(c => c.created_at >= monthStart);
    return Math.round(monthCalls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60);
  }

  const totalMRR = clients.reduce((s, c) => s + Number(c.monthly_price ?? 0), 0);

  const overageRevenue = invoices
    .filter(i => i.status !== 'paid' || i.overage_amount > 0)
    .reduce((s, i) => s + Number(i.overage_amount ?? 0), 0);

  const overdueInvoices = invoices.filter(i => i.status === 'overdue');

  // Plan distribution
  const planMap = {};
  clients.forEach(c => {
    const plan = c.plan_name ?? 'Unknown';
    if (!planMap[plan]) planMap[plan] = { count:0, revenue:0, totalMinutes:0 };
    planMap[plan].count++;
    planMap[plan].revenue += Number(c.monthly_price ?? 0);
    planMap[plan].totalMinutes += getMonthMinutes(c);
  });
  const planRows = Object.entries(planMap).map(([plan, v]) => ({
    plan,
    count:    v.count,
    revenue:  v.revenue,
    avgMins:  v.count > 0 ? Math.round(v.totalMinutes / v.count) : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  // Clients with issues
  const clientsWithIssues = [];

  overdueInvoices.forEach(inv => {
    if (inv.clients) {
      clientsWithIssues.push({
        name:    inv.clients.business_name ?? inv.clients.email,
        issue:  'overdue',
        amount: Number(inv.total_amount ?? 0),
        id:      inv.client_id,
      });
    }
  });

  clients.forEach(c => {
    const used  = getMonthMinutes(c);
    const limit = c.minutes_limit ?? 0;
    if (limit > 0 && used > limit && !clientsWithIssues.find(x => x.id === c.id)) {
      clientsWithIssues.push({
        name:   c.business_name ?? c.email,
        issue: 'overage',
        amount: Math.round((used - limit) * Number(c.overage_rate ?? 0) * 100) / 100,
        id:     c.id,
      });
    }
    if (c.status === 'inactive' && !clientsWithIssues.find(x => x.id === c.id)) {
      clientsWithIssues.push({
        name:   c.business_name ?? c.email,
        issue: 'inactive',
        amount: 0,
        id:     c.id,
      });
    }
  });

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.03em' }}>Billing Overview</h1>
        <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>Revenue summary, plan distribution, and accounts needing attention.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28 }}>
        <div style={{ background:'var(--ink)', borderRadius:10, padding:'20px 24px' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Total MRR</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:36, fontWeight:700, color:'white', lineHeight:1 }}>
            {loading ? '…' : `$${totalMRR.toLocaleString()}`}
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:6 }}>Monthly recurring revenue</div>
        </div>

        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:'20px 24px' }}>
          <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Overage Revenue</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:36, fontWeight:700, color:'var(--amber)', lineHeight:1 }}>
            {loading ? '…' : `$${overageRevenue.toFixed(0)}`}
          </div>
          <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:6 }}>This billing cycle</div>
        </div>

        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:'20px 24px' }}>
          <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Overdue Invoices</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:36, fontWeight:700, color: overdueInvoices.length > 0 ? 'var(--red)' : 'var(--green)', lineHeight:1 }}>
            {loading ? '…' : overdueInvoices.length}
          </div>
          <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:6 }}>
            {overdueInvoices.length > 0 ? 'Require immediate attention' : 'All invoices current'}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Plan Distribution */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)' }}>
            <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>Plan Distribution</span>
          </div>
          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--ink-3)', fontSize:14 }}>Loading…</div>
          ) : planRows.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--ink-3)', fontSize:14 }}>No plans found</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--paper-2)' }}>
                  {['Plan','Clients','Revenue','Avg Min'].map(h => (
                    <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {planRows.map((row, i) => (
                  <tr key={row.plan} style={{ borderTop:'1px solid var(--line)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--paper)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding:'11px 16px', fontWeight:600, color:'var(--ink)' }}>{row.plan}</td>
                    <td style={{ padding:'11px 16px', fontFamily:"'JetBrains Mono',monospace", color:'var(--ink-2)' }}>{row.count}</td>
                    <td style={{ padding:'11px 16px', fontFamily:"'JetBrains Mono',monospace", color:'var(--ink)', fontWeight:600 }}>${row.revenue.toLocaleString()}</td>
                    <td style={{ padding:'11px 16px', fontFamily:"'JetBrains Mono',monospace", color:'var(--ink-3)' }}>{row.avgMins} min</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr style={{ borderTop:'2px solid var(--line)', background:'var(--paper-2)' }}>
                  <td style={{ padding:'11px 16px', fontWeight:700, color:'var(--ink)' }}>Total</td>
                  <td style={{ padding:'11px 16px', fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:'var(--ink)' }}>{clients.length}</td>
                  <td style={{ padding:'11px 16px', fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:'var(--ink)' }}>${totalMRR.toLocaleString()}</td>
                  <td style={{ padding:'11px 16px' }} />
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Clients with issues */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>Needs Attention</span>
            {clientsWithIssues.length > 0 && (
              <span style={{ fontSize:12, fontWeight:600, color:'var(--red)', background:'var(--red-soft)', padding:'2px 9px', borderRadius:99 }}>
                {clientsWithIssues.length}
              </span>
            )}
          </div>
          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--ink-3)', fontSize:14 }}>Loading…</div>
          ) : clientsWithIssues.length === 0 ? (
            <div style={{ padding:'48px 20px', textAlign:'center', color:'var(--ink-3)' }}>
              <div style={{ fontSize:28, marginBottom:10 }}>✅</div>
              <div style={{ fontSize:14, fontWeight:500, color:'var(--ink-2)', marginBottom:4 }}>All clear</div>
              <div style={{ fontSize:13 }}>No overdue invoices or overage issues.</div>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--paper-2)' }}>
                  {['Client','Issue','Amount',''].map(h => (
                    <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientsWithIssues.map((item, i) => (
                  <tr key={`${item.id}-${i}`} style={{ borderTop:'1px solid var(--line)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--paper)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding:'11px 16px', fontWeight:500, color:'var(--ink)', maxWidth:140 }}>
                      <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                    </td>
                    <td style={{ padding:'11px 16px' }}><IssueBadge type={item.issue} /></td>
                    <td style={{ padding:'11px 16px', fontFamily:"'JetBrains Mono',monospace", fontWeight:600, color: item.issue === 'overdue' ? 'var(--red)' : item.amount > 0 ? 'var(--amber)' : 'var(--ink-3)' }}>
                      {item.amount > 0 ? `$${item.amount.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding:'11px 16px' }}>
                      <a href={`/admin/${item.id}`} style={{ padding:'5px 12px', border:'1px solid var(--line-2)', borderRadius:6, background:'transparent', fontSize:12, fontWeight:500, color:'var(--ink)', cursor:'pointer', fontFamily:"'Inter',sans-serif", textDecoration:'none', display:'inline-block' }}>
                        View →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
