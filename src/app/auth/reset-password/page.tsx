'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { updatePassword, getPasswordRecoverySession } from '@/lib/supabase/auth'

function ResetPasswordContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })

  // Verify recovery session on mount
  useEffect(() => {
    const verifySession = async () => {
      const result = await getPasswordRecoverySession()

      if (!result.success) {
        setError(result.error || 'Invalid or expired reset link. Please try again.')
        setVerifying(false)
        return
      }

      setEmail(result.data?.email || '')
      setVerifying(false)
    }

    verifySession()
  }, [])

  // Handle redirect after success
  useEffect(() => {
    if (redirectUrl) {
      window.location.href = redirectUrl
    }
  }, [redirectUrl])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validation
      if (!formData.password || !formData.confirmPassword) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }

      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long')
        setLoading(false)
        return
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      // Update password
      const result = await updatePassword(formData.password)

      if (!result.success) {
        setError(result.error || 'Failed to update password')
        setLoading(false)
        return
      }

      setSuccess(true)
      setFormData({ password: '', confirmPassword: '' })
      setLoading(false)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        setRedirectUrl('/auth/login')
      }, 3000)
    } catch (err) {
      console.error('Reset password error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-900"></div>
        </div>
        <p className="text-purple-600 mt-4">Verifying your reset link...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-purple-900 mb-6">Reset Password</h2>

      {success ? (
        <div className="text-center">
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm font-medium">
              Password reset successfully! You will be redirected to login in a moment...
            </p>
          </div>
          <Link href="/auth/login" className="text-amber-600 hover:underline">
            Click here if you're not redirected
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-medium mb-3">{error}</p>
              {error.includes('expired') && (
                <Link href="/auth/login" className="text-red-600 hover:underline text-sm">
                  Go back to login and try again
                </Link>
              )}
            </div>
          )}

          {email && !error && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                Resetting password for <strong>{email}</strong>
              </p>
            </div>
          )}

          {!error && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-purple-900 placeholder-purple-400"
                  placeholder="At least 8 characters"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <p className="text-xs text-purple-600 mt-1">
                  Use at least 8 characters with a mix of letters, numbers, and symbols
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-purple-900 placeholder-purple-400"
                  placeholder="Re-enter your password"
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                variant="primary"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}

          {/* Back to login link */}
          {!success && (
            <p className="text-center text-purple-600 text-sm mt-6">
              <Link href="/auth/login" className="text-amber-600 hover:underline font-medium">
                Back to Login
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center text-gray-600">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
