'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime, formatDate } from '@/lib/utils/format';

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    loadInterviews();
  }, [resultFilter, fromDate, toDate]);

  async function loadInterviews() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (resultFilter) params.append('result', resultFilter);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const response = await fetch(`/api/interviews?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error loading interviews:', response.statusText);
        setInterviews([]);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setInterviews(result.data || []);
      } else {
        console.error('Error loading interviews:', result.error);
        setInterviews([]);
      }
    } catch (error) {
      console.error('Error loading interviews:', error);
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  }

  const getResultBadgeVariant = (result: string | null) => {
    if (!result) return 'default';
    switch (result.toLowerCase()) {
      case 'selected':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      case 'no show':
        return 'error';
      default:
        return 'default';
    }
  };

  const getInterviewRoundBadge = (round: string) => {
    switch (round) {
      case 'Phone Screen':
        return 'info';
      case 'Technical':
        return 'warning';
      case 'Final':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Interviews</h1>
          <p className="mt-2 text-gray-600">Schedule and track interviews</p>
        </div>
        <Link href="/interviews/new">
          <Button>Schedule Interview</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              options={[
                { value: '', label: 'All Results' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Selected', label: 'Selected' },
                { value: 'Rejected', label: 'Rejected' },
                { value: 'No Show', label: 'No Show' },
              ]}
            />
            <Input
              type="date"
              placeholder="From Date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <Input
              type="date"
              placeholder="To Date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
            <Button variant="outline" onClick={loadInterviews}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>{interviews.length} Interviews</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : interviews.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No interviews found. Schedule your first interview!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Candidate</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Job Title</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Round</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Scheduled</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Interviewer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Mode</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Result</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {interviews.map((interview) => (
                    <tr key={interview.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {interview.submission?.candidate ? (
                          <Link
                            href={`/candidates/${interview.submission.candidate_id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {interview.submission.candidate.first_name}{' '}
                            {interview.submission.candidate.last_name}
                          </Link>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {interview.submission?.job_requirement ? (
                          <div>
                            <div className="font-medium">{interview.submission.job_requirement.title}</div>
                            <div className="text-gray-500">
                              {'-'}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getInterviewRoundBadge('-')}>
                          {'-'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDateTime(interview.scheduled_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">{'-'}</td>
                      <td className="px-4 py-3 text-sm">{'-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getResultBadgeVariant(interview.outcome)}>
                          {interview.outcome || 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/interviews/${interview.id}`}>
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
