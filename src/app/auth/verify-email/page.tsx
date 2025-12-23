'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Please verify your email to continue.');
  const [isResending, setIsResending] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUser();
  }, []);

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        setMessage('Could not find user email');
        return;
      }

      const { error } = await supabase.auth.resendEnvelope({
        type: 'signup',
        email: user.email,
      });

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Verification email sent! Check your inbox.');
      }
    } catch (err) {
      setMessage('Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-gray-600 mb-4">{message}</p>

          {userEmail && (
            <p className="text-sm text-gray-500 mb-6">
              Verification email sent to: <strong>{userEmail}</strong>
            </p>
          )}

          <div className="space-y-3">
            <button
              onClick={handleResendEmail}
              disabled={isResending}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </button>

            <button
              onClick={handleSignOut}
              className="w-full py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium"
            >
              Sign Out
            </button>
          </div>

          <p className="mt-6 text-sm text-gray-600">
            Once you verify your email, you'll be able to access your account.
          </p>
        </div>
      </div>
    </div>
  );
}
