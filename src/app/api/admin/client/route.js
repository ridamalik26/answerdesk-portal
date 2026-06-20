import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/admin/client?id=<uuid>
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  console.log('[admin/client] GET id =', id);

  if (!id) {
    return NextResponse.json({ error: 'Missing id param' }, { status: 400 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set.' }, { status: 500 });
  }

  const supabase = getAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // maybeSingle() returns null cleanly when no row found — no error code needed
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  console.log('[admin/client] clients query — data:', clientData, '| error:', clientError);

  if (clientError) {
    console.error('[admin/client] Supabase error:', clientError);
    return NextResponse.json({ error: clientError.message, detail: clientError }, { status: 500 });
  }

  if (!clientData) {
    // Log all client IDs to help diagnose a UUID mismatch
    const { data: allIds } = await supabase.from('clients').select('id, email');
    console.log('[admin/client] No match found. All client IDs in DB:', allIds);
    return NextResponse.json({ error: `No client found with id: ${id}`, allIds }, { status: 404 });
  }

  const [callsRes, stepsRes] = await Promise.all([
    supabase.from('calls').select('duration_seconds,created_at,status').eq('client_id', id).gte('created_at', monthStart),
    supabase.from('onboarding_steps').select('*').eq('client_id', id).order('step_number'),
  ]);

  return NextResponse.json({
    client: clientData,
    calls:  callsRes.data ?? [],
    steps:  stepsRes.data ?? [],
  });
}

// PATCH /api/admin/client?id=<uuid>
export async function PATCH(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id param' }, { status: 400 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set.' }, { status: 500 });
  }

  const supabase = getAdminClient();
  const body = await request.json();

  const { error } = await supabase.from('clients').update(body).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
