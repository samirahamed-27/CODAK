import React from 'react';
import { RankTier } from '@/types/database';
import { RankEmblem } from './RankEmblem';
import { getRankForLevel } from '@/lib/ranks';

interface RankChipProps {
  rank?: RankTier | { slug: string; name: string; color: string; min_level?: number };
  level?: number;
  size?: 'xs' | 'sm' | 'md';
  showLevel?: boolean;
  className?: string;
}

export const RankChip: React.FC<RankChipProps> = ({
  rank,
  level,
  size = 'sm',
  showLevel = false,
  className = '',
}) => {
  const resolvedRank = rank || (level !== undefined ? getRankForLevel(level) : undefined);
  const name = resolvedRank?.name || 'Apprentice';
  const color = resolvedRank?.color || '#94A3B8';
  const minLevel = (resolvedRank as RankTier)?.min_level;

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-sm gap-2',
  }[size];

  const emblemSize = size === 'md' ? 'sm' : 'xs';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium tracking-wide transition-colors ${sizeClasses} ${className}`}
      style={{
        backgroundColor: `${color}14`,
        borderColor: `${color}40`,
        borderWidth: '1px',
        color: color,
      }}
      title={`Rank: ${name}${minLevel ? ` (Unlocked at L${minLevel})` : ''}`}
      aria-label={`Rank: ${name}`}
    >
      <RankEmblem rank={rank} size={emblemSize} />
      <span>{name}</span>
      {showLevel && level !== undefined && (
        <span className="opacity-70 text-[0.85em] font-mono">
          L{level}
        </span>
      )}
    </span>
  );
};
