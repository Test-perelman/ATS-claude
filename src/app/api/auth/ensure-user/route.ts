import { ensureUserRecord } from '@/lib/auth-actions';

export async function POST() {
  try {
    const result = await ensureUserRecord();

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[ensure-user] Error:', error);
    return Response.json(
      { success: false, error: 'Failed to ensure user record' },
      { status: 500 }
    );
  }
}
