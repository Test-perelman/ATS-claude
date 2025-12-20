import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// GET: List users (Master Admin only)
// ============================================================================

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  // Check master admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profileResult = await supabase
    .from('users')
    .select('is_master_admin')
    .eq('user_id', user.id)
    .single() as any;
  const profile = profileResult?.data as { is_master_admin: boolean } | null;

  if (!profile?.is_master_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // List all users
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// ============================================================================
// PATCH: Update user (Master Admin only)
// ============================================================================

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  // Check master admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profileResult2 = await supabase
    .from('users')
    .select('is_master_admin')
    .eq('user_id', user.id)
    .single() as any;
  const profile2 = profileResult2?.data as { is_master_admin: boolean } | null;

  if (!profile2?.is_master_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { user_id, is_master_admin } = body;

  const updateResult = await (supabase
    .from('users') as any)
    .update({ is_master_admin })
    .eq('user_id', user_id)
    .select()
    .single() as any;

  if (updateResult.error) return NextResponse.json({ error: updateResult.error.message }, { status: 500 });

  return NextResponse.json(updateResult.data);
}
