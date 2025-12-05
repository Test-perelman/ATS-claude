'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { getCandidates } from '@/lib/api/candidates';
import { formatDate } from '@/lib/utils/format';

export default function BenchPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [benchStatusFilter, setBenchStatusFilter] = useState('on_bench');

  useEffect(() => {
    loadBenchCandidates();
  }, [benchStatusFilter]);

  async function loadBenchCandidates() {
    setLoading(true);
    const result = await getCandidates({
      benchStatus: benchStatusFilter || undefined,
    });
    if ('error' in result) {
      console.error('Error loading candidates:', result.error);
      setCandidates([]);
    } else {
      setCandidates(result.data.data || []);
    }
    setLoading(false);
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
                    <tr key={candidate.candidate_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/candidates/${candidate.candidate_id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {candidate.first_name} {candidate.last_name}
                        </Link>
                        <div className="text-xs text-gray-500">{candidate.email_address}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{candidate.primary_skills || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="info">{candidate.visa_status?.visa_name || 'N/A'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getBenchBadgeVariant(candidate.bench_status)}>
                          {candidate.bench_status?.replace('_', ' ') || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {candidate.bench_added_date ? formatDate(candidate.bench_added_date) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {candidate.current_city && candidate.current_state
                          ? `${candidate.current_city}, ${candidate.current_state}`
                          : '-'}
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
