import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const ADMIN_EMAIL = 'ashhad.rasool22@gmail.com';

function redirect(request, pathname) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export async function proxy(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const email = user?.email?.trim().toLowerCase() ?? null;

  console.log(`[proxy] ${pathname} | user: ${email ?? 'none'}`);

  // ── /admin routes ─────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    // Step 1: must be logged in
    if (!user) {
      console.log('[proxy] /admin — no session → /login');
      return redirect(request, '/login');
    }
    // Step 2: must be the admin email
    if (email !== ADMIN_EMAIL) {
      console.log(`[proxy] /admin — wrong email (${email}) → /dashboard`);
      return redirect(request, '/dashboard');
    }
    // Step 3: correct admin email — allow through
    console.log('[proxy] /admin — admin confirmed, allowing through');
    return supabaseResponse;
  }

  // ── Client portal routes ───────────────────────────────────
  const clientRoutes = ['/dashboard', '/calls', '/minutes', '/billing', '/account', '/onboarding'];
  if (clientRoutes.some(r => pathname.startsWith(r))) {
    if (!user) {
      console.log(`[proxy] ${pathname} — no session → /login`);
      return redirect(request, '/login');
    }
    // Admin user should not be browsing client portal routes
    if (email === ADMIN_EMAIL) {
      console.log(`[proxy] ${pathname} — admin user on client route → /admin`);
      return redirect(request, '/admin');
    }
    return supabaseResponse;
  }

  // ── /login — bounce logged-in users to the right destination ──
  if (pathname === '/login' && user) {
    if (email === ADMIN_EMAIL) {
      console.log('[proxy] /login — admin user → /admin');
      return redirect(request, '/admin');
    }
    console.log('[proxy] /login — regular user → /dashboard');
    return redirect(request, '/dashboard');
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
