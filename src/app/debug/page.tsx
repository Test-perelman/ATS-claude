'use client'

import { useEffect, useState } from 'react'

interface DebugInfo {
  timestamp: string
  environment: {
    nodeEnv: string
    nextPublicSupabaseUrl: string
    hasServiceRoleKey: boolean
  }
  services: {
    supabase: 'connected' | 'error' | 'unknown'
    database: 'connected' | 'error' | 'unknown'
  }
  timing: Record<string, number>
  errors: string[]
  auth?: {
    hasSession: boolean
    userId: string
  }
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('/api/debug/status', {
        cache: 'no-store',
      })
      const data = await response.json()
      setDebugInfo(data)
    } catch (error) {
      console.error('Failed to fetch debug info:', error)
      setDebugInfo({
        timestamp: new Date().toISOString(),
        environment: {
          nodeEnv: 'unknown',
          nextPublicSupabaseUrl: 'unknown',
          hasServiceRoleKey: false,
        },
        services: {
          supabase: 'error',
          database: 'error',
        },
        timing: {},
        errors: [
          error instanceof Error ? error.message : 'Unknown error fetching debug info',
        ],
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebugInfo()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchDebugInfo, 2000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-yellow-50 border-yellow-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
      case 'error':
        return <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
      default:
        return <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🔍 Debug Console</h1>
          <p className="text-gray-600">Real-time system status monitoring</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => fetchDebugInfo()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                ↻ Refresh Now
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  autoRefresh
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                {autoRefresh ? '⏸ Auto-Refresh ON' : '▶ Auto-Refresh OFF'}
              </button>
            </div>
            {debugInfo && (
              <span className="text-sm text-gray-500">
                Last updated: {new Date(debugInfo.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {loading && !debugInfo ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
            <div className="inline-block animate-spin text-4xl mb-4">⟳</div>
            <p className="text-gray-600">Loading debug information...</p>
          </div>
        ) : debugInfo ? (
          <div className="space-y-6">
            {/* Services Status */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Services</h2>
              </div>
              <div className="p-6 space-y-3">
                {Object.entries(debugInfo.services).map(([service, status]) => (
                  <div
                    key={service}
                    className={`p-3 rounded-lg border ${getStatusColor(status)} flex items-center justify-between`}
                  >
                    <div className="flex items-center">
                      {getStatusBadge(status)}
                      <span className="font-medium text-gray-900 capitalize">{service}</span>
                    </div>
                    <span className="text-sm font-mono text-gray-700">{status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Authentication */}
            {debugInfo.auth && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                  <h2 className="text-lg font-semibold text-gray-900">Authentication</h2>
                </div>
                <div className="p-6 space-y-3">
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-mono">Session Active:</span>{' '}
                      <span className="font-semibold">{debugInfo.auth.hasSession ? 'Yes' : 'No'}</span>
                    </p>
                  </div>
                  {debugInfo.auth.userId !== 'none' && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-gray-600 break-all">
                        <span className="font-mono">User ID:</span>{' '}
                        <span className="font-mono text-xs">{debugInfo.auth.userId}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Environment */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Environment</h2>
              </div>
              <div className="p-6 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-gray-600">Node Environment</p>
                    <p className="font-mono font-semibold text-gray-900">
                      {debugInfo.environment.nodeEnv}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-gray-600">Supabase URL</p>
                    <p className="font-mono text-xs font-semibold text-gray-900 break-all">
                      {debugInfo.environment.nextPublicSupabaseUrl}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Timing */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Performance Timing</h2>
              </div>
              <div className="p-6">
                <div className="space-y-2 text-sm">
                  {Object.entries(debugInfo.timing).map(([metric, time]) => (
                    <div key={metric} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-700 capitalize">
                        {metric.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                      <span className="font-mono font-semibold text-gray-900">{time}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Errors */}
            {debugInfo.errors.length > 0 && (
              <div className="bg-white rounded-lg border border-red-200 overflow-hidden shadow-sm">
                <div className="bg-red-50 border-b border-red-200 px-6 py-4">
                  <h2 className="text-lg font-semibold text-red-900">⚠️ Errors ({debugInfo.errors.length})</h2>
                </div>
                <div className="p-6 space-y-3">
                  {debugInfo.errors.map((error, idx) => (
                    <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm text-red-800 font-mono break-all">{error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
