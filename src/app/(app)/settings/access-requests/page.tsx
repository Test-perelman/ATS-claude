'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getAccessRequests } from '@/lib/api/teams';

export default function AccessRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | undefined>(
    'pending'
  );

  useEffect(() => {
    loadRequests();
  }, [filter]);

  async function loadRequests() {
    try {
      setLoading(true);
      setError('');
      const result = await getAccessRequests(filter);

      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }

      setRequests(result.data || []);
    } catch (err) {
      setError('Failed to load access requests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(requestId: string) {
    try {
      setApproving(requestId);
      const response = await fetch(`/api/access-requests/${requestId}/approve`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to approve request');
        setApproving(null);
        return;
      }

      setSuccess('Request approved successfully!');
      setTimeout(() => {
        setSuccess('');
        loadRequests();
      }, 2000);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
      setApproving(null);
    }
  }

  async function handleReject(requestId: string) {
    try {
      setApproving(requestId);
      const response = await fetch(`/api/access-requests/${requestId}/reject`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to reject request');
        setApproving(null);
        return;
      }

      setSuccess('Request rejected successfully!');
      setTimeout(() => {
        setSuccess('');
        loadRequests();
      }, 2000);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
      setApproving(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Access Requests</h1>
        <p className="mt-2 text-gray-600">Review and approve team member access requests</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        {(['pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === status
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{filter ? `${filter.charAt(0).toUpperCase() + filter.slice(1)}` : 'All'} Requests ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No {filter} access requests
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.request_id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-900">
                        {request.first_name} {request.last_name}
                      </h3>
                      <Badge
                        variant={
                          request.status === 'pending'
                            ? 'warning'
                            : request.status === 'approved'
                            ? 'success'
                            : 'error'
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      <strong>Email:</strong> {request.email}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Company Email:</strong> {request.company_email}
                    </p>
                    {request.reason && (
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Reason:</strong> {request.reason}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Requested:{' '}
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  {request.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApprove(request.request_id)}
                        disabled={approving === request.request_id}
                      >
                        {approving === request.request_id ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(request.request_id)}
                        disabled={approving === request.request_id}
                      >
                        {approving === request.request_id ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
