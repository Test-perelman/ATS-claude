'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Timeline } from '@/components/common/Timeline';
import { getClientTimeline } from '@/lib/utils/timeline';
import { formatDate, formatPhoneNumber } from '@/lib/utils/format';

export default function ClientDetailPage() {
    const params = useParams();
    const clientId = params?.id as string;

    const [client, setClient] = useState<any>(null);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'documents'>('overview');

    useEffect(() => {
        if (clientId) {
            loadClient();
            loadTimeline();
        }
    }, [clientId]);

    async function loadClient() {
        setLoading(true);
        try {
            const response = await fetch(`/api/clients/${clientId}`);
            if (!response.ok) throw new Error('Failed to load client');
            const { data } = await response.json();
            setClient(data);
        } catch (error) {
            console.error('Error loading client:', error);
            setClient(null);
        } finally {
            setLoading(false);
        }
    }

    async function loadTimeline() {
        const timelineData = await getClientTimeline(clientId);
        setTimeline(timelineData);
    }

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="text-gray-500">Client not found</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {client.client_name}
                    </h1>
                    <div className="mt-2 flex items-center space-x-4">
                        <Badge variant="status" status={client.is_active ? 'active' : 'inactive'} />
                        <Badge>{client.industry}</Badge>
                        <span className="text-gray-600">
                            Added {formatDate(client.created_at)}
                        </span>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline">✏️ Edit</Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'timeline', label: 'Timeline' },
                        { id: 'documents', label: 'Documents' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`border-b-2 px-1 py-4 text-sm font-medium ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Contact Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Primary Contact</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-3">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Contact Name</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {client.primary_contact_name || '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {client.primary_contact_email || '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {formatPhoneNumber(client.primary_contact_phone)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Website</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {client.website ? (
                                            <a
                                                href={client.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                            >
                                                {client.website}
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {client.address || '-'}
                                        {client.city && `, ${client.city}`}
                                        {client.state && `, ${client.state}`}
                                        {client.zip_code && ` ${client.zip_code}`}
                                    </dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>

                    {/* Business Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Business Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-3">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Industry</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {client.industry || '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Payment Terms</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {client.payment_terms || '-'}
                                        {client.payment_terms_days && ` (${client.payment_terms_days} days)`}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">MSP Portal</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {client.msp_portal_name || '-'}
                                        {client.msp_portal_link && (
                                            <a
                                                href={client.msp_portal_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-2 text-blue-600 hover:underline text-xs"
                                            >
                                                (Link)
                                            </a>
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === 'timeline' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Activity Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Timeline items={timeline} />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'documents' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Documents & Attachments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-12 text-gray-500">
                            Document management coming soon...
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
