import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { UserWithRole } from '@/types/database'

/**
 * User Server Client Module
 *
 * INVARIANT: This module ONLY handles user authentication via cookies.
 * It MUST NEVER import or use admin-server.ts or service role keys.
 *
 * Trust Model: Cookie-based session (anon key)
 * RLS: Enforced on all queries
 * Auth Source: next/headers cookies (session from auth.getUser())
 */

/**
 * Create a Supabase client for authenticated user requests
 *
 * Rules:
 * - Uses anon key (respects RLS)
 * - Reads cookies from request
 * - Can resolve user via auth.getUser()
 * - Cannot bypass RLS
 * - MUST NOT import service role key
 *
 * CRITICAL: Must be called within a request handler
 */
export async function createUserClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = cookies()

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // Ignore setAll errors from Server Components
            // Middleware handles session refresh
          }
        },
      },
    }
  )
}

/**
 * Require current authenticated user from session
 *
 * Rules:
 * - MUST be called as first executable line in user routes
 * - Reads session from cookies
 * - Calls auth.getUser()
 * - If user is null → throw 401 Not authenticated
 * - Never fallback to admin logic
 * - Never return null
 *
 * @throws Error with status 401 if no authenticated user
 * @returns UserWithRole object with complete user, role, and team data
 */
export async function requireCurrentUser(): Promise<UserWithRole> {
  try {
    const supabase = await createUserClient()

    // Step 1: Get authenticated user from session
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      const error = new Error('Not authenticated')
      ;(error as any).status = 401
      throw error
    }

    // Step 2: Query user record from database
    const userIdString = authUser.id.toString()
    const { data: userData, error: queryError } = await supabase
      .from('users')
      .select(`
        id,
        team_id,
        role_id,
        email,
        is_master_admin,
        created_at,
        updated_at,
        role:roles (
          id,
          name,
          is_admin
        ),
        team:teams (
          id,
          name
        )
      `)
      .eq('id', userIdString)
      .single()

    // Only PGRST116 (no rows) is acceptable; throw other errors
    if (queryError && queryError.code !== 'PGRST116') {
      throw queryError
    }

    if (!userData) {
      // User authenticated but missing from database = incomplete signup
      // This is a data integrity issue, not an auth issue
      const error = new Error('User record not found')
      ;(error as any).status = 500
      ;(error as any).code = 'USER_RECORD_MISSING'
      throw error
    }

    // Step 3: Return complete user object
    const userWithRole: UserWithRole = {
      user_id: (userData as any).id,
      team_id: (userData as any).team_id,
      role_id: (userData as any).role_id,
      email: (userData as any).email,
      username: null,
      first_name: null,
      last_name: null,
      is_master_admin: (userData as any).is_master_admin,
      status: 'active' as const,
      role: (userData as any).role
        ? {
            role_id: (userData as any).role.id,
            role_name: (userData as any).role.name,
            is_admin_role: (userData as any).role.is_admin,
          }
        : null,
      team: (userData as any).team
        ? {
            team_id: (userData as any).team.id,
            team_name: (userData as any).team.name,
            company_name: (userData as any).team.name,
          }
        : null,
    }

    return userWithRole
  } catch (error) {
    // Propagate with proper status codes
    if (error instanceof Error) {
      const err = error as any
      if (err.status === 401 || err.status === 500) {
        throw error
      }
    }
    // Unexpected errors → 500
    const err = new Error('Authentication failed')
    ;(err as any).status = 500
    throw err
  }
}