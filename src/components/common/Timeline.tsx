'use client';

import React from 'react';
import Link from 'next/link';
import { formatRelativeTime, formatDate } from '@/lib/utils/format';
import type { TimelineItem } from '@/lib/utils/timeline';

interface TimelineProps {
  items: TimelineItem[];
}

export const Timeline: React.FC<TimelineProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No activity yet
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {items.map((item, itemIdx) => (
          <li key={item.id}>
            <div className="relative pb-8">
              {itemIdx !== items.length - 1 && (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                      getColorClass(item.color || 'gray')
                    }`}
                  >
                    {getIcon(item.icon || 'dot')}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.navigationUrl ? (
                        <Link
                          href={item.navigationUrl}
                          className="text-blue-600 hover:underline"
                          title={item.navigationLabel || 'Navigate to record'}
                        >
                          {item.title}
                        </Link>
                      ) : (
                        item.title
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
                    {item.user && (
                      <p className="mt-1 text-xs text-gray-400">
                        by {item.user.username}
                      </p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-gray-500">
                    <time dateTime={item.timestamp} title={formatDate(item.timestamp, 'PPpp')}>
                      {formatRelativeTime(item.timestamp)}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

function getColorClass(color: string): string {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
    orange: 'bg-orange-500',
    gray: 'bg-gray-500',
  };

  return colors[color] || colors.gray;
}

function getIcon(icon: string): React.ReactNode {
  // Simple icon representations using Unicode
  const icons: Record<string, string> = {
    dot: '•',
    history: '↻',
    activity: '⚡',
    note: '📝',
    send: '📤',
    calendar: '📅',
    briefcase: '💼',
    'user-minus': '👤',
    'user-check': '✓',
    file: '📄',
    edit: '✏️',
    clock: '🕐',
    'dollar-sign': '$',
  };

  return <span className="text-white text-sm">{icons[icon] || icons.dot}</span>;
}
