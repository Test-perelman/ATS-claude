import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Create a Supabase client for use in Server Components, Server Actions, and Route Handlers
 * Uses Next.js cookies for proper authentication handling
 */
export async function createClient() {
  const cookieStore = cookies()

  console.log('[createClient] Getting cookies from request...')
  console.log('[createClient] All cookies:', cookieStore.getAll().map(c => c.name).join(', '))

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          const value = cookieStore.get(name)?.value
          console.log(`[createClient] get("${name}"):`, value ? `found (${value.substring(0, 50)}...)` : 'NOT FOUND')
          return value
        },
        setAll(cookiesToSet) {
          console.log('[createClient] setAll called with', cookiesToSet.length, 'cookies')
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
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
