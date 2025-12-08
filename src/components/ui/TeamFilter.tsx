'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { getAllTeams } from '@/lib/api/teams';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { Database } from '@/types/database';

type Team = Database['public']['Tables']['teams']['Row'];

export interface TeamFilterProps {
  value: string;
  onChange: (teamId: string) => void;
  className?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
}

export const TeamFilter: React.FC<TeamFilterProps> = ({
  value,
  onChange,
  className,
  showAllOption = true,
  allOptionLabel = 'All Companies',
}) => {
  const { isMasterAdmin } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTeams() {
      if (!isMasterAdmin) {
        setLoading(false);
        return;
      }

      const result = await getAllTeams();
      if ('data' in result && result.data) {
        setTeams(result.data);
      }
      setLoading(false);
    }

    loadTeams();
  }, [isMasterAdmin]);

  // Don't render if not master admin
  if (!isMasterAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn('w-48', className)}>
        <select
          disabled
          className="flex h-10 w-full rounded-md border border-purple-300 bg-gray-50 px-3 py-2 text-sm text-gray-400"
        >
          <option>Loading teams...</option>
        </select>
      </div>
    );
  }

  return (
    <div className={cn('w-48', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-purple-300 bg-white px-3 py-2 text-sm text-purple-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
      >
        {showAllOption && (
          <option value="">{allOptionLabel}</option>
        )}
        {teams.map((team) => (
          <option key={team.team_id} value={team.team_id}>
            {team.company_name || team.team_name}
          </option>
        ))}
      </select>
    </div>
  );
};

TeamFilter.displayName = 'TeamFilter';
