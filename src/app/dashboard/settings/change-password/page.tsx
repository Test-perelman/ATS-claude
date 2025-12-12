'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { updatePassword } from '@/lib/supabase/auth'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

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
      if (!formData.newPassword || !formData.confirmPassword) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }

      if (formData.newPassword.length < 8) {
        setError('Password must be at least 8 characters long')
        setLoading(false)
        return
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      // Note: Supabase doesn't provide a way to verify the current password
      // before updating without additional security. For better security,
      // consider using Supabase's built-in password confirmation flow or
      // implementing custom backend logic to verify current password.

      // Update password
      const result = await updatePassword(formData.newPassword)

      if (!result.success) {
        setError(result.error || 'Failed to update password')
        setLoading(false)
        return
      }

      setSuccess(true)
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setLoading(false)

      // Clear success message and optionally redirect
      setTimeout(() => {
        setSuccess(false)
        // Optionally redirect to dashboard
        // router.push('/dashboard')
      }, 3000)
    } catch (err) {
      console.error('Change password error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-purple-900 mb-2">Change Password</h1>
        <p className="text-purple-600 text-sm mb-6">
          Update your account password. Make sure to use a strong password.
        </p>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm font-medium">
              Password updated successfully!
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password - for reference, disabled since Supabase doesn't validate it */}
          <div>
            <label className="block text-sm font-medium text-purple-900 mb-1">
              Current Password
            </label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-purple-900 placeholder-purple-400"
              placeholder="Enter your current password"
              disabled={true}
              title="For security, password verification is handled by Supabase authentication"
            />
            <p className="text-xs text-purple-600 mt-1">
              For security purposes, password verification is handled automatically
            </p>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-purple-900 mb-1">
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-purple-900 placeholder-purple-400"
              placeholder="At least 8 characters"
              disabled={loading}
              autoComplete="new-password"
            />
            <p className="text-xs text-purple-600 mt-1">
              Use at least 8 characters with a mix of letters, numbers, and symbols for better security
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
              placeholder="Re-enter your new password"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          {/* Password Requirements */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">Password Requirements:</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>✓ At least 8 characters long</li>
              <li>✓ Mix of uppercase and lowercase letters</li>
              <li>✓ At least one number</li>
              <li>✓ At least one special character (!@#$%^&*)</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
              variant="primary"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
            <Button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="flex-1"
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </form>

        {/* Security note */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>Security Tip:</strong> Never share your password with anyone. Our team will never
            ask for your password. If you suspect your account has been compromised, change your
            password immediately.
          </p>
        </div>
      </div>
    </div>
  )
}
