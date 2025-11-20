'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function VendorsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
          <p className="mt-2 text-gray-600">Manage your vendor relationships</p>
        </div>
        <Button>➕ Add Vendor</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-gray-500">
            <p className="text-lg mb-4">📋 Vendor Module - Coming Soon</p>
            <p className="text-sm">
              This module will manage vendor companies, contacts, tier levels, and payment terms.
            </p>
            <p className="text-sm mt-2 text-gray-400">
              Pattern: Follow the Candidates module implementation
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
