'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(1); // 1 = company info, 2 = team name
  const [companyName, setCompanyName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not authenticated or already has team
  if (!loading && !user) {
    router.push('/auth/login');
    return null;
  }

  if (!loading && user?.team_id) {
    router.push('/dashboard');
    return null;
  }

  const handleNext = () => {
    if (step === 1) {
      if (!companyName.trim()) {
        setError('Company name is required');
        return;
      }
      setError('');
      setTeamName(companyName); // Pre-fill team name with company name
      setStep(2);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/team-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          companyName,
          teamName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create team');
        setIsSubmitting(false);
        return;
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  if (loading) {
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Perelman ATS</h1>
          <p className="text-gray-600">Let's set up your team</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-between mb-8">
          <div
            className={`flex-1 h-2 rounded-full mx-1 ${
              step >= 1 ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          ></div>
          <div
            className={`flex-1 h-2 rounded-full mx-1 ${
              step >= 2 ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          ></div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Company Info */}
        {step === 1 && (
          <form className="space-y-6">
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                id="company"
                type="text"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setError('');
                }}
                placeholder="e.g., Acme Corporation"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-gray-500">
                This will be your company name in the system
              </p>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Continue
            </button>

            <p className="text-center text-sm text-gray-500">
              Step 1 of 2
            </p>
          </form>
        )}

        {/* Step 2: Team Details */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-2">
                Team Name
              </label>
              <input
                id="teamName"
                type="text"
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  setError('');
                }}
                placeholder="e.g., Engineering Team"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-gray-500">
                You can change this later. You'll be the admin of this team.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Company:</strong> {companyName}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
              >
                {isSubmitting ? 'Creating Team...' : 'Create Team'}
              </button>
            </div>

            <p className="text-center text-sm text-gray-500">
              Step 2 of 2
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
