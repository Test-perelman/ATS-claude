'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatCurrency } from '@/lib/utils/format';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, byStatus: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('pipeline');

  const statuses = [
    { value: 'submitted', label: 'Submitted', color: 'bg-gray-100' },
    { value: 'screening', label: 'Screening', color: 'bg-blue-100' },
    { value: 'shortlisted', label: 'Shortlisted', color: 'bg-purple-100' },
    { value: 'interview_scheduled', label: 'Interview', color: 'bg-yellow-100' },
    { value: 'offered', label: 'Offered', color: 'bg-green-100' },
    { value: 'accepted', label: 'Accepted', color: 'bg-green-200' },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100' },
    { value: 'declined', label: 'Declined', color: 'bg-orange-100' },
    { value: 'withdrawn', label: 'Withdrawn', color: 'bg-gray-100' },
  ];

  useEffect(() => {
    loadSubmissions();
    loadStats();
  }, [search, statusFilter]);

  async function loadSubmissions() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/submissions?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error loading submissions:', response.statusText);
        setSubmissions([]);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setSubmissions(result.data || []);
      } else {
        console.error('Error loading submissions:', result.error);
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const response = await fetch('/api/submissions/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error loading stats:', response.statusText);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setStats(result.data || { total: 0, byStatus: {} });
      } else {
        console.error('Error loading stats:', result.error);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  function getSubmissionsByStatus(status: string) {
    return submissions.filter(s => s.status === status);
  }

  function getStatusBadgeVariant(status: string): 'active' | 'inactive' {
    const activeStatuses = ['submitted', 'screening', 'shortlisted', 'interview_scheduled', 'offered', 'accepted'];
    return activeStatuses.includes(status) ? 'active' : 'inactive';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Submissions</h1>
          <p className="mt-2 text-gray-600">Track candidate submissions through the pipeline</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'pipeline' ? 'primary' : 'outline'}
            onClick={() => setViewMode('pipeline')}
          >
            Pipeline View
          </Button>
          <Button
            variant={viewMode === 'table' ? 'primary' : 'outline'}
            onClick={() => setViewMode('table')}
          >
            Table View
          </Button>
          <Link href="/submissions/new">
            <Button>New Submission</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500">Total Submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.byStatus?.submitted || 0}</div>
            <p className="text-xs text-gray-500">Submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.byStatus?.screening || 0}</div>
            <p className="text-xs text-gray-500">In Screening</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.byStatus?.interview_scheduled || 0}</div>
            <p className="text-xs text-gray-500">Interviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.byStatus?.offered || 0}</div>
            <p className="text-xs text-gray-500">Offers</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              placeholder="Search submissions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                ...statuses.map(s => ({ value: s.value, label: s.label }))
              ]}
            />
            <Button variant="outline" onClick={loadSubmissions}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline View */}
      {viewMode === 'pipeline' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {statuses.filter(s => ['submitted', 'screening', 'shortlisted', 'interview_scheduled', 'offered', 'accepted'].includes(s.value)).map((status) => {
              const statusSubmissions = getSubmissionsByStatus(status.value);
              return (
                <div key={status.value} className="flex-shrink-0 w-80">
                  <Card className={status.color}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex justify-between items-center">
                        <span>{status.label}</span>
                        <Badge>{statusSubmissions.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {statusSubmissions.map((submission) => (
                          <Link
                            key={submission.id}
                            href={`/submissions/${submission.id}`}
                          >
                            <Card className="hover:shadow-md transition-shadow cursor-pointer bg-white">
                              <CardContent className="p-4">
                                <div className="font-medium text-sm mb-1">
                                  {submission.candidate?.first_name} {submission.candidate?.last_name}
                                </div>
                                <div className="text-xs text-gray-600 mb-2">
                                  {submission.job_requirement?.title || '-'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {'-'}
                                </div>
                                <div className="text-xs text-gray-400 mt-2">
                                  {formatDate(submission.created_at)}
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                        {statusSubmissions.length === 0 && (
                          <div className="text-center py-8 text-gray-400 text-sm">
                            No submissions
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardHeader>
            <CardTitle>{submissions.length} Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-gray-500">Loading...</div>
            ) : submissions.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                No submissions found. Create your first submission to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Candidate</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Job</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Bill Rate</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Submitted</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/candidates/${submission.candidate_id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {submission.candidate?.first_name} {submission.candidate?.last_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Link
                            href={`/requirements/${submission.requirement_id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {submission.job_requirement?.title || '-'}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {'-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="status" status={getStatusBadgeVariant(submission.status)}>
                            {submission.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {'-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatDate(submission.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/submissions/${submission.id}`}>
                            <Button size="sm" variant="outline">View</Button>
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
      )}
    </div>
  );
}
