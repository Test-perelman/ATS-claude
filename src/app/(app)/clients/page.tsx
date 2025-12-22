'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { TeamFilter } from '@/components/ui/TeamFilter';
import { formatDate } from '@/lib/utils/format';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function ClientsPage() {
  const { user, isMasterAdmin, teamId } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  useEffect(() => {
    if (user?.user_id) {
      loadClients();
    }
  }, [search, industryFilter, statusFilter, teamFilter, isMasterAdmin, teamId, user]);

  async function loadClients() {
    if (!user?.user_id) {
      console.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (industryFilter) params.append('industry', industryFilter);
      if (statusFilter === 'active') params.append('isActive', 'true');
      if (statusFilter === 'inactive') params.append('isActive', 'false');
      if (teamFilter) params.append('teamId', teamFilter);

      const response = await fetch(`/api/clients?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error loading clients:', response.statusText);
        setClients([]);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setClients(result.data || []);
      } else {
        console.error('Error loading clients:', result.error);
        setClients([]);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="mt-2 text-gray-600">Manage your client relationships</p>
        </div>
        <Link href="/clients/new">
          <Button>
            ➕ Add Client
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <Input
              placeholder="Search by name, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Input
              placeholder="Industry"
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            {isMasterAdmin && (
              <TeamFilter
                value={teamFilter}
                onChange={setTeamFilter}
                allOptionLabel="All Companies"
              />
            )}
            <Button variant="outline" onClick={loadClients}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            {clients.length} Clients {search && `matching "${search}"`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No clients found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Client Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Contact Person</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Industry</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    {isMasterAdmin && (
                      <th className="px-4 py-3 text-left text-sm font-semibold">Company</th>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-semibold">Added</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>{client.contact_name || '-'}</div>
                        <div className="text-gray-500 text-xs">{client.contact_email || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="default">{client.industry || '-'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {'-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="status"
                          status={client.status || 'inactive'}
                        />
                      </td>
                      {isMasterAdmin && (
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">Team {client.team_id}</span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(client.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/clients/${client.id}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
