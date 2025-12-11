/**
 * Create Master Admin API Endpoint
 * POST /api/admin/create-master-admin
 *
 * Creates a system administrator with global access.
 * This endpoint should be secured and only accessible by existing master admins.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createMasterAdmin, getCurrentUser } from '@/lib/supabase/auth'
import { z } from 'zod'

// Validation schema
const masterAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
})

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate requesting user
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    // 2. Verify requesting user is a master admin
    if (!currentUser.is_master_admin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Only master admins can create other master admins',
        },
        { status: 403 }
      )
    }

    // 3. Parse and validate request body
    const body = await request.json()
    const validationResult = masterAdminSchema.safeParse(body)

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

    // 4. Create master admin
    const result = await createMasterAdmin({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to create master admin',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    console.error('Create master admin API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
