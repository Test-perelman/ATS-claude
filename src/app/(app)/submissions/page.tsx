'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function SubmissionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Submissions</h1>
          <p className="mt-2 text-gray-600">Track candidate submissions</p>
        </div>
        <Button>➕ New Submission</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submission Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-gray-500">
            <p className="text-lg mb-4">📤 Submissions Module - Coming Soon</p>
            <p className="text-sm">
              This module will track candidate submissions with pipeline view.
            </p>
            <p className="text-sm mt-2 text-gray-400">
              Pattern: Follow the Candidates module implementation + add pipeline view
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
