'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';

// ============================================================================
// SIGN UP
// ============================================================================

export async function signUp(email: string, password: string) {
  const supabase = await createClient();

  // Step 1: Create auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'Failed to create user' };
  }

  // Step 2: Create user record + team + role using admin client
  try {
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminSupabase = await createAdminClient();

    // Generate UUIDs for team and admin role
    const teamId = randomUUID();
    const roleId = randomUUID();

    // Create team for this user
    const { error: teamError } = await (adminSupabase.from('teams') as any)
      .insert({
        id: teamId,
        name: `${email.split('@')[0]}'s Team`,
      });

    if (teamError) {
      console.error('Failed to create team:', teamError);
      return { error: 'Signup failed: Could not create team' };
    }

    // Create admin role for the team
    const { error: roleError } = await (adminSupabase.from('roles') as any)
      .insert({
        id: roleId,
        team_id: teamId,
        name: 'Admin',
        is_admin: true,
      });

    if (roleError) {
      console.error('Failed to create admin role:', roleError);
      return { error: 'Signup failed: Could not create admin role' };
    }

    // Create user record and assign to team with admin role
    const { error: userError } = await (adminSupabase.from('users') as any)
      .insert({
        id: data.user.id,
        email: email.trim().toLowerCase(),
        is_master_admin: false,
        team_id: teamId,
        role_id: roleId,
      });

    if (userError) {
      console.error('Failed to create user record:', userError);
      return { error: 'Signup failed: Could not create user record' };
    }
  } catch (err) {
    console.error('Signup error:', err);
    return { error: 'Signup failed. Please try again.' };
  }

  return { success: true, data };
}

// ============================================================================
// SIGN IN
// ============================================================================

export async function signIn(email: string, password: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'Failed to sign in' };
  }

  // Ensure user record exists in database
  try {
    const { data: existingUser, error } = await (supabase.from('users') as any)
      .select('id')
      .eq('id', data.user.id)
      .single();

    // Only ignore "no rows" error (PGRST116) - all other errors are unexpected
    if (error && error.code !== 'PGRST116') {
      console.error('[signIn] Unexpected query error:', error.message);
      throw error;
    }

    // If user record doesn't exist, create it with team + role
    if (!existingUser) {
      const { createAdminClient } = await import('@/lib/supabase/server');
      const adminSupabase = await createAdminClient();

      // Generate UUIDs for team and admin role
      const teamId = randomUUID();
      const roleId = randomUUID();

      // Create team for this user
      const { error: teamError } = await (adminSupabase.from('teams') as any)
        .insert({
          id: teamId,
          name: `${email.split('@')[0]}'s Team`,
        });

      if (teamError) {
        console.error('[signIn] Failed to create team:', teamError);
        // Continue - user can log in but may have issues creating records
      } else {
        // Create admin role for the team
        const { error: roleError } = await (adminSupabase.from('roles') as any)
          .insert({
            id: roleId,
            team_id: teamId,
            name: 'Admin',
            is_admin: true,
          });

        if (roleError) {
          console.error('[signIn] Failed to create admin role:', roleError);
        } else {
          // Create user record and assign to team with admin role
          const { error: createError } = await (adminSupabase.from('users') as any)
            .insert({
              id: data.user.id,
              email: email.trim().toLowerCase(),
              is_master_admin: false,
              team_id: teamId,
              role_id: roleId,
            });

          if (createError) {
            console.error('[signIn] Failed to create user record:', createError);
          }
        }
      }
    }
  } catch (err) {
    console.error('[signIn] Failed to validate/create user record:', err);
    // Continue anyway - user auth is valid
  }

  redirect('/dashboard');
}

// ============================================================================
// SIGN IN WITH OTP (Magic Link)
// ============================================================================

export async function signInWithOtp(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// ============================================================================
// RESET PASSWORD (Send Link)
// ============================================================================

export async function resetPassword(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// ============================================================================
// UPDATE PASSWORD
// ============================================================================

export async function updatePassword(newPassword: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// ============================================================================
// GET CURRENT USER + CLAIMS
// ============================================================================

export async function getCurrentUser() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Get user profile + claims
  // Note: users table uses id, not user_id
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    auth: user,
    profile,
  };
}

// ============================================================================
// SIGN OUT
// ============================================================================

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect('/');
}

// ============================================================================
// ADMIN: Invite User (Master Admin only)
// ============================================================================

export async function inviteUser(email: string) {
  const supabase = await createClient();

  // Check if current user is master admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Note: users table uses id, not user_id
  const profileResult = await supabase
    .from('users')
    .select('is_master_admin')
    .eq('id', user.id)
    .single() as any;
  const profile = profileResult?.data as { is_master_admin: boolean } | null;

  if (!profile?.is_master_admin) {
    return { error: 'Only master admins can invite users' };
  }

  // Invite user
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);

  if (error) {
    return { error: error.message };
  }

  return { data };
}
