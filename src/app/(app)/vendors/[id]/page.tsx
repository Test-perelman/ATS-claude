'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Timeline } from '@/components/common/Timeline';
import { getVendorTimeline } from '@/lib/utils/timeline';
import { formatDate, formatPhoneNumber } from '@/lib/utils/format';

export default function VendorDetailPage() {
    const params = useParams();
    const router = useRouter();
    const vendorId = params?.id as string;

    const [vendor, setVendor] = useState<any>(null);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'documents'>('overview');

    useEffect(() => {
        if (vendorId) {
            loadVendor();
            loadTimeline();
        }
    }, [vendorId]);

    async function loadVendor() {
        setLoading(true);
        try {
            const response = await fetch(`/api/vendors/${vendorId}`);
            if (!response.ok) throw new Error('Failed to load vendor');
            const { data } = await response.json();
            setVendor(data);
        } catch (error) {
            console.error('Error loading vendor:', error);
            setVendor(null);
        } finally {
            setLoading(false);
        }
    }

    async function loadTimeline() {
        const timelineData = await getVendorTimeline(vendorId);
        setTimeline(timelineData);
    }

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="text-gray-500">Vendor not found</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {vendor.vendor_name}
                    </h1>
                    <div className="mt-2 flex items-center space-x-4">
                        <Badge variant="status" status={vendor.is_active ? 'active' : 'inactive'} />
                        <Badge>{vendor.tier_level}</Badge>
                        <span className="text-gray-600">
                            Added {formatDate(vendor.created_at)}
                        </span>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => router.back()}>
                        ← Back
                    </Button>
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
                            <CardTitle>Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-3">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Contact Name</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {vendor.contact_name || '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {vendor.contact_email ? (
                                            <a
                                                href={`mailto:${vendor.contact_email}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {vendor.contact_email}
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {formatPhoneNumber(vendor.contact_phone)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Website</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {vendor.website ? (
                                            <a
                                                href={vendor.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                            >
                                                Visit Website
                                            </a>
                                        ) : (
                                            '-'
                                        )}
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
                                    <dt className="text-sm font-medium text-gray-500">Tier Level</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {vendor.tier_level || '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Payment Terms</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {vendor.payment_terms || '-'}
                                        {vendor.payment_terms_days && ` (${vendor.payment_terms_days} days)`}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">W9 Received</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        <Badge variant="status" status={vendor.w9_received ? 'active' : 'inactive'}>
                                            {vendor.w9_received ? 'Yes' : 'No'}
                                        </Badge>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">MSA Signed</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        <Badge variant="status" status={vendor.msa_signed ? 'active' : 'inactive'}>
                                            {vendor.msa_signed ? 'Yes' : 'No'}
                                        </Badge>
                                    </dd>
                                </div>
                                {vendor.msa_expiry_date && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">MSA Expiry Date</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {formatDate(vendor.msa_expiry_date)}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </CardContent>
                    </Card>

                    {/* Address */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Address</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-3">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Street Address</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {vendor.address || '-'}
                                    </dd>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">City</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {vendor.city || '-'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">State</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {vendor.state || '-'}
                                        </dd>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Zip Code</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {vendor.zip_code || '-'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Country</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {vendor.country || '-'}
                                        </dd>
                                    </div>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>

                    {/* Tax Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Tax Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-3">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">EIN (Tax ID)</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {vendor.ein ? `**-***${vendor.ein.slice(-4)}` : '-'}
                                    </dd>
                                </div>
                            </dl>
                        </CardContent>
                    </Card>

                    {/* Internal Notes */}
                    {vendor.notes_internal && (
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Internal Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                    {vendor.notes_internal}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Metadata */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Record Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {formatDate(vendor.created_at)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {formatDate(vendor.updated_at)}
                                    </dd>
                                </div>
                                {vendor.created_by_user && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Created By</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {vendor.created_by_user.username}
                                        </dd>
                                    </div>
                                )}
                                {vendor.updated_by_user && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Updated By</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {vendor.updated_by_user.username}
                                        </dd>
                                    </div>
                                )}
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
