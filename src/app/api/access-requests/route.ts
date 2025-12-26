import { requestTeamAccess } from '@/lib/supabase/auth-server';
import { getPendingAccessRequests } from '@/lib/api/teams';
import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/supabase/user-server';

/**
 * Access Requests Endpoint
 * POST: Create a new access request (AUTHENTICATED USER ONLY)
 * GET: Get pending access requests (ADMIN ONLY)
 *
 * INVARIANT: Both methods require authentication
 * Enforced via requireCurrentUser() as first executable line
 */

export async function POST(request: NextRequest) {
  try {
    // INVARIANT: Require authenticated user
    const user = await requireCurrentUser();

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
    // requireCurrentUser() throws 401 if not authenticated
    if (error instanceof Error && (error as any).status === 401) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Create access request error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // INVARIANT: Require authenticated user (will validate admin role below)
    const user = await requireCurrentUser();

    // INVARIANT: Admin-only endpoint
    if (!user.is_master_admin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

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
    // requireCurrentUser() throws 401 if not authenticated
    if (error instanceof Error && (error as any).status === 401) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Get access requests error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
