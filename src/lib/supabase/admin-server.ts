import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Admin Server Client Module
 *
 * INVARIANT: This module ONLY handles admin/service operations.
 * It MUST NEVER:
 * - Read cookies
 * - Call auth.getUser()
 * - Return a "current user" from session
 * - Import user-server.ts
 *
 * Trust Model: Service role key (authority-based, bypasses RLS)
 * RLS: Bypassed
 * Use Cases: Signup flows, user provisioning, team creation
 */

/**
 * Create a Supabase Admin client for privileged operations
 *
 * Rules:
 * - Uses service role key
 * - NEVER reads cookies
 * - NEVER calls auth.getUser()
 * - NEVER returns a "current user"
 * - Bypasses all RLS policies
 * - Only used for admin/service operations
 *
 * CRITICAL: Must NOT be used to infer or resolve a user
 */
export async function createAdminClient(): Promise<SupabaseClient<Database>> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'public' },
    }
  )
}
