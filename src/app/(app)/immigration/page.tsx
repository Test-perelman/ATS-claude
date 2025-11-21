'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { getImmigrationRecords } from '@/lib/api/immigration';
import { formatDate } from '@/lib/utils/format';

export default function ImmigrationPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visaTypeFilter, setVisaTypeFilter] = useState('');

  useEffect(() => {
    loadRecords();
  }, [visaTypeFilter]);

  async function loadRecords() {
    setLoading(true);
    const { data } = await getImmigrationRecords({
      visaType: visaTypeFilter || undefined,
    });
    setRecords(data || []);
    setLoading(false);
  }

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryBadge = (expiryDate: string) => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days < 0) return { variant: 'error' as const, label: 'Expired' };
    if (days <= 30) return { variant: 'error' as const, label: `${days} days` };
    if (days <= 90) return { variant: 'warning' as const, label: `${days} days` };
    return { variant: 'success' as const, label: `${days} days` };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Immigration</h1>
          <p className="mt-2 text-gray-600">Track visa status and compliance</p>
        </div>
        <Button>Add Immigration Record</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              value={visaTypeFilter}
              onChange={(e) => setVisaTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'All Visa Types' },
                { value: 'H1B', label: 'H1B' },
                { value: 'L1', label: 'L1' },
                { value: 'F1-OPT', label: 'F1-OPT' },
                { value: 'F1-CPT', label: 'F1-CPT' },
                { value: 'TN', label: 'TN' },
                { value: 'EAD', label: 'EAD' },
                { value: 'Green Card', label: 'Green Card' },
              ]}
            />
            <Button variant="outline" onClick={loadRecords}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{records.length} Immigration Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No immigration records found. Add your first record!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Candidate</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Visa Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Petition #</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Visa Expiry</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">I-94 Expiry</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map((record) => {
                    const expiryBadge = getExpiryBadge(record.visa_expiry_date);
                    return (
                      <tr key={record.immigration_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {record.candidate ? (
                            <Link
                              href={`/candidates/${record.candidate.candidate_id}`}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {record.candidate.first_name} {record.candidate.last_name}
                            </Link>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="info">{record.visa_type}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">{record.petition_number || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div>{formatDate(record.visa_expiry_date)}</div>
                          <Badge variant={expiryBadge.variant} className="mt-1">
                            {expiryBadge.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {record.i94_expiry_date ? formatDate(record.i94_expiry_date) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              getDaysUntilExpiry(record.visa_expiry_date) > 90
                                ? 'success'
                                : getDaysUntilExpiry(record.visa_expiry_date) > 0
                                ? 'warning'
                                : 'error'
                            }
                          >
                            {getDaysUntilExpiry(record.visa_expiry_date) > 0 ? 'Active' : 'Expired'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
