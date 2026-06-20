'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Left panel */}
      <div style={{
        flex: '0 0 45%',
        background: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 56px',
        color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 3h12v9H3V3z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M6 15h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 12v3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>AnswerDesk</span>
        </div>

        <div>
          <p style={{
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            fontSize: 38,
            lineHeight: 1.25,
            color: 'white',
            marginBottom: 24,
            maxWidth: 380,
          }}>
            "Every missed call is a missed customer."
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            Your answering service, running 24/7.<br />
            Manage calls, minutes, and billing in one place.
          </p>
        </div>

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          © 2026 AnswerDesk. All rights reserved.
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        flex: 1,
        background: 'var(--paper)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, letterSpacing: '-0.03em' }}>
              Sign in to your account
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>
              Enter your credentials to access the portal.
            </p>
          </div>

          {error && (
            <div style={{
              marginBottom: 16, padding: '10px 14px',
              background: 'var(--red-soft)', border: '1px solid var(--red)',
              borderRadius: 8, fontSize: 13, color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid var(--line-2)',
                  borderRadius: 8,
                  fontSize: 14,
                  color: 'var(--ink)',
                  background: 'var(--surface)',
                  outline: 'none',
                  fontFamily: "'Inter', sans-serif",
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--line-2)'}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
                  Password
                </label>
                <a href="#" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid var(--line-2)',
                  borderRadius: 8,
                  fontSize: 14,
                  color: 'var(--ink)',
                  background: 'var(--surface)',
                  outline: 'none',
                  fontFamily: "'Inter', sans-serif",
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--line-2)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                padding: '11px 24px',
                background: loading ? 'var(--ink-2)' : 'var(--ink)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '-0.01em',
                opacity: loading ? 0.8 : 1,
              }}
              onMouseEnter={e => { if (!loading) e.target.style.background = 'var(--ink-2)'; }}
              onMouseLeave={e => { if (!loading) e.target.style.background = 'var(--ink)'; }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: 32, fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
            Need help?{' '}
            <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
}
