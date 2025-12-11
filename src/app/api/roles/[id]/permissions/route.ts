/**
 * Role Permissions Management Routes
 * GET /api/roles/[id]/permissions - Get role permissions
 * PUT /api/roles/[id]/permissions - Update role permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth-server';
import { isMasterAdmin } from '@/lib/utils/role-helpers';
import { getRolePermissions, assignPermissionsToRole, getAllPermissions } from '@/lib/api/roles';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const roleId = params.id;
    const result = await getRolePermissions(roleId);

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    // Also return all available permissions for reference
    const allPermsResult = await getAllPermissions();
    const allPermissions = 'data' in allPermsResult ? allPermsResult.data : {};

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        allPermissions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/roles/[id]/permissions error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can manage roles (Master Admin or Local Admin)
    const canManageRoles = isMasterAdmin(user) ||
      (user as any).role_id?.role_name === 'Local Admin';

    if (!canManageRoles) {
      return NextResponse.json(
        { error: 'You do not have permission to manage role permissions' },
        { status: 403 }
      );
    }

    const roleId = params.id;
    const body = await request.json();
    const { permissionIds } = body;

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json(
        { error: 'permissionIds must be an array' },
        { status: 400 }
      );
    }

    const result = await assignPermissionsToRole(roleId, permissionIds);

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 200 }
    );
  } catch (error) {
    console.error('PUT /api/roles/[id]/permissions error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
