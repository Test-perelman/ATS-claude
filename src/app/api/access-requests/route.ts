import { requestTeamAccess } from '@/lib/supabase/auth-server';
import { getPendingAccessRequests } from '@/lib/api/teams';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST: Create a new access request
 * GET: Get pending access requests for admin
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, firstName, lastName, companyEmail, reason, requestedTeamId } = body;

    // Validate required fields
    if (!email || !firstName || !lastName || !companyEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await requestTeamAccess({
      email,
      firstName,
      lastName,
      companyEmail,
      reason,
      requestedTeamId,
    });

    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (!('data' in result) || !result.data) {
      return NextResponse.json({ error: 'Failed to create access request' }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Access request submitted successfully',
        data: result.data.request,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create access request error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Only return pending requests - for admin dashboard
    const result = await getPendingAccessRequests();

    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get access requests error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
