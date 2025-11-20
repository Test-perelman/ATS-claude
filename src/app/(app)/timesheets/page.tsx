'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function TimesheetsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
          <p className="mt-2 text-gray-600">Track hours and approvals</p>
        </div>
        <Button>➕ New Timesheet</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timesheet Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-gray-500">
            <p className="text-lg mb-4">🕐 Timesheets Module - Coming Soon</p>
            <p className="text-sm">
              This module will track weekly hours and client approvals.
            </p>
            <p className="text-sm mt-2 text-gray-400">
              Pattern: Weekly view + approval workflow + link to invoices
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
