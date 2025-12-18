/**
 * Vendors API Endpoint
 * GET /api/vendors - List vendors
 * POST /api/vendors - Create vendor
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth-server'
import { getTeamContext } from '@/lib/utils/team-context'
import { checkPermission } from '@/lib/utils/permissions'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

/**
 * GET /api/vendors
 * List all vendors for the user's team
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
      const hasPermission = await checkPermission(user.user_id, 'vendors.read')
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
      .from('vendors')
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
        `vendor_name.ilike.%${search}%,email.ilike.%${search}%`
      )
    }

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    query = query.range(offset, offset + limit - 1)

    const { data: vendors, error, count } = await query

    if (error) {
      console.error('Query vendors error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch vendors' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: vendors || [],
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    })
  } catch (error) {
    console.error('Get vendors API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

const createVendorSchema = z.object({
  vendorName: z.string().min(1, 'Vendor name is required'),
  companyName: z.string().min(1, 'Company name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  status: z.string().default('active'),
  notes: z.string().optional(),
})

/**
 * POST /api/vendors
 * Create a new vendor
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
      const hasPermission = await checkPermission(user.user_id, 'vendors.create')
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const validationResult = createVendorSchema.safeParse(body)

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

    const { data: vendor, error } = await (supabase
      .from('vendors') as any)
      .insert({
        team_id: teamContext.teamId,
        vendor_name: data.vendorName,
        company_name: data.companyName,
        email: data.email,
        phone: data.phone || null,
        website: data.website || null,
        status: data.status,
        notes: data.notes || null,
        created_by: user.user_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Create vendor error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create vendor' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: vendor,
    })
  } catch (error) {
    console.error('Create vendor API error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
