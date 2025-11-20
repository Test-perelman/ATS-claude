'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function BenchPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bench Management</h1>
          <p className="mt-2 text-gray-600">Track consultants on bench</p>
        </div>
        <Button>➕ Add to Bench</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bench Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-gray-500">
            <p className="text-lg mb-4">📋 Bench Module - Coming Soon</p>
            <p className="text-sm">
              This module will show bench pipeline and history.
            </p>
            <p className="text-sm mt-2 text-gray-400">
              Pattern: Pipeline view + quick actions + filter by availability
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
