'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { getVendors } from '@/lib/api/vendors';
import { formatDate, formatPhoneNumber } from '@/lib/utils/format';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadVendors();
  }, [search, tierFilter, statusFilter]);

  async function loadVendors() {
    setLoading(true);
    const result = await getVendors({
      search: search || undefined,
      tierLevel: tierFilter || undefined,
      isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
    });
    if ('error' in result) {
      console.error('Error loading vendors:', result.error);
      setVendors([]);
    } else {
      setVendors(result.data.vendors || []);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
          <p className="mt-2 text-gray-600">Manage your vendor relationships</p>
        </div>
        <Link href="/vendors/new">
          <Button>
            ➕ Add Vendor
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Input
              placeholder="Search by name, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              options={[
                { value: '', label: 'All Tiers' },
                { value: 'Tier 1', label: 'Tier 1' },
                { value: 'Tier 2', label: 'Tier 2' },
                { value: 'Tier 3', label: 'Tier 3' },
                { value: 'MSP', label: 'MSP' },
                { value: 'Direct', label: 'Direct' },
              ]}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <Button variant="outline" onClick={loadVendors}>
              🔍 Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            {vendors.length} Vendors {search && `matching "${search}"`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : vendors.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No vendors found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Vendor Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Contact Person</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Tier</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Added</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vendors.map((vendor) => (
                    <tr key={vendor.vendor_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/vendors/${vendor.vendor_id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {vendor.vendor_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>{vendor.contact_name || '-'}</div>
                        <div className="text-gray-500 text-xs">{vendor.contact_email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge>{vendor.tier_level || '-'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatPhoneNumber(vendor.contact_phone)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="status"
                          status={vendor.is_active ? 'active' : 'inactive'}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(vendor.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/vendors/${vendor.vendor_id}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
