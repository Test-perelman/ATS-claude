'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getInterviewById, updateInterview } from '@/lib/api/interviews';
import { formatDateTime } from '@/lib/utils/format';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';

export default function InterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params?.id as string;

  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (interviewId) {
      loadInterview();
    }
  }, [interviewId]);

  async function loadInterview() {
    setLoading(true);
    const { data } = await getInterviewById(interviewId);
    setInterview(data as any);
    setFormData({
      result: (data as any)?.result || '',
      feedback_notes: (data as any)?.feedback_notes || '',
      rating: (data as any)?.rating || '',
    });
    setLoading(false);
  }

  async function handleSave() {
    await updateInterview(interviewId, formData);
    setEditing(false);
    loadInterview();
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Interview not found</div>
      </div>
    );
  }

  const candidate = interview.submission?.candidate;
  const job = interview.submission?.job;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Interview Details
          </h1>
          <div className="mt-2">
            {candidate && (
              <Link
                href={`/candidates/${candidate.candidate_id}`}
                className="text-blue-600 hover:underline"
              >
                {candidate.first_name} {candidate.last_name}
              </Link>
            )}
            {job && (
              <span className="text-gray-600 ml-2">
                • {job.job_title}
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.back()}>
            ← Back
          </Button>
          {!editing && (
            <Button onClick={() => setEditing(true)}>
              ✏️ Edit Result
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Interview Information */}
        <Card>
          <CardHeader>
            <CardTitle>Interview Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Round</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <Badge>{interview.interview_round}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Scheduled Time</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateTime(interview.scheduled_time)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Interviewer</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {interview.interviewer_name || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Interview Mode</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {interview.interview_mode || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Location/Link</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {interview.interview_location || '-'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Result & Feedback */}
        <Card>
          <CardHeader>
            <CardTitle>Result & Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Result
                  </label>
                  <Select
                    value={formData.result}
                    onChange={(e) =>
                      setFormData({ ...formData, result: e.target.value })
                    }
                    options={[
                      { value: '', label: 'Select Result' },
                      { value: 'Pending', label: 'Pending' },
                      { value: 'Selected', label: 'Selected' },
                      { value: 'Rejected', label: 'Rejected' },
                      { value: 'No Show', label: 'No Show' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating (1-10)
                  </label>
                  <Select
                    value={formData.rating}
                    onChange={(e) =>
                      setFormData({ ...formData, rating: e.target.value })
                    }
                    options={[
                      { value: '', label: 'No Rating' },
                      ...Array.from({ length: 10 }, (_, i) => ({
                        value: String(i + 1),
                        label: String(i + 1),
                      })),
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback Notes
                  </label>
                  <Textarea
                    value={formData.feedback_notes}
                    onChange={(e) =>
                      setFormData({ ...formData, feedback_notes: e.target.value })
                    }
                    rows={6}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSave}>Save</Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Result</dt>
                  <dd className="mt-1">
                    <Badge
                      variant={
                        interview.result === 'Selected'
                          ? 'success'
                          : interview.result === 'Rejected'
                          ? 'error'
                          : 'warning'
                      }
                    >
                      {interview.result || 'Pending'}
                    </Badge>
                  </dd>
                </div>
                {interview.rating && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Rating</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {interview.rating}/10
                    </dd>
                  </div>
                )}
                {interview.feedback_notes && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Feedback Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {interview.feedback_notes}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Candidate Information */}
        {candidate && (
          <Card>
            <CardHeader>
              <CardTitle>Candidate</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <Link
                      href={`/candidates/${candidate.candidate_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {candidate.first_name} {candidate.last_name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <a
                      href={`mailto:${candidate.email_address}`}
                      className="text-blue-600 hover:underline"
                    >
                      {candidate.email_address}
                    </a>
                  </dd>
                </div>
                {candidate.phone_number && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {candidate.phone_number}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Job Information */}
        {job && (
          <Card>
            <CardHeader>
              <CardTitle>Job Position</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Job Title</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <Link
                      href={`/requirements/${job.job_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {job.job_title}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Client</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {job.client?.client_name || '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
