'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect to onboarding if user doesn't have a team
  React.useEffect(() => {
    if (!loading && user && !user.team_id) {
      router.push('/onboarding');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const stats = [
    { title: 'Total Candidates', value: '248', change: '+12%', icon: '👥' },
    { title: 'On Bench', value: '32', change: '-5%', icon: '📋' },
    { title: 'Active Projects', value: '45', change: '+8%', icon: '💼' },
    { title: 'Open Requirements', value: '18', change: '+3%', icon: '📝' },
  ];

  const recentActivity = [
    { id: 1, action: 'New candidate added', name: 'John Doe', time: '2 minutes ago' },
    { id: 2, action: 'Interview scheduled', name: 'Jane Smith', time: '15 minutes ago' },
    { id: 3, action: 'Submission created', name: 'Mike Johnson', time: '1 hour ago' },
    { id: 4, action: 'Project started', name: 'Sarah Williams', time: '2 hours ago' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-purple-900">Dashboard</h1>
        <p className="mt-2 text-purple-600">Welcome to Perelman ATS</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">{stat.title}</p>
                  <p className="mt-2 text-3xl font-bold text-purple-900">{stat.value}</p>
                  <p className="mt-1 text-sm text-green-600">{stat.change}</p>
                </div>
                <div className="text-4xl">{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 mt-2 rounded-full bg-cyan-500"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-purple-900">{activity.action}</p>
                    <p className="text-sm text-purple-600">{activity.name}</p>
                  </div>
                  <div className="flex-shrink-0 text-xs text-purple-500">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-purple-300 p-6 hover:border-cyan-500 hover:bg-cyan-50 transition-colors">
                <span className="text-3xl mb-2">➕</span>
                <span className="text-sm font-medium text-purple-900">Add Candidate</span>
              </button>
              <button className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-purple-300 p-6 hover:border-cyan-500 hover:bg-cyan-50 transition-colors">
                <span className="text-3xl mb-2">📤</span>
                <span className="text-sm font-medium text-purple-900">New Submission</span>
              </button>
              <button className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-purple-300 p-6 hover:border-cyan-500 hover:bg-cyan-50 transition-colors">
                <span className="text-3xl mb-2">📅</span>
                <span className="text-sm font-medium text-purple-900">Schedule Interview</span>
              </button>
              <button className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-purple-300 p-6 hover:border-cyan-500 hover:bg-cyan-50 transition-colors">
                <span className="text-3xl mb-2">💼</span>
                <span className="text-sm font-medium text-purple-900">New Project</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-l-4 border-blue-500 bg-blue-50 p-4">
              <div>
                <p className="font-medium">Technical Interview - Jane Smith</p>
                <p className="text-sm text-gray-600">Video call with XYZ Corp</p>
              </div>
              <p className="text-sm font-medium text-blue-600">Today, 2:00 PM</p>
            </div>
            <div className="flex items-center justify-between border-l-4 border-green-500 bg-green-50 p-4">
              <div>
                <p className="font-medium">Project Start - Mike Johnson</p>
                <p className="text-sm text-gray-600">ABC Technologies</p>
              </div>
              <p className="text-sm font-medium text-green-600">Tomorrow</p>
            </div>
            <div className="flex items-center justify-between border-l-4 border-yellow-500 bg-yellow-50 p-4">
              <div>
                <p className="font-medium">Visa Expiry Alert - Sarah Williams</p>
                <p className="text-sm text-gray-600">H-1B expires in 30 days</p>
              </div>
              <p className="text-sm font-medium text-yellow-600">In 30 days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
