'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/lib/contexts/AuthContext';

function NewSubmissionForm() {
  const router = useRouter();
  const { user, teamId, isMasterAdmin } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    candidateId: searchParams?.get('candidateId') || searchParams?.get('candidate_id') || '',
    jobId: searchParams?.get('jobId') || searchParams?.get('job_id') || '',
    submissionStatus: 'submitted',
    billRateOffered: '',
    payRateOffered: '',
    margin: '',
    notes: '',
  });

  useEffect(() => {
    if (user?.user_id) {
      loadCandidates();
      loadJobs();
    }
  }, [user]);

  useEffect(() => {
    if (formData.candidateId) {
      const candidate = candidates.find(c => c.candidate_id === formData.candidateId);
      setSelectedCandidate(candidate);

      // Auto-fill pay rate from candidate's hourly rate
      if (candidate && candidate.hourly_pay_rate && !formData.payRateOffered) {
        setFormData(prev => ({
          ...prev,
          payRateOffered: candidate.hourly_pay_rate.toString()
        }));
      }
    }
  }, [formData.candidateId, candidates]);

  useEffect(() => {
    if (formData.jobId) {
      const job = jobs.find(j => j.job_id === formData.jobId);
      setSelectedJob(job);
    }
  }, [formData.jobId, jobs]);

  useEffect(() => {
    // Calculate margin when rates change
    if (formData.billRateOffered && formData.payRateOffered) {
      const billRate = parseFloat(formData.billRateOffered);
      const payRate = parseFloat(formData.payRateOffered);
      if (!isNaN(billRate) && !isNaN(payRate)) {
        const margin = billRate - payRate;
        setFormData(prev => ({ ...prev, margin: margin.toFixed(2) }));
      }
    }
  }, [formData.billRateOffered, formData.payRateOffered]);

  async function loadCandidates() {
    if (!user?.user_id) {
      console.error('User not authenticated');
      return;
    }

    try {
      const response = await fetch('/api/candidates');
      if (!response.ok) throw new Error('Failed to load candidates');
      const { data } = await response.json();
      setCandidates(data || []);
    } catch (error) {
      console.error('Error loading candidates:', error);
      setCandidates([]);
    }
  }

  async function loadJobs() {
    try {
      const response = await fetch('/api/requirements?status=open');
      if (!response.ok) throw new Error('Failed to load jobs');
      const { data } = await response.json();
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
      setJobs([]);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!teamId || !user?.user_id) {
        throw new Error('User or team information not available');
      }

      // Prepare data for insertion
      const submissionData: any = {
        candidateId: formData.candidateId,
        jobId: formData.jobId,
        submissionStatus: formData.submissionStatus,
        billRateOffered: formData.billRateOffered ? parseFloat(formData.billRateOffered) : null,
        payRateOffered: formData.payRateOffered ? parseFloat(formData.payRateOffered) : null,
        margin: formData.margin ? parseFloat(formData.margin) : null,
        notes: formData.notes || null,
        submittedAt: new Date().toISOString(),
      };

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create submission');
      }

      const result = await response.json();

      if ((result as any).data) {
        // Redirect to submission detail page
        router.push(`/submissions/${((result as any).data as any).submission_id}`);
      }
    } catch (error: any) {
      console.error('Error creating submission:', error);
      alert('Error creating submission: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Submission</h1>
          <p className="mt-2 text-gray-600">Submit a candidate for a job requirement</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Candidate & Job Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Candidate & Job</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Select
                    label="Candidate"
                    name="candidateId"
                    value={formData.candidateId}
                    onChange={handleChange}
                    required
                    options={[
                      { value: '', label: 'Select Candidate' },
                      ...candidates.map(candidate => ({
                        value: candidate.candidate_id,
                        label: `${candidate.first_name} ${candidate.last_name} - ${candidate.skills_primary || 'N/A'}`
                      }))
                    ]}
                  />
                  {selectedCandidate && (
                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                      <div className="font-medium">{selectedCandidate.first_name} {selectedCandidate.last_name}</div>
                      <div className="text-gray-600 text-xs mt-1">
                        {selectedCandidate.email_address}
                      </div>
                      <div className="text-gray-600 text-xs">
                        Skills: {selectedCandidate.skills_primary || 'N/A'}
                      </div>
                      <div className="text-gray-600 text-xs">
                        Experience: {selectedCandidate.total_experience_years} years
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Select
                    label="Job Requirement"
                    name="jobId"
                    value={formData.jobId}
                    onChange={handleChange}
                    required
                    options={[
                      { value: '', label: 'Select Job' },
                      ...jobs.map(job => ({
                        value: job.job_id,
                        label: `${job.job_title} - ${job.client?.client_name || 'N/A'}`
                      }))
                    ]}
                  />
                  {selectedJob && (
                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                      <div className="font-medium">{selectedJob.job_title}</div>
                      <div className="text-gray-600 text-xs mt-1">
                        Client: {selectedJob.client?.client_name || 'N/A'}
                      </div>
                      <div className="text-gray-600 text-xs">
                        Location: {selectedJob.location || 'N/A'} • {selectedJob.work_mode || 'N/A'}
                      </div>
                      {selectedJob.bill_rate_range_min && selectedJob.bill_rate_range_max && (
                        <div className="text-gray-600 text-xs">
                          Rate: ${selectedJob.bill_rate_range_min}-${selectedJob.bill_rate_range_max}/hr
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rates & Status */}
          <Card>
            <CardHeader>
              <CardTitle>Rates & Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Bill Rate ($/hr)"
                  name="billRateOffered"
                  type="number"
                  step="0.01"
                  value={formData.billRateOffered}
                  onChange={handleChange}
                  required
                  placeholder="85.00"
                />
                <Input
                  label="Pay Rate ($/hr)"
                  name="payRateOffered"
                  type="number"
                  step="0.01"
                  value={formData.payRateOffered}
                  onChange={handleChange}
                  required
                  placeholder="60.00"
                />
                <Input
                  label="Margin ($/hr)"
                  name="margin"
                  type="number"
                  step="0.01"
                  value={formData.margin}
                  onChange={handleChange}
                  disabled
                  placeholder="Calculated automatically"
                />
                <Select
                  label="Initial Status"
                  name="submissionStatus"
                  value={formData.submissionStatus}
                  onChange={handleChange}
                  required
                  options={[
                    { value: 'submitted', label: 'Submitted' },
                    { value: 'screening', label: 'Screening' },
                    { value: 'shortlisted', label: 'Shortlisted' },
                  ]}
                />
              </div>

              {formData.billRateOffered && formData.payRateOffered && formData.margin && (
                <div className="mt-4 p-4 bg-blue-50 rounded">
                  <div className="text-sm font-medium text-blue-900">Margin Calculation</div>
                  <div className="text-xs text-blue-700 mt-2">
                    Bill Rate: ${formData.billRateOffered}/hr - Pay Rate: ${formData.payRateOffered}/hr =
                    Margin: ${formData.margin}/hr (
                    {((parseFloat(formData.margin) / parseFloat(formData.billRateOffered)) * 100).toFixed(2)}%)
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                label="Submission Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any notes about this submission..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Submission'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewSubmissionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <NewSubmissionForm />
    </Suspense>
  );
}
