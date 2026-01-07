'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/Select';

interface User {
  id: string;
  email: string;
  team_id?: string;
  is_master_admin: boolean;
  role?: {
    id: string;
    name: string;
    is_admin: boolean;
  };
  teams?: {
    id: string;
    name: string;
  };
  created_at: string;
}

export default function MasterAdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState('');
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, [teamFilter]);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/admin/teams');
      const result = await response.json();
      if (result.success) {
        setTeams(result.data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const url = teamFilter
        ? `/api/admin/users?teamId=${teamFilter}`
        : '/api/admin/users';
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'teamName', label: 'Team' },
    { key: 'roleName', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Created' },
  ];

  const formattedUsers = users.map((user) => ({
    ...user,
    teamName: user.is_master_admin ? 'N/A' : (user.teams?.name || 'No Team'),
    roleName: user.is_master_admin ? 'Master Admin' : (user.role?.name || 'No Role'),
    status: user.is_master_admin ? 'Master Admin' : 'User',
    created_at: new Date(user.created_at).toLocaleDateString(),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>View and manage all users across the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-40"
            >
              <option value="">All Teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={formattedUsers}
            keyField="id"
            loading={loading}
            emptyMessage={teamFilter ? 'No users in this team' : 'No users found'}
            actions={(row: any) => (
              <div className="flex gap-2 items-center">
                {row.is_master_admin && (
                  <Badge className="bg-purple-100 text-purple-800">Master Admin</Badge>
                )}
                {row.role?.is_admin && !row.is_master_admin && (
                  <Badge className="bg-blue-100 text-blue-800">Admin</Badge>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}