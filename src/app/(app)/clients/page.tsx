'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="mt-2 text-gray-600">Manage your client relationships</p>
        </div>
        <Button>➕ Add Client</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-gray-500">
            <p className="text-lg mb-4">🤝 Client Module - Coming Soon</p>
            <p className="text-sm">
              This module will manage client companies, contacts, MSP portals, and payment terms.
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
