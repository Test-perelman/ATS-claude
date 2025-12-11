/**
 * Team Signup API Endpoint
 * POST /api/auth/team-signup
 *
 * Creates a new team with the first admin user.
 * Workflow:
 * 1. Create Supabase auth user
 * 2. Create team
 * 3. Clone all role templates
 * 4. Assign user as Local Admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { teamSignUp } from '@/lib/supabase/auth'
import { z } from 'zod'

// Validation schema
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyName: z.string().min(1, 'Company name is required'),
  teamName: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = signupSchema.safeParse(body)

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

    // Perform team signup
    const result = await teamSignUp({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      teamName: data.teamName,
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Team signup failed',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        user: result.data.user,
        team: result.data.team,
      },
    })
  } catch (error) {
    console.error('Team signup API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
