'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { getProjects } from '@/lib/api/projects';
import { formatDate, formatCurrency } from '@/lib/utils/format';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadProjects();
  }, [search, statusFilter]);

  async function loadProjects() {
    setLoading(true);
    const { data } = await getProjects({
      search: search || undefined,
      status: statusFilter || undefined,
    });
    setProjects(data || []);
    setLoading(false);
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Completed':
        return 'info';
      case 'Terminated':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="mt-2 text-gray-600">Manage active placements</p>
        </div>
        <Link href="/projects/new">
          <Button>New Project</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Terminated', label: 'Terminated' },
              ]}
            />
            <Button variant="outline" onClick={loadProjects}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>{projects.length} Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No projects found. Create your first project!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Project Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Candidate</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Duration</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Rates</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.map((project) => (
                    <tr key={project.project_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${project.project_id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {project.project_name || 'Untitled Project'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {project.candidate ? (
                          <Link
                            href={`/candidates/${project.candidate.candidate_id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {project.candidate.first_name} {project.candidate.last_name}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {project.client ? (
                          <Link
                            href={`/clients/${project.client.client_id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {project.client.client_name}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>{formatDate(project.start_date)}</div>
                        <div className="text-gray-500">
                          {project.end_date ? `to ${formatDate(project.end_date)}` : 'Ongoing'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>Bill: {formatCurrency(project.bill_rate_final)}/hr</div>
                        <div className="text-gray-500">Pay: {formatCurrency(project.pay_rate_final)}/hr</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(project.status)}>
                          {project.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/projects/${project.project_id}`}>
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
