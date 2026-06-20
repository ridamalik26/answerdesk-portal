import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.' }, { status: 500 });
  }

  // Service role client — bypasses RLS, can create auth users
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const body = await request.json();
  const {
    business_name, contact_name, email, phone,
    timezone, plan_name, minutes_limit, monthly_price,
    overage_rate, status,
  } = body;

  // 1. Create the auth user with a temporary password
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'AnswerDesk@123',
    email_confirm: true, // skip confirmation email
    user_metadata: { business_name, full_name: contact_name },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  // 2. Insert into clients table using the new auth user's ID
  const { error: dbError } = await supabase.from('clients').insert({
    id:            userId,
    business_name,
    contact_name,
    email,
    phone,
    timezone,
    plan_name,
    minutes_limit: Number(minutes_limit),
    monthly_price: Number(monthly_price),
    overage_rate:  Number(overage_rate),
    status:        status ?? 'active',
  });

  if (dbError) {
    // Roll back: delete the auth user so we don't orphan it
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: dbError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, userId });
}
