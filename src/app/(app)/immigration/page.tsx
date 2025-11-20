'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ImmigrationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Immigration & Compliance</h1>
          <p className="mt-2 text-gray-600">Track visa status and compliance</p>
        </div>
        <Button>➕ Add Record</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Immigration Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-gray-500">
            <p className="text-lg mb-4">🛂 Immigration Module - Coming Soon</p>
            <p className="text-sm">
              This module will track visa expiries and compliance documents.
            </p>
            <p className="text-sm mt-2 text-gray-400">
              Pattern: Alert system + document management + link to candidates
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
