'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString([], { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' });
}

function Badge({ status }) {
  const map = {
    answered: { bg:'var(--green-soft)', color:'var(--green)', label:'Answered' },
    missed:   { bg:'var(--red-soft)',   color:'var(--red)',   label:'Missed'   },
    voicemail:{ bg:'var(--blue-soft)',  color:'var(--blue)',  label:'Voicemail'},
  };
  const c = map[status] ?? map.answered;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:99, background:c.bg, color:c.color, fontSize:12, fontWeight:500 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.color }} />{c.label}
    </span>
  );
}

function DirectionChip({ direction }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:4, background: direction === 'inbound' ? 'var(--paper-2)' : 'var(--blue-soft)', color: direction === 'inbound' ? 'var(--ink-2)' : 'var(--blue)', fontSize:11, fontWeight:500, textTransform:'capitalize' }}>
      {direction === 'inbound' ? '↙' : '↗'} {direction}
    </span>
  );
}

const PAGE_SIZE = 10;

export default function CallsPage() {
  const [allCalls, setAllCalls] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [page, setPage]         = useState(1);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('calls')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      setAllCalls(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = allCalls.filter(c => {
    const matchSearch = !search ||
      (c.caller_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.caller_number ?? '').includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalMinutes = Math.round(allCalls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60);
  const answered     = allCalls.filter(c => c.status === 'answered').length;
  const missed       = allCalls.filter(c => c.status === 'missed').length;
  const voicemail    = allCalls.filter(c => c.status === 'voicemail').length;

  function exportCSV() {
    const headers = ['Date/Time','Caller Name','Caller Number','Direction','Duration (s)','Agent','Notes','Status'];
    const rows = filtered.map(c => [
      formatDateTime(c.created_at), c.caller_name ?? '', c.caller_number,
      c.direction, c.duration_seconds, c.agent_name ?? '', c.notes ?? '', c.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
    a.download = 'calls.csv';
    a.click();
  }

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.03em' }}>Call Logs</h1>
        <p style={{ fontSize:14, color:'var(--ink-3)', marginTop:4 }}>Review every call handled on your behalf.</p>
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:20 }}>
        <div style={{ position:'relative', flex:'1 1 220px', maxWidth:320 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--ink-3)' }}>
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search caller or number..."
            style={{ width:'100%', padding:'8px 12px 8px 32px', border:'1px solid var(--line-2)', borderRadius:7, fontSize:13, color:'var(--ink)', background:'var(--surface)', outline:'none', fontFamily:"'Inter',sans-serif" }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ padding:'8px 12px', border:'1px solid var(--line-2)', borderRadius:7, fontSize:13, color:'var(--ink)', background:'var(--surface)', outline:'none', fontFamily:"'Inter',sans-serif", cursor:'pointer' }}>
          <option value="all">All Statuses</option>
          <option value="answered">Answered</option>
          <option value="missed">Missed</option>
          <option value="voicemail">Voicemail</option>
        </select>
        <button onClick={exportCSV} style={{ marginLeft:'auto', padding:'8px 16px', border:'1px solid var(--line-2)', borderRadius:7, background:'var(--surface)', fontSize:13, fontWeight:500, color:'var(--ink-2)', cursor:'pointer', fontFamily:"'Inter',sans-serif", display:'flex', alignItems:'center', gap:6 }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v8M3 6l3.5 3.5L10 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1.5 11.5h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Export CSV
        </button>
      </div>

      {/* Summary strip */}
      <div style={{ display:'flex', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, marginBottom:20, overflow:'hidden' }}>
        {[
          { label:'Total Calls',    value: allCalls.length,   color:'var(--ink)'   },
          { label:'Answered',       value: answered,           color:'var(--green)' },
          { label:'Missed',         value: missed,             color:'var(--red)'   },
          { label:'Voicemail',      value: voicemail,          color:'var(--blue)'  },
          { label:'Total Minutes',  value: totalMinutes,       color:'var(--ink)'   },
        ].map((s, i) => (
          <div key={s.label} style={{ flex:1, padding:'14px 20px', borderRight: i < 4 ? '1px solid var(--line)' : 'none' }}>
            <div style={{ fontSize:11, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{s.label}</div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:700, color: loading ? 'var(--line)' : s.color }}>
              {loading ? '—' : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'var(--ink-3)' }}>
            <div style={{ fontSize:14 }}>Loading calls…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'60px 20px', textAlign:'center', color:'var(--ink-3)' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📞</div>
            <div style={{ fontSize:15, fontWeight:500, color:'var(--ink-2)', marginBottom:4 }}>
              {allCalls.length === 0 ? 'No calls yet' : 'No calls match your filter'}
            </div>
            <div style={{ fontSize:13 }}>{allCalls.length === 0 ? 'Calls will appear here once your service is active.' : 'Try adjusting your search or status filter.'}</div>
          </div>
        ) : (
          <>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--paper-2)', borderBottom:'1px solid var(--line)' }}>
                  {['Date / Time','Caller','Direction','Duration','Agent','Notes','Status'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--ink-3)', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((call, i) => (
                  <tr key={call.id} style={{ borderBottom: i < paginated.length - 1 ? '1px solid var(--line)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--paper)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding:'11px 16px', color:'var(--ink-2)', whiteSpace:'nowrap', fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>{formatDateTime(call.created_at)}</td>
                    <td style={{ padding:'11px 16px' }}>
                      <div style={{ fontWeight:500, color:'var(--ink)' }}>{call.caller_name || 'Unknown Caller'}</div>
                      <div style={{ fontSize:11, color:'var(--ink-3)', fontFamily:"'JetBrains Mono',monospace", marginTop:1 }}>{call.caller_number}</div>
                    </td>
                    <td style={{ padding:'11px 16px' }}><DirectionChip direction={call.direction} /></td>
                    <td style={{ padding:'11px 16px', fontFamily:"'JetBrains Mono',monospace", color:'var(--ink-2)', fontWeight:500 }}>{formatDuration(call.duration_seconds)}</td>
                    <td style={{ padding:'11px 16px', color:'var(--ink-2)' }}>{call.agent_name || '—'}</td>
                    <td style={{ padding:'11px 16px', color:'var(--ink-3)', maxWidth:200 }}>
                      <span style={{ display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{call.notes || '—'}</span>
                    </td>
                    <td style={{ padding:'11px 16px' }}><Badge status={call.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ padding:'12px 16px', borderTop:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--paper-2)' }}>
              <span style={{ fontSize:13, color:'var(--ink-3)' }}>
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} calls
              </span>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding:'5px 12px', border:'1px solid var(--line-2)', borderRadius:6, background:'var(--surface)', fontSize:13, cursor: page === 1 ? 'default' : 'pointer', color: page === 1 ? 'var(--ink-3)' : 'var(--ink)', fontFamily:"'Inter',sans-serif" }}>
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ padding:'5px 10px', border:'1px solid var(--line-2)', borderRadius:6, background: p === page ? 'var(--ink)' : 'var(--surface)', color: p === page ? 'white' : 'var(--ink)', fontSize:13, cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding:'5px 12px', border:'1px solid var(--line-2)', borderRadius:6, background:'var(--surface)', fontSize:13, cursor: page === totalPages ? 'default' : 'pointer', color: page === totalPages ? 'var(--ink-3)' : 'var(--ink)', fontFamily:"'Inter',sans-serif" }}>
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
