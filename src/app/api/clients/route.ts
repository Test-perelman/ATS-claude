/**
 * Clients API Endpoint
 * GET /api/clients - List clients
 * POST /api/clients - Create client
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server'
import { getTeamContext } from '@/lib/utils/team-context'
import { checkPermission } from '@/lib/utils/permissions'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

/**
 * GET /api/clients
 * List all clients for the user's team
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
      const hasPermission = await checkPermission(user.user_id, 'clients.read')
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
      .from('clients')
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
        `client_name.ilike.%${search}%,primary_contact_email.ilike.%${search}%`
      )
    }

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    const { data: clients, error, count } = await query

    if (error) {
      console.error('Query clients error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch clients' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: clients || [],
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    })
  } catch (error) {
    console.error('Get clients API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

const createClientSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().optional(),
  status: z.string().default('active'),
  notes: z.string().optional(),
})

/**
 * POST /api/clients
 * Create a new client
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
      const hasPermission = await checkPermission(user.user_id, 'clients.create')
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const validationResult = createClientSchema.safeParse(body)

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

    const { data: client, error } = await (supabase
      .from('clients') as any)
      .insert({
        team_id: teamContext.teamId,
        client_name: data.clientName,
        industry: data.industry || null,
        website: data.website || null,
        primary_contact_name: data.primaryContactName || null,
        primary_contact_email: data.primaryContactEmail || null,
        primary_contact_phone: data.primaryContactPhone || null,
        status: data.status,
        notes: data.notes || null,
        created_by: user.user_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Create client error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create client' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: client,
    })
  } catch (error) {
    console.error('Create client API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
