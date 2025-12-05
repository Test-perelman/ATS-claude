import { adminSignUp } from '@/lib/supabase/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, password, firstName, lastName, companyName, teamName, subscriptionTier } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const result = await adminSignUp({
      email,
      password,
      firstName,
      lastName,
      companyName,
      teamName: teamName || companyName,
      subscriptionTier: subscriptionTier || 'basic',
    });

    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (!('data' in result) || !result.data) {
      return NextResponse.json({ error: 'Failed to create admin account' }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Admin account created successfully',
        data: {
          user: result.data.user,
          team: result.data.team,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Admin signup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
