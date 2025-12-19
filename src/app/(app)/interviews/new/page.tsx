'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/lib/contexts/AuthContext';
import { apiPost, apiGet, apiPut, apiDelete } from '@/lib/api-client';

function NewInterviewForm() {
  const router = useRouter();
  const { user, teamId } = useAuth();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('submission_id');

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    submissionId: submissionId || '',
    interviewRound: '',
    scheduledTime: '',
    interviewerName: '',
    interviewMode: '',
    interviewLocation: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    try {
      const response = await fetch('/api/submissions');
      if (!response.ok) throw new Error('Failed to load submissions');
      const { data } = await response.json();
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
      setSubmissions([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (!teamId || !user?.user_id) {
        throw new Error('User or team information not available');
      }

      const response = await apiPost('/api/interviews', formData);

      if (!response.ok) {
        const errorData = await response.json();
        alert('Error creating interview: ' + (errorData.error || 'Unknown error'));
        setLoading(false);
        return;
      }

      router.push('/interviews');
    } catch (error: any) {
      alert('Error: ' + error.message);
      setLoading(false);
    }
  }

  const submissionOptions = submissions.map((sub) => ({
    value: sub.submission_id,
    label: `${sub.candidate?.first_name} ${sub.candidate?.last_name} - ${sub.job?.job_title}`,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Schedule Interview</h1>
        <p className="mt-2 text-gray-600">Create a new interview schedule</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interview Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Submission <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.submissionId}
                onChange={(e) =>
                  setFormData({ ...formData, submissionId: e.target.value })
                }
                options={[
                  { value: '', label: 'Select a submission' },
                  ...submissionOptions,
                ]}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Interview Round <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.interviewRound}
                onChange={(e) =>
                  setFormData({ ...formData, interviewRound: e.target.value })
                }
                options={[
                  { value: '', label: 'Select round' },
                  { value: 'Phone Screen', label: 'Phone Screen' },
                  { value: 'Technical', label: 'Technical' },
                  { value: 'Behavioral', label: 'Behavioral' },
                  { value: 'Managerial', label: 'Managerial' },
                  { value: 'Final', label: 'Final' },
                  { value: 'Client Interview', label: 'Client Interview' },
                ]}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Scheduled Time <span className="text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                value={formData.scheduledTime}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledTime: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Interviewer Name
              </label>
              <Input
                type="text"
                value={formData.interviewerName}
                onChange={(e) =>
                  setFormData({ ...formData, interviewerName: e.target.value })
                }
                placeholder="Enter interviewer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Interview Mode
              </label>
              <Select
                value={formData.interviewMode}
                onChange={(e) =>
                  setFormData({ ...formData, interviewMode: e.target.value })
                }
                options={[
                  { value: '', label: 'Select mode' },
                  { value: 'Phone', label: 'Phone' },
                  { value: 'Video', label: 'Video' },
                  { value: 'In-Person', label: 'In-Person' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Location / Meeting Link
              </label>
              <Input
                type="text"
                value={formData.interviewLocation}
                onChange={(e) =>
                  setFormData({ ...formData, interviewLocation: e.target.value })
                }
                placeholder="Enter location or meeting link"
              />
            </div>

            <div className="flex space-x-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Scheduling...' : 'Schedule Interview'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewInterviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <NewInterviewForm />
    </Suspense>
  );
}
