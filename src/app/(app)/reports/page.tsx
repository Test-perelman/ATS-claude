'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="mt-2 text-gray-600">View insights and performance metrics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-gray-500">
            <p className="text-lg mb-4">📈 Reports Module - Coming Soon</p>
            <p className="text-sm">
              This module will show analytics, charts, and custom reports.
            </p>
            <p className="text-sm mt-2 text-gray-400">
              Pattern: Use recharts for visualizations + export to PDF/Excel
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
