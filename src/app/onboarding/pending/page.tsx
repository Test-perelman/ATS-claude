'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

interface Membership {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  team: {
    id: string;
    name: string;
  };
}

export default function PendingApprovalPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(true);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  if (!loading && !user) {
    router.push('/auth/login');
    return null;
  }

  // Redirect if user already has an approved membership
  if (!loading && user?.team_id) {
    router.push('/dashboard');
    return null;
  }

  useEffect(() => {
    if (user?.user_id) {
      fetchMembership();
      // Poll for approval every 5 seconds
      const interval = setInterval(fetchMembership, 5000);
      return () => clearInterval(interval);
    }
  }, [user?.user_id]);

  const fetchMembership = async () => {
    try {
      const response = await fetch('/api/memberships');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load membership status');
        setLoadingMembership(false);
        return;
      }

      // Get the pending membership (should be only one)
      const pending = data.data.pending[0];

      if (!pending) {
        // No pending membership found - this shouldn't happen
        setError('No pending membership found. Please contact support.');
        setLoadingMembership(false);
        return;
      }

      setMembership(pending);
      setLoadingMembership(false);

      // If membership was approved while on this page, redirect to dashboard
      if (pending.status === 'approved') {
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load membership status');
      setLoadingMembership(false);
    }
  };

  if (loading || loadingMembership) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
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
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Request Sent</h1>
          <p className="text-gray-600">
            Your request to join{' '}
            <span className="font-semibold text-gray-900">{membership?.team.name}</span> is
            pending approval.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Status Card */}
        {membership && (
          <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Team</p>
                <p className="text-lg font-semibold text-gray-900">{membership.team.name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>
                  <p className="text-lg font-semibold text-yellow-700">Pending Approval</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Requested on</p>
                <p className="text-sm text-gray-900">
                  {new Date(membership.requested_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>What happens next?</strong>
          </p>
          <p className="text-sm text-blue-800 mt-2">
            A team administrator will review your request and approve or decline your access. Once
            approved, you'll gain immediate access to the team's data and can start collaborating.
          </p>
          <p className="text-sm text-blue-800 mt-3">
            We'll automatically refresh this page when a decision is made, but you can also refresh
            manually.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => fetchMembership()}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
          >
            Refresh Status
          </button>

          <button
            onClick={() => router.push('/auth/login')}
            className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
          >
            Sign Out
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Page automatically checks for updates every 5 seconds
        </p>
      </div>
    </div>
  );
}
