'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { signOut } from '@/lib/supabase/auth';

export default function SettingsPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Configure system settings and team management</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Team Settings */}
        <Link href="/settings/team">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">View and edit your team details</p>
              <Button variant="outline" size="sm">Edit Team →</Button>
            </CardContent>
          </Card>
        </Link>

        {/* Team Members */}
        <Link href="/settings/members">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Manage team members and roles</p>
              <Button variant="outline" size="sm">Manage Members →</Button>
            </CardContent>
          </Card>
        </Link>

        {/* Access Requests */}
        <Link href="/settings/access-requests">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Access Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Review pending team access requests</p>
              <Button variant="outline" size="sm">View Requests →</Button>
            </CardContent>
          </Card>
        </Link>

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
      </div>

      {/* Account Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Logout</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">Sign out of your account</p>
            <Button
              variant="danger"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
