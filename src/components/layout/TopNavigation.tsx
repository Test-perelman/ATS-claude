'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { signOut } from '@/lib/supabase/auth';
import { useAuth } from '@/lib/contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Candidates', href: '/candidates', icon: '👥' },
  { name: 'Bench', href: '/bench', icon: '📋' },
  { name: 'Vendors', href: '/vendors', icon: '🏢' },
  { name: 'Clients', href: '/clients', icon: '🤝' },
  { name: 'Requirements', href: '/requirements', icon: '📝' },
  { name: 'Submissions', href: '/submissions', icon: '📤' },
  { name: 'Interviews', href: '/interviews', icon: '📅' },
  { name: 'Projects', href: '/projects', icon: '💼' },
  { name: 'Timesheets', href: '/timesheets', icon: '🕐' },
  { name: 'Invoices', href: '/invoices', icon: '💰' },
  { name: 'Immigration', href: '/immigration', icon: '🛂' },
  { name: 'Reports', href: '/reports', icon: '📈' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export const TopNavigation: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userRole } = useAuth();
  const [showMore, setShowMore] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get user initials
  const getUserInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const visibleItems = navigation.slice(0, 8);
  const moreItems = navigation.slice(8);

  return (
    <header className="sticky top-0 z-20 bg-gradient-to-r from-purple-300 via-purple-200 to-purple-300 shadow-2xl border-b border-purple-200">
      {/* Main navigation bar */}
      <div className="flex h-16 items-center justify-between px-6 text-purple-900">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-amber-500 bg-clip-text text-transparent">Perelman ATS</h1>
        </div>

        {/* Navigation items */}
        <nav className="hidden items-center space-x-1 md:flex lg:space-x-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center space-x-1 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-gradient-to-br from-purple-400 to-purple-500 text-white shadow-md'
                    : 'text-purple-700 hover:bg-purple-200 hover:text-purple-900'
                )}
              >
                <span>{item.icon}</span>
                <span className="hidden lg:inline">{item.name}</span>
              </Link>
            );
          })}

          {/* More dropdown */}
          {moreItems.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMore(!showMore)}
                className={cn(
                  'flex items-center space-x-1 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  showMore
                    ? 'bg-gradient-to-br from-purple-400 to-purple-500 text-white shadow-md'
                    : 'text-purple-700 hover:bg-purple-200 hover:text-purple-900'
                )}
              >
                <span>⋯</span>
                <span className="hidden lg:inline">More</span>
              </button>

              {/* Dropdown menu */}
              {showMore && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-2xl border border-purple-200">
                  {moreItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center space-x-3 px-4 py-2 text-sm transition-all',
                          isActive
                            ? 'bg-gradient-to-r from-purple-200 to-purple-100 text-purple-900 font-medium'
                            : 'text-purple-900 hover:bg-purple-50'
                        )}
                      >
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Right side - Search, notifications, profile */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="hidden sm:block relative">
            <input
              type="text"
              placeholder="Search..."
              className="h-9 w-48 rounded-md border border-purple-300 bg-white bg-opacity-80 px-3 text-sm text-purple-900 placeholder-purple-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Notifications */}
          <button className="rounded-lg p-2 text-purple-600 hover:bg-purple-300 hover:text-purple-900 transition-all hover:shadow-md">
            🔔
          </button>

          {/* Profile */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 font-bold text-white hover:shadow-md transition-all hover:from-amber-500 hover:to-amber-600"
            >
              {getUserInitials()}
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-2xl border border-purple-200 py-2 z-50">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-purple-100">
                  <p className="text-sm font-medium text-gray-900">{user?.email || 'User'}</p>
                  <p className="text-xs text-gray-500 mt-1">{userRole || 'Member'}</p>
                </div>

                {/* Menu Items */}
                <Link
                  href="/settings"
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <span>⚙️</span>
                  <span>Settings</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <span>🚪</span>
                  <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="flex overflow-x-auto border-t border-purple-300 md:hidden bg-gradient-to-r from-purple-200 to-purple-300 px-2 py-2 space-x-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-1 rounded-lg px-2 py-1 text-xs font-medium transition-all whitespace-nowrap',
                isActive
                  ? 'bg-gradient-to-br from-purple-400 to-purple-500 text-white shadow-md'
                  : 'text-purple-700 hover:bg-purple-300 hover:text-purple-900'
              )}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
