'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// ============================================================================
// SIGN UP
// ============================================================================

export async function signUp(email: string, password: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { data };
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
