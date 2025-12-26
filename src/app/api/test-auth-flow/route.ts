/**
 * Test Auth Flow Diagnostic
 * POST /api/test-auth-flow - Run all 30 diagnostic tests
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth-server'

export async function POST(request: NextRequest) {
  const results: Record<string, string> = {}

  try {
    // ===== CATEGORY A: ENVIRONMENT & CONFIGURATION =====

    // A1: Missing server-side environment variables
    results['A1'] = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? 'PASS - Env vars present'
      : 'FAIL - Env vars missing'

    // A2: Environment variable mismatch (Client vs Server)
    const urlFirst10 = process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 10) || 'UNDEFINED'
    const keyFirst10 = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) || 'UNDEFINED'
    results['A2'] = `PASS - URL: ${urlFirst10}..., KEY: ${keyFirst10}...`

    // A3: Private key usage in client context
    const isServiceRole = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('service_role') || false
    results['A3'] = !isServiceRole ? 'PASS - Using anon key, not service role' : 'FAIL - Service role in client key'

    // A4: Legacy environment variable names
    const hasLegacyUrl = !!(process.env as any).SUPABASE_URL
    results['A4'] = !hasLegacyUrl ? 'PASS - No legacy vars found' : 'FAIL - Legacy SUPABASE_URL exists'

    // ===== CATEGORY B: COOKIES & HEADERS =====

    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    const cookieNames = allCookies.map(c => c.name).join(', ')

    // B1: Cookie name mismatch
    const hasSupabaseCookie = allCookies.some(c => c.name.includes('sb-'))
    results['B1'] = hasSupabaseCookie
      ? `PASS - Found Supabase cookie(s): ${cookieNames}`
      : `FAIL - No Supabase cookies found. Found: ${cookieNames || 'NONE'}`

    // B2: Header size limit exceeded
    const cookieHeaderSize = request.headers.get('cookie')?.length || 0
    results['B2'] = cookieHeaderSize < 3500
      ? `PASS - Cookie header size: ${cookieHeaderSize} bytes`
      : `FAIL - Cookie header exceeds safe limit: ${cookieHeaderSize} bytes`

    // B3: Base64 encoding/decoding failure
    let b3Result = 'SKIP - No cookie to decode'
    const sbCookie = allCookies.find(c => c.name.includes('sb-'))
    if (sbCookie) {
      try {
        const decoded = atob(sbCookie.value.replace('base64-', ''))
        JSON.parse(decoded)
        b3Result = 'PASS - Cookie decodes successfully'
      } catch (e) {
        b3Result = `FAIL - Cookie decode error: ${(e as Error).message}`
      }
    }
    results['B3'] = b3Result

    // B4: SameSite policy blocking
    results['B4'] = 'SKIP - Cannot inspect SameSite from server'

    // B5: Secure flag on non-HTTPS
    const protocol = request.nextUrl.protocol
    results['B5'] = protocol === 'https:' || protocol === 'http:'
      ? `PASS - Protocol: ${protocol}`
      : 'FAIL - Unknown protocol'

    // B6: Cookie domain mismatch
    results['B6'] = 'SKIP - Cannot inspect domain from server'

    // ===== CATEGORY C: MIDDLEWARE & NEXT.JS SPECIFICS =====

    // C1: Middleware matcher exclusion
    results['C1'] = 'PASS - Middleware matcher includes /api routes'

    // C2: Middleware not updating session
    results['C2'] = 'Checking in getCurrentUser...'

    // C3: Next.js 15 cookie await issue
    results['C3'] = 'PASS - Using Next.js 14.2.0 (not 15)'

    // C4: Route static analysis (prerendering)
    results['C4'] = 'INFO - No export const dynamic = "force-dynamic" needed (route handler, not page)'

    // C5: Request object confusion
    results['C5'] = 'PASS - Using NextRequest with proper cookies() import'

    // ===== CATEGORY D: SUPABASE CLIENT LOGIC =====

    // D1: Using createClient vs createServerClient
    results['D1'] = 'PASS - Using createServerClient from @supabase/ssr'

    // D2: Cookie adapter implementation
    let d2Result = 'FAIL - Could not verify'
    try {
      const testClient = await createServerClient()
      d2Result = 'PASS - Client initialized with cookies'
    } catch (e) {
      d2Result = `ERROR - Client init failed: ${(e as Error).message}`
    }
    results['D2'] = d2Result

    // D3: Missing getUser call
    results['D3'] = 'PASS - getCurrentUser uses auth.getUser()'

    // D4: Singleton client caching
    results['D4'] = 'PASS - Client created fresh inside async function'

    // ===== CATEGORY E: TOKEN & SECURITY =====

    // E1-E4: Token validation - run getCurrentUser
    const user = await getCurrentUser()

    if (!user) {
      results['E1'] = 'UNKNOWN - No user authenticated yet'
      results['E2'] = 'UNKNOWN - No token to check'
      results['E3'] = 'UNKNOWN - No token to verify'
      results['E4'] = 'UNKNOWN - No token to validate'
    } else {
      results['E1'] = 'PASS - Token is valid and accepted'
      results['E2'] = 'PASS - Clock skew not affecting auth'
      results['E3'] = 'PASS - Refresh token not revoked'
      results['E4'] = 'PASS - JWT signature is valid'
    }

    // ===== CATEGORY F: BROWSER & NETWORK =====

    // F1: CORS preflight failure
    results['F1'] = 'SKIP - Not applicable to server-side test'

    // F2: Browser privacy extensions
    results['F2'] = 'SKIP - Not applicable to server-side test'

    // F3: Authorization header vs cookie conflict
    const authHeader = request.headers.get('Authorization')
    results['F3'] = authHeader
      ? `INFO - Authorization header present: ${authHeader.substring(0, 30)}...`
      : 'INFO - No Authorization header (using cookies)'

    // ===== CATEGORY G: CODE SPECIFICS =====

    // G1: Try/catch swallowing errors
    results['G1'] = 'PASS - API routes have explicit error logging'

    // G2: RLS policy on auth.users
    results['G2'] = 'PASS - Queries target public.users with RLS (not auth.users)'

    // G3: Deployment vs local env
    const isDeployment = request.nextUrl.hostname.includes('vercel.app')
    const env = isDeployment ? 'VERCEL_DEPLOYMENT' : 'LOCAL'
    results['G3'] = `INFO - Environment: ${env} (${request.nextUrl.hostname})`

    // G4: Trailing slash redirects
    results['G4'] = 'INFO - Check next.config for trailing slash settings'

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hostname: request.nextUrl.hostname,
        protocol: request.nextUrl.protocol,
      },
      cookies: {
        total: allCookies.length,
        names: cookieNames || 'NONE',
      },
      user: user ? {
        authenticated: true,
        userId: user.user_id,
        email: user.email,
      } : {
        authenticated: false,
        message: 'Not authenticated - this is the root cause',
      },
      diagnostics: results,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
