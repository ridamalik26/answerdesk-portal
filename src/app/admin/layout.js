'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

const navLinks = [
  {
    href: '/admin',
    label: 'All Clients',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="5.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="10.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1 13c0-2.21 2.015-4 4.5-4s4.5 1.79 4.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M10.5 9c2.485 0 4.5 1.79 4.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/admin/billing',
    label: 'Billing Overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 10h2M10 10h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const supabaseRef = useRef(null);

  useEffect(() => {
    supabaseRef.current = getSupabaseClient();
    supabaseRef.current.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecked(true);
    });
  }, [router]);

  async function handleSignOut() {
    if (supabaseRef.current) await supabaseRef.current.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const displayEmail = user?.email ?? '';
  const displayName = user?.user_metadata?.full_name ?? displayEmail.split('@')[0] ?? '—';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  if (!authChecked) {
    return (
      <div style={{ display:'flex', minHeight:'100vh', background:'var(--paper)', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:14, color:'var(--ink-3)' }}>Verifying access…</div>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--paper)' }}>
      <aside style={{
        width:240, flexShrink:0,
        background:'var(--surface)', borderRight:'1px solid var(--line)',
        display:'flex', flexDirection:'column',
        position:'fixed', top:0, left:0, bottom:0, zIndex:50,
      }}>
        {/* Brand */}
        <div style={{ padding:'24px 20px 20px', borderBottom:'1px solid var(--line)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:7, background:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2h12v8H2V2z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/>
                <path d="M5 14h6" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M8 10v4" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.02em' }}>AnswerDesk</div>
              <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:1 }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                  <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:'var(--accent)' }} />
                  Admin Portal
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin badge */}
        <div style={{ padding:'10px 20px', background:'var(--accent-soft)', borderBottom:'1px solid var(--line)' }}>
          <span style={{ fontSize:11, fontWeight:600, color:'var(--accent-ink)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            🔐 Admin Access
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 0', overflowY:'auto' }}>
          {navLinks.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'9px 20px', fontSize:13.5,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                  textDecoration:'none',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  transition:'all 0.15s', marginBottom:2,
                }}
                onMouseEnter={e => {
                  if (!isActive) { e.currentTarget.style.background = 'var(--paper-2)'; e.currentTarget.style.color = 'var(--ink)'; }
                }}
                onMouseLeave={e => {
                  if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-2)'; }
                }}
              >
                <span style={{ color: isActive ? 'var(--accent)' : 'currentColor', flexShrink:0 }}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}

          <div style={{ margin:'16px 20px 8px', height:1, background:'var(--line)' }} />

          <Link
            href="/dashboard"
            style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 20px', fontSize:13, color:'var(--ink-3)', textDecoration:'none' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-3)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M6 10L3 7l3-3M3 7h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Client Portal
          </Link>
        </nav>

        {/* User */}
        <div style={{ padding:'16px 20px', borderTop:'1px solid var(--line)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, color:'white', flexShrink:0 }}>
              {avatarLetter}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{displayName}</div>
              <div style={{ fontSize:11, color:'var(--ink-3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{displayEmail}</div>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ width:'100%', padding:'7px 12px', border:'1px solid var(--line-2)', borderRadius:6, background:'transparent', fontSize:12, fontWeight:500, color:'var(--ink-2)', cursor:'pointer', fontFamily:"'Inter',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M5 2H2.5A.5.5 0 002 2.5v8a.5.5 0 00.5.5H5M9 9l3-3-3-3M12 6.5H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      <main style={{ marginLeft:240, flex:1, minWidth:0 }}>
        {children}
      </main>
    </div>
  );
}
