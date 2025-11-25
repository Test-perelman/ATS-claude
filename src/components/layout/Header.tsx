'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-purple-200 bg-white px-6 shadow-sm">
      <div className="flex items-center space-x-4">
        <h2 className="text-xl font-semibold text-purple-900">Dashboard</h2>
      </div>

      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-64 rounded-md border border-purple-300 px-3 text-sm placeholder-purple-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="sm">
          🔔
        </Button>

        {/* Profile */}
        <Button variant="ghost" size="sm">
          👤
        </Button>
      </div>
    </header>
  );
};
