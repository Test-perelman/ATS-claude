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
import { getJobRequirements } from '@/lib/api/requirements';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function RequirementsPage() {
  const { isMasterAdmin, teamId } = useAuth();
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  useEffect(() => {
    loadRequirements();
  }, [search, statusFilter, priorityFilter, teamFilter, isMasterAdmin, teamId]);

  async function loadRequirements() {
    setLoading(true);
    const { data } = await getJobRequirements({
      search: search || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      teamId: teamFilter || undefined,
      userTeamId: teamId || undefined,
      isMasterAdmin,
    });
    setRequirements(data || []);
    setLoading(false);
  }

  function getStatusBadgeVariant(status: string) {
    const statusMap: Record<string, 'active' | 'inactive'> = {
      'open': 'active',
      'filled': 'inactive',
      'closed': 'inactive',
      'on_hold': 'inactive',
    };
    return statusMap[status] || 'inactive';
  }

  function getPriorityColor(priority: string) {
    const colorMap: Record<string, string> = {
      'Low': 'text-gray-600',
      'Medium': 'text-blue-600',
      'High': 'text-orange-600',
      'Urgent': 'text-red-600',
    };
    return colorMap[priority] || 'text-gray-600';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Job Requirements</h1>
          <p className="mt-2 text-gray-600">Manage open positions</p>
        </div>
        <Link href="/requirements/new">
          <Button>Add Requirement</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'open', label: 'Open' },
                { value: 'filled', label: 'Filled' },
                { value: 'on_hold', label: 'On Hold' },
                { value: 'closed', label: 'Closed' },
              ]}
            />
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              options={[
                { value: '', label: 'All Priorities' },
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
                { value: 'Urgent', label: 'Urgent' },
              ]}
            />
            {isMasterAdmin && (
              <TeamFilter
                value={teamFilter}
                onChange={setTeamFilter}
                allOptionLabel="All Companies"
              />
            )}
            <Button variant="outline" onClick={loadRequirements}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>{requirements.length} Job Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : requirements.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No job requirements found. Create your first requirement to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Job Title</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Vendor</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Priority</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Bill Rate</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Location</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    {isMasterAdmin && (
                      <th className="px-4 py-3 text-left text-sm font-semibold">Company</th>
                    )}
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {requirements.map((job) => (
                    <tr key={job.job_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/requirements/${job.job_id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {job.job_title}
                        </Link>
                        <div className="text-xs text-gray-500 mt-1">
                          {job.work_mode} • {job.employment_type}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {job.client ? (
                          <Link
                            href={`/clients/${job.client.client_id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {job.client.client_name}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {job.vendor ? (
                          <Link
                            href={`/vendors/${job.vendor.vendor_id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {job.vendor.vendor_name}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${getPriorityColor(job.priority)}`}>
                          {job.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {job.bill_rate_range_min && job.bill_rate_range_max
                          ? `${formatCurrency(job.bill_rate_range_min)}-${formatCurrency(job.bill_rate_range_max)}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>{job.location || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="status" status={getStatusBadgeVariant(job.status)}>
                          {job.status}
                        </Badge>
                      </td>
                      {isMasterAdmin && (
                        <td className="px-4 py-3">
                          <TeamBadge
                            teamName={job.team?.team_name}
                            companyName={job.team?.company_name}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <Link href={`/requirements/${job.job_id}`}>
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
    </div>
  );
}
