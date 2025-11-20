'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { createVendor } from '@/lib/api/vendors';

export default function NewVendorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    vendor_name: '',
    tier_level: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA',
    payment_terms: '',
    payment_terms_days: '',
    w9_received: false,
    msa_signed: false,
    msa_expiry_date: '',
    ein: '',
    notes_internal: '',
    is_active: true,
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
      // Prepare data for insertion
      const vendorData: any = {
        vendor_name: formData.vendor_name,
        tier_level: formData.tier_level || null,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        website: formData.website || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        country: formData.country || null,
        payment_terms: formData.payment_terms || null,
        payment_terms_days: formData.payment_terms_days ? parseInt(formData.payment_terms_days) : null,
        w9_received: formData.w9_received,
        msa_signed: formData.msa_signed,
        msa_expiry_date: formData.msa_expiry_date || null,
        ein: formData.ein || null,
        notes_internal: formData.notes_internal || null,
        is_active: formData.is_active,
      };

      const result = await createVendor(vendorData);

      if (result.error) {
        throw result.error;
      }

      // Check for duplicates
      if (result.duplicate && result.matches && result.matches.length > 0) {
        const confirmed = window.confirm(
          `A similar vendor "${result.matches[0].vendor_name}" already exists. Do you want to create anyway?`
        );

        if (confirmed) {
          // Create with duplicate check skipped
          const forceResult = await createVendor(vendorData, undefined, { skipDuplicateCheck: true });
          if (forceResult.error) throw forceResult.error;
          if (forceResult.data) {
            router.push(`/vendors/${forceResult.data.vendor_id}`);
          }
        }
      } else if (result.data) {
        // Redirect to vendor detail page
        router.push(`/vendors/${result.data.vendor_id}`);
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
                  name="vendor_name"
                  value={formData.vendor_name}
                  onChange={handleChange}
                  required
                  placeholder="Acme Staffing Solutions"
                />
                <Select
                  label="Tier Level"
                  name="tier_level"
                  value={formData.tier_level}
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
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
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
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  placeholder="John Doe"
                />
                <Input
                  label="Contact Email"
                  name="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                />
                <Input
                  label="Contact Phone"
                  name="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
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
                    name="zip_code"
                    value={formData.zip_code}
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
                    name="payment_terms"
                    value={formData.payment_terms}
                    onChange={handleChange}
                    placeholder="Net 30, Net 45, etc."
                  />
                  <Input
                    label="Payment Terms (Days)"
                    name="payment_terms_days"
                    type="number"
                    value={formData.payment_terms_days}
                    onChange={handleChange}
                    placeholder="30"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center pt-6">
                    <input
                      type="checkbox"
                      id="w9_received"
                      name="w9_received"
                      checked={formData.w9_received}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label htmlFor="w9_received" className="text-sm font-medium text-gray-700">
                      W9 Received
                    </label>
                  </div>
                  <div className="flex items-center pt-6">
                    <input
                      type="checkbox"
                      id="msa_signed"
                      name="msa_signed"
                      checked={formData.msa_signed}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label htmlFor="msa_signed" className="text-sm font-medium text-gray-700">
                      MSA Signed
                    </label>
                  </div>
                </div>
                {formData.msa_signed && (
                  <Input
                    label="MSA Expiry Date"
                    name="msa_expiry_date"
                    type="date"
                    value={formData.msa_expiry_date}
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
                name="notes_internal"
                value={formData.notes_internal}
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
