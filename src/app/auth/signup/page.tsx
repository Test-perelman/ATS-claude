'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUp } from '@/lib/auth-actions';
import { useRouter } from 'next/navigation';

// Password strength validation
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasDigit: /\d/,
  hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
};

function validatePassword(password: string) {
  return {
    minLength: password.length >= PASSWORD_REQUIREMENTS.minLength,
    hasUppercase: PASSWORD_REQUIREMENTS.hasUppercase.test(password),
    hasLowercase: PASSWORD_REQUIREMENTS.hasLowercase.test(password),
    hasDigit: PASSWORD_REQUIREMENTS.hasDigit.test(password),
    hasSymbol: PASSWORD_REQUIREMENTS.hasSymbol.test(password),
  };
}

function isPasswordStrong(validation: ReturnType<typeof validatePassword>) {
  return Object.values(validation).every(Boolean);
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(validatePassword(''));

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordValidation(validatePassword(newPassword));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordStrong(passwordValidation)) {
      setError('Password does not meet all requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Redirect based on user type
        const redirectPath = (result as any).isMasterAdmin ? '/master-admin/teams' : '/team-discovery';
        setTimeout(() => {
          router.push(redirectPath);
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6">Create Account</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 rounded text-sm">
            Account created! Setting up your team...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="new-password"
            />
            <div className="mt-2 space-y-1 text-xs">
              <div className={passwordValidation.minLength ? 'text-green-600' : 'text-gray-500'}>
                ✓ At least 8 characters
              </div>
              <div className={passwordValidation.hasUppercase ? 'text-green-600' : 'text-gray-500'}>
                ✓ Uppercase letter (A-Z)
              </div>
              <div className={passwordValidation.hasLowercase ? 'text-green-600' : 'text-gray-500'}>
                ✓ Lowercase letter (a-z)
              </div>
              <div className={passwordValidation.hasDigit ? 'text-green-600' : 'text-gray-500'}>
                ✓ Number (0-9)
              </div>
              <div className={passwordValidation.hasSymbol ? 'text-green-600' : 'text-gray-500'}>
                ✓ Special character (!@#$%^&*)
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success || !isPasswordStrong(passwordValidation)}
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
