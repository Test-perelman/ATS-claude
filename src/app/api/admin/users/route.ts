import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/supabase/user-server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/users
 * List all users (Master Admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const searchParams = req.nextUrl.searchParams;
    const teamId = searchParams.get('teamId');

    const adminSupabase = await createAdminClient();

    // Verify master admin
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('is_master_admin')
      .eq('id', user.user_id)
      .single();

    if (userError || !userData?.is_master_admin) {
      return NextResponse.json(
        { success: false, error: 'Only Master Admin can view all users' },
        { status: 403 }
      );
    }

    // Build query
    let query = adminSupabase
      .from('users')
      .select(`
        id,
        email,
        team_id,
        role_id,
        is_master_admin,
        created_at,
        teams:teams(id, name),
        role:roles(id, name, is_admin)
      `);

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data: users, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: users || [],
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: error.status || 500 }
    );
  }
}

// ============================================================================
// PATCH: Update user (Master Admin only)
// ============================================================================

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  // Check master admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Note: users table has column "id", not "user_id"
  const profileResult2 = await supabase
    .from('users')
    .select('is_master_admin')
    .eq('id', user.id)
    .single() as any;
  const profile2 = profileResult2?.data as { is_master_admin: boolean } | null;

  if (!profile2?.is_master_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { user_id, is_master_admin } = body;

  // Note: users table has column "id", not "user_id"
  const updateResult = await (supabase
    .from('users') as any)
    .update({ is_master_admin })
    .eq('id', user_id)
    .select()
    .single() as any;

  if (updateResult.error) return NextResponse.json({ error: updateResult.error.message }, { status: 500 });

  return NextResponse.json(updateResult.data);
}
