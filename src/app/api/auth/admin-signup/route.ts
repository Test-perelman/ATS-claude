import { adminSignUp } from '@/lib/supabase/auth-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Admin signup request received:', { ...body, password: '[REDACTED]' });

    const { email, password, firstName, lastName, companyName, teamName, subscriptionTier } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !companyName) {
      console.log('Validation failed: Missing required fields', { email: !!email, password: !!password, firstName: !!firstName, lastName: !!lastName, companyName: !!companyName });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log('Validation failed: Invalid email format');
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      console.log('Validation failed: Password too short');
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    console.log('Calling adminSignUp...');
    const result = await adminSignUp({
      email,
      password,
      firstName,
      lastName,
      companyName,
      teamName: teamName || companyName,
      subscriptionTier: subscriptionTier || 'basic',
    });
    console.log('adminSignUp result:', 'error' in result ? { error: result.error } : { success: true });

    if ('error' in result && result.error) {
      console.log('Admin signup returned error:', result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (!('data' in result) || !result.data) {
      console.log('Admin signup returned no data');
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
      { error: 'An unexpected error occurred: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
