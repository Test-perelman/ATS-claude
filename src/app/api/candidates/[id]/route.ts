/**
 * Individual Candidate API Endpoint V2
 * GET /api/candidates/[id] - Get candidate by ID
 * PUT /api/candidates/[id] - Update candidate
 * DELETE /api/candidates/[id] - Soft delete candidate
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getTeamContext } from '@/lib/utils/team-context'
import { checkPermission } from '@/lib/utils/permissions'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

/**
 * GET /api/candidates/[id]
 * Get a specific candidate by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 4. Query candidate with team filter
    const supabase = await createServerClient()

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
      .eq('candidate_id', params.id)
      .is('deleted_at', null)
      .single()

    // Apply team filter (skip for master admin)
    if (!teamContext.isMasterAdmin && teamContext.teamId) {
      query = query.eq('team_id', teamContext.teamId)
    }

    const { data: candidate, error } = await query

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Candidate not found' },
          { status: 404 }
        )
      }
      console.error('Query candidate error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch candidate' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: candidate,
    })
  } catch (error) {
    console.error('Get candidate API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Validation schema for updating candidate
const updateCandidateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  status: z
    .enum(['new', 'screening', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn'])
    .optional(),
  currentLocation: z.string().optional(),
  preferredLocations: z.array(z.string()).optional(),
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
  skills: z.array(z.string()).optional(),
  experienceYears: z.number().min(0).optional(),
  currentTitle: z.string().optional(),
  currentCompany: z.string().optional(),
  desiredSalary: z.number().min(0).optional(),
  availableFrom: z.string().optional(),
  notes: z.string().optional(),
})

/**
 * PUT /api/candidates/[id]
 * Update a specific candidate
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      const hasPermission = await checkPermission(user.user_id, 'candidates.update')
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    // 4. Validate request body
    const body = await request.json()
    const validationResult = updateCandidateSchema.safeParse(body)

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

    // 5. Update candidate
    const supabase = await createServerClient()

    // Build update object
    const updateData: any = {
      updated_by: user.user_id,
      updated_at: new Date().toISOString(),
    }

    if (data.firstName !== undefined) updateData.first_name = data.firstName
    if (data.lastName !== undefined) updateData.last_name = data.lastName
    if (data.email !== undefined) updateData.email = data.email || null
    if (data.phone !== undefined) updateData.phone = data.phone || null
    if (data.status !== undefined) updateData.status = data.status
    if (data.currentLocation !== undefined)
      updateData.current_location = data.currentLocation || null
    if (data.preferredLocations !== undefined)
      updateData.preferred_locations = data.preferredLocations
    if (data.workAuthorization !== undefined)
      updateData.work_authorization = data.workAuthorization || null
    if (data.linkedinUrl !== undefined) updateData.linkedin_url = data.linkedinUrl || null
    if (data.resumeUrl !== undefined) updateData.resume_url = data.resumeUrl || null
    if (data.skills !== undefined) updateData.skills = data.skills
    if (data.experienceYears !== undefined)
      updateData.experience_years = data.experienceYears || null
    if (data.currentTitle !== undefined) updateData.current_title = data.currentTitle || null
    if (data.currentCompany !== undefined)
      updateData.current_company = data.currentCompany || null
    if (data.desiredSalary !== undefined) updateData.desired_salary = data.desiredSalary || null
    if (data.availableFrom !== undefined) updateData.available_from = data.availableFrom || null
    if (data.notes !== undefined) updateData.notes = data.notes || null

    let query = supabase
      .from('candidates')
      .update(updateData)
      .eq('candidate_id', params.id)
      .is('deleted_at', null)

    // Apply team filter (skip for master admin)
    if (!teamContext.isMasterAdmin && teamContext.teamId) {
      query = query.eq('team_id', teamContext.teamId)
    }

    const { data: candidate, error } = await query.select().single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Candidate not found' },
          { status: 404 }
        )
      }
      console.error('Update candidate error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update candidate' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: candidate,
    })
  } catch (error) {
    console.error('Update candidate API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/candidates/[id]
 * Soft delete a candidate
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      const hasPermission = await checkPermission(user.user_id, 'candidates.delete')
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    // 4. Soft delete candidate
    const supabase = await createServerClient()

    let query = supabase
      .from('candidates')
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: user.user_id,
      })
      .eq('candidate_id', params.id)
      .is('deleted_at', null)

    // Apply team filter (skip for master admin)
    if (!teamContext.isMasterAdmin && teamContext.teamId) {
      query = query.eq('team_id', teamContext.teamId)
    }

    const { error } = await query

    if (error) {
      console.error('Delete candidate error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete candidate' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Candidate deleted successfully',
    })
  } catch (error) {
    console.error('Delete candidate API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
