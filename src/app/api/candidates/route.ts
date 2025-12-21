/**
 * Candidates API Endpoint V2
 * GET /api/candidates - List candidates (team-scoped)
 * POST /api/candidates - Create candidate
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server'
import { getTeamContext } from '@/lib/utils/team-context'
import { checkPermission } from '@/lib/utils/permissions'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

/**
 * GET /api/candidates
 * List all candidates for the user's team
 * Supports pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

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

    const supabase = await createServerClient()

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
    console.log('[POST /candidates] Checking authentication...')
    // 1. Authenticate
    const user = await getCurrentUser()
    if (!user) {
      console.log('[POST /candidates] User not authenticated')
      return NextResponse.json(
        { success: false, error: 'User authentication required. Please log in again.' },
        { status: 401 }
      )
    }

    console.log('[POST /candidates] User authenticated:', user.user_id)

    // 2. Get team context
    const teamContext = await getTeamContext(user.user_id)

    // 3. Check permissions (skip if master admin or local admin)
    if (!teamContext.isMasterAdmin && !teamContext.isLocalAdmin) {
      const hasPermission = await checkPermission(user.user_id, 'candidates.create')
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    // 4. Validate request body
    const body = await request.json()
    const validationResult = createCandidateSchema.safeParse(body)

    if (!validationResult.success) {
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

    const supabase = await createServerClient()

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
        created_by: user.user_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Create candidate error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create candidate' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: candidate,
    })
  } catch (error) {
    console.error('Create candidate API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
