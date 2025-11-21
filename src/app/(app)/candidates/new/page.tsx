'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { supabase, typedInsert } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

export default function NewCandidatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [visaStatuses, setVisaStatuses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email_address: '',
    phone_number: '',
    linkedin_url: '',
    current_location: '',
    relocation_preference: '',
    visa_status_id: '',
    visa_expiry_date: '',
    total_experience_years: '',
    skills_primary: '',
    skills_secondary: '',
    preferred_roles: '',
    hourly_pay_rate: '',
    salary_annual: '',
    bench_status: 'available',
    notes_internal: '',
  });

  useEffect(() => {
    loadDropdownData();
  }, []);

  async function loadDropdownData() {
    // Load visa statuses
    const { data: visas } = await supabase
      .from('visa_status')
      .select('*')
      .eq('is_active', true)
      .order('visa_name');
    setVisaStatuses(visas || []);

    // Load users for assignment
    const { data: usersList } = await supabase
      .from('users')
      .select('user_id, username, email')
      .eq('status', 'active')
      .order('username');
    setUsers(usersList || []);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare data for insertion with proper typing
      const candidateData: Database['public']['Tables']['candidates']['Insert'] = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email_address: formData.email_address || null,
        phone_number: formData.phone_number || null,
        linkedin_url: formData.linkedin_url || null,
        current_location: formData.current_location || null,
        relocation_preference: formData.relocation_preference || null,
        visa_status_id: formData.visa_status_id || null,
        visa_expiry_date: formData.visa_expiry_date || null,
        total_experience_years: formData.total_experience_years ? parseFloat(formData.total_experience_years) : null,
        skills_primary: formData.skills_primary || null,
        skills_secondary: formData.skills_secondary || null,
        preferred_roles: formData.preferred_roles || null,
        hourly_pay_rate: formData.hourly_pay_rate ? parseFloat(formData.hourly_pay_rate) : null,
        salary_annual: formData.salary_annual ? parseFloat(formData.salary_annual) : null,
        bench_status: formData.bench_status,
        bench_added_date: formData.bench_status === 'on_bench' ? new Date().toISOString().split('T')[0] : null,
        notes_internal: formData.notes_internal || null,
      };

      const { data, error } = await typedInsert('candidates', candidateData);

      if (error) throw error;

      // Redirect to candidate detail page
      router.push(`/candidates/${(data as any)?.candidate_id}`);
    } catch (error: any) {
      console.error('Error creating candidate:', error);
      alert('Error creating candidate: ' + error.message);
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
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Email Address"
                  name="email_address"
                  type="email"
                  value={formData.email_address}
                  onChange={handleChange}
                />
                <Input
                  label="Phone Number"
                  name="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="123-456-7890"
                />
                <Input
                  label="LinkedIn URL"
                  name="linkedin_url"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/..."
                />
                <Input
                  label="Current Location"
                  name="current_location"
                  value={formData.current_location}
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
                  label="Visa Status"
                  name="visa_status_id"
                  value={formData.visa_status_id}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select Visa Status' },
                    ...visaStatuses.map(v => ({ value: v.visa_status_id, label: v.visa_name }))
                  ]}
                />
                <Input
                  label="Visa Expiry Date"
                  name="visa_expiry_date"
                  type="date"
                  value={formData.visa_expiry_date}
                  onChange={handleChange}
                />
                <Input
                  label="Relocation Preference"
                  name="relocation_preference"
                  value={formData.relocation_preference}
                  onChange={handleChange}
                  placeholder="Open to relocation / Remote only"
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
                    label="Total Experience (Years)"
                    name="total_experience_years"
                    type="number"
                    step="0.5"
                    value={formData.total_experience_years}
                    onChange={handleChange}
                    placeholder="5.0"
                  />
                  <Input
                    label="Preferred Roles"
                    name="preferred_roles"
                    value={formData.preferred_roles}
                    onChange={handleChange}
                    placeholder="Full Stack Developer, Java Developer"
                  />
                </div>
                <Textarea
                  label="Primary Skills"
                  name="skills_primary"
                  value={formData.skills_primary}
                  onChange={handleChange}
                  placeholder="Java, Spring Boot, Microservices, AWS..."
                  rows={3}
                />
                <Textarea
                  label="Secondary Skills"
                  name="skills_secondary"
                  value={formData.skills_secondary}
                  onChange={handleChange}
                  placeholder="Docker, Kubernetes, Jenkins..."
                  rows={3}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Hourly Pay Rate ($)"
                  name="hourly_pay_rate"
                  type="number"
                  step="0.01"
                  value={formData.hourly_pay_rate}
                  onChange={handleChange}
                  placeholder="75.00"
                />
                <Input
                  label="Annual Salary ($)"
                  name="salary_annual"
                  type="number"
                  step="1000"
                  value={formData.salary_annual}
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
                  label="Bench Status"
                  name="bench_status"
                  value={formData.bench_status}
                  onChange={handleChange}
                  options={[
                    { value: 'available', label: 'Available' },
                    { value: 'on_bench', label: 'On Bench' },
                    { value: 'placed', label: 'Placed' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
                <Textarea
                  label="Internal Notes"
                  name="notes_internal"
                  value={formData.notes_internal}
                  onChange={handleChange}
                  placeholder="Add any internal notes about this candidate..."
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
