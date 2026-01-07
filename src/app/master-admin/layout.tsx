import { redirect } from 'next/navigation';
import { createUserClient } from '@/lib/supabase/user-server';
import Link from 'next/link';

export const metadata = {
  title: 'Master Admin | Perelman ATS',
};

async function MasterAdminLayout({ children }: { children: React.ReactNode }) {
  // Check if user is master admin
  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check master admin status
  const { data: userData, error } = await supabase
    .from('users')
    .select('is_master_admin')
    .eq('id', user.id)
    .single();

  if (error || !userData?.is_master_admin) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Master Admin</h1>
          <Link href="/dashboard" className="text-purple-600 hover:text-purple-700">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Sidebar + Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* Sidebar */}
        <nav className="w-48 flex-shrink-0">
          <div className="space-y-2">
            <Link
              href="/master-admin/teams"
              className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
            >
              Teams
            </Link>
            <Link
              href="/master-admin/users"
              className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
            >
              Users
            </Link>
            <Link
              href="/master-admin/access-requests"
              className="block px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
            >
              Access Requests
            </Link>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export default MasterAdminLayout;
