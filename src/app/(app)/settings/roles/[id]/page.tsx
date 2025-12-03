'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useCanManageRoles } from '@/lib/utils/permission-hooks';
import { getRoleById, updateRole, getAllPermissions, assignPermissionsToRole } from '@/lib/api/roles';
import type { Database } from '@/types/database';

type Role = Database['public']['Tables']['roles']['Row'];
type Permission = Database['public']['Tables']['permissions']['Row'];

export default function RoleEditorPage() {
  const router = useRouter();
  const params = useParams();
  const roleId = params.id as string;
  const canManageRoles = useCanManageRoles();

  const [role, setRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [allPermissions, setAllPermissions] = useState<Record<string, Permission[]>>({});
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isNewRole = roleId === 'new';

  useEffect(() => {
    if (!canManageRoles) {
      setError('You do not have permission to manage roles');
      setLoading(false);
      return;
    }

    loadData();
  }, [canManageRoles]);

  async function loadData() {
    try {
      setLoading(true);

      // Load all permissions
      const permResult = await getAllPermissions();
      if ('data' in permResult) {
        setAllPermissions(permResult.data as any);
      }

      // Load role if editing
      if (!isNewRole) {
        const roleResult = await getRoleById(roleId);

        if ('error' in roleResult) {
          setError(roleResult.error);
          return;
        }

        const roleData = roleResult.role as Role;
        setRole(roleData);
        setRoleName(roleData.role_name);
        setRoleDescription(roleData.role_description || '');

        // Set selected permissions
        const selectedPerms = new Set<string>();
        if (roleResult.permissions) {
          (roleResult.permissions as any[]).forEach((rp) => {
            selectedPerms.add(rp.permission?.permission_id || '');
          });
        }
        setSelectedPermissions(selectedPerms);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const handlePermissionToggle = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleSelectAllInModule = (modulePermissions: Permission[]) => {
    const newSelected = new Set(selectedPermissions);
    const allSelected = modulePermissions.every((p) =>
      newSelected.has(p.permission_id)
    );

    modulePermissions.forEach((p) => {
      if (allSelected) {
        newSelected.delete(p.permission_id);
      } else {
        newSelected.add(p.permission_id);
      }
    });

    setSelectedPermissions(newSelected);
  };

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (!roleName.trim()) {
        setError('Role name is required');
        return;
      }

      // If new role, create it first
      let finalRoleId = roleId;
      if (isNewRole) {
        const response = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roleName.trim(),
            description: roleDescription.trim() || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Failed to create role');
          return;
        }

        const data = await response.json();
        finalRoleId = data.data.role_id;
      } else {
        // Update existing role
        const response = await fetch(`/api/roles/${roleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roleName.trim(),
            description: roleDescription.trim() || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Failed to update role');
          return;
        }
      }

      // Update permissions
      const permResponse = await fetch(`/api/roles/${finalRoleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissionIds: Array.from(selectedPermissions),
        }),
      });

      if (!permResponse.ok) {
        const data = await permResponse.json();
        setError(data.error || 'Failed to update permissions');
        return;
      }

      setSuccess(
        isNewRole
          ? 'Role created successfully'
          : 'Role updated successfully'
      );

      // Redirect after success
      setTimeout(() => {
        router.push('/settings/roles');
      }, 1500);
    } catch (err) {
      console.error('Error saving role:', err);
      setError('Failed to save role');
    } finally {
      setSaving(false);
    }
  }

  if (!canManageRoles) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {isNewRole ? 'Create Role' : 'Edit Role'}
        </h1>

        <Card className="border border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">
              You do not have permission to manage roles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {isNewRole ? 'Create Role' : 'Edit Role'}
        </h1>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isNewRole ? 'Create New Role' : `Edit Role: ${roleName}`}
        </h1>
        <p className="mt-2 text-gray-600">
          {isNewRole
            ? 'Create a new role and assign permissions'
            : 'Update role details and manage permissions'}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {success && (
        <Card className="border border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-green-700">{success}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Role Details */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Role Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name
                </label>
                <Input
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g., Sales Manager"
                  disabled={!isNewRole && saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="Describe this role's purpose"
                  rows={4}
                  disabled={!isNewRole && saving}
                />
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? 'Saving...' : isNewRole ? 'Create Role' : 'Save Changes'}
                </Button>
                <Button
                  onClick={() => router.push('/settings/roles')}
                  variant="outline"
                  className="w-full mt-2"
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permissions */}
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(allPermissions).map(([module, permissions]) => (
            <Card key={module}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base">{module}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleSelectAllInModule(permissions as Permission[])
                  }
                >
                  {permissions?.every((p) =>
                    selectedPermissions.has(p.permission_id)
                  )
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(permissions as Permission[]).map((permission) => (
                    <label
                      key={permission.permission_id}
                      className="flex items-start cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.has(
                          permission.permission_id
                        )}
                        onChange={() =>
                          handlePermissionToggle(permission.permission_id)
                        }
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {permission.permission_key}
                        </p>
                        {permission.permission_description && (
                          <p className="text-xs text-gray-500">
                            {permission.permission_description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
