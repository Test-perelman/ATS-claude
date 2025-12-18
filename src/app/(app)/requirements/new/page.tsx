'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function NewJobRequirementPage() {
  const router = useRouter();
  const { user, teamId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    jobTitle: '',
    jobDescription: '',
    skillsRequired: '',
    clientId: '',
    vendorId: '',
    location: '',
    workMode: '',
    billRateRangeMin: '',
    billRateRangeMax: '',
    employmentType: '',
    duration: '',
    priority: 'Medium',
    receivedDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    status: 'open',
    notes: '',
  });

  useEffect(() => {
    if (user?.user_id) {
      loadClients();
      loadVendors();
    }
  }, [user]);

  async function loadClients() {
    if (!user?.user_id) {
      console.error('User not authenticated');
      return;
    }

    try {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Failed to load clients');
      const { data } = await response.json();
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    }
  }

  async function loadVendors() {
    if (!user?.user_id) {
      console.error('User not authenticated');
      return;
    }

    try {
      const response = await fetch('/api/vendors');
      if (!response.ok) throw new Error('Failed to load vendors');
      const { data } = await response.json();
      setVendors(data || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
      setVendors([]);
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
      const jobData: any = {
        jobTitle: formData.jobTitle,
        jobDescription: formData.jobDescription || null,
        skillsRequired: formData.skillsRequired || null,
        clientId: formData.clientId || null,
        vendorId: formData.vendorId || null,
        location: formData.location || null,
        workMode: formData.workMode || null,
        billRateRangeMin: formData.billRateRangeMin ? parseFloat(formData.billRateRangeMin) : null,
        billRateRangeMax: formData.billRateRangeMax ? parseFloat(formData.billRateRangeMax) : null,
        employmentType: formData.employmentType || null,
        duration: formData.duration || null,
        priority: formData.priority || null,
        receivedDate: formData.receivedDate || null,
        expiryDate: formData.expiryDate || null,
        status: formData.status,
        notes: formData.notes || null,
      };

      const response = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create job requirement');
      }

      const result = await response.json();

      // Check for duplicates
      if (result.duplicate && result.matches && result.matches.length > 0) {
        const confirmed = window.confirm(
          `A similar job requirement "${(result.matches as any)[0].job_title}" already exists. Do you want to create anyway?`
        );

        if (confirmed) {
          // Create with duplicate check skipped
          const forceResponse = await fetch('/api/requirements?skipDuplicateCheck=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobData),
          });
          if (!forceResponse.ok) {
            const errorData = await forceResponse.json();
            throw new Error(errorData.error || 'Failed to create job requirement');
          }
          const forceResult = await forceResponse.json();
          if ((forceResult as any).data) {
            router.push(`/requirements/${((forceResult as any).data as any).job_id}`);
          }
        }
      } else if ((result as any).data) {
        // Redirect to job detail page
        router.push(`/requirements/${((result as any).data as any).job_id}`);
      }
    } catch (error: any) {
      console.error('Error creating job requirement:', error);
      alert('Error creating job requirement: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Job Requirement</h1>
          <p className="mt-2 text-gray-600">Enter job requirement information</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Back
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
                <div className="md:col-span-2">
                  <Input
                    label="Job Title"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    required
                    placeholder="Senior Software Engineer"
                  />
                </div>
                <Select
                  label="Client"
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select Client' },
                    ...clients.map(client => ({
                      value: client.client_id,
                      label: client.client_name
                    }))
                  ]}
                />
                <Select
                  label="Vendor"
                  name="vendorId"
                  value={formData.vendorId}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select Vendor' },
                    ...vendors.map(vendor => ({
                      value: vendor.vendor_id,
                      label: vendor.vendor_name
                    }))
                  ]}
                />
                <Select
                  label="Priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  required
                  options={[
                    { value: 'Low', label: 'Low' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'High', label: 'High' },
                    { value: 'Urgent', label: 'Urgent' },
                  ]}
                />
                <Select
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  options={[
                    { value: 'open', label: 'Open' },
                    { value: 'on_hold', label: 'On Hold' },
                    { value: 'filled', label: 'Filled' },
                    { value: 'closed', label: 'Closed' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="San Francisco, CA"
                />
                <Select
                  label="Work Mode"
                  name="workMode"
                  value={formData.workMode}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select Work Mode' },
                    { value: 'Remote', label: 'Remote' },
                    { value: 'Hybrid', label: 'Hybrid' },
                    { value: 'Onsite', label: 'Onsite' },
                  ]}
                />
                <Select
                  label="Employment Type"
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select Employment Type' },
                    { value: 'W2', label: 'W2' },
                    { value: 'C2C', label: 'C2C' },
                    { value: '1099', label: '1099' },
                    { value: 'Contract', label: 'Contract' },
                    { value: 'Full-Time', label: 'Full-Time' },
                  ]}
                />
                <Input
                  label="Duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="6 months"
                />
                <Input
                  label="Bill Rate Min ($/hr)"
                  name="billRateRangeMin"
                  type="number"
                  step="0.01"
                  value={formData.billRateRangeMin}
                  onChange={handleChange}
                  placeholder="80"
                />
                <Input
                  label="Bill Rate Max ($/hr)"
                  name="billRateRangeMax"
                  type="number"
                  step="0.01"
                  value={formData.billRateRangeMax}
                  onChange={handleChange}
                  placeholder="100"
                />
                <Input
                  label="Received Date"
                  name="receivedDate"
                  type="date"
                  value={formData.receivedDate}
                  onChange={handleChange}
                />
                <Input
                  label="Expiry Date"
                  name="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Job Description */}
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                label="Description"
                name="jobDescription"
                value={formData.jobDescription}
                onChange={handleChange}
                placeholder="Enter detailed job description..."
                rows={6}
              />
            </CardContent>
          </Card>

          {/* Skills Required */}
          <Card>
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                label="Skills"
                name="skillsRequired"
                value={formData.skillsRequired}
                onChange={handleChange}
                placeholder="Java, Spring Boot, AWS, Docker, Kubernetes..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                label="Internal Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any internal notes about this requirement..."
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
              {loading ? 'Creating...' : 'Create Job Requirement'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
