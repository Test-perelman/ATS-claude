/**
 * Requirements API Endpoint
 * GET /api/requirements - List job requirements
 * POST /api/requirements - Create job requirement
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server'
import { getTeamContext } from '@/lib/utils/team-context'
import { checkPermission } from '@/lib/utils/permissions'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

/**
 * GET /api/requirements
 * List all requirements for the user's team
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const teamContext = await getTeamContext(user.user_id, {
      targetTeamId: searchParams.get('teamId') || undefined,
    })

    if (!teamContext.isMasterAdmin) {
      const hasPermission = await checkPermission(user.user_id, 'requirements.read')
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    if (!teamContext.teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID required' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    let query = supabase
      .from('job_requirements')
      .select('*')
      .eq('team_id', teamContext.teamId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    const status = searchParams.get('status')
    if (status) {
      query = query.eq('status', status)
    }

    const search = searchParams.get('search')
    if (search) {
      query = query.or(
        `job_title.ilike.%${search}%,job_description.ilike.%${search}%`
      )
    }

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    const { data: requirements, error, count } = await query

    if (error) {
      console.error('Query requirements error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch requirements' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: requirements || [],
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    })
  } catch (error) {
    console.error('Get requirements API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

const createRequirementSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  jobDescription: z.string().optional(),
  skillsRequired: z.string().optional(),
  clientId: z.string().optional(),
  vendorId: z.string().optional(),
  location: z.string().optional(),
  workMode: z.string().optional(),
  billRateRangeMin: z.number().min(0).optional(),
  billRateRangeMax: z.number().min(0).optional(),
  employmentType: z.string().optional(),
  duration: z.string().optional(),
  priority: z.string().optional(),
  receivedDate: z.string().optional(),
  expiryDate: z.string().optional(),
  status: z.string().default('open'),
  notes: z.string().optional(),
})

/**
 * POST /api/requirements
 * Create a new job requirement
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const teamContext = await getTeamContext(user.user_id)

    if (!teamContext.isMasterAdmin && !teamContext.isLocalAdmin) {
      const hasPermission = await checkPermission(user.user_id, 'requirements.create')
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const validationResult = createRequirementSchema.safeParse(body)

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

    if (!teamContext.teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID required' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    const { data: requirement, error } = await (supabase
      .from('job_requirements') as any)
      .insert({
        team_id: teamContext.teamId,
        job_title: data.jobTitle,
        job_description: data.jobDescription || null,
        required_skills: data.skillsRequired ? data.skillsRequired.split(',').map((s: string) => s.trim()) : null,
        client_id: data.clientId || null,
        location: data.location || null,
        remote_type: data.workMode || null,
        min_salary: data.billRateRangeMin || null,
        max_salary: data.billRateRangeMax || null,
        employment_type: data.employmentType || 'full-time',
        priority: data.priority || null,
        status: data.status,
        notes: data.notes || null,
        created_by: user.user_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Create requirement error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create requirement' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: requirement,
    })
  } catch (error) {
    console.error('Create requirement API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
