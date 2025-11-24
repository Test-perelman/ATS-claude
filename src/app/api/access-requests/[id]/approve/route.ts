import { getCurrentUserTeamId } from '@/lib/supabase/auth';
import { approveAccessRequest } from '@/lib/api/teams';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = await getCurrentUserTeamId();

    if (!teamId) {
      return NextResponse.json(
        { error: 'User not associated with a team' },
        { status: 401 }
      );
    }

    const result = await approveAccessRequest(params.id, teamId);

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
    console.error('Approve access request error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
