'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Membership {
  id: string;
  user_id: string;
  team_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  user: {
    id: string;
    email: string;
  };
  team: {
    id: string;
    name: string;
  };
}

export default function AccessRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requests, setRequests] = useState<Membership[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadRequests();
    loadRoles();
  }, []);

  async function loadRequests() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/admin/pending-memberships', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result.error || 'Failed to load access requests');
        setLoading(false);
        return;
      }

      const result = await response.json();
      setRequests(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load access requests');
    } finally {
      setLoading(false);
    }
  }

  async function loadRoles() {
    try {
      const response = await fetch('/api/admin/roles', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setAvailableRoles(result.data || []);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  }

  async function handleApprove(membership: Membership) {
    if (!selectedRole) {
      setError('Please select a role to assign');
      return;
    }

    try {
      setProcessing(membership.id);
      const response = await fetch('/api/admin/approve-membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          membershipId: membership.id,
          roleId: selectedRole,
          message: `Welcome to the team!`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to approve request');
        setProcessing(null);
        return;
      }

      setSuccess('Request approved successfully! User can now access the team.');
      setShowRoleModal(false);
      setSelectedRole('');
      setSelectedMembership(null);
      setTimeout(() => {
        setSuccess('');
        loadRequests();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setProcessing(null);
    }
  }

  async function handleReject(membership: Membership) {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessing(membership.id);
      const response = await fetch('/api/admin/reject-membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          membershipId: membership.id,
          reason: rejectionReason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to reject request');
        setProcessing(null);
        return;
      }

      setSuccess('Request rejected successfully!');
      setRejectionReason('');
      setShowRejectModal(false);
      setSelectedMembership(null);
      setTimeout(() => {
        setSuccess('');
        loadRequests();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setProcessing(null);
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
        <h1 className="text-3xl font-bold text-gray-900">Member Approval</h1>
        <p className="mt-2 text-gray-600">Review and approve pending membership requests</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No pending membership requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((membership) => (
                <div
                  key={membership.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-900">{membership.user.email}</h3>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Requested on{' '}
                      {new Date(membership.requested_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        setSelectedMembership(membership);
                        setShowRoleModal(true);
                        setError('');
                      }}
                      disabled={processing === membership.id}
                    >
                      {processing === membership.id ? 'Processing...' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedMembership(membership);
                        setShowRejectModal(true);
                        setRejectionReason('');
                        setError('');
                      }}
                      disabled={processing === membership.id}
                    >
                      {processing === membership.id ? 'Processing...' : 'Reject'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Selection Modal */}
      {showRoleModal && selectedMembership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Assign Role</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select a role for {selectedMembership.user.email}:
            </p>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            >
              <option value="">Choose a role...</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedMembership(null);
                  setSelectedRole('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(selectedMembership)}
                disabled={!selectedRole || processing === selectedMembership.id}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {processing === selectedMembership.id ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && selectedMembership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Reject Request</h2>
            <p className="text-sm text-gray-600 mb-4">
              Provide a reason for rejecting {selectedMembership.user.email}:
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Does not meet team requirements"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={3}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedMembership(null);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedMembership)}
                disabled={!rejectionReason.trim() || processing === selectedMembership.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processing === selectedMembership.id ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
