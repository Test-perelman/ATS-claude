'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function InterviewsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Interviews</h1>
          <p className="mt-2 text-gray-600">Schedule and track interviews</p>
        </div>
        <Button>➕ Schedule Interview</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interview Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-gray-500">
            <p className="text-lg mb-4">📅 Interviews Module - Coming Soon</p>
            <p className="text-sm">
              This module will manage interview scheduling and results tracking.
            </p>
            <p className="text-sm mt-2 text-gray-400">
              Pattern: Add calendar view + follow Candidates module for details
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
