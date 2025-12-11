/**
 * Individual Role Management Routes
 * GET /api/roles/[id] - Get role with permissions
 * PUT /api/roles/[id] - Update role
 * DELETE /api/roles/[id] - Delete role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth-server';
import { isMasterAdmin } from '@/lib/utils/role-helpers';
import { getRoleById, updateRole, deleteRole } from '@/lib/api/roles';

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
    const result = await getRoleById(roleId);

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/roles/[id] error:', error);
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

    // Only Master Admin can update roles
    if (!isMasterAdmin(user)) {
      return NextResponse.json(
        { error: 'Only Master Admin can update roles' },
        { status: 403 }
      );
    }

    const roleId = params.id;
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Role name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const result = await updateRole(roleId, {
      role_name: name.trim(),
      role_description: description || null,
    });

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
    console.error('PUT /api/roles/[id] error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Only Master Admin can delete roles
    if (!isMasterAdmin(user)) {
      return NextResponse.json(
        { error: 'Only Master Admin can delete roles' },
        { status: 403 }
      );
    }

    const roleId = params.id;

    // Prevent deleting built-in roles
    const builtInRoles = [
      'Master Admin',
      'Local Admin',
      'Sales Manager',
      'Manager',
      'Recruiter',
      'Finance',
      'View-Only',
    ];

    // Fetch role to check its name
    const roleResult = await getRoleById(roleId);
    if ('data' in roleResult && roleResult.data && builtInRoles.includes((roleResult.data.role as any).role_name)) {
      return NextResponse.json(
        { error: 'Cannot delete built-in roles' },
        { status: 400 }
      );
    }

    const result = await deleteRole(roleId);

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Role deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE /api/roles/[id] error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
