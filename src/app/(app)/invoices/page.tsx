'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { getInvoices } from '@/lib/api/invoices';
import { formatDate, formatCurrency } from '@/lib/utils/format';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  async function loadInvoices() {
    setLoading(true);
    const { data } = await getInvoices({
      status: statusFilter || undefined,
    });
    setInvoices(data || []);
    setLoading(false);
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'success';
      case 'Sent':
        return 'info';
      case 'Overdue':
        return 'error';
      case 'Draft':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-2 text-gray-600">Manage billing and payments</p>
        </div>
        <Button>Create Invoice</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Invoices' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Sent', label: 'Sent' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Overdue', label: 'Overdue' },
              ]}
            />
            <Button variant="outline" onClick={loadInvoices}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{invoices.length} Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No invoices found. Create your first invoice!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Invoice #</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Project</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Invoice Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Due Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((invoice) => (
                    <tr key={invoice.invoice_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{invoice.invoice_number}</td>
                      <td className="px-4 py-3 text-sm">
                        {invoice.client ? (
                          <Link
                            href={`/clients/${invoice.client.client_id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {invoice.client.client_name}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {invoice.project?.project_name || '-'}
                        {invoice.project?.candidate && (
                          <div className="text-gray-500">
                            {invoice.project.candidate.first_name}{' '}
                            {invoice.project.candidate.last_name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(invoice.invoice_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(invoice.invoice_date)}</td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(invoice.payment_due_date)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(invoice.status)}>
                          {invoice.status}
                        </Badge>
                        {invoice.payment_received_date && (
                          <div className="text-xs text-gray-500 mt-1">
                            Paid: {formatDate(invoice.payment_received_date)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline">
                          View
                        </Button>
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
