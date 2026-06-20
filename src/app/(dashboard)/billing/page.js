'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

function StatusBadge({ status }) {
  const map = {
    paid:    { bg:'var(--green-soft)', color:'var(--green)', label:'Paid'    },
    overdue: { bg:'var(--red-soft)',   color:'var(--red)',   label:'Overdue' },
    pending: { bg:'var(--amber-soft)', color:'var(--amber)', label:'Pending' },
  };
  const c = map[status] ?? map.pending;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:99, background:c.bg, color:c.color, fontSize:12, fontWeight:500 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.color }} />{c.label}
    </span>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' });
}

export default function BillingPage() {
  const [client, setClient]     = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [clientRes, invoicesRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', user.id).single(),
        supabase.from('invoices').select('*').eq('client_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (clientRes.data)    setClient(clientRes.data);
      if (invoicesRes.data)  setInvoices(invoicesRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const nextInvoice = invoices.find(i => i.status === 'pending' || i.status === 'overdue');
  const baseAmount  = Number(client?.monthly_price ?? 0);
  const overageAmt  = Number(nextInvoice?.overage_amount ?? 0);
  const totalEst    = baseAmount + overageAmt;

  const nextReset = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    .toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' });

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.03em' }}>Billing</h1>
        <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>Manage your plan, review invoices, and update payment methods.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Plan card */}
        <div style={{ background:'var(--ink)', borderRadius:12, padding:'28px 30px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
            <div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Current Plan</div>
              <div style={{ fontSize:24, fontWeight:700, color:'white', letterSpacing:'-0.03em' }}>
                {loading ? '…' : (client?.plan_name ?? 'No plan')}
              </div>
            </div>
            {!loading && client && (
              <span style={{ padding:'4px 12px', borderRadius:99, background: client.status === 'active' ? 'var(--green-soft)' : 'var(--red-soft)', color: client.status === 'active' ? 'var(--green)' : 'var(--red)', fontSize:12, fontWeight:600, textTransform:'capitalize' }}>
                {client.status}
              </span>
            )}
          </div>

          <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:24 }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:44, fontWeight:700, color:'white' }}>
              {loading ? '…' : `$${Number(client?.monthly_price ?? 0).toFixed(0)}`}
            </span>
            <span style={{ fontSize:14, color:'rgba(255,255,255,0.4)' }}>/month</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
            {[
              { label:'Included Minutes', value: loading ? '…' : `${client?.minutes_limit ?? '—'} min` },
              { label:'Overage Rate',     value: loading ? '…' : (client ? `$${client.overage_rate}/min` : '—') },
              { label:'Next Billing',     value: nextReset },
              { label:'Account Status',   value: loading ? '…' : (client?.status ?? '—') },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{item.label}</div>
                <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.85)', fontFamily:"'JetBrains Mono',monospace" }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button style={{ flex:1, padding:10, borderRadius:8, background:'var(--accent)', border:'none', color:'white', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
              Upgrade Plan
            </button>
            <button style={{ padding:'10px 16px', borderRadius:8, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.7)', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
              Update Card
            </button>
          </div>
        </div>

        {/* Upcoming invoice estimate */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:12, padding:'28px 30px' }}>
          <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>Upcoming Invoice Estimate</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:44, fontWeight:700, color:'var(--ink)', lineHeight:1, marginBottom:4 }}>
            {loading ? '…' : `$${totalEst.toFixed(0)}`}
          </div>
          <div style={{ fontSize:13, color:'var(--ink-3)', marginBottom:24 }}>
            Due {nextReset} · estimate may change
          </div>

          <div style={{ borderRadius:8, overflow:'hidden', border:'1px solid var(--line)' }}>
            {[
              { label: `Base Plan (${client?.plan_name ?? '—'})`, amount: `$${baseAmount.toFixed(2)}`, bold:false },
              { label: `Overage (${nextInvoice?.overage_minutes ?? 0} min × $${client?.overage_rate ?? 0})`, amount: `$${overageAmt.toFixed(2)}`, sub:true },
              { label: 'Total Estimate', amount: `$${totalEst.toFixed(2)}`, bold:true },
            ].map((row, i) => (
              <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 14px', borderTop: i > 0 ? '1px solid var(--line)' : 'none', background: row.bold ? 'var(--paper-2)' : 'transparent' }}>
                <span style={{ fontSize:13, color: row.sub ? 'var(--ink-3)' : 'var(--ink)', fontWeight: row.bold ? 600 : 400 }}>{row.label}</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color: row.bold ? 'var(--ink)' : row.sub ? 'var(--amber)' : 'var(--ink-2)', fontWeight: row.bold ? 700 : 400 }}>{loading ? '…' : row.amount}</span>
              </div>
            ))}
          </div>

          {!loading && overageAmt > 0 && (
            <div style={{ marginTop:16, padding:'10px 14px', borderRadius:8, background:'var(--amber-soft)', display:'flex', gap:8, alignItems:'flex-start' }}>
              <span style={{ fontSize:14, flexShrink:0 }}>💡</span>
              <p style={{ fontSize:12, color:'var(--amber)', lineHeight:1.5 }}>
                You have {nextInvoice?.overage_minutes} overage minutes this cycle. Upgrading your plan could eliminate this charge.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice history */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)' }}>
          <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>Invoice History</span>
        </div>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--ink-3)', fontSize:14 }}>Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding:'60px 20px', textAlign:'center', color:'var(--ink-3)' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🧾</div>
            <div style={{ fontSize:15, fontWeight:500, color:'var(--ink-2)', marginBottom:4 }}>No invoices yet</div>
            <div style={{ fontSize:13 }}>Your first invoice will appear here at the end of your billing cycle.</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--paper-2)' }}>
                {['Invoice','Period','Date','Amount','Status',''].map((h, i) => (
                  <th key={i} style={{ padding:'8px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={inv.id} style={{ borderTop:'1px solid var(--line)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--paper)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding:'11px 16px', fontFamily:"'JetBrains Mono',monospace", color:'var(--ink-2)', fontSize:12 }}>{inv.invoice_number}</td>
                  <td style={{ padding:'11px 16px', color:'var(--ink)' }}>
                    {new Date(inv.period_start).toLocaleDateString([], { month:'short', year:'numeric' })}
                  </td>
                  <td style={{ padding:'11px 16px', color:'var(--ink-3)' }}>{formatDate(inv.created_at)}</td>
                  <td style={{ padding:'11px 16px', fontFamily:"'JetBrains Mono',monospace", fontWeight:600, color:'var(--ink)' }}>
                    ${Number(inv.total_amount).toFixed(2)}
                  </td>
                  <td style={{ padding:'11px 16px' }}><StatusBadge status={inv.status} /></td>
                  <td style={{ padding:'11px 16px' }}>
                    <button style={{ padding:'5px 12px', border:'1px solid var(--line-2)', borderRadius:6, background:'transparent', fontSize:12, color:'var(--ink-2)', cursor:'pointer', fontFamily:"'Inter',sans-serif", display:'flex', alignItems:'center', gap:5 }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1v7M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M1.5 10.5h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
