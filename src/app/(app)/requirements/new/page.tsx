'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { createJobRequirement } from '@/lib/api/requirements';
import { getClients } from '@/lib/api/clients';
import { getVendors } from '@/lib/api/vendors';

export default function NewJobRequirementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    job_title: '',
    job_description: '',
    skills_required: '',
    client_id: '',
    vendor_id: '',
    location: '',
    work_mode: '',
    bill_rate_range_min: '',
    bill_rate_range_max: '',
    employment_type: '',
    duration: '',
    priority: 'Medium',
    received_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    status: 'open',
    notes: '',
  });

  useEffect(() => {
    loadClients();
    loadVendors();
  }, []);

  async function loadClients() {
    const { data } = await getClients();
    setClients(data || []);
  }

  async function loadVendors() {
    const { data } = await getVendors();
    setVendors(data || []);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare data for insertion
      const jobData: any = {
        job_title: formData.job_title,
        job_description: formData.job_description || null,
        skills_required: formData.skills_required || null,
        client_id: formData.client_id || null,
        vendor_id: formData.vendor_id || null,
        location: formData.location || null,
        work_mode: formData.work_mode || null,
        bill_rate_range_min: formData.bill_rate_range_min ? parseFloat(formData.bill_rate_range_min) : null,
        bill_rate_range_max: formData.bill_rate_range_max ? parseFloat(formData.bill_rate_range_max) : null,
        employment_type: formData.employment_type || null,
        duration: formData.duration || null,
        priority: formData.priority || null,
        received_date: formData.received_date || null,
        expiry_date: formData.expiry_date || null,
        status: formData.status,
        notes: formData.notes || null,
      };

      const result = await createJobRequirement(jobData);

      if (result.error) {
        throw result.error;
      }

      // Check for duplicates
      if (result.duplicate && result.matches && result.matches.length > 0) {
        const confirmed = window.confirm(
          `A similar job requirement "${(result.matches as any)[0].job_title}" already exists. Do you want to create anyway?`
        );

        if (confirmed) {
          // Create with duplicate check skipped
          const forceResult = await createJobRequirement(jobData, undefined, { skipDuplicateCheck: true });
          if (forceResult.error) throw forceResult.error;
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
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleChange}
                    required
                    placeholder="Senior Software Engineer"
                  />
                </div>
                <Select
                  label="Client"
                  name="client_id"
                  value={formData.client_id}
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
                  name="vendor_id"
                  value={formData.vendor_id}
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
                  name="work_mode"
                  value={formData.work_mode}
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
                  name="employment_type"
                  value={formData.employment_type}
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
                  name="bill_rate_range_min"
                  type="number"
                  step="0.01"
                  value={formData.bill_rate_range_min}
                  onChange={handleChange}
                  placeholder="80"
                />
                <Input
                  label="Bill Rate Max ($/hr)"
                  name="bill_rate_range_max"
                  type="number"
                  step="0.01"
                  value={formData.bill_rate_range_max}
                  onChange={handleChange}
                  placeholder="100"
                />
                <Input
                  label="Received Date"
                  name="received_date"
                  type="date"
                  value={formData.received_date}
                  onChange={handleChange}
                />
                <Input
                  label="Expiry Date"
                  name="expiry_date"
                  type="date"
                  value={formData.expiry_date}
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
                name="job_description"
                value={formData.job_description}
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
                name="skills_required"
                value={formData.skills_required}
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
