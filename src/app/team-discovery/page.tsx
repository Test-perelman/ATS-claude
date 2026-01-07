'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface DiscoverableTeam {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
}

export default function TeamDiscoveryPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<DiscoverableTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    fetchDiscoverableTeams();
  }, []);

  const fetchDiscoverableTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams/discoverable', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Failed to load teams');
        return;
      }

      setTeams(data.data || []);
    } catch (err) {
      setError('Failed to load teams');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (teamId: string, teamName: string) => {
    try {
      setRequesting(teamId);
      setError('');

      const response = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requested_team_id: teamId,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Failed to submit request');
        return;
      }

      // Redirect to confirmation page
      router.push(`/access-request?team=${encodeURIComponent(teamName)}`);
    } catch (err) {
      setError('Failed to submit request');
      console.error('Error:', err);
    } finally {
      setRequesting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Discover Teams</h1>
          <p className="text-purple-100">Join a team and start collaborating</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <Card>
            <CardContent className="pt-8 text-center">
              <p className="text-gray-500 mb-4">No discoverable teams yet.</p>
              <p className="text-sm text-gray-400">
                Contact your platform administrator to create or discover teams.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Card key={team.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  {team.description && (
                    <CardDescription className="line-clamp-2">{team.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-3 mb-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">{team.member_count}</span> members
                    </div>
                    <div className="text-xs text-gray-500">
                      Created {new Date(team.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
                <div className="px-6 pb-6 pt-0">
                  <Button
                    onClick={() => handleRequestAccess(team.id, team.name)}
                    disabled={requesting === team.id}
                    className="w-full"
                  >
                    {requesting === team.id ? 'Requesting...' : 'Request Access'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-600">
          <p>
            Want to switch teams?{' '}
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              Go to dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
