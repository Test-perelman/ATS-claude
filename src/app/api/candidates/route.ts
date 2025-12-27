/**
 * Candidates API Endpoint V2
 * GET /api/candidates - List candidates (team-scoped)
 * POST /api/candidates - Create candidate
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createUserClient } from '@/lib/supabase/user-server'
import { getTeamContext } from '@/lib/utils/team-context'
import { checkPermission } from '@/lib/utils/permissions'
import { z } from 'zod'

/**
 * GET /api/candidates
 * List all candidates for the user's team
 * Supports pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // DEBUG: Check available cookies immediately
    const cookieStore = cookies()
    const availableCookies = cookieStore.getAll()
    console.log('[API GET /candidates] ========== COOKIE DEBUG ==========')
    console.log('[API GET /candidates] Available cookies:', availableCookies.map(c => c.name).join(', ') || 'NONE')
    console.log('[API GET /candidates] Total cookie count:', availableCookies.length)
    availableCookies.forEach(c => {
      console.log(`[API GET /candidates]   - ${c.name}: ${c.value.length} bytes`)
    })

    // 1. Authenticate using server client with cookies
    console.log('[GET /candidates] Creating server client with cookies...')
    const supabase = await createUserClient()

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    console.log('[GET /candidates] Auth user found:', authUser?.id || 'NONE')

    if (authError || !authUser) {
      console.log('[GET /candidates] ❌ FAILED: No authenticated user')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Query user record from database
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
      .eq('id', authUser.id)
      .single()

    if (queryError && queryError.code !== 'PGRST116') {
      console.error('[GET /candidates] Query error:', queryError.message)
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!userData) {
      console.log('[GET /candidates] ❌ FAILED: No user record found')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = {
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

    console.log('[GET /candidates] ✅ User authenticated:', user.user_id)

    // 2. Get team context
    const searchParams = request.nextUrl.searchParams
    const teamContext = await getTeamContext(user.user_id, {
      targetTeamId: searchParams.get('teamId') || undefined,
    })

    // 3. Check permissions (skip if master admin)
    if (!teamContext.isMasterAdmin) {
      const hasPermission = await checkPermission(user.user_id, 'candidates.read')
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    // 4. Query candidates with team filter
    if (!teamContext.teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID required' },
        { status: 400 }
      )
    }

    // Build query with filters
    let query = supabase
      .from('candidates')
      .select(`
        id,
        team_id,
        first_name,
        last_name,
        email,
        phone,
        status,
        location,
        skills,
        experience_years,
        current_title,
        current_employer,
        created_by,
        created_at,
        updated_at
      `)
      .eq('team_id', teamContext.teamId)
      .order('created_at', { ascending: false })

    // Apply filters
    const status = searchParams.get('status')
    if (status) {
      query = query.eq('status', status)
    }

    const search = searchParams.get('search')
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      )
    }

    const workAuth = searchParams.get('workAuthorization')
    if (workAuth) {
      query = query.eq('work_authorization', workAuth)
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    const { data: candidates, error, count } = await query

    if (error) {
      console.error('Query candidates error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch candidates' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: candidates || [],
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    })
  } catch (error) {
    console.error('Get candidates API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Validation schema for creating candidate
// MUST match the form data from NewCandidatePage (camelCase)
const createCandidateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  linkedinUrl: z.string().optional().or(z.literal('')),
  currentLocation: z.string().optional().or(z.literal('')),
  workAuthorization: z.string().optional().or(z.literal('')),
  resumeUrl: z.string().optional().or(z.literal('')),
  currentTitle: z.string().optional().or(z.literal('')),
  currentCompany: z.string().optional().or(z.literal('')),
  experienceYears: z.number().optional(),
  skills: z.array(z.string()).default([]),
  desiredSalary: z.number().optional(),
  status: z
    .enum(['new', 'screening', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn'])
    .default('new'),
  notes: z.string().optional().or(z.literal('')),
})

/**
 * POST /api/candidates
 * Create a new candidate for the team
 */
export async function POST(request: NextRequest) {
  try {
    // DEBUG: Check available cookies immediately
    const cookieStore = cookies()
    const availableCookies = cookieStore.getAll()
    console.log('[API POST /candidates] ========== COOKIE DEBUG ==========')
    console.log('[API POST /candidates] Available cookies:', availableCookies.map(c => c.name).join(', ') || 'NONE')
    console.log('[API POST /candidates] Total cookie count:', availableCookies.length)
    availableCookies.forEach(c => {
      console.log(`[API POST /candidates]   - ${c.name}: ${c.value.length} bytes`)
    })

    console.log('[POST /candidates] ========== AUTHENTICATION CHECK ==========')
    console.log('[POST /candidates] Time:', new Date().toISOString())

    // Create server client with cookies
    console.log('[POST /candidates] Creating server client with cookies...')
    const supabase = await createUserClient()

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    console.log('[POST /candidates] Auth user found:', authUser?.id || 'NONE')

    if (authError || !authUser) {
      console.log('[POST /candidates] ❌ FAILED: No authenticated user')
      console.log('[POST /candidates] ========== END ==========')
      return NextResponse.json(
        { success: false, error: 'User authentication required. Please log in again.' },
        { status: 401 }
      )
    }

    // Query user record from database
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
      .eq('id', authUser.id)
      .single()

    if (queryError && queryError.code !== 'PGRST116') {
      console.error('[POST /candidates] Query error:', queryError.message)
      return NextResponse.json(
        { success: false, error: 'User authentication required. Please log in again.' },
        { status: 401 }
      )
    }

    if (!userData) {
      console.log('[POST /candidates] ❌ FAILED: No user record found')
      return NextResponse.json(
        { success: false, error: 'User authentication required. Please log in again.' },
        { status: 401 }
      )
    }

    const user = {
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

    console.log('[POST /candidates] ✅ User authenticated:', user.user_id)

    // Ensure user_id is a string (fallback handling for type safety with auth ID mismatch)
    const userId = String(user.user_id)
    console.log('[POST /candidates] User ID (as string):', userId)

    // 2. Get team context
    const teamContext = await getTeamContext(userId)

    // 3. Check permissions (skip if master admin or local admin)
    if (!teamContext.isMasterAdmin && !teamContext.isLocalAdmin) {
      const hasPermission = await checkPermission(userId, 'candidates.create')
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    // 4. Validate request body
    const body = await request.json()
    console.log('[POST /candidates] Request body:', JSON.stringify(body).substring(0, 500))

    const validationResult = createCandidateSchema.safeParse(body)

    if (!validationResult.success) {
      console.log('[POST /candidates] Validation failed:', validationResult.error.errors[0].message)
      console.log('[POST /candidates] Validation errors:', JSON.stringify(validationResult.error.errors).substring(0, 500))
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.errors[0].message,
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 5. Create candidate
    if (!teamContext.teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID required' },
        { status: 400 }
      )
    }

    console.log('[POST /candidates] Inserting candidate:', {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      teamId: teamContext.teamId,
      userId: userId,
    })

    const { data: candidate, error } = await (supabase
      .from('candidates') as any)
      .insert({
        team_id: teamContext.teamId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email && data.email !== '' ? data.email : null,
        phone: data.phone && data.phone !== '' ? data.phone : null,
        location: data.currentLocation && data.currentLocation !== '' ? data.currentLocation : null,
        skills: data.skills && data.skills.length > 0 ? data.skills : [],
        experience_years: data.experienceYears || null,
        current_title: data.currentTitle && data.currentTitle !== '' ? data.currentTitle : null,
        current_employer: data.currentCompany && data.currentCompany !== '' ? data.currentCompany : null,
        status: data.status,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /candidates] Insert error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create candidate: ' + error.message },
        { status: 400 }
      )
    }

    console.log('[POST /candidates] ✅ Candidate created successfully:', candidate.id)
    return NextResponse.json({
      success: true,
      data: candidate,
    })
  } catch (error: any) {
    console.error('Create candidate API error:', error)
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Error details:', JSON.stringify(error).substring(0, 500))
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred: ' + (error?.message || 'Unknown error') },
      { status: 500 }
    )
  }
}
