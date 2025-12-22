'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

interface DiscoverableTeam {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<'choice' | 'create' | 'join'>('choice'); // choice = select create/join, create = create team, join = join team
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Team fields
  const [teamName, setTeamName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Join Team fields
  const [discoverableTeams, setDiscoverableTeams] = useState<DiscoverableTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Redirect if not authenticated or already has team
  if (!loading && !user) {
    router.push('/auth/login');
    return null;
  }

  if (!loading && user?.team_id) {
    router.push('/dashboard');
    return null;
  }

  // Fetch discoverable teams when entering join step
  useEffect(() => {
    if (step === 'join') {
      fetchDiscoverableTeams();
    }
  }, [step]);

  const fetchDiscoverableTeams = async () => {
    setLoadingTeams(true);
    try {
      const response = await fetch('/api/teams/discoverable');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load teams');
        return;
      }

      setDiscoverableTeams(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!teamName.trim() || !firstName.trim() || !lastName.trim()) {
      setError('All fields are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/create-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teamName,
          firstName,
          lastName,
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

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedTeamId.trim() || !firstName.trim() || !lastName.trim()) {
      setError('All fields are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/join-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teamId: selectedTeamId,
          firstName,
          lastName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to request team access');
        setIsSubmitting(false);
        return;
      }

      // Success - redirect to pending approval page
      router.push('/onboarding/pending');
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
          <p className="text-gray-600">
            {step === 'choice' && 'Let\'s get you started'}
            {step === 'create' && 'Create your team'}
            {step === 'join' && 'Join an existing team'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Choice - Create or Join */}
        {step === 'choice' && (
          <div className="space-y-4">
            <button
              onClick={() => {
                setStep('create');
                setError('');
              }}
              className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100">
                    <span className="text-blue-600 text-lg">+</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Create Team</h3>
                  <p className="mt-1 text-sm text-gray-500">Start a new team and become its administrator</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setStep('join');
                setError('');
              }}
              className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-100">
                    <span className="text-green-600 text-lg">→</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Join Team</h3>
                  <p className="mt-1 text-sm text-gray-500">Request access to an existing team</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Step 2: Create Team */}
        {step === 'create' && (
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div>
              <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-1">
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
                placeholder="e.g., Acme Corp"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setError('');
                  }}
                  placeholder="John"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setError('');
                  }}
                  placeholder="Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setStep('choice');
                  setError('');
                  setTeamName('');
                  setFirstName('');
                  setLastName('');
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
              >
                {isSubmitting ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Join Team */}
        {step === 'join' && (
          <form onSubmit={handleJoinTeam} className="space-y-4">
            <div>
              <label htmlFor="selectTeam" className="block text-sm font-medium text-gray-700 mb-2">
                Select Team
              </label>
              {loadingTeams ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : discoverableTeams.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-sm">
                  No teams available to join. Please create a team instead.
                </div>
              ) : (
                <select
                  id="selectTeam"
                  value={selectedTeamId}
                  onChange={(e) => {
                    setSelectedTeamId(e.target.value);
                    setError('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a team...</option>
                  {discoverableTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.memberCount} members)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="joinFirstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  id="joinFirstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setError('');
                  }}
                  placeholder="John"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="joinLastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  id="joinLastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setError('');
                  }}
                  placeholder="Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setStep('choice');
                  setError('');
                  setSelectedTeamId('');
                  setFirstName('');
                  setLastName('');
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting || loadingTeams}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
              >
                {isSubmitting ? 'Requesting...' : 'Request Access'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
