/**
 * Client-Side Authentication Functions
 * Use these functions in Client Components
 *
 * For server-side functions, import from './auth-server' instead
 */

import { supabase } from './client'
import type { UserWithRole, ApiResponse } from '@/types/database'

// ================================================================
// CLIENT-SIDE AUTHENTICATION FUNCTIONS
// ================================================================

/**
 * Sign in with email and password
 * Use this in client components
 *
 * @param email - User email
 * @param password - User password
 * @returns User data or error
 */
export async function signIn(
  email: string,
  password: string
): Promise<ApiResponse<{ user: UserWithRole }>> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Invalid credentials',
      }
    }

    console.log('Auth successful, userId:', authData.user.id)

    // Get user record with team and role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        user_id,
        team_id,
        role_id,
        email,
        username,
        first_name,
        last_name,
        is_master_admin,
        status,
        created_at,
        updated_at,
        last_login,
        avatar_url,
        role:roles (
          role_id,
          role_name,
          is_admin_role
        ),
        team:teams (
          team_id,
          team_name,
          company_name
        )
      `)
      .eq('user_id', authData.user.id)
      .single()

    if (userError || !userData) {
      return {
        success: false,
        error: userError?.message || 'Failed to fetch user data',
      }
    }

    // Update last login
    await (supabase.from('users') as any)
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', authData.user.id)

    return {
      success: true,
      data: {
        user: userData as UserWithRole,
      },
    }
  } catch (error) {
    console.error('Sign in error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Admin sign in - alias for signIn
 * Same as signIn, just a different name for clarity in admin contexts
 */
export async function adminSignIn(
  email: string,
  password: string
): Promise<ApiResponse<{ user: UserWithRole }>> {
  return signIn(email, password)
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }
    return { success: true }
  } catch (error) {
    console.error('Sign out error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Send password reset email
 * Supabase will send a password recovery email to the user
 * User clicks link in email to reset password
 *
 * @param email - User email address
 * @param redirectUrl - Where to redirect after password reset (e.g., /auth/reset-password)
 */
export async function resetPasswordEmail(
  email: string,
  redirectUrl: string
): Promise<ApiResponse<void>> {
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}${redirectUrl}`,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Reset password email error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Update user password (for authenticated users)
 * Use after user resets password or to change current password
 *
 * @param newPassword - New password
 */
export async function updatePassword(
  newPassword: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Update password error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Get password recovery session
 * Call this on the password reset page to get the recovery session
 * This validates the token from the reset email
 */
export async function getPasswordRecoverySession(): Promise<
  ApiResponse<{
    email: string
  }>
> {
  try {
    // Get the current session - Supabase populates this from the recovery token in the URL
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return {
        success: false,
        error: sessionError?.message || 'No recovery session found. Your link may have expired.',
      }
    }

    return {
      success: true,
      data: {
        email: session.user.email || '',
      },
    }
  } catch (error) {
    console.error('Get password recovery session error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

// End of authentication module

