/**
 * Interviews API Endpoint
 * GET /api/interviews - List interviews
 * POST /api/interviews - Create interview
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server'
import { getTeamContext } from '@/lib/utils/team-context'
import { checkPermission } from '@/lib/utils/permissions'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

/**
 * GET /api/interviews
 * List all interviews for the user's team
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
      const hasPermission = await checkPermission(user.user_id, 'interviews.read')
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
      .from('interviews')
      .select(`
        *,
        submission:submissions(submission_id, candidate_id, requirement_id, candidate:candidates(first_name, last_name), job_requirement:job_requirements(job_title))
      `)
      .eq('team_id', teamContext.teamId)
      .is('deleted_at', null)
      .order('scheduled_at', { ascending: false })

    const status = searchParams.get('status')
    if (status) {
      query = query.eq('status', status)
    }

    const submissionId = searchParams.get('submissionId')
    if (submissionId) {
      query = query.eq('submission_id', submissionId)
    }

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    const { data: interviews, error, count } = await query

    if (error) {
      console.error('Query interviews error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch interviews' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: interviews || [],
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    })
  } catch (error) {
    console.error('Get interviews API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

const createInterviewSchema = z.object({
  submissionId: z.string().min(1, 'Submission ID is required'),
  interviewRound: z.string().min(1, 'Interview round is required'),
  scheduledTime: z.string().min(1, 'Scheduled time is required'),
  interviewerName: z.string().optional(),
  interviewMode: z.string().optional(),
  interviewLocation: z.string().optional(),
})

/**
 * POST /api/interviews
 * Create a new interview
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
      const hasPermission = await checkPermission(user.user_id, 'interviews.create')
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const validationResult = createInterviewSchema.safeParse(body)

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

    // Map interview round to interview_type
    const interviewTypeMap: { [key: string]: string } = {
      'Phone Screen': 'phone-screen',
      'Phone': 'phone-screen',
      'Technical': 'technical',
      'Behavioral': 'behavioral',
      'Managerial': 'panel',
      'Final': 'final',
      'Client Interview': 'final',
    }

    const interviewType = interviewTypeMap[data.interviewRound] || 'other'

    const { data: interview, error } = await (supabase
      .from('interviews') as any)
      .insert({
        team_id: teamContext.teamId,
        submission_id: data.submissionId,
        interview_type: interviewType,
        interview_round: 1,
        scheduled_at: data.scheduledTime,
        location: data.interviewLocation || null,
        interviewer_names: data.interviewerName ? [data.interviewerName] : null,
        status: 'scheduled',
        created_by: user.user_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Create interview error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create interview' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: interview,
    })
  } catch (error) {
    console.error('Create interview API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
