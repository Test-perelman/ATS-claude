'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/lib/contexts/AuthContext';
import { apiPost } from '@/lib/api-client';

export default function NewCandidatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedinUrl: 'https://www.linkedin.com/in/',
    currentLocation: '',
    workAuthorization: '',
    resumeUrl: '',
    currentTitle: '',
    currentCompany: '',
    experienceYears: '',
    skills: [],
    desiredSalary: '',
    status: 'new',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Ensure LinkedIn URL always starts with the prefix
    if (name === 'linkedinUrl') {
      const prefix = 'https://www.linkedin.com/in/';
      if (!value.startsWith(prefix)) {
        setFormData(prev => ({ ...prev, [name]: prefix }));
        return;
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user?.user_id) {
        throw new Error('User authentication required. Please log in again.');
      }

      // Prepare data for insertion (team_id will be set server-side)
      const candidateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        currentLocation: formData.currentLocation || undefined,
        workAuthorization: formData.workAuthorization || undefined,
        resumeUrl: formData.resumeUrl || undefined,
        currentTitle: formData.currentTitle || undefined,
        currentCompany: formData.currentCompany || undefined,
        experienceYears: formData.experienceYears ? parseFloat(formData.experienceYears) : undefined,
        skills: [],
        desiredSalary: formData.desiredSalary ? parseFloat(formData.desiredSalary) : undefined,
        status: formData.status,
        notes: formData.notes || undefined,
      };

      // Call API with credentials
      const response = await apiPost('/api/candidates', candidateData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create candidate');
      }

      const result = await response.json();

      if (result.duplicate) {
        // Handle duplicate - show matches to user
        alert('Duplicate candidate found. Please review existing records.');
        // TODO: Show duplicate modal with matches
        return;
      }

      // Success - redirect to candidate detail page
      router.push(`/candidates/${result.data.candidate_id}`);
    } catch (error: any) {
      console.error('Error creating candidate:', error);
      alert('Error creating candidate: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Candidate</h1>
          <p className="mt-2 text-gray-600">Enter candidate information</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          ← Back
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                <Input
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="123-456-7890"
                />
                <Input
                  label="LinkedIn URL"
                  name="linkedinUrl"
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/..."
                />
                <Input
                  label="Current Location"
                  name="currentLocation"
                  value={formData.currentLocation}
                  onChange={handleChange}
                  placeholder="City, State"
                />
              </div>
            </CardContent>
          </Card>

          {/* Work Authorization */}
          <Card>
            <CardHeader>
              <CardTitle>Work Authorization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Work Authorization"
                  name="workAuthorization"
                  value={formData.workAuthorization}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select Work Authorization' },
                    { value: 'us_citizen', label: 'US Citizen' },
                    { value: 'green_card', label: 'Green Card' },
                    { value: 'h1b', label: 'H1B' },
                    { value: 'opt', label: 'OPT' },
                    { value: 'cpt', label: 'CPT' },
                    { value: 'ead', label: 'EAD' },
                    { value: 'tn', label: 'TN' },
                    { value: 'other', label: 'Other' },
                    { value: 'requires_sponsorship', label: 'Requires Sponsorship' },
                  ]}
                />
                <Input
                  label="Resume URL"
                  name="resumeUrl"
                  type="url"
                  value={formData.resumeUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills & Experience */}
          <Card>
            <CardHeader>
              <CardTitle>Skills & Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Years of Experience"
                    name="experienceYears"
                    type="number"
                    step="0.5"
                    value={formData.experienceYears}
                    onChange={handleChange}
                    placeholder="5.0"
                  />
                  <Input
                    label="Current Title"
                    name="currentTitle"
                    value={formData.currentTitle}
                    onChange={handleChange}
                    placeholder="Senior Developer"
                  />
                </div>
                <Input
                  label="Current Company"
                  name="currentCompany"
                  value={formData.currentCompany}
                  onChange={handleChange}
                  placeholder="Company Name"
                />
              </div>
            </CardContent>
          </Card>

          {/* Compensation */}
          <Card>
            <CardHeader>
              <CardTitle>Compensation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Desired Salary ($)"
                  name="desiredSalary"
                  type="number"
                  step="1000"
                  value={formData.desiredSalary}
                  onChange={handleChange}
                  placeholder="156000"
                />
              </div>
            </CardContent>
          </Card>

          {/* Status & Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={[
                    { value: 'new', label: 'New' },
                    { value: 'screening', label: 'Screening' },
                    { value: 'interviewing', label: 'Interviewing' },
                    { value: 'offered', label: 'Offered' },
                    { value: 'hired', label: 'Hired' },
                    { value: 'rejected', label: 'Rejected' },
                    { value: 'withdrawn', label: 'Withdrawn' },
                  ]}
                />
                <Textarea
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Add any notes about this candidate..."
                  rows={4}
                />
              </div>
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
              {loading ? 'Creating...' : 'Create Candidate'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
