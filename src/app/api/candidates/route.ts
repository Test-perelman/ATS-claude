/**
 * Candidates API Endpoint V2
 * GET /api/candidates - List candidates (team-scoped)
 * POST /api/candidates - Create candidate
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'
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
        candidate_id,
        team_id,
        first_name,
        last_name,
        email,
        phone,
        status,
        current_location,
        preferred_locations,
        work_authorization,
        linkedin_url,
        resume_url,
        skills,
        experience_years,
        current_title,
        current_company,
        desired_salary,
        available_from,
        notes,
        created_by,
        updated_by,
        created_at,
        updated_at,
        deleted_at
      `)
      .eq('team_id', teamContext.teamId)
      .is('deleted_at', null)
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
const createCandidateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  status: z
    .enum(['new', 'screening', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn'])
    .default('new'),
  currentLocation: z.string().optional(),
  preferredLocations: z.array(z.string()).default([]),
  workAuthorization: z
    .enum([
      'us_citizen',
      'green_card',
      'h1b',
      'opt',
      'cpt',
      'ead',
      'tn',
      'other',
      'requires_sponsorship',
    ])
    .optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  resumeUrl: z.string().url().optional().or(z.literal('')),
  skills: z.array(z.string()).default([]),
  experienceYears: z.number().min(0).optional(),
  currentTitle: z.string().optional(),
  currentCompany: z.string().optional(),
  desiredSalary: z.number().min(0).optional(),
  availableFrom: z.string().optional(),
  notes: z.string().optional(),
})

/**
 * POST /api/candidates
 * Create a new candidate for the team
 */
export async function POST(request: NextRequest) {
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

    const { data: candidate, error } = await supabase
      .from('candidates')
      .insert({
        team_id: teamContext.teamId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        status: data.status,
        current_location: data.currentLocation || null,
        preferred_locations: data.preferredLocations,
        work_authorization: data.workAuthorization || null,
        linkedin_url: data.linkedinUrl || null,
        resume_url: data.resumeUrl || null,
        skills: data.skills,
        experience_years: data.experienceYears || null,
        current_title: data.currentTitle || null,
        current_company: data.currentCompany || null,
        desired_salary: data.desiredSalary || null,
        available_from: data.availableFrom || null,
        notes: data.notes || null,
        created_by: user.user_id,
        updated_by: user.user_id,
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
