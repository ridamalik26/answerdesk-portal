'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

const timezones = [
  'America/New_York','America/Chicago','America/Denver',
  'America/Los_Angeles','America/Phoenix','Pacific/Honolulu',
];

function Toggle({ enabled, onToggle }) {
  return (
    <button onClick={onToggle} style={{ width:40, height:22, borderRadius:99, background: enabled ? 'var(--ink)' : 'var(--line-2)', border:'none', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <span style={{ position:'absolute', top:3, left: enabled ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'white', transition:'left 0.2s', display:'block', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

function Field({ label, value, onChange, type = 'text', mono = false }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display:'block', fontSize:12, fontWeight:500, color:'var(--ink-3)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width:'100%', padding:'9px 12px', border:`1px solid ${focused ? 'var(--ink)' : 'var(--line-2)'}`, borderRadius:7, fontSize:14, color:'var(--ink)', background:'var(--surface)', outline:'none', fontFamily: mono ? "'JetBrains Mono',monospace" : "'Inter',sans-serif", transition:'border-color 0.15s' }} />
    </div>
  );
}

export default function AccountPage() {
  const [client, setClient]       = useState(null);
  const [settings, setSettings]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState('');
  const [passwords, setPasswords] = useState({ current:'', next:'', confirm:'' });
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwMsg, setPwMsg]         = useState('');

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [clientRes, settingsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', user.id).single(),
        supabase.from('client_settings').select('*').eq('client_id', user.id).single(),
      ]);

      if (clientRes.data)   setClient(clientRes.data);
      if (settingsRes.data) setSettings(settingsRes.data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!client) return;
    setSaving(true); setSaveError('');
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('clients').update({
      business_name: client.business_name,
      contact_name:  client.contact_name,
      email:         client.email,
      phone:         client.phone,
      timezone:      client.timezone,
    }).eq('id', client.id);
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  }

  async function handleNotifToggle(key) {
    if (!settings) return;
    const updated = { ...settings.notifications, [key]: !settings.notifications[key] };
    const supabase = getSupabaseClient();
    await supabase.from('client_settings').update({ notifications: updated }).eq('id', settings.id);
    setSettings(s => ({ ...s, notifications: updated }));
  }

  async function handlePasswordUpdate() {
    if (passwords.next !== passwords.confirm) { setPwMsg('Passwords do not match.'); return; }
    if (!passwords.next) { setPwMsg('New password is required.'); return; }
    setPwSaving(true); setPwMsg('');
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: passwords.next });
    setPwSaving(false);
    setPwMsg(error ? error.message : 'Password updated successfully.');
    if (!error) setPasswords({ current:'', next:'', confirm:'' });
  }

  function update(key, val) {
    setClient(c => ({ ...c, [key]: val }));
    setSaved(false);
  }

  const notifs = settings?.notifications ?? {
    missedCall:true, dailySummary:true, invoiceReady:true, overageAlert:true, agentNotes:false,
  };

  const notifItems = [
    { key:'missedCall',   label:'Missed Call Alerts',    desc:'Instant email when a call is missed' },
    { key:'dailySummary', label:'Daily Summary',         desc:'End-of-day report every evening' },
    { key:'invoiceReady', label:'Invoice Ready',         desc:'When a new invoice is available' },
    { key:'overageAlert', label:'Overage Warning',       desc:'Alert when usage reaches 80% of plan' },
    { key:'agentNotes',   label:'Agent Notes',           desc:'Email copy of every call note' },
  ];

  if (loading) {
    return (
      <div style={{ padding:'32px 36px', color:'var(--ink-3)', fontSize:14 }}>Loading account…</div>
    );
  }

  if (!client) {
    return (
      <div style={{ padding:'32px 36px' }}>
        <div style={{ padding:'40px', textAlign:'center', color:'var(--ink-3)', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10 }}>
          <div style={{ fontSize:32, marginBottom:12 }}>👤</div>
          <div style={{ fontSize:15, fontWeight:500, color:'var(--ink-2)', marginBottom:4 }}>No client profile found</div>
          <div style={{ fontSize:13 }}>Your account profile has not been set up yet. Please contact support.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.03em' }}>My Account</h1>
        <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>Manage your business profile and preferences.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:20 }}>
        {/* Business info */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:24 }}>
            <h2 style={{ fontSize:15, fontWeight:700, color:'var(--ink)', marginBottom:20, letterSpacing:'-0.02em' }}>Business Information</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Field label="Business Name" value={client.business_name ?? ''} onChange={v => update('business_name', v)} />
              <Field label="Contact Name"  value={client.contact_name  ?? ''} onChange={v => update('contact_name', v)} />
              <Field label="Email Address" value={client.email         ?? ''} onChange={v => update('email', v)} type="email" />
              <Field label="Phone Number"  value={client.phone         ?? ''} onChange={v => update('phone', v)} mono />
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:500, color:'var(--ink-3)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Timezone</label>
                <select value={client.timezone ?? ''} onChange={e => update('timezone', e.target.value)}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--line-2)', borderRadius:7, fontSize:14, color:'var(--ink)', background:'var(--surface)', outline:'none', fontFamily:"'Inter',sans-serif", cursor:'pointer' }}>
                  {timezones.map(tz => <option key={tz}>{tz}</option>)}
                </select>
              </div>
            </div>
            {saveError && <div style={{ marginTop:12, fontSize:13, color:'var(--red)', background:'var(--red-soft)', padding:'8px 12px', borderRadius:7 }}>{saveError}</div>}
            <div style={{ marginTop:20, display:'flex', gap:10, alignItems:'center' }}>
              <button onClick={handleSave} disabled={saving}
                style={{ padding:'9px 20px', background: saving ? 'var(--ink-2)' : 'var(--ink)', color:'white', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily:"'Inter',sans-serif" }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {saved && <span style={{ fontSize:13, color:'var(--green)' }}>✓ Saved successfully</span>}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Notifications */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:24 }}>
            <h2 style={{ fontSize:15, fontWeight:700, color:'var(--ink)', marginBottom:4, letterSpacing:'-0.02em' }}>Notification Preferences</h2>
            <p style={{ fontSize:13, color:'var(--ink-3)', marginBottom:20 }}>Delivered to {client.email}</p>
            {notifItems.map((item, i) => (
              <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom: i < notifItems.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--ink)', marginBottom:2 }}>{item.label}</div>
                  <div style={{ fontSize:12, color:'var(--ink-3)' }}>{item.desc}</div>
                </div>
                <Toggle enabled={!!notifs[item.key]} onToggle={() => handleNotifToggle(item.key)} />
              </div>
            ))}
          </div>

          {/* Change password */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:24 }}>
            <h2 style={{ fontSize:15, fontWeight:700, color:'var(--ink)', marginBottom:20, letterSpacing:'-0.02em' }}>Change Password</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label:'Current Password',      key:'current' },
                { label:'New Password',          key:'next'    },
                { label:'Confirm New Password',  key:'confirm' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display:'block', fontSize:12, fontWeight:500, color:'var(--ink-3)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>{f.label}</label>
                  <input type="password" value={passwords[f.key]} placeholder="••••••••"
                    onChange={e => setPasswords(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--line-2)', borderRadius:7, fontSize:14, color:'var(--ink)', background:'var(--surface)', outline:'none', fontFamily:"'Inter',sans-serif" }}
                    onFocus={e => e.target.style.borderColor = 'var(--ink)'}
                    onBlur={e => e.target.style.borderColor  = 'var(--line-2)'} />
                </div>
              ))}
            </div>
            {pwMsg && (
              <div style={{ marginTop:10, fontSize:13, color: pwMsg.includes('successfully') ? 'var(--green)' : 'var(--red)', background: pwMsg.includes('successfully') ? 'var(--green-soft)' : 'var(--red-soft)', padding:'8px 12px', borderRadius:7 }}>
                {pwMsg}
              </div>
            )}
            <button onClick={handlePasswordUpdate} disabled={pwSaving}
              style={{ marginTop:16, padding:'9px 20px', background: pwSaving ? 'var(--ink-2)' : 'var(--ink)', color:'white', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor: pwSaving ? 'not-allowed' : 'pointer', fontFamily:"'Inter',sans-serif" }}>
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
