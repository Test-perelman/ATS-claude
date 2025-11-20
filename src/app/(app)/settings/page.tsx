'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Configure system settings</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-6 text-center text-gray-500">
              <p className="text-sm">Manage system users and roles</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles & Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-6 text-center text-gray-500">
              <p className="text-sm">Configure role-based access control</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Config Dropdowns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-6 text-center text-gray-500">
              <p className="text-sm">Manage dropdown options system-wide</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-6 text-center text-gray-500">
              <p className="text-sm">View system audit trail</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
