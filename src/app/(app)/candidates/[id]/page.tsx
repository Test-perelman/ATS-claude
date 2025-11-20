'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Timeline } from '@/components/common/Timeline';
import { getCandidateById } from '@/lib/api/candidates';
import { getCandidateTimeline } from '@/lib/utils/timeline';
import { formatDate, formatPhoneNumber, formatCurrency } from '@/lib/utils/format';

export default function CandidateDetailPage() {
  const params = useParams();
  const candidateId = params?.id as string;

  const [candidate, setCandidate] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'documents'>('overview');

  useEffect(() => {
    if (candidateId) {
      loadCandidate();
      loadTimeline();
    }
  }, [candidateId]);

  async function loadCandidate() {
    setLoading(true);
    const { data } = await getCandidateById(candidateId);
    setCandidate(data);
    setLoading(false);
  }

  async function loadTimeline() {
    const timelineData = await getCandidateTimeline(candidateId);
    setTimeline(timelineData);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Candidate not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {candidate.first_name} {candidate.last_name}
          </h1>
          <div className="mt-2 flex items-center space-x-4">
            <Badge variant="status" status={candidate.bench_status} />
            <span className="text-gray-600">{candidate.visa_status?.visa_name}</span>
            <span className="text-gray-600">
              {candidate.total_experience_years} years exp
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">✏️ Edit</Button>
          <Button>📤 Submit to Job</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
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
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.email_address || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatPhoneNumber(candidate.phone_number)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">LinkedIn</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.linkedin_url ? (
                      <a
                        href={candidate.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View Profile
                      </a>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Location</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.current_location || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(candidate.date_of_birth)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Work Authorization */}
          <Card>
            <CardHeader>
              <CardTitle>Work Authorization</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Visa Status</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.visa_status?.visa_name || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Visa Expiry</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(candidate.visa_expiry_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">SSN Last 4</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.ssn_last4 ? `***-**-${candidate.ssn_last4}` : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Passport Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.passport_number || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.work_authorization_notes || '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Skills & Experience */}
          <Card>
            <CardHeader>
              <CardTitle>Skills & Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Primary Skills</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.skills_primary || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Secondary Skills</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.skills_secondary || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Total Experience</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.total_experience_years} years
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Preferred Roles</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.preferred_roles || '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Compensation */}
          <Card>
            <CardHeader>
              <CardTitle>Compensation</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Hourly Rate</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatCurrency(candidate.hourly_pay_rate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Annual Salary</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatCurrency(candidate.salary_annual)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Terms %</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.terms_percentage}%
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Team Assignment */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Team Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Sales Manager</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.sales_manager?.username || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Sales Executive</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.sales_executive?.username || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Recruiter Manager</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.recruiter_manager?.username || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Recruiter Executive</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {candidate.recruiter_executive?.username || '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          {candidate.notes_internal && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {candidate.notes_internal}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
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
