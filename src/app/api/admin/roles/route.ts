import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// GET: List roles for team
// ============================================================================

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('team_id');

  if (!teamId) {
    return NextResponse.json({ error: 'team_id required' }, { status: 400 });
  }

  // Verify user can access this team
  const result = await supabase
    .from('users')
    .select('team_id, is_master_admin')
    .eq('user_id', user.id)
    .single() as any;
  const userProfile = result?.data as { team_id: string; is_master_admin: boolean } | null;

  if (userProfile && !userProfile.is_master_admin && userProfile.team_id !== teamId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('roles')
    .select('*, role_permissions(*)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// ============================================================================
// POST: Create role
// ============================================================================

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { team_id, name, is_admin } = body;

  // Check if user is admin for this team
  const userResult = await supabase
    .from('users')
    .select('team_id, is_master_admin, role_id')
    .eq('user_id', user.id)
    .single() as any;
  const userProfile = userResult?.data as { team_id: string; is_master_admin: boolean; role_id: string } | null;

  if (userProfile && !userProfile.is_master_admin) {
    if (userProfile.team_id !== team_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const roleResult = await supabase
      .from('roles')
      .select('is_admin_role')
      .eq('role_id', userProfile.role_id)
      .single() as any;
    const role = roleResult?.data as { is_admin_role: boolean } | null;
    if (!role?.is_admin_role) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const insertResult = await supabase
    .from('roles')
    .insert({ team_id, name, is_admin } as any)
    .select()
    .single() as any;

  if (insertResult.error) return NextResponse.json({ error: insertResult.error.message }, { status: 500 });

  return NextResponse.json(insertResult.data);
}

// ============================================================================
// PATCH: Update role permissions
// ============================================================================

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { role_id, permission_ids } = body;

  // Get role
  const roleResult = await supabase
    .from('roles')
    .select('team_id')
    .eq('role_id', role_id)
    .single() as any;
  const role = roleResult?.data as { team_id: string } | null;

  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

  // Check permissions
  const userResult2 = await supabase
    .from('users')
    .select('team_id, is_master_admin')
    .eq('user_id', user.id)
    .single() as any;
  const userProfile2 = userResult2?.data as { team_id: string; is_master_admin: boolean } | null;

  if (userProfile2 && !userProfile2.is_master_admin && userProfile2.team_id !== role.team_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete existing role_permissions
  await supabase.from('role_permissions').delete().eq('role_id', role_id);

  // Insert new permissions
  const { error } = await supabase.from('role_permissions').insert(
    permission_ids.map((pid: string) => ({
      role_id,
      permission_id: pid,
    }))
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
