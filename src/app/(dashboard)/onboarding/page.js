'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

const messageDeliveryOptions = ['Email only','SMS only','Email + SMS','Portal only'];

const DEFAULT_STEPS = [
  { step_number:1, step_name:'Account Created',              completed:false },
  { step_number:2, step_name:'Business Info Submitted',       completed:false },
  { step_number:3, step_name:'Call Handling Instructions Set',completed:false },
  { step_number:4, step_name:'Test Call Completed',           completed:false },
  { step_number:5, step_name:'Payment Method Added',          completed:false },
  { step_number:6, step_name:'Team Members Invited',          completed:false },
];

const STEP_DESCS = {
  1:'Your client portal account is active.',
  2:'Company name, timezone, and contacts are saved.',
  3:'Greeting script and message delivery rules configured.',
  4:'You have verified how we answer on your behalf.',
  5:'Add a credit card to activate billing.',
  6:'Invite staff to receive call notifications.',
};

const STEP_ACTIONS = { 5:'/billing', 6:'/account' };

export default function OnboardingPage() {
  const [steps, setSteps]       = useState([]);
  const [settings, setSettings] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  const [hoursStart,  setHoursStart]  = useState('08:00');
  const [hoursEnd,    setHoursEnd]    = useState('18:00');
  const [greeting,    setGreeting]    = useState('');
  const [delivery,    setDelivery]    = useState('Email + SMS');
  const [special,     setSpecial]     = useState('');

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setClientId(user.id);

      const [stepsRes, settingsRes] = await Promise.all([
        supabase.from('onboarding_steps').select('*').eq('client_id', user.id).order('step_number'),
        supabase.from('client_settings').select('*').eq('client_id', user.id).single(),
      ]);

      if (stepsRes.data?.length)  setSteps(stepsRes.data);
      else                        setSteps(DEFAULT_STEPS);

      if (settingsRes.data) {
        const s = settingsRes.data;
        setSettings(s);
        setGreeting(s.greeting_script ?? '');
        setDelivery(s.message_delivery ?? 'Email + SMS');
        setSpecial(s.special_instructions ?? '');
        if (s.business_hours?.start) setHoursStart(s.business_hours.start);
        if (s.business_hours?.end)   setHoursEnd(s.business_hours.end);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleSaveInstructions() {
    if (!clientId) return;
    setSaving(true); setSaved(false);
    const supabase = getSupabaseClient();
    const payload = {
      client_id:            clientId,
      greeting_script:      greeting,
      message_delivery:     delivery,
      special_instructions: special,
      business_hours:       { start: hoursStart, end: hoursEnd, days:['Mon','Tue','Wed','Thu','Fri'] },
    };

    if (settings?.id) {
      await supabase.from('client_settings').update(payload).eq('id', settings.id);
    } else {
      const { data } = await supabase.from('client_settings').insert(payload).select().single();
      if (data) setSettings(data);
    }

    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function toggleStep(step) {
    if (!clientId) return;
    const supabase = getSupabaseClient();
    const newCompleted = !step.completed;
    const completedAt  = newCompleted ? new Date().toISOString() : null;

    if (step.id) {
      await supabase.from('onboarding_steps').update({ completed: newCompleted, completed_at: completedAt }).eq('id', step.id);
    } else {
      await supabase.from('onboarding_steps').insert({ client_id: clientId, step_number: step.step_number, step_name: step.step_name, completed: newCompleted, completed_at: completedAt });
    }

    setSteps(prev => prev.map(s => s.step_number === step.step_number ? { ...s, completed: newCompleted, completed_at: completedAt } : s));
  }

  const doneCount   = steps.filter(s => s.completed).length;
  const totalSteps  = steps.length || 6;
  const progressPct = Math.round((doneCount / totalSteps) * 100);
  const r = 36, circ = 2 * Math.PI * r;

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.03em' }}>Onboarding</h1>
        <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>Complete setup to get the most out of AnswerDesk.</p>
      </div>

      {/* Progress hero */}
      <div style={{ background:'var(--ink)', borderRadius:12, padding:'28px 32px', marginBottom:28, display:'flex', alignItems:'center', gap:32, flexWrap:'wrap' }}>
        <div style={{ position:'relative', width:96, height:96, flexShrink:0 }}>
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8"/>
            {!loading && (
              <circle cx="48" cy="48" r={r} fill="none" stroke="var(--accent)" strokeWidth="8"
                strokeDasharray={`${(progressPct / 100) * circ} ${circ}`} strokeLinecap="round" transform="rotate(-90 48 48)"/>
            )}
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:700, color:'white' }}>
              {loading ? '…' : `${doneCount}/${totalSteps}`}
            </span>
          </div>
        </div>

        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontSize:26, color:'white', marginBottom:8 }}>
            {loading ? 'Loading setup status…' : `You're ${progressPct}% set up!`}
          </div>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.5)', maxWidth:420 }}>
            {loading ? '' : `${doneCount} of ${totalSteps} steps complete. Finish the remaining steps to ensure calls are handled perfectly.`}
          </p>
        </div>

        <div style={{ marginLeft:'auto' }}>
          <div style={{ height:8, width:200, background:'rgba(255,255,255,0.1)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ width: loading ? '0%' : `${progressPct}%`, height:'100%', background:'var(--accent)', borderRadius:99, transition:'width 0.4s' }} />
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', marginTop:6, textAlign:'right' }}>{100 - progressPct}% remaining</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'0.9fr 1.2fr', gap:24 }}>
        {/* Checklist */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:24 }}>
          <h2 style={{ fontSize:15, fontWeight:700, color:'var(--ink)', marginBottom:24, letterSpacing:'-0.02em' }}>Setup Checklist</h2>
          {loading ? (
            <div style={{ color:'var(--ink-3)', fontSize:14 }}>Loading steps…</div>
          ) : (
            <div style={{ position:'relative' }}>
              <div style={{ position:'absolute', left:15, top:16, bottom:16, width:2, background:'var(--line)' }} />
              {steps.map((step, i) => (
                <div key={step.step_number} style={{ display:'flex', gap:16, marginBottom: i < steps.length - 1 ? 20 : 0, position:'relative' }}>
                  <button onClick={() => toggleStep(step)} style={{
                    width:32, height:32, borderRadius:'50%', flexShrink:0,
                    background: step.completed ? 'var(--green-soft)' : 'var(--amber-soft)',
                    border:`2px solid ${step.completed ? 'var(--green)' : 'var(--amber)'}`,
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                    zIndex:1, position:'relative',
                  }}>
                    {step.completed ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7l3.5 3.5 5.5-6" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <span style={{ fontSize:11, fontWeight:700, color:'var(--amber)', fontFamily:"'JetBrains Mono',monospace" }}>{step.step_number}</span>
                    )}
                  </button>
                  <div style={{ paddingTop:4 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', marginBottom:3 }}>
                      {step.step_name}
                      {step.completed && (
                        <span style={{ marginLeft:8, fontSize:11, fontWeight:500, color:'var(--green)', background:'var(--green-soft)', padding:'1px 7px', borderRadius:99 }}>Done</span>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:'var(--ink-3)', lineHeight:1.5 }}>
                      {STEP_DESCS[step.step_number] ?? step.step_name}
                    </div>
                    {!step.completed && STEP_ACTIONS[step.step_number] && (
                      <a href={STEP_ACTIONS[step.step_number]} style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:6, fontSize:12, fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>
                        Complete now →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Call handling form */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:24 }}>
          <h2 style={{ fontSize:15, fontWeight:700, color:'var(--ink)', marginBottom:4, letterSpacing:'-0.02em' }}>Call Handling Instructions</h2>
          <p style={{ fontSize:13, color:'var(--ink-3)', marginBottom:24 }}>These instructions guide our agents when answering on your behalf.</p>

          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            {/* Business hours */}
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:500, color:'var(--ink-3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Business Hours</label>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <input type="time" value={hoursStart} onChange={e => setHoursStart(e.target.value)}
                  style={{ padding:'8px 12px', border:'1px solid var(--line-2)', borderRadius:7, fontSize:14, color:'var(--ink)', background:'var(--surface)', outline:'none', fontFamily:"'JetBrains Mono',monospace" }} />
                <span style={{ color:'var(--ink-3)', fontSize:13 }}>to</span>
                <input type="time" value={hoursEnd} onChange={e => setHoursEnd(e.target.value)}
                  style={{ padding:'8px 12px', border:'1px solid var(--line-2)', borderRadius:7, fontSize:14, color:'var(--ink)', background:'var(--surface)', outline:'none', fontFamily:"'JetBrains Mono',monospace" }} />
                <span style={{ fontSize:12, color:'var(--ink-3)' }}>Mon–Fri</span>
              </div>
            </div>

            {/* Greeting script */}
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:500, color:'var(--ink-3)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Greeting Script</label>
              <textarea value={greeting} onChange={e => setGreeting(e.target.value)} rows={4}
                placeholder="Thank you for calling [Business Name]! How can I help you today?"
                style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--line-2)', borderRadius:7, fontSize:13, color:'var(--ink)', background:'var(--surface)', outline:'none', fontFamily:"'Inter',sans-serif", resize:'vertical', lineHeight:1.6 }}
                onFocus={e => e.target.style.borderColor = 'var(--ink)'}
                onBlur={e => e.target.style.borderColor  = 'var(--line-2)'} />
              <p style={{ fontSize:11, color:'var(--ink-3)', marginTop:4 }}>Use [Agent Name] as a placeholder for the agent's name.</p>
            </div>

            {/* Message delivery */}
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:500, color:'var(--ink-3)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Message Delivery</label>
              <select value={delivery} onChange={e => setDelivery(e.target.value)}
                style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--line-2)', borderRadius:7, fontSize:14, color:'var(--ink)', background:'var(--surface)', outline:'none', fontFamily:"'Inter',sans-serif", cursor:'pointer' }}>
                {messageDeliveryOptions.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>

            {/* Special instructions */}
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:500, color:'var(--ink-3)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Special Instructions</label>
              <textarea value={special} onChange={e => setSpecial(e.target.value)} rows={5}
                placeholder="Any special handling instructions, escalation rules, VIP callers, or emergency protocols…"
                style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--line-2)', borderRadius:7, fontSize:13, color:'var(--ink)', background:'var(--surface)', outline:'none', fontFamily:"'Inter',sans-serif", resize:'vertical', lineHeight:1.6 }}
                onFocus={e => e.target.style.borderColor = 'var(--ink)'}
                onBlur={e => e.target.style.borderColor  = 'var(--line-2)'} />
            </div>

            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <button onClick={handleSaveInstructions} disabled={saving}
                style={{ padding:'10px 22px', background: saving ? 'var(--ink-2)' : 'var(--ink)', color:'white', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily:"'Inter',sans-serif" }}>
                {saving ? 'Saving…' : 'Save Instructions'}
              </button>
              {saved && <span style={{ fontSize:13, color:'var(--green)' }}>✓ Instructions saved</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
