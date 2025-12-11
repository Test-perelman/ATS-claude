'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useCanManageRoles } from '@/lib/utils/permission-hooks';
import type { Database } from '@/types/database';

type Role = Database['public']['Tables']['roles']['Row'];

interface RoleWithStats extends Role {
  userCount?: number;
  permissionCount?: number;
}

const BUILT_IN_ROLES = [
  'Master Admin',
  'Local Admin',
  'Sales Manager',
  'Manager',
  'Recruiter',
  'Finance',
  'View-Only',
];

export default function RolesPage() {
  const router = useRouter();
  const canManageRoles = useCanManageRoles();
  const [roles, setRoles] = useState<RoleWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Check permission before loading
    if (!canManageRoles) {
      setError('You do not have permission to manage roles');
      setLoading(false);
      return;
    }

    loadRoles();
  }, [canManageRoles]);

  async function loadRoles() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/roles', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setError('Failed to load roles');
        return;
      }

      const result = await response.json();
      if (!result.success) {
        setError(result.error || 'Failed to load roles');
        return;
      }

      // Load stats for each role
      const rolesWithStats = await Promise.all(
        (result.data || []).map(async (role: any) => {
          try {
            const statsResponse = await fetch(`/api/roles/${role.role_id}/stats`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (statsResponse.ok) {
              const statsResult = await statsResponse.json();
              return {
                ...role,
                ...statsResult.data,
              };
            }
          } catch (err) {
            console.error(`Error loading stats for role ${role.role_id}:`, err);
          }
          return role;
        })
      );

      setRoles(rolesWithStats);
    } catch (err) {
      console.error('Error loading roles:', err);
      setError('Failed to load roles');
    } finally {
      setLoading(false);
    }
  }

  const filteredRoles = roles.filter((role) =>
    role.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canManageRoles) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles Management</h1>
        </div>

        <Card className="border border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">
              You do not have permission to manage roles. Only Master Admin and Local Admin can access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles Management</h1>
          <p className="mt-2 text-gray-600">Create and configure roles and permissions</p>
        </div>
        <Button onClick={() => router.push('/settings/roles/new')}>
          + New Role
        </Button>
      </div>

      {/* Search Bar */}
      <div>
        <input
          type="text"
          placeholder="Search roles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">{error}</p>
            <Button
              onClick={loadRoles}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading roles...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roles Table */}
      {!loading && !error && (
        <>
          {filteredRoles.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="py-8 text-center text-gray-500">
                  <p>No roles found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Role Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Description
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                      Users
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoles.map((role) => (
                    <tr key={role.role_id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
                          {role.role_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {role.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        <span className="inline-flex items-center justify-center rounded-full bg-blue-100 h-8 w-8 text-blue-700 font-semibold">
                          {role.userCount || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        <span className="text-gray-600">{role.permissionCount || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <Link href={`/settings/roles/${role.role_id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                          >
                            Edit
                          </Button>
                        </Link>

                        {!BUILT_IN_ROLES.includes(role.role_name) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 border-red-200"
                            onClick={() => handleDelete(role.role_id)}
                          >
                            Delete
                          </Button>
                        )}

                        {BUILT_IN_ROLES.includes(role.role_name) && (
                          <span className="text-xs text-gray-500">Built-in</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Info Box */}
      <Card className="border border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base text-blue-900">About Roles</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800">
          <ul className="list-inside list-disc space-y-1">
            <li>Built-in roles cannot be deleted</li>
            <li>Custom roles can be created and deleted</li>
            <li>Each role defines a set of permissions</li>
            <li>Users are assigned roles to control their access</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );

  async function handleDelete(roleId: string) {
    const role = roles.find((r) => r.role_id === roleId);
    if (!role) return;

    if (!confirm(`Are you sure you want to delete the "${role.role_name}" role?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete role');
        return;
      }

      // Remove from list
      setRoles(roles.filter((r) => r.role_id !== roleId));
    } catch (err) {
      console.error('Error deleting role:', err);
      setError('Failed to delete role');
    }
  }
}
