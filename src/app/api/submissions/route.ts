/**
 * Submissions API Endpoint
 * GET /api/submissions - List submissions
 * POST /api/submissions - Create submission
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server'
import { getTeamContext } from '@/lib/utils/team-context'
import { checkPermission } from '@/lib/utils/permissions'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

/**
 * GET /api/submissions
 * List all submissions for the user's team
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
      const hasPermission = await checkPermission(user.user_id, 'submissions.read')
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
      .from('submissions')
      .select(`
        *,
        candidate:candidates(candidate_id, first_name, last_name, email),
        job_requirement:job_requirements(requirement_id, job_title)
      `)
      .eq('team_id', teamContext.teamId)
      .is('deleted_at', null)
      .order('submitted_at', { ascending: false })

    const status = searchParams.get('status')
    if (status) {
      query = query.eq('status', status)
    }

    const candidateId = searchParams.get('candidateId')
    if (candidateId) {
      query = query.eq('candidate_id', candidateId)
    }

    const requirementId = searchParams.get('requirementId')
    if (requirementId) {
      query = query.eq('requirement_id', requirementId)
    }

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    const { data: submissions, error, count } = await query

    if (error) {
      console.error('Query submissions error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch submissions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: submissions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    })
  } catch (error) {
    console.error('Get submissions API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

const createSubmissionSchema = z.object({
  candidateId: z.string().min(1, 'Candidate ID is required'),
  jobId: z.string().min(1, 'Job ID is required'),
  submissionStatus: z.string().default('submitted'),
  billRateOffered: z.number().min(0).optional(),
  payRateOffered: z.number().min(0).optional(),
  margin: z.number().min(0).optional(),
  notes: z.string().optional(),
  submittedAt: z.string().optional(),
})

/**
 * POST /api/submissions
 * Create a new submission
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
      const hasPermission = await checkPermission(user.user_id, 'submissions.create')
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const validationResult = createSubmissionSchema.safeParse(body)

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

    const { data: submission, error } = await (supabase
      .from('submissions') as any)
      .insert({
        team_id: teamContext.teamId,
        candidate_id: data.candidateId,
        requirement_id: data.jobId,
        status: data.submissionStatus,
        submitted_rate: data.billRateOffered || null,
        submitted_rate_currency: 'USD',
        notes: data.notes || null,
        submitted_by: user.user_id,
        submitted_at: data.submittedAt || new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Create submission error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create submission' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: submission,
    })
  } catch (error) {
    console.error('Create submission API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
