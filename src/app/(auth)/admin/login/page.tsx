'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { adminSignIn } from '@/lib/supabase/auth';

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (searchParams.get('success')) {
      setSuccess(true);
      // Clear success message after 5 seconds
      const timeout = setTimeout(() => setSuccess(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [searchParams]);

  // Handle redirect after successful login
  useEffect(() => {
    if (redirectUrl) {
      console.log('useEffect: Performing redirect to:', redirectUrl);
      // Use window.location for full page reload to ensure session cookies propagate to middleware
      window.location.href = redirectUrl;
    }
  }, [redirectUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (!formData.email || !formData.password) {
        setError('Please enter your email and password');
        setLoading(false);
        return;
      }

      console.log('Starting login with email:', formData.email);
      const result = await adminSignIn(formData.email, formData.password);
      console.log('Login result:', result);

      if ('error' in result && result.error) {
        console.error('Login failed with error:', result.error);
        setError(result.error);
        setLoading(false);
        return;
      }

      // Success - redirect to appropriate page
      // If user has team, go to dashboard; otherwise go to access-request
      const hasTeam = (result as any).user?.team_id;
      console.log('Login successful. User:', (result as any).user);
      console.log('Has team:', hasTeam);
      const url = hasTeam ? '/dashboard' : '/access-request';
      console.log('Setting redirect URL to:', url);
      setLoading(false);
      setRedirectUrl(url);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Login</h2>

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">Account created successfully! You can now sign in.</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="you@example.com"
            disabled={loading}
            autoComplete="email"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your password"
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      {/* Sign up link */}
      <p className="text-center text-gray-600 text-sm mt-6">
        Don't have an account?{' '}
        <Link href="/admin/signup" className="text-blue-600 hover:underline font-medium">
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-gray-600">Loading...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
