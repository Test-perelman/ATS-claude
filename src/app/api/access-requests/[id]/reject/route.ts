import { getCurrentUserTeamId } from '@/lib/supabase/auth-server';
import { rejectAccessRequest } from '@/lib/api/teams';
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

    const result = await rejectAccessRequest(params.id, teamId);

    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Access request rejected successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reject access request error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
