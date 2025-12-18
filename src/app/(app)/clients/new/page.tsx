'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function NewClientPage() {
  const router = useRouter();
  const { user } = useAuth(); // teamId no longer needed - handled server-side
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    clientName: '',
    industry: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    paymentTerms: '',
    paymentTermsDays: '',
    website: '',
    notes: '',
    isActive: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.user_id) {
      alert('User authentication required. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      // Prepare data for insertion (team_id will be set server-side)
      const clientData = {
        clientName: formData.clientName,
        industry: formData.industry || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        country: formData.country || undefined,
        primaryContactName: formData.primaryContactName || undefined,
        primaryContactEmail: formData.primaryContactEmail || undefined,
        primaryContactPhone: formData.primaryContactPhone || undefined,
        paymentTerms: formData.paymentTerms || undefined,
        paymentTermsDays: formData.paymentTermsDays ? parseInt(formData.paymentTermsDays) : undefined,
        website: formData.website || undefined,
        notes: formData.notes || undefined,
        isActive: formData.isActive,
      };

      // Call API with fetch
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert('Error creating client: ' + (errorData.error || 'Unknown error'));
        setLoading(false);
        return;
      }

      const result = await response.json();

      // Check for duplicates
      if (result.duplicate && result.matches && result.matches.length > 0) {
        setLoading(false);
        const confirmed = window.confirm(
          `A similar client "${(result.matches as any)[0].client_name}" already exists. Do you want to create anyway?`
        );

        if (confirmed) {
          setLoading(true);
          // Create with duplicate check skipped
          const forceResponse = await fetch('/api/clients?skipDuplicateCheck=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData),
          });
          if (!forceResponse.ok) {
            const errorData = await forceResponse.json();
            alert('Error creating client: ' + (errorData.error || 'Unknown error'));
            setLoading(false);
            return;
          }
          const forceResult = await forceResponse.json();
          if (forceResult.data) {
            router.push(`/clients/${forceResult.data.client_id}`);
          }
        }
      } else if (result.data) {
        // Redirect to client detail page
        router.push(`/clients/${result.data.client_id}`);
      }
    } catch (error: any) {
      console.error('Error creating client:', error);
      alert('Error creating client: ' + (error.message || 'Unknown error'));
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Client</h1>
          <p className="mt-2 text-gray-600">Enter client information</p>
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
                <Input
                  label="Client Name"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  required
                  placeholder="Acme Corporation"
                />
                <Input
                  label="Industry"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  placeholder="Technology, Finance, Healthcare, etc."
                />
                <Input
                  label="Website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://www.example.com"
                />
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Active Client
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Primary Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Primary Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Contact Name"
                  name="primaryContactName"
                  value={formData.primaryContactName}
                  onChange={handleChange}
                  placeholder="Jane Smith"
                />
                <Input
                  label="Contact Email"
                  name="primaryContactEmail"
                  type="email"
                  value={formData.primaryContactEmail}
                  onChange={handleChange}
                  placeholder="jane@example.com"
                />
                <Input
                  label="Contact Phone"
                  name="primaryContactPhone"
                  type="tel"
                  value={formData.primaryContactPhone}
                  onChange={handleChange}
                  placeholder="123-456-7890"
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Street Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Business Ave"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="San Francisco"
                  />
                  <Input
                    label="State"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="CA"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Zip Code"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    placeholder="94105"
                  />
                  <Input
                    label="Country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="USA"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Payment Terms"
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
                  placeholder="Net 30, Net 45, etc."
                />
                <Input
                  label="Payment Terms (Days)"
                  name="paymentTermsDays"
                  type="number"
                  value={formData.paymentTermsDays}
                  onChange={handleChange}
                  placeholder="30"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any internal notes about this client..."
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
              {loading ? 'Creating...' : 'Create Client'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
