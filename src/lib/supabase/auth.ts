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

