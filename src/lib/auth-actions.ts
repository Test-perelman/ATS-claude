'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

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

  // Step 2: Create user record in database using admin client to bypass RLS
  // NEW USER STATE: is_master_admin=false, team_id=null, role_id=null (pending onboarding)
  // After onboarding: user will be assigned team_id and role_id
  try {
    // Import admin client dynamically to avoid circular imports
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminSupabase = await createAdminClient();

    const { error: userError } = await (adminSupabase.from('users') as any)
      .insert({
        user_id: data.user.id,
        email: email.trim().toLowerCase(),
        username: email.trim().toLowerCase().split('@')[0],
        is_master_admin: false,
        team_id: null,
        role_id: null,
        status: 'active',
      });

    if (userError) {
      console.error('Failed to create user record:', userError);
      // Don't fail signup - user can still log in and create record later
    }
  } catch (err) {
    console.error('Error creating user record:', err);
    // Continue - user can still log in
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
      .select('user_id')
      .eq('user_id', data.user.id)
      .single();

    // Only ignore "no rows" error (PGRST116) - all other errors are unexpected
    if (error && error.code !== 'PGRST116') {
      // This is unexpected - data integrity issue
      console.error('[signIn] Unexpected query error:', error.message);
      throw error;  // Don't hide this error
    }

    // If user record doesn't exist, create it using admin client
    // NEW USER STATE: is_master_admin=false, team_id=null, role_id=null (pending onboarding)
    // After onboarding: user will be assigned team_id and role_id
    if (!existingUser) {
      const { createAdminClient } = await import('@/lib/supabase/server');
      const adminSupabase = await createAdminClient();

      const { error: createError } = await (adminSupabase.from('users') as any)
        .insert({
          user_id: data.user.id,
          email: email.trim().toLowerCase(),
          username: email.trim().toLowerCase().split('@')[0],
          is_master_admin: false,
          team_id: null,
          role_id: null,
          status: 'active',
        });

      if (createError) {
        console.error('[signIn] Failed to create user record on signin:', createError);
        // Continue anyway - user auth is valid
      }
    }
  } catch (err) {
    console.error('[signIn] Failed to validate/create user record:', err);
    // User is authenticated but record validation/creation failed
    // Continue with caution - user may have issues
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
