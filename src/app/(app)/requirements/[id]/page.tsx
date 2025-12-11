'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Timeline } from '@/components/common/Timeline';
import { getJobRequirementTimeline } from '@/lib/utils/timeline';
import { formatDate, formatCurrency } from '@/lib/utils/format';

export default function JobRequirementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [matchingCandidates, setMatchingCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'candidates' | 'timeline' | 'documents'>('overview');

  useEffect(() => {
    if (jobId) {
      loadJob();
      loadTimeline();
      loadSubmissions();
      loadMatchingCandidates();
    }
  }, [jobId]);

  async function loadJob() {
    setLoading(true);
    try {
      const response = await fetch(`/api/requirements/${jobId}`);
      if (!response.ok) throw new Error('Failed to load job');
      const { data } = await response.json();
      setJob(data);
    } catch (error) {
      console.error('Error loading job:', error);
      setJob(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadTimeline() {
    const timelineData = await getJobRequirementTimeline(jobId);
    setTimeline(timelineData);
  }

  async function loadSubmissions() {
    try {
      const response = await fetch(`/api/requirements/${jobId}/submissions`);
      if (!response.ok) throw new Error('Failed to load submissions');
      const { data } = await response.json();
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
      setSubmissions([]);
    }
  }

  async function loadMatchingCandidates() {
    try {
      const response = await fetch(`/api/requirements/${jobId}/matching-candidates`);
      if (!response.ok) throw new Error('Failed to load candidates');
      const { data } = await response.json();
      setMatchingCandidates(data || []);
    } catch (error) {
      console.error('Error loading candidates:', error);
      setMatchingCandidates([]);
    }
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
      'Low': 'gray',
      'Medium': 'blue',
      'High': 'orange',
      'Urgent': 'red',
    };
    return colorMap[priority] || 'gray';
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Job requirement not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {job.job_title}
          </h1>
          <div className="mt-2 flex items-center space-x-4">
            <Badge variant="status" status={getStatusBadgeVariant(job.status)}>
              {job.status}
            </Badge>
            <Badge style={{ backgroundColor: getPriorityColor(job.priority) }}>
              {job.priority}
            </Badge>
            <span className="text-gray-600">
              Posted {formatDate(job.received_date)}
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Button variant="outline">Edit</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'submissions', label: `Submissions (${submissions.length})` },
            { id: 'candidates', label: `Matching (${matchingCandidates.length})` },
            { id: 'timeline', label: 'Timeline' },
            { id: 'documents', label: 'Documents' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Location</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {job.location || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Work Mode</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {job.work_mode || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Employment Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {job.employment_type || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Duration</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {job.duration || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Bill Rate Range</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {job.bill_rate_range_min && job.bill_rate_range_max
                      ? `${formatCurrency(job.bill_rate_range_min)} - ${formatCurrency(job.bill_rate_range_max)}`
                      : '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Client & Vendor */}
          <Card>
            <CardHeader>
              <CardTitle>Client & Vendor</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Client</dt>
                  <dd className="mt-1 text-sm text-gray-900">
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
                  </dd>
                </div>
                {job.client?.primary_contact_name && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Client Contact</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <div>{job.client.primary_contact_name}</div>
                      {job.client.primary_contact_email && (
                        <a
                          href={`mailto:${job.client.primary_contact_email}`}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          {job.client.primary_contact_email}
                        </a>
                      )}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vendor</dt>
                  <dd className="mt-1 text-sm text-gray-900">
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
                  </dd>
                </div>
                {job.vendor?.contact_name && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Vendor Contact</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <div>{job.vendor.contact_name}</div>
                      {job.vendor.contact_email && (
                        <a
                          href={`mailto:${job.vendor.contact_email}`}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          {job.vendor.contact_email}
                        </a>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Job Description */}
          {job.job_description && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {job.job_description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Skills Required */}
          {job.skills_required && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Required Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {job.skills_required}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {job.notes && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {job.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Record Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Received Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(job.received_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Expiry Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(job.expiry_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(job.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(job.updated_at)}
                  </dd>
                </div>
                {job.created_by_user && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created By</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {job.created_by_user.username}
                    </dd>
                  </div>
                )}
                {job.updated_by_user && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Updated By</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {job.updated_by_user.username}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'submissions' && (
        <Card>
          <CardHeader>
            <CardTitle>Candidate Submissions ({submissions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No submissions yet for this job requirement.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Candidate</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Submitted</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Rates</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {submissions.map((submission) => (
                      <tr key={submission.submission_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/submissions/${submission.submission_id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {submission.candidate?.first_name} {submission.candidate?.last_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge>{submission.submission_status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatDate(submission.submitted_at)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {submission.bill_rate_offered && submission.pay_rate_offered
                            ? `${formatCurrency(submission.bill_rate_offered)} / ${formatCurrency(submission.pay_rate_offered)}`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/submissions/${submission.submission_id}`}>
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

      {activeTab === 'candidates' && (
        <Card>
          <CardHeader>
            <CardTitle>Matching Candidates ({matchingCandidates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {matchingCandidates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No matching candidates found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Skills</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Experience</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {matchingCandidates.map((candidate) => (
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
                          {candidate.skills_primary || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {candidate.total_experience_years} years
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="status" status={candidate.bench_status === 'available' ? 'active' : 'inactive'}>
                            {candidate.bench_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/candidates/${candidate.candidate_id}`}>
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

      {activeTab === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline items={timeline} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card>
          <CardHeader>
            <CardTitle>Documents & Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              Document management coming soon...
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
