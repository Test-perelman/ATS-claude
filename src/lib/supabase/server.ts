import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * LEGACY: This file maintains backward compatibility
 *
 * For NEW code, use:
 * - user-server.ts for cookie-based user authentication
 * - admin-server.ts for service-role admin operations
 */

/**
 * Create a Supabase client for use in Server Components, Server Actions, and Route Handlers
 * Uses Next.js cookies for proper authentication handling
 *
 * DEPRECATED: Use createUserClient() from user-server.ts instead
 *
 * IMPORTANT: This function must be called INSIDE a request handler (API route or Server Action)
 * to access the request-scoped cookies() API from next/headers
 */
export async function createClient() {
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}

// Alias for compatibility
export const createServerClient = createClient

/**
 * Create a Supabase Admin client for privileged operations
 * Uses service role key for admin operations (bypasses RLS)
 *
 * DEPRECATED: Use createAdminClient() from admin-server.ts instead
 */
export async function createAdminClient(): Promise<SupabaseClient<Database>> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "public" }
    }
  )
}
