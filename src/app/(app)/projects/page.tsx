'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="mt-2 text-gray-600">Manage active placements</p>
        </div>
        <Button>➕ New Project</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-gray-500">
            <p className="text-lg mb-4">💼 Projects Module - Coming Soon</p>
            <p className="text-sm">
              This module will manage consultant placements and project tracking.
            </p>
            <p className="text-sm mt-2 text-gray-400">
              Pattern: Follow Candidates module + link to timesheets/invoices
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
