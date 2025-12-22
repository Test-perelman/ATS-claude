'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils/format';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function BenchPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [benchStatusFilter, setBenchStatusFilter] = useState('on_bench');

  useEffect(() => {
    if (user?.user_id) {
      loadBenchCandidates();
    }
  }, [benchStatusFilter, user]);

  async function loadBenchCandidates() {
    if (!user?.user_id) {
      console.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (benchStatusFilter) params.append('status', benchStatusFilter);

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

  const getBenchBadgeVariant = (status: string) => {
    switch (status) {
      case 'on_bench':
        return 'warning';
      case 'available':
        return 'success';
      case 'notice_period':
        return 'info';
      case 'placed':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bench Management</h1>
          <p className="mt-2 text-gray-600">Track consultants on bench</p>
        </div>
        <Link href="/candidates/new">
          <Button>Add Candidate</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              value={benchStatusFilter}
              onChange={(e) => setBenchStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Candidates' },
                { value: 'on_bench', label: 'On Bench' },
                { value: 'available', label: 'Available' },
                { value: 'notice_period', label: 'Notice Period' },
                { value: 'placed', label: 'Placed' },
              ]}
            />
            <Button variant="outline" onClick={loadBenchCandidates}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{candidates.length} Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No candidates found with this bench status.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Primary Skills</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Visa Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Bench Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Bench Since</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Location</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/candidates/${candidate.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {candidate.first_name} {candidate.last_name}
                        </Link>
                        <div className="text-xs text-gray-500">{candidate.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {Array.isArray(candidate.skills) ? candidate.skills.join(', ') : candidate.skills || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="info">{'N/A'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getBenchBadgeVariant(candidate.status)}>
                          {candidate.status?.replace('_', ' ') || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {candidate.created_at ? formatDate(candidate.created_at) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {candidate.location || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/candidates/${candidate.id}`}>
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
