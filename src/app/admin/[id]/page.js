'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

function StatusBadge({ status }) {
  const map = {
    active:   { bg:'var(--green-soft)', color:'var(--green)',  label:'Active'   },
    inactive: { bg:'var(--line)',        color:'var(--ink-3)', label:'Inactive' },
    overage:  { bg:'var(--red-soft)',    color:'var(--red)',   label:'Overage'  },
  };
  const c = map[status] ?? map.inactive;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:99, background:c.bg, color:c.color, fontSize:12, fontWeight:500 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.color }} />{c.label}
    </span>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--line)' }}>
      <span style={{ fontSize:12, color:'var(--ink-3)', fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:13, color:'var(--ink)', fontWeight:500, fontFamily: mono ? "'JetBrains Mono',monospace" : "'Inter',sans-serif", textAlign:'right', maxWidth:200, wordBreak:'break-all' }}>
        {value || '—'}
      </span>
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [calls, setCalls]   = useState([]);
  const [steps, setSteps]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      setFetchError('');

      console.log('[ClientDetailPage] fetching id =', id);
      const res = await fetch(`/api/admin/client?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const json = await res.json();
      console.log('[ClientDetailPage] API response:', json);

      if (!res.ok || json.error) {
        setFetchError(json.error ?? 'Failed to load client.');
        setLoading(false);
        return;
      }

      setClient(json.client);
      setNotes(json.client?.admin_notes ?? '');
      setCalls(json.calls ?? []);
      setSteps(json.steps ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSaveNotes() {
    if (!client) return;
    setSaving(true);
    await fetch(`/api/admin/client?id=${encodeURIComponent(client.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_notes: notes }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleDeactivate() {
    if (!client) return;
    if (!confirm(`Deactivate ${client.business_name}? This will mark their account inactive.`)) return;
    await fetch(`/api/admin/client?id=${encodeURIComponent(client.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'inactive' }),
    });
    setClient(c => ({ ...c, status: 'inactive' }));
  }

  if (loading) {
    return <div style={{ padding:'32px 36px', color:'var(--ink-3)', fontSize:14 }}>Loading client…</div>;
  }

  if (fetchError || !client) {
    return (
      <div style={{ padding:'32px 36px' }}>
        <button onClick={() => router.push('/admin')}
          style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:20, padding:'6px 12px', border:'1px solid var(--line-2)', borderRadius:7, background:'transparent', fontSize:13, color:'var(--ink-2)', cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M8 10L5 6.5 8 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          All Clients
        </button>
        <div style={{ padding:40, textAlign:'center', color:'var(--ink-3)', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10 }}>
          <div style={{ fontSize:28, marginBottom:10 }}>👤</div>
          <div style={{ fontSize:15, fontWeight:500, color:'var(--ink-2)', marginBottom:4 }}>Client not found</div>
          <div style={{ fontSize:13, marginBottom:8, color:'var(--red)' }}>{fetchError || `No client with ID: ${id}`}</div>
          <div style={{ fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:'var(--ink-3)', background:'var(--paper-2)', padding:'6px 12px', borderRadius:6, display:'inline-block' }}>
            URL id: {id}
          </div>
        </div>
      </div>
    );
  }

  const totalMinutes  = Math.round(calls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60);
  const limit         = client.minutes_limit ?? 0;
  const usagePct      = limit > 0 ? Math.round((totalMinutes / limit) * 100) : 0;
  const answeredCount = calls.filter(c => c.status === 'answered').length;
  const initials      = (client.business_name ?? client.email ?? '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const clientStatus = client.status === 'inactive'
    ? 'inactive'
    : totalMinutes > limit && limit > 0
      ? 'overage'
      : 'active';

  const doneSteps  = steps.filter(s => s.completed).length;
  const totalSteps = steps.length || 6;

  return (
    <div style={{ padding:'32px 36px' }}>
      {/* Back */}
      <button onClick={() => router.push('/admin')}
        style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:20, padding:'6px 12px', border:'1px solid var(--line-2)', borderRadius:7, background:'transparent', fontSize:13, color:'var(--ink-2)', cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M8 10L5 6.5 8 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        All Clients
      </button>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:28, flexWrap:'wrap' }}>
        <div style={{ width:56, height:56, borderRadius:14, background:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:'white', flexShrink:0, letterSpacing:'-0.02em' }}>
          {initials}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <h1 style={{ fontSize:22, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.03em', margin:0 }}>
              {client.business_name || client.email}
            </h1>
            <StatusBadge status={clientStatus} />
          </div>
          <div style={{ fontSize:13, color:'var(--ink-3)', marginTop:4 }}>
            {client.plan_name ?? 'No plan'} · {client.email}
          </div>
        </div>
        <button style={{ padding:'8px 16px', border:'1px solid var(--line-2)', borderRadius:7, background:'transparent', fontSize:13, fontWeight:500, color:'var(--ink-2)', cursor:'pointer', fontFamily:"'Inter',sans-serif", display:'flex', alignItems:'center', gap:6 }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1a5.5 5.5 0 100 11A5.5 5.5 0 006.5 1z" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M4 6.5h5M6.5 4v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          View in HubSpot
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Left column */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Contact Details */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:24 }}>
            <h2 style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:16, letterSpacing:'-0.02em' }}>Contact Details</h2>
            <InfoRow label="Contact Name" value={client.contact_name} />
            <InfoRow label="Email"        value={client.email} />
            <InfoRow label="Phone"        value={client.phone} mono />
            <InfoRow label="Timezone"     value={client.timezone} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10 }}>
              <span style={{ fontSize:12, color:'var(--ink-3)', fontWeight:500 }}>Onboarding</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:80, height:5, background:'var(--paper-2)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ width:`${Math.round((doneSteps / totalSteps) * 100)}%`, height:'100%', background:'var(--green)', borderRadius:99 }} />
                </div>
                <span style={{ fontSize:12, fontFamily:"'JetBrains Mono',monospace", color:'var(--ink-2)' }}>{doneSteps}/{totalSteps}</span>
              </div>
            </div>
          </div>

          {/* Plan & Billing */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:24 }}>
            <h2 style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:16, letterSpacing:'-0.02em' }}>Plan & Billing</h2>
            <InfoRow label="Plan Name"       value={client.plan_name} />
            <InfoRow label="Monthly Price"   value={`$${Number(client.monthly_price ?? 0).toFixed(2)}`} mono />
            <InfoRow label="Overage Rate"    value={client.overage_rate ? `$${client.overage_rate}/min` : null} mono />
            <InfoRow label="Minute Limit"    value={client.minutes_limit ? `${client.minutes_limit} min` : null} mono />
            <InfoRow label="Stripe Customer" value={client.stripe_customer_id} mono />
            <InfoRow label="Account Status"  value={clientStatus} />
          </div>
        </div>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* This Month Usage */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:24 }}>
            <h2 style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:16, letterSpacing:'-0.02em' }}>This Month's Usage</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:20 }}>
              {[
                { label:'Total Calls',  value: calls.length },
                { label:'Answered',     value: answeredCount },
                { label:'Minutes Used', value: totalMinutes },
              ].map(s => (
                <div key={s.label} style={{ background:'var(--paper)', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:700, color:'var(--ink)' }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:12, color:'var(--ink-3)' }}>Minute usage</span>
                <span style={{ fontSize:12, fontFamily:"'JetBrains Mono',monospace", color: usagePct >= 100 ? 'var(--red)' : usagePct >= 80 ? 'var(--amber)' : 'var(--ink-2)' }}>
                  {totalMinutes} / {limit} min ({usagePct}%)
                </span>
              </div>
              <div style={{ height:8, background:'var(--paper-2)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ width:`${Math.min(usagePct, 100)}%`, height:'100%', background: usagePct >= 100 ? 'var(--red)' : usagePct >= 80 ? 'var(--accent)' : 'var(--green)', borderRadius:99, transition:'width 0.4s' }} />
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:24 }}>
            <h2 style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:12, letterSpacing:'-0.02em' }}>Admin Notes</h2>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setSaved(false); }}
              rows={5}
              placeholder="Internal notes — billing issues, special handling, follow-ups…"
              style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--line-2)', borderRadius:7, fontSize:13, color:'var(--ink)', background:'var(--surface)', outline:'none', fontFamily:"'Inter',sans-serif", resize:'vertical', lineHeight:1.6, boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor = 'var(--ink)'}
              onBlur={e => e.target.style.borderColor  = 'var(--line-2)'}
            />
            <div style={{ display:'flex', gap:10, alignItems:'center', marginTop:12 }}>
              <button onClick={handleSaveNotes} disabled={saving}
                style={{ padding:'9px 18px', background: saving ? 'var(--ink-2)' : 'var(--ink)', color:'white', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily:"'Inter',sans-serif" }}>
                {saving ? 'Saving…' : 'Save Notes'}
              </button>
              {saved && <span style={{ fontSize:13, color:'var(--green)' }}>✓ Saved</span>}
            </div>
          </div>

          {/* Actions */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:24 }}>
            <h2 style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:16, letterSpacing:'-0.02em' }}>Actions</h2>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button style={{ padding:'9px 18px', background:'var(--ink)', color:'white', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'Inter',sans-serif", display:'flex', alignItems:'center', gap:6 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M1 9.5L2.5 5 6.5 1.5 11 6 7.5 9.5 3 11 1 9.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  <circle cx="7.5" cy="5.5" r="1" fill="currentColor"/>
                </svg>
                Send Email
              </button>
              {client.status !== 'inactive' ? (
                <button onClick={handleDeactivate}
                  style={{ padding:'9px 18px', background:'var(--red-soft)', color:'var(--red)', border:'1px solid var(--red)', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
                  Deactivate Account
                </button>
              ) : (
                <span style={{ padding:'9px 18px', background:'var(--paper-2)', color:'var(--ink-3)', borderRadius:7, fontSize:13, fontWeight:500, border:'1px solid var(--line-2)' }}>
                  Account is inactive
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
