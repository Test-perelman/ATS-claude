'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { signOut } from '@/lib/auth-actions';

export default function AccessRequestPage() {
  const searchParams = useSearchParams();
  const teamName = searchParams?.get('team') || 'the team';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl">Access Request Pending</CardTitle>
          <CardDescription>
            Your request to join <span className="font-semibold text-purple-600">{teamName}</span>{' '}
            is awaiting approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">1.</span>
                <span>A team administrator will review your request</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">2.</span>
                <span>You'll receive an email notification once approved</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">3.</span>
                <span>You can then sign in and access team resources</span>
              </li>
            </ul>
          </div>

          <div className="border-t pt-6 space-y-3">
            <Link href="/team-discovery" className="block">
              <Button variant="outline" className="w-full">
                Request Access to Another Team
              </Button>
            </Link>
            <Button variant="ghost" onClick={handleSignOut} className="w-full">
              Sign Out
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            Need help? Contact your platform administrator
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
