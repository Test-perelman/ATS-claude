'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function TeamMembersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      setLoading(true);
      const response = await fetch('/api/teams/members', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setError('Failed to load team members');
        return;
      }

      const result = await response.json();
      if (result.success) {
        setMembers(result.data || []);
      } else {
        setError(result.error || 'Failed to load team members');
      }
    } catch (err) {
      setError('Failed to load team members');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/settings" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
          <p className="mt-2 text-gray-600">Manage your team's members and their roles</p>
        </div>
        <Link href="/settings/members/invite">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            + Invite Member
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No team members yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {members.map((member) => (
                    <tr key={member.user_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {member.username}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
                      <td className="px-4 py-3 text-sm">
                        {member.role_id ? (
                          <Badge variant="info">{member.role_id.role_name}</Badge>
                        ) : (
                          <span className="text-gray-500 text-xs">No role</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge
                          variant={member.status === 'active' ? 'success' : 'warning'}
                        >
                          {member.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
