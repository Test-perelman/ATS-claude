'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/lib/contexts/AuthContext';
import { apiPost, apiGet, apiPut, apiDelete } from '@/lib/api-client';

export default function AccessRequestPage() {
  const router = useRouter();
  const { user, requestStatus, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    companyEmail: '',
    reason: '',
  });

  // If user already has team access, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user && !requestStatus) {
      // They have access, redirect
      router.push('/dashboard');
    }
  }, [authLoading, user, requestStatus, router]);

  // Pre-fill user info if available
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email || '',
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.companyEmail) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/access-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          companyEmail: formData.companyEmail,
          reason: formData.reason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to submit access request');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        companyEmail: '',
        reason: '',
      });

      // Redirect after success
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Access request error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // If user has pending request, show status
  if (requestStatus === 'pending') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Access Request Pending</h1>
          <p className="mt-2 text-gray-600">Your request is being reviewed by the admin</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Pending Review</p>
                <p className="text-sm text-gray-600">
                  Your access request is being reviewed. You will receive an email notification once it's approved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If request was rejected
  if (requestStatus === 'rejected') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Access Request Denied</h1>
          <p className="mt-2 text-gray-600">Your request has been denied</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-2xl">✕</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Request Denied</p>
                <p className="text-sm text-gray-600">
                  Your access request has been denied. Please contact your administrator for more information.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Request Team Access</h1>
        <p className="mt-2 text-gray-600">
          Submit a request to join your company's team. Your request will be reviewed by the team administrator.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">
                Your access request has been submitted successfully. The team admin will review it shortly.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John"
                disabled={loading}
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Doe"
                disabled={loading}
              />
            </div>

            {/* Personal Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Personal Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your.email@gmail.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            {/* Company Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Email *
              </label>
              <input
                type="email"
                name="companyEmail"
                value={formData.companyEmail}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="john@company.com"
                disabled={loading}
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Access (optional)
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tell the admin why you need access to the system..."
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card>
        <CardHeader>
          <CardTitle>What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            1. Your access request will be sent to your company's team administrator for review
          </p>
          <p>
            2. The administrator will review your request and either approve or deny it
          </p>
          <p>
            3. You will receive an email notification once your request has been processed
          </p>
          <p>
            4. Once approved, you will have full access to the system on your next login
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
