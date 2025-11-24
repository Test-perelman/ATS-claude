'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getTeam, updateTeam } from '@/lib/api/teams';

export default function TeamSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [teamData, setTeamData] = useState<any>(null);
  const [formData, setFormData] = useState({
    team_name: '',
    company_name: '',
    description: '',
    subscription_tier: 'basic',
  });

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    try {
      setLoading(true);
      const result = await getTeam();

      if ('error' in result) {
        setError(result.error || 'Failed to load team');
        return;
      }

      if (!result.data) {
        setError('No team data found');
        return;
      }

      const teamData = result.data;
      setTeamData(teamData);
      setFormData({
        team_name: teamData.team_name || '',
        company_name: teamData.company_name || '',
        description: teamData.description || '',
        subscription_tier: teamData.subscription_tier || 'basic',
      });
    } catch (err) {
      setError('Failed to load team information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const result = await updateTeam({
        team_name: formData.team_name,
        company_name: formData.company_name,
        description: formData.description,
        subscription_tier: formData.subscription_tier,
      });

      if ('error' in result && result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }

      setSuccess(true);
      setTeamData(result.data);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to update team');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <Link href="/settings" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Team Information</h1>
          <p className="mt-2 text-gray-600">Manage your team's profile and settings</p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">Team information updated successfully!</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Team Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  name="team_name"
                  value={formData.team_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="My Team"
                  disabled={saving}
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Acme Corporation"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of your team..."
                disabled={saving}
              />
            </div>

            {/* Subscription Tier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subscription Tier
              </label>
              <select
                name="subscription_tier"
                value={formData.subscription_tier}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={saving}
              >
                <option value="basic">Basic</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Current: <strong>{formData.subscription_tier}</strong>
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => loadTeam()} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Team Information Summary */}
      {teamData && (
        <Card>
          <CardHeader>
            <CardTitle>Team Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600">Team ID</p>
                <p className="font-mono text-sm text-gray-900">{teamData.team_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-sm text-gray-900">
                  {new Date(teamData.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-sm">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    teamData.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {teamData.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-sm text-gray-900">
                  {new Date(teamData.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
