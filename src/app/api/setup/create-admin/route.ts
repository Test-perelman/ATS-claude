import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const SETUP_SECRET = 'PERELMAN';

export async function POST(request: NextRequest) {
  try {
    const { email, password, secret } = await request.json();

    if (secret !== SETUP_SECRET) {
      return NextResponse.json({ error: 'Invalid secret key' }, { status: 403 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const adminSupabase = await createAdminClient();
    const normalizedEmail = email.toLowerCase();

    // Delete existing user with this email if exists
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (existingUser) {
      // Delete from public.users first
      await adminSupabase.from('users').delete().eq('id', existingUser.id);
      // Delete from auth.users
      await adminSupabase.auth.admin.deleteUser(existingUser.id);
    }

    // Also clean up any orphan public.users with this email
    await adminSupabase.from('users').delete().eq('email', normalizedEmail);

    // Create new auth user
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Create public.users record
    const { error: userError } = await adminSupabase.from('users').upsert({
      id: authData.user.id,
      email: normalizedEmail,
      is_master_admin: true,
      team_id: null,
      role_id: null,
    });

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Admin user created. You can now login.',
      credentials: { email: normalizedEmail, password }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
