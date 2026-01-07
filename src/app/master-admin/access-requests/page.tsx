'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/Select';

interface AccessRequest {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  requested_team_id: string;
  teams?: { id: string; name: string };
  status: string;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
}

export default function MasterAdminAccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/access-requests?status=${statusFilter}`);
      const result = await response.json();
      if (result.success) {
        setRequests(result.data);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async (teamId: string) => {
    try {
      const response = await fetch(`/api/roles?teamId=${teamId}`);
      const result = await response.json();
      if (result.success) {
        setRoles(result.data);
        setSelectedRole(result.data[0]?.id || '');
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleApprove = async (request: AccessRequest) => {
    setSelectedRequest(request);
    await fetchRoles(request.requested_team_id);
    setShowApproveModal(true);
  };

  const handleReject = (request: AccessRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const confirmApprove = async () => {
    if (!selectedRequest || !selectedRole) return;
    try {
      setApproving(true);
      const response = await fetch(`/api/access-requests/${selectedRequest.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: selectedRole }),
      });
      const result = await response.json();
      if (result.success) {
        setShowApproveModal(false);
        fetchRequests();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to approve request');
    } finally {
      setApproving(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;
    try {
      setRejecting(true);
      const response = await fetch(`/api/access-requests/${selectedRequest.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });
      const result = await response.json();
      if (result.success) {
        setShowRejectModal(false);
        setRejectionReason('');
        fetchRequests();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to reject request');
    } finally {
      setRejecting(false);
    }
  };

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'teamName', label: 'Team' },
    { key: 'requesterName', label: 'Name' },
    { key: 'created_at', label: 'Requested' },
  ];

  const formattedRequests = requests.map((req) => ({
    ...req,
    teamName: req.teams?.name || 'Unknown',
    requesterName: req.first_name && req.last_name ? `${req.first_name} ${req.last_name}` : req.email,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Access Requests</CardTitle>
          <CardDescription>Review and manage team access requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>

          <DataTable
            columns={columns}
            data={formattedRequests}
            keyField="id"
            loading={loading}
            emptyMessage={`No ${statusFilter} requests`}
            actions={(row: any) => (
              <div className="flex gap-2">
                {row.status === 'pending' && (
                  <>
                    <Button size="sm" onClick={() => handleApprove(row)}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(row)}>Reject</Button>
                  </>
                )}
                {row.status === 'approved' && <Badge className="bg-green-100">Approved</Badge>}
                {row.status === 'rejected' && <Badge className="bg-red-100">Rejected</Badge>}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Access Request"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Approving {selectedRequest?.email}</p>
          <div>
            <label className="block text-sm font-medium mb-2">Select Role</label>
            <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>Cancel</Button>
            <Button onClick={confirmApprove} disabled={approving}>{approving ? 'Approving...' : 'Approve'}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Access Request"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Rejecting {selectedRequest?.email}</p>
          <div>
            <label className="block text-sm font-medium mb-2">Reason</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button onClick={confirmReject} disabled={rejecting}>{rejecting ? 'Rejecting...' : 'Reject'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}