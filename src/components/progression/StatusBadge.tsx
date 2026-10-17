import React from 'react';
import { CourseStatus } from '@/lib/course-progression-data';
import { CheckCircle2, AlertTriangle, AlertOctagon, Sparkles } from 'lucide-react';

interface StatusBadgeProps {
  status: CourseStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}: StatusBadgeProps) {
  const getStyles = () => {
    switch (status) {
      case 'ON TRACK':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
          dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />,
        };
      case 'TIGHT':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
          dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
          icon: <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />,
        };
      case 'DANGER':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse',
          dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]',
          icon: <AlertOctagon className="w-3 h-3 text-rose-400 shrink-0" />,
        };
      case 'COMPLETE':
        return {
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
          dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]',
          icon: <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />,
        };
      default:
        return {
          bg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          dot: 'bg-zinc-400',
          icon: null,
        };
    }
  };

  const config = getStyles();
  const sizeClasses =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5 gap-1 tracking-wider'
      : size === 'lg'
      ? 'text-xs px-3.5 py-1.5 gap-2 tracking-wider font-semibold'
      : 'text-[11px] px-2.5 py-1 gap-1.5 tracking-wider font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border uppercase font-mono ${config.bg} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {showIcon && config.icon}
      <span>{status}</span>
    </span>
  );
}
