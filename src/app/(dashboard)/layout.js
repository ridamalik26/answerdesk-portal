'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

const navLinks = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    href: '/calls',
    label: 'Call Logs',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 3.5A1.5 1.5 0 013.5 2h1.236a.5.5 0 01.47.333l.946 2.838a.5.5 0 01-.114.524L4.75 7.004a9.015 9.015 0 004.246 4.246l1.31-1.288a.5.5 0 01.523-.114l2.838.946A.5.5 0 0114 11.264V12.5A1.5 1.5 0 0112.5 14C6.701 14 2 9.299 2 3.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/minutes',
    label: 'Minute Tracker',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/billing',
    label: 'Billing',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 10h2M10 10h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/account',
    label: 'My Account',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M2.5 13.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/onboarding',
    label: 'Onboarding',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M13 8.5V13a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 2l4 4-5.5 5.5H5V8L10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const supabaseRef = useRef(null);

  useEffect(() => {
    // createBrowserClient only runs client-side, never during prerender
    supabaseRef.current = getSupabaseClient();
    supabaseRef.current.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  async function handleSignOut() {
    if (supabaseRef.current) await supabaseRef.current.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const displayEmail = user?.email ?? '';
  const displayName = user?.user_metadata?.business_name
    ?? user?.user_metadata?.full_name
    ?? displayEmail.split('@')[0]
    ?? '—';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
      }}>
        {/* Brand */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7,
              background: 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2h12v8H2V2z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/>
                <path d="M5 14h6" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M8 10v4" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                AnswerDesk
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>Client Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navLinks.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 20px',
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                  textDecoration: 'none',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  transition: 'all 0.15s',
                  marginBottom: 2,
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--paper-2)';
                    e.currentTarget.style.color = 'var(--ink)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--ink-2)';
                  }
                }}
              >
                <span style={{ color: isActive ? 'var(--accent)' : 'currentColor', flexShrink: 0 }}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, color: 'white', flexShrink: 0,
            }}>
              {avatarLetter}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayEmail}
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '7px 12px',
              border: '1px solid var(--line-2)',
              borderRadius: 6,
              background: 'transparent',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--ink-2)',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M5 2H2.5A.5.5 0 002 2.5v8a.5.5 0 00.5.5H5M9 9l3-3-3-3M12 6.5H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 240, flex: 1, minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
