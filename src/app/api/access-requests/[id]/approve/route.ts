import { approveAccessRequest } from '@/lib/api/teams';
import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/supabase/user-server';

/**
 * Approve Access Request
 * POST /api/access-requests/[id]/approve
 *
 * INVARIANT: Requires authenticated user with admin role
 * Enforced via requireCurrentUser() as first executable line
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // INVARIANT: Require authenticated user
    const user = await requireCurrentUser();

    // INVARIANT: Verify user has team
    if (!user.team_id) {
      return NextResponse.json(
        { error: 'User not associated with a team' },
        { status: 400 }
      );
    }

    // INVARIANT: Verify user is team admin
    if (!user.is_master_admin && !(user.role as any)?.is_admin_role) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const result = await approveAccessRequest(params.id, user.team_id);

    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Access request approved successfully',
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
    console.error('Approve access request error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
