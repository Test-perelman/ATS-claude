'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';

interface Team {
  id: string;
  name: string;
  description?: string;
  is_discoverable?: boolean;
  member_count: number;
  created_at: string;
}

export default function MasterAdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_discoverable: false,
  });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/teams');
      const result = await response.json();
      if (result.success) {
        setTeams(result.data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!formData.name.trim()) {
      alert('Team name is required');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (result.success) {
        setShowCreateModal(false);
        setFormData({ name: '', description: '', is_discoverable: false });
        fetchTeams();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating team:', error);
      alert('Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Team Name' },
    { key: 'description', label: 'Description' },
    { key: 'member_count', label: 'Members' },
    { key: 'created_at', label: 'Created' },
  ];

  const formattedTeams = teams.map((team) => ({
    ...team,
    created_at: new Date(team.created_at).toLocaleDateString(),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Teams</CardTitle>
            <CardDescription>Manage all teams in the platform</CardDescription>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>Create Team</Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={formattedTeams}
            keyField="id"
            loading={loading}
            emptyMessage="No teams created yet"
            actions={(row: Team) => (
              <div className="flex gap-2 items-center">
                {row.is_discoverable && (
                  <Badge className="bg-blue-100 text-blue-800">Discoverable</Badge>
                )}
                <span className="text-xs text-gray-500">{row.member_count} members</span>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Team"
        description="Create a new team to start managing users and projects"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Name *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter team name"
              disabled={creating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              disabled={creating}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="discoverable"
              checked={formData.is_discoverable}
              onChange={(e) => setFormData({ ...formData, is_discoverable: e.target.checked })}
              disabled={creating}
              className="rounded border-gray-300"
            />
            <label htmlFor="discoverable" className="text-sm font-medium text-gray-700">
              Make team discoverable (users can find and request access)
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTeam}
              disabled={creating || !formData.name.trim()}
            >
              {creating ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}