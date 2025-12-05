'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Timeline } from '@/components/common/Timeline';
import { getSubmissionById, updateSubmissionStatus, getSubmissionInterviews } from '@/lib/api/submissions';
import { getSubmissionTimeline } from '@/lib/utils/timeline';
import { formatDate, formatCurrency } from '@/lib/utils/format';

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params?.id as string;

  const [submission, setSubmission] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'interviews' | 'documents'>('overview');

  const statuses = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'screening', label: 'Screening' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'interview_scheduled', label: 'Interview Scheduled' },
    { value: 'offered', label: 'Offered' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'declined', label: 'Declined' },
    { value: 'withdrawn', label: 'Withdrawn' },
  ];

  useEffect(() => {
    if (submissionId) {
      loadSubmission();
      loadTimeline();
      loadInterviews();
    }
  }, [submissionId]);

  async function loadSubmission() {
    setLoading(true);
    const result = await getSubmissionById(submissionId);
    if ('error' in result) {
      console.error('Error loading submission:', result.error);
      setSubmission(null);
    } else {
      setSubmission(result.data);
    }
    setLoading(false);
  }

  async function loadTimeline() {
    const timelineData = await getSubmissionTimeline(submissionId);
    setTimeline(timelineData);
  }

  async function loadInterviews() {
    const result = await getSubmissionInterviews(submissionId);
    if ('error' in result) {
      console.error('Error loading interviews:', result.error);
      setInterviews([]);
    } else {
      setInterviews(result.data || []);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!newStatus || newStatus === submission.submission_status) return;

    const confirmed = window.confirm(
      `Change submission status from "${submission.submission_status}" to "${newStatus}"?`
    );

    if (!confirmed) return;

    setUpdating(true);
    const result = await updateSubmissionStatus(submissionId, newStatus);

    if ('error' in result) {
      alert('Error updating status: ' + result.error);
    } else {
      await loadSubmission();
      await loadTimeline();
    }
    setUpdating(false);
  }

  function getStatusBadgeVariant(status: string): 'active' | 'inactive' {
    const activeStatuses = ['submitted', 'screening', 'shortlisted', 'interview_scheduled', 'offered', 'accepted'];
    return activeStatuses.includes(status) ? 'active' : 'inactive';
  }

  function calculateMargin() {
    if (submission?.bill_rate_offered && submission?.pay_rate_offered) {
      const margin = submission.bill_rate_offered - submission.pay_rate_offered;
      const marginPercent = (margin / submission.bill_rate_offered) * 100;
      return { margin, marginPercent };
    }
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Submission not found</div>
      </div>
    );
  }

  const marginData = calculateMargin();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {submission.candidate?.first_name} {submission.candidate?.last_name}
          </h1>
          <p className="mt-2 text-gray-600">{submission.job?.job_title}</p>
          <div className="mt-2 flex items-center space-x-4">
            <Badge variant="status" status={getStatusBadgeVariant(submission.submission_status)}>
              {submission.submission_status}
            </Badge>
            <span className="text-gray-600">
              Submitted {formatDate(submission.submitted_at)}
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

      {/* Status Update */}
      <Card className="bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Update Status:</span>
            <Select
              value={submission.submission_status}
              onChange={(e) => handleStatusChange(e.target.value)}
              options={statuses}
              disabled={updating}
            />
            {updating && <span className="text-sm text-gray-500">Updating...</span>}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'interviews', label: `Interviews (${interviews.length})` },
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
          {/* Candidate Information */}
          <Card>
            <CardHeader>
              <CardTitle>Candidate Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <Link
                      href={`/candidates/${submission.candidate?.candidate_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {submission.candidate?.first_name} {submission.candidate?.last_name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {submission.candidate?.email_address ? (
                      <a
                        href={`mailto:${submission.candidate.email_address}`}
                        className="text-blue-600 hover:underline"
                      >
                        {submission.candidate.email_address}
                      </a>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {submission.candidate?.phone_number || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Skills</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {submission.candidate?.skills_primary || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Experience</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {submission.candidate?.total_experience_years} years
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Job Information */}
          <Card>
            <CardHeader>
              <CardTitle>Job Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Job Title</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <Link
                      href={`/requirements/${submission.job?.job_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {submission.job?.job_title}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Location</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {submission.job?.location || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Work Mode</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {submission.job?.work_mode || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Employment Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {submission.job?.employment_type || '-'}
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
                    {submission.client?.client ? (
                      <Link
                        href={`/clients/${submission.client.client.client_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {submission.client.client.client_name}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vendor</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {submission.vendor?.vendor ? (
                      <Link
                        href={`/vendors/${submission.vendor.vendor.vendor_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {submission.vendor.vendor.vendor_name}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Rates & Margin */}
          <Card>
            <CardHeader>
              <CardTitle>Rates & Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Bill Rate</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-medium text-green-600">
                    {submission.bill_rate_offered ? formatCurrency(submission.bill_rate_offered) + '/hr' : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Pay Rate</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-medium text-blue-600">
                    {submission.pay_rate_offered ? formatCurrency(submission.pay_rate_offered) + '/hr' : '-'}
                  </dd>
                </div>
                {marginData && (
                  <>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Margin</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-medium text-purple-600">
                        {formatCurrency(marginData.margin)}/hr
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Margin %</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-medium text-purple-600">
                        {marginData.marginPercent.toFixed(2)}%
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Notes */}
          {submission.notes && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {submission.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Rejection Reason */}
          {submission.rejection_reason && (
            <Card className="lg:col-span-2 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700">Rejection Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-900 whitespace-pre-wrap">
                  {submission.rejection_reason}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Submission Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Submitted At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(submission.submitted_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(submission.updated_at)}
                  </dd>
                </div>
                {submission.submitted_by && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Submitted By</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {submission.submitted_by.username}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'interviews' && (
        <Card>
          <CardHeader>
            <CardTitle>Interviews ({interviews.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {interviews.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No interviews scheduled yet for this submission.
              </div>
            ) : (
              <div className="space-y-4">
                {interviews.map((interview) => (
                  <Card key={interview.interview_id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">Interview Round {interview.interview_round}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatDate(interview.scheduled_time)} • {interview.interview_mode}
                          </div>
                          {interview.interviewer_name && (
                            <div className="text-sm text-gray-600 mt-1">
                              Interviewer: {interview.interviewer_name}
                            </div>
                          )}
                        </div>
                        <Badge variant="status" status={interview.result === 'passed' ? 'active' : 'inactive'}>
                          {interview.result || 'Pending'}
                        </Badge>
                      </div>
                      {interview.feedback_notes && (
                        <div className="mt-4 text-sm text-gray-700">
                          {interview.feedback_notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
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
