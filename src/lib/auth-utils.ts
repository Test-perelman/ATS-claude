import { createClient } from '@/lib/supabase/server';

// ============================================================================
// Get current user with full profile
// ============================================================================

export async function getCurrentUserWithProfile() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select(
      `
      id,
      email,
      team_id,
      role_id,
      is_master_admin,
      teams (id, name),
      roles (id, name, is_admin)
      `
    )
    .eq('id', user.id)
    .single();

  return {
    auth: user,
    profile,
  };
}

// ============================================================================
// Check if user is master admin
// ============================================================================

export async function isMasterAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('users')
    .select('is_master_admin')
    .eq('id', userId)
    .single();

  return user?.is_master_admin === true;
}

// ============================================================================
// Check if user is team admin
// ============================================================================

export async function isTeamAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('users')
    .select('roles(is_admin)')
    .eq('id', userId)
    .single();

  return user?.roles?.is_admin === true;
}

// ============================================================================
// Check if user is admin (master or team)
// ============================================================================

export async function isAdmin(userId: string): Promise<boolean> {
  const [isMaster, isTeam] = await Promise.all([
    isMasterAdmin(userId),
    isTeamAdmin(userId),
  ]);

  return isMaster || isTeam;
}

// ============================================================================
// Get user's team
// ============================================================================

export async function getUserTeam(userId: string) {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('users')
    .select('team_id')
    .eq('id', userId)
    .single();

  if (!user?.team_id) return null;

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', user.team_id)
    .single();

  return team;
}

// ============================================================================
// Verify user can access team
// ============================================================================

export async function canAccessTeam(userId: string, teamId: string): Promise<boolean> {
  const supabase = await createClient();

  // Master admin can access all teams
  if (await isMasterAdmin(userId)) return true;

  // Regular user can only access their team
  const { data: user } = await supabase
    .from('users')
    .select('team_id')
    .eq('id', userId)
    .single();

  return user?.team_id === teamId;
}

// ============================================================================
// Verify user can access resource (check team ownership)
// ============================================================================

export async function canAccessResource(
  userId: string,
  tableName: string,
  resourceId: string
): Promise<boolean> {
  const supabase = await createClient();

  // Master admin can access everything
  if (await isMasterAdmin(userId)) return true;

  // Get resource team_id
  const { data: resource } = await supabase
    .from(tableName)
    .select('team_id')
    .eq('id', resourceId)
    .single();

  if (!resource) return false;

  return await canAccessTeam(userId, resource.team_id);
}
