'use client';

import React from 'react';
import { Award, Lock, CheckCircle2, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export interface BadgeTileProps {
  code: string;
  name: string;
  description: string;
  category: 'MILESTONE' | 'QUEST' | 'IMPROVEMENT' | 'RANK';
  isEarned: boolean;
  earnedAt?: string;
  howToEarn?: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  MILESTONE: {
    bg: 'bg-white/10',
    text: 'text-white',
    border: 'border-white/20',
  },
  QUEST: {
    bg: 'bg-white/10',
    text: 'text-white',
    border: 'border-white/20',
  },
  IMPROVEMENT: {
    bg: 'bg-white/10',
    text: 'text-white',
    border: 'border-white/20',
  },
  RANK: {
    bg: 'bg-white/10',
    text: 'text-white',
    border: 'border-white/20',
  },
};

export const BadgeTile: React.FC<BadgeTileProps> = ({
  name,
  description,
  category,
  isEarned,
  earnedAt,
  howToEarn,
}) => {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.MILESTONE;

  return (
    <div
      className={clsx(
        'relative p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between',
        isEarned
          ? 'bg-[#0c0c0e] border-white/15 shadow-lg hover:border-white/30'
          : 'bg-black/60 border-white/10 opacity-70 hover:opacity-90'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-transform',
              isEarned
                ? `${colors.bg} ${colors.text} border ${colors.border} shadow-inner`
                : 'bg-zinc-900 border border-white/10 text-zinc-500'
            )}
          >
            {isEarned ? <Award className="w-5 h-5 text-white" /> : <Lock className="w-4 h-4 text-zinc-500" />}
          </div>
          <div>
            <h4 className={clsx('text-xs font-bold leading-tight', isEarned ? 'text-white' : 'text-zinc-400')}>
              {name}
            </h4>
            <span
              className={clsx(
                'inline-block px-1.5 py-0.5 mt-0.5 text-[9px] font-bold tracking-wider uppercase rounded-md border',
                colors.bg,
                colors.text,
                colors.border
              )}
            >
              {category}
            </span>
          </div>
        </div>

        {isEarned && (
          <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
        )}
      </div>

      <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">
        {description}
      </p>

      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
        {isEarned ? (
          <span className="text-white font-medium">
            Unlocked {earnedAt ? new Date(earnedAt).toLocaleDateString() : 'Earned'}
          </span>
        ) : (
          <span className="text-zinc-500 italic">
            Unlock: {howToEarn || description}
          </span>
        )}
      </div>
    </div>
  );
};

export interface XpChipProps {
  amount: number | string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'indigo' | 'emerald' | 'amber';
}

export const XpChip: React.FC<XpChipProps> = ({
  amount,
  label = 'XP',
  size = 'md',
  variant = 'indigo',
}) => {
  const variantStyles = {
    indigo: 'bg-white/10 text-white border-white/20',
    emerald: 'bg-white/15 text-white border-white/25',
    amber: 'bg-white/10 text-zinc-300 border-white/20',
  }[variant];

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  }[size];

  return (
    <span
      className={clsx(
        'inline-flex items-center font-bold rounded-full border shadow-sm backdrop-blur-sm',
        variantStyles,
        sizeStyles
      )}
    >
      <Sparkles className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{amount}</span>
      {label && <span className="opacity-80 font-medium">{label}</span>}
    </span>
  );
};

export interface GameCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ children, className, glow = false }) => {
  return (
    <div
      className={clsx(
        'p-6 rounded-3xl bg-[#0c0c0e] border border-white/15 shadow-xl backdrop-blur-xl transition-all duration-300',
        glow && 'hover:border-white/30 hover:shadow-white/5',
        className
      )}
    >
      {children}
    </div>
  );
};
