import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface TeamBadgeProps {
  teamName?: string | null;
  companyName?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}

const teamColors = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-teal-100 text-teal-800 border-teal-200',
];

function getColorForTeam(teamName: string): string {
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return teamColors[Math.abs(hash) % teamColors.length];
}

export const TeamBadge: React.FC<TeamBadgeProps> = ({
  teamName,
  companyName,
  className,
  size = 'sm',
}) => {
  const displayName = companyName || teamName;

  if (!displayName) {
    return null;
  }

  const colorClass = getColorForTeam(displayName);
  const sizeClass = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-medium',
        colorClass,
        sizeClass,
        className
      )}
      title={companyName && teamName ? `${companyName} (${teamName})` : displayName}
    >
      {displayName}
    </span>
  );
};

TeamBadge.displayName = 'TeamBadge';
