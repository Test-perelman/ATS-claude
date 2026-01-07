import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    services: {
      supabase: 'unknown',
      database: 'unknown',
    },
    timing: {},
    errors: [] as string[],
  }

  try {
    // Test Supabase connection
    const supabaseStartTime = Date.now()
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              // Ignore cookie errors in API route
            }
          },
        },
      }
    )

    debugInfo.timing.supabaseSetup = Date.now() - supabaseStartTime

    // Test database connection
    const dbStartTime = Date.now()
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .limit(1)

      debugInfo.timing.databaseQuery = Date.now() - dbStartTime

      if (error) {
        debugInfo.services.database = 'error'
        debugInfo.errors.push(`Database error: ${error.message}`)
      } else {
        debugInfo.services.database = 'connected'
      }
    } catch (dbError) {
      debugInfo.services.database = 'error'
      debugInfo.errors.push(
        `Database connection error: ${dbError instanceof Error ? dbError.message : String(dbError)}`
      )
      debugInfo.timing.databaseQuery = Date.now() - dbStartTime
    }

    debugInfo.services.supabase = 'connected'

    // Test auth session
    const sessionStartTime = Date.now()
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      debugInfo.timing.sessionCheck = Date.now() - sessionStartTime
      debugInfo.auth = {
        hasSession: !!sessionData?.session,
        userId: sessionData?.session?.user?.id || 'none',
      }
    } catch (sessionError) {
      debugInfo.timing.sessionCheck = Date.now() - sessionStartTime
      debugInfo.errors.push(
        `Session check error: ${sessionError instanceof Error ? sessionError.message : String(sessionError)}`
      )
    }
  } catch (error) {
    debugInfo.services.supabase = 'error'
    debugInfo.errors.push(
      `Supabase error: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  debugInfo.timing.totalTime = Date.now() - startTime

  return NextResponse.json(debugInfo, {
    status: debugInfo.errors.length > 0 ? 200 : 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
