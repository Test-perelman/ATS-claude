'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { TeamFilter } from '@/components/ui/TeamFilter';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { formatDate, formatPhoneNumber } from '@/lib/utils/format';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function CandidatesPage() {
  const { user, isMasterAdmin, teamId } = useAuth();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [benchFilter, setBenchFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  useEffect(() => {
    if (user?.user_id) {
      loadCandidates();
    }
  }, [search, benchFilter, teamFilter, isMasterAdmin, teamId, user]);

  async function loadCandidates() {
    if (!user?.user_id) {
      console.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (benchFilter) params.append('status', benchFilter);
      if (teamFilter) params.append('teamId', teamFilter);

      const response = await fetch(`/api/candidates?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error loading candidates:', response.statusText);
        setCandidates([]);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setCandidates(result.data || []);
      } else {
        console.error('Error loading candidates:', result.error);
        setCandidates([]);
      }
    } catch (error) {
      console.error('Error loading candidates:', error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Candidates</h1>
          <p className="mt-2 text-gray-600">Manage your consultant database</p>
        </div>
        <Link href="/candidates/new">
          <Button>
            ➕ Add Candidate
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Input
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={benchFilter}
              onChange={(e) => setBenchFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'available', label: 'Available' },
                { value: 'on_bench', label: 'On Bench' },
                { value: 'placed', label: 'Placed' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            {isMasterAdmin && (
              <TeamFilter
                value={teamFilter}
                onChange={setTeamFilter}
                allOptionLabel="All Companies"
              />
            )}
            <Button variant="outline" onClick={loadCandidates}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            {candidates.length} Candidates {search && `matching "${search}"`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No candidates found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Skills</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Visa Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Bench Status</th>
                    {isMasterAdmin && (
                      <th className="px-4 py-3 text-left text-sm font-semibold">Company</th>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-semibold">Added</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {candidates.map((candidate) => (
                    <tr key={candidate.candidate_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/candidates/${candidate.candidate_id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {candidate.first_name} {candidate.last_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>{candidate.email_address || '-'}</div>
                        <div className="text-gray-500">
                          {formatPhoneNumber(candidate.phone_number)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="max-w-xs truncate" title={candidate.skills_primary}>
                          {candidate.skills_primary || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {candidate.visa_status?.visa_name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="status" status={candidate.bench_status} />
                      </td>
                      {isMasterAdmin && (
                        <td className="px-4 py-3">
                          <TeamBadge
                            teamName={candidate.team?.team_name}
                            companyName={candidate.team?.company_name}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(candidate.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/candidates/${candidate.candidate_id}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
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
