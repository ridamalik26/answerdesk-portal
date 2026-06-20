'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const TIMEZONES = [
  'America/New_York','America/Chicago','America/Denver',
  'America/Los_Angeles','America/Phoenix','Pacific/Honolulu',
];

const PLANS = [
  { name:'Starter 100',      minutes:100,  price:99,  overage:0.25 },
  { name:'Pro 300',          minutes:300,  price:199, overage:0.20 },
  { name:'Professional 500', minutes:500,  price:299, overage:0.15 },
];

const EMPTY_FORM = {
  business_name:'', contact_name:'', email:'', phone:'',
  timezone:'America/New_York', plan_name:'Starter 100',
  minutes_limit:100, monthly_price:99, overage_rate:0.25, status:'active',
};

function StatusBadge({ status }) {
  const map = {
    active:   { bg:'var(--green-soft)', color:'var(--green)',  label:'Active'   },
    inactive: { bg:'var(--line)',        color:'var(--ink-3)', label:'Inactive' },
    overage:  { bg:'var(--red-soft)',    color:'var(--red)',   label:'Overage'  },
  };
  const c = map[status] ?? map.inactive;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:99, background:c.bg, color:c.color, fontSize:12, fontWeight:500 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.color }} />{c.label}
    </span>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width:'100%', padding:'8px 11px', border:'1px solid var(--line-2)', borderRadius:7,
  fontSize:13, color:'var(--ink)', background:'var(--surface)', outline:'none',
  fontFamily:"'Inter',sans-serif", boxSizing:'border-box',
};

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [planFilter, setPlan]     = useState('all');
  const [statusFilter, setStatus] = useState('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function loadClients() {
    // Use the server-side API route so the service role key bypasses RLS,
    // allowing the admin to see all clients (not just their own row).
    const res = await fetch('/api/admin/clients', { cache: 'no-store' });
    const json = await res.json();
    setClients(json.clients ?? []);
    setLoading(false);
  }

  useEffect(() => { loadClients(); }, []);

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handlePlanChange(planName) {
    const plan = PLANS.find(p => p.name === planName);
    if (plan) {
      setForm(f => ({
        ...f,
        plan_name:     plan.name,
        minutes_limit: plan.minutes,
        monthly_price: plan.price,
        overage_rate:  plan.overage,
      }));
    }
  }

  function openModal() {
    setForm(EMPTY_FORM);
    setModalError('');
    setSuccessMsg('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setModalError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.business_name || !form.email) {
      setModalError('Business name and email are required.');
      return;
    }
    setSubmitting(true);
    setModalError('');

    const res = await fetch('/api/admin/create-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();

    setSubmitting(false);

    if (!res.ok || json.error) {
      setModalError(json.error ?? 'Something went wrong.');
      return;
    }

    setShowModal(false);
    setSuccessMsg(`${form.business_name} added successfully. Temporary password: AnswerDesk@123`);
    setTimeout(() => setSuccessMsg(''), 8000);
    setLoading(true);
    await loadClients();
  }

  const allPlans = [...new Set(clients.map(c => c.plan_name).filter(Boolean))];

  function getMinutesUsed(client) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthCalls = (client.calls ?? []).filter(c => c.created_at >= monthStart);
    return Math.round(monthCalls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60);
  }

  function getClientStatus(client) {
    const used = getMinutesUsed(client);
    if (client.status === 'inactive') return 'inactive';
    if (used > (client.minutes_limit ?? 0)) return 'overage';
    return 'active';
  }

  const nextBill = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    .toLocaleDateString([], { month:'short', day:'numeric' });

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (c.business_name ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q);
    const matchPlan   = planFilter === 'all' || c.plan_name === planFilter;
    const matchStatus = statusFilter === 'all' || getClientStatus(c) === statusFilter;
    return matchSearch && matchPlan && matchStatus;
  });

  const totalMRR    = clients.reduce((s, c) => s + Number(c.monthly_price ?? 0), 0);
  const activeCount = clients.filter(c => getClientStatus(c) === 'active').length;

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.03em' }}>All Clients</h1>
        <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>Manage and monitor all AnswerDesk client accounts.</p>
      </div>

      {successMsg && (
        <div style={{ marginBottom:20, padding:'12px 16px', background:'var(--green-soft)', border:'1px solid var(--green)', borderRadius:8, fontSize:13, color:'var(--green)', fontWeight:500 }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Clients', value: loading ? '…' : clients.length,                                    color:'var(--ink)',   sub:'All accounts' },
          { label:'Active Plans',  value: loading ? '…' : activeCount,                                       color:'var(--green)', sub:'Currently active' },
          { label:'Total MRR',     value: loading ? '…' : `$${totalMRR.toLocaleString()}`,                   color:'var(--ink)',   sub:'Monthly recurring' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:'20px 24px' }}>
            <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:32, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:16 }}>
        <div style={{ position:'relative', flex:'1 1 220px', maxWidth:320 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--ink-3)' }}>
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search business or email…"
            style={{ width:'100%', padding:'8px 12px 8px 32px', border:'1px solid var(--line-2)', borderRadius:7, fontSize:13, color:'var(--ink)', background:'var(--surface)', outline:'none', fontFamily:"'Inter',sans-serif" }} />
        </div>

        <select value={planFilter} onChange={e => setPlan(e.target.value)}
          style={{ padding:'8px 12px', border:'1px solid var(--line-2)', borderRadius:7, fontSize:13, color:'var(--ink)', background:'var(--surface)', outline:'none', fontFamily:"'Inter',sans-serif", cursor:'pointer' }}>
          <option value="all">All Plans</option>
          {allPlans.map(p => <option key={p}>{p}</option>)}
        </select>

        <select value={statusFilter} onChange={e => setStatus(e.target.value)}
          style={{ padding:'8px 12px', border:'1px solid var(--line-2)', borderRadius:7, fontSize:13, color:'var(--ink)', background:'var(--surface)', outline:'none', fontFamily:"'Inter',sans-serif", cursor:'pointer' }}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="overage">Overage</option>
          <option value="inactive">Inactive</option>
        </select>

        <button onClick={openModal}
          style={{ marginLeft:'auto', padding:'8px 16px', background:'var(--ink)', color:'white', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'Inter',sans-serif", display:'flex', alignItems:'center', gap:6 }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Add Client
        </button>
      </div>

      {/* Table */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--ink-3)', fontSize:14 }}>Loading clients…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'60px 20px', textAlign:'center', color:'var(--ink-3)' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>👥</div>
            <div style={{ fontSize:15, fontWeight:500, color:'var(--ink-2)', marginBottom:4 }}>No clients found</div>
            <div style={{ fontSize:13 }}>Try adjusting your search or filters.</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--paper-2)', borderBottom:'1px solid var(--line)' }}>
                {['Business','Plan','Minutes Used','Next Bill','Status',''].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, i) => {
                const used   = getMinutesUsed(client);
                const limit  = client.minutes_limit ?? 0;
                const pct    = limit > 0 ? Math.round((used / limit) * 100) : 0;
                const status = getClientStatus(client);
                return (
                  <tr key={client.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--line)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--paper)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ fontWeight:600, color:'var(--ink)', marginBottom:2 }}>{client.business_name || '—'}</div>
                      <div style={{ fontSize:11, color:'var(--ink-3)' }}>{client.email}</div>
                    </td>
                    <td style={{ padding:'12px 16px', color:'var(--ink-2)' }}>
                      <div style={{ fontWeight:500 }}>{client.plan_name || '—'}</div>
                      <div style={{ fontSize:11, color:'var(--ink-3)', fontFamily:"'JetBrains Mono',monospace" }}>${Number(client.monthly_price ?? 0).toFixed(0)}/mo</div>
                    </td>
                    <td style={{ padding:'12px 16px', minWidth:140 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color: pct >= 100 ? 'var(--red)' : pct >= 80 ? 'var(--amber)' : 'var(--ink-2)' }}>
                          {used}/{limit}
                        </span>
                        <span style={{ fontSize:11, color:'var(--ink-3)' }}>min</span>
                      </div>
                      <div style={{ height:4, background:'var(--paper-2)', borderRadius:99, overflow:'hidden', width:100 }}>
                        <div style={{ width:`${Math.min(pct, 100)}%`, height:'100%', background: pct >= 100 ? 'var(--red)' : pct >= 80 ? 'var(--accent)' : 'var(--green)', borderRadius:99 }} />
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px', fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'var(--ink-2)' }}>{nextBill}</td>
                    <td style={{ padding:'12px 16px' }}><StatusBadge status={status} /></td>
                    <td style={{ padding:'12px 16px' }}>
                      <button onClick={() => router.push(`/admin/${client.id}`)}
                        style={{ padding:'5px 14px', border:'1px solid var(--line-2)', borderRadius:6, background:'transparent', fontSize:12, fontWeight:500, color:'var(--ink)', cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Client Modal */}
      {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
          style={{ position:'fixed', inset:0, background:'rgba(15,27,45,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20 }}>
          <div style={{ background:'var(--surface)', borderRadius:12, width:'100%', maxWidth:560, maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
            {/* Modal header */}
            <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.02em' }}>Add New Client</div>
                <div style={{ fontSize:12, color:'var(--ink-3)', marginTop:2 }}>Creates a portal account with temporary password: AnswerDesk@123</div>
              </div>
              <button onClick={closeModal}
                style={{ width:28, height:28, borderRadius:6, border:'1px solid var(--line-2)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-3)', fontSize:16, lineHeight:1 }}>
                ✕
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSubmit} style={{ padding:24 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <FormField label="Business Name *">
                  <input value={form.business_name} onChange={e => setField('business_name', e.target.value)}
                    placeholder="Acme Corp" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor='var(--ink)'}
                    onBlur={e => e.target.style.borderColor='var(--line-2)'} />
                </FormField>
                <FormField label="Contact Name">
                  <input value={form.contact_name} onChange={e => setField('contact_name', e.target.value)}
                    placeholder="Jane Smith" style={inputStyle}
                    onFocus={e => e.target.style.borderColor='var(--ink)'}
                    onBlur={e => e.target.style.borderColor='var(--line-2)'} />
                </FormField>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <FormField label="Email *">
                  <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                    placeholder="jane@acmecorp.com" required style={inputStyle}
                    onFocus={e => e.target.style.borderColor='var(--ink)'}
                    onBlur={e => e.target.style.borderColor='var(--line-2)'} />
                </FormField>
                <FormField label="Phone">
                  <input value={form.phone} onChange={e => setField('phone', e.target.value)}
                    placeholder="+1 (555) 000-0000" style={{ ...inputStyle, fontFamily:"'JetBrains Mono',monospace" }}
                    onFocus={e => e.target.style.borderColor='var(--ink)'}
                    onBlur={e => e.target.style.borderColor='var(--line-2)'} />
                </FormField>
              </div>

              <div style={{ marginBottom:14 }}>
                <FormField label="Timezone">
                  <select value={form.timezone} onChange={e => setField('timezone', e.target.value)} style={inputStyle}>
                    {TIMEZONES.map(tz => <option key={tz}>{tz}</option>)}
                  </select>
                </FormField>
              </div>

              <div style={{ marginBottom:14 }}>
                <FormField label="Plan">
                  <select value={form.plan_name} onChange={e => handlePlanChange(e.target.value)} style={inputStyle}>
                    {PLANS.map(p => <option key={p.name}>{p.name}</option>)}
                  </select>
                </FormField>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14 }}>
                <FormField label="Minutes Limit">
                  <input type="number" value={form.minutes_limit} onChange={e => setField('minutes_limit', e.target.value)}
                    style={{ ...inputStyle, fontFamily:"'JetBrains Mono',monospace" }}
                    onFocus={e => e.target.style.borderColor='var(--ink)'}
                    onBlur={e => e.target.style.borderColor='var(--line-2)'} />
                </FormField>
                <FormField label="Monthly Price ($)">
                  <input type="number" value={form.monthly_price} onChange={e => setField('monthly_price', e.target.value)}
                    style={{ ...inputStyle, fontFamily:"'JetBrains Mono',monospace" }}
                    onFocus={e => e.target.style.borderColor='var(--ink)'}
                    onBlur={e => e.target.style.borderColor='var(--line-2)'} />
                </FormField>
                <FormField label="Overage Rate ($/min)">
                  <input type="number" step="0.01" value={form.overage_rate} onChange={e => setField('overage_rate', e.target.value)}
                    style={{ ...inputStyle, fontFamily:"'JetBrains Mono',monospace" }}
                    onFocus={e => e.target.style.borderColor='var(--ink)'}
                    onBlur={e => e.target.style.borderColor='var(--line-2)'} />
                </FormField>
              </div>

              <div style={{ marginBottom:20 }}>
                <FormField label="Status">
                  <select value={form.status} onChange={e => setField('status', e.target.value)} style={inputStyle}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </FormField>
              </div>

              {modalError && (
                <div style={{ marginBottom:16, padding:'10px 14px', background:'var(--red-soft)', border:'1px solid var(--red)', borderRadius:7, fontSize:13, color:'var(--red)' }}>
                  {modalError}
                </div>
              )}

              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button type="button" onClick={closeModal}
                  style={{ padding:'9px 18px', border:'1px solid var(--line-2)', borderRadius:7, background:'transparent', fontSize:13, fontWeight:500, color:'var(--ink-2)', cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  style={{ padding:'9px 22px', background: submitting ? 'var(--ink-2)' : 'var(--ink)', color:'white', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily:"'Inter',sans-serif" }}>
                  {submitting ? 'Creating…' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
