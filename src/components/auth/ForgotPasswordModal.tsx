'use client'

import { useState } from 'react'
import { resetPasswordEmail } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/Button'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email) {
        setError('Please enter your email address')
        setLoading(false)
        return
      }

      // Send password reset email
      const result = await resetPasswordEmail(email, '/auth/reset-password')

      if (!result.success) {
        setError(result.error || 'Failed to send reset email')
        setLoading(false)
        return
      }

      setSuccess(true)
      setEmail('')
      setLoading(false)

      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Forgot password error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-purple-900 mb-4">Reset Password</h3>

        {success ? (
          <div className="text-center">
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">
                Password reset link sent to <strong>{email}</strong>. Check your email and click the
                link to reset your password.
              </p>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-purple-900 placeholder-purple-400"
                  placeholder="you@example.com"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                  variant="primary"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1"
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </form>

            <p className="text-center text-purple-600 text-xs mt-4">
              We'll send you an email with a link to reset your password.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
