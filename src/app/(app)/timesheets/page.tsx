'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { getTimesheets } from '@/lib/api/timesheets';
import { formatDate } from '@/lib/utils/format';

export default function TimesheetsPage() {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvedFilter, setApprovedFilter] = useState('');

  useEffect(() => {
    loadTimesheets();
  }, [approvedFilter]);

  async function loadTimesheets() {
    setLoading(true);
    const { data } = await getTimesheets({
      approved: approvedFilter === '' ? undefined : approvedFilter === 'true',
    });
    setTimesheets(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
          <p className="mt-2 text-gray-600">Track time and billable hours</p>
        </div>
        <Button>Add Timesheet</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              value={approvedFilter}
              onChange={(e) => setApprovedFilter(e.target.value)}
              options={[
                { value: '', label: 'All Timesheets' },
                { value: 'true', label: 'Approved' },
                { value: 'false', label: 'Pending Approval' },
              ]}
            />
            <Button variant="outline" onClick={loadTimesheets}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{timesheets.length} Timesheets</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : timesheets.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No timesheets found. Add your first timesheet!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Week Period</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Candidate</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Project</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Hours</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Approval</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {timesheets.map((timesheet) => (
                    <tr key={timesheet.timesheet_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div>{formatDate(timesheet.week_start)}</div>
                        <div className="text-gray-500">to {formatDate(timesheet.week_end)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {timesheet.candidate ? (
                          `${timesheet.candidate.first_name} ${timesheet.candidate.last_name}`
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {timesheet.project?.project_name || '-'}
                        <div className="text-gray-500">
                          {timesheet.project?.client?.client_name || ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>Total: {timesheet.hours_worked || 0} hrs</div>
                        {timesheet.overtime_hours > 0 && (
                          <div className="text-gray-500">OT: {timesheet.overtime_hours} hrs</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={timesheet.approved_by_client ? 'success' : 'warning'}>
                          {timesheet.approved_by_client ? 'Approved' : 'Pending'}
                        </Badge>
                        {timesheet.approval_date && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(timesheet.approval_date)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline">
                          View
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
