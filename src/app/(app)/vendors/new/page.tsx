'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth } from '@/lib/contexts/AuthContext';
import { apiPost, apiGet, apiPut, apiDelete } from '@/lib/api-client';

export default function NewVendorPage() {
  const router = useRouter();
  const { user, teamId } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    vendorName: '',
    tierLevel: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    paymentTerms: '',
    paymentTermsDays: '',
    w9Received: false,
    msaSigned: false,
    msaExpiryDate: '',
    ein: '',
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
    setLoading(true);

    try {
      if (!teamId || !user?.user_id) {
        throw new Error('User or team information not available');
      }

      // Prepare data for insertion
      const vendorData: any = {
        vendorName: formData.vendorName,
        tierLevel: formData.tierLevel || undefined,
        contactName: formData.contactName || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        website: formData.website || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        country: formData.country || undefined,
        paymentTerms: formData.paymentTerms || undefined,
        paymentTermsDays: formData.paymentTermsDays ? parseInt(formData.paymentTermsDays) : undefined,
        w9Received: formData.w9Received,
        msaSigned: formData.msaSigned,
        msaExpiryDate: formData.msaExpiryDate || undefined,
        ein: formData.ein || undefined,
        notes: formData.notes || undefined,
        isActive: formData.isActive,
      };

      const response = await apiPost('/api/vendors', vendorData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create vendor');
      }

      const result = await response.json();

      // Check for duplicates
      if (result.duplicate && result.matches && result.matches.length > 0) {
        const confirmed = window.confirm(
          `A similar vendor "${(result.matches as any)[0].vendor_name}" already exists. Do you want to create anyway?`
        );

        if (confirmed) {
          // Create with duplicate check skipped
          const forceResponse = await apiPost('/api/vendors?skipDuplicateCheck=true', vendorData);
          if (!forceResponse.ok) {
            const errorData = await forceResponse.json();
            throw new Error(errorData.error || 'Failed to create vendor');
          }
          const forceResult = await forceResponse.json();
          if (forceResult.data) {
            router.push(`/vendors/${(forceResult.data as any).vendor_id}`);
          }
        }
      } else if (result.data) {
        // Redirect to vendor detail page
        router.push(`/vendors/${(result.data as any).vendor_id}`);
      }
    } catch (error: any) {
      console.error('Error creating vendor:', error);
      alert('Error creating vendor: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Vendor</h1>
          <p className="mt-2 text-gray-600">Enter vendor information</p>
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
                  label="Vendor Name"
                  name="vendorName"
                  value={formData.vendorName}
                  onChange={handleChange}
                  required
                  placeholder="Acme Staffing Solutions"
                />
                <Select
                  label="Tier Level"
                  name="tierLevel"
                  value={formData.tierLevel}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select Tier Level' },
                    { value: 'Tier 1', label: 'Tier 1' },
                    { value: 'Tier 2', label: 'Tier 2' },
                    { value: 'Tier 3', label: 'Tier 3' },
                    { value: 'MSP', label: 'MSP' },
                    { value: 'Direct', label: 'Direct' },
                  ]}
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
                    Active Vendor
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Contact Name"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  placeholder="John Doe"
                />
                <Input
                  label="Contact Email"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="john@example.com"
                />
                <Input
                  label="Contact Phone"
                  name="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
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
                  placeholder="123 Main Street"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="New York"
                  />
                  <Input
                    label="State"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="NY"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Zip Code"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    placeholder="10001"
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

          {/* Business Details */}
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center pt-6">
                    <input
                      type="checkbox"
                      id="w9Received"
                      name="w9Received"
                      checked={formData.w9Received}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label htmlFor="w9Received" className="text-sm font-medium text-gray-700">
                      W9 Received
                    </label>
                  </div>
                  <div className="flex items-center pt-6">
                    <input
                      type="checkbox"
                      id="msaSigned"
                      name="msaSigned"
                      checked={formData.msaSigned}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label htmlFor="msaSigned" className="text-sm font-medium text-gray-700">
                      MSA Signed
                    </label>
                  </div>
                </div>
                {formData.msaSigned && (
                  <Input
                    label="MSA Expiry Date"
                    name="msaExpiryDate"
                    type="date"
                    value={formData.msaExpiryDate}
                    onChange={handleChange}
                  />
                )}
                <Input
                  label="EIN (Tax ID)"
                  name="ein"
                  value={formData.ein}
                  onChange={handleChange}
                  placeholder="12-3456789"
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
                placeholder="Add any internal notes about this vendor..."
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
              {loading ? 'Creating...' : 'Create Vendor'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
