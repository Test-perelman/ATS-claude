'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  permission?: string;
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

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col bg-purple-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-purple-800">
        <h1 className="text-xl font-bold">Perelman ATS</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-purple-700 text-white'
                      : 'text-purple-100 hover:bg-purple-800 hover:text-white'
                  )}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info */}
      <div className="border-t border-purple-800 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500">
            <span className="text-sm font-medium text-purple-900 font-bold">U</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">User</p>
            <p className="text-xs text-purple-300">Super Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
};
