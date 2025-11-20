'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-2 text-gray-600">Manage billing and payments</p>
        </div>
        <Button>➕ New Invoice</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-gray-500">
            <p className="text-lg mb-4">💰 Invoices Module - Coming Soon</p>
            <p className="text-sm">
              This module will generate invoices and track payments.
            </p>
            <p className="text-sm mt-2 text-gray-400">
              Pattern: Follow Candidates module + add PDF generation
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
