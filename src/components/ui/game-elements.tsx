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
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  QUEST: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
  },
  IMPROVEMENT: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  RANK: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
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
          ? 'bg-slate-900/80 border-slate-700/80 shadow-lg hover:border-indigo-500/50 hover:shadow-indigo-500/10'
          : 'bg-slate-950/60 border-slate-800/50 opacity-70 hover:opacity-90'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-transform',
              isEarned
                ? `${colors.bg} ${colors.text} border ${colors.border} shadow-inner`
                : 'bg-slate-900 border border-slate-800 text-slate-600'
            )}
          >
            {isEarned ? <Award className="w-5 h-5" /> : <Lock className="w-4 h-4 text-slate-500" />}
          </div>
          <div>
            <h4 className={clsx('text-xs font-bold leading-tight', isEarned ? 'text-white' : 'text-slate-400')}>
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
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        )}
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
        {description}
      </p>

      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
        {isEarned ? (
          <span className="text-emerald-400 font-medium">
            Unlocked {earnedAt ? new Date(earnedAt).toLocaleDateString() : 'Earned'}
          </span>
        ) : (
          <span className="text-slate-500 italic">
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
    indigo: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
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
        'p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-xl backdrop-blur-xl transition-all duration-300',
        glow && 'hover:border-indigo-500/40 hover:shadow-indigo-500/10',
        className
      )}
    >
      {children}
    </div>
  );
};
