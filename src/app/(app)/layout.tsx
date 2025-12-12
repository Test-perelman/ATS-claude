'use client';

import { TopNavigation } from '@/components/layout/TopNavigation';
import { AuthProvider } from '@/lib/contexts/AuthContext';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopNavigation />
        <main className="flex-1 overflow-y-auto bg-purple-50 p-6">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
