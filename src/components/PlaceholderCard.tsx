import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';

interface PlaceholderCardProps {
  title: string;
  description: string;
  phase: string;
  icon: LucideIcon;
  features?: string[];
}

export function PlaceholderCard({
  title,
  description,
  phase,
  icon: Icon,
  features,
}: PlaceholderCardProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl backdrop-blur-sm transition-all hover:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Icon className="w-6 h-6" />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Sparkles className="w-3.5 h-3.5" />
          {phase}
        </span>
      </div>

      <h3 className="text-xl font-bold tracking-tight mb-2 text-slate-100">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed mb-6">{description}</p>

      {features && features.length > 0 && (
        <div className="border-t border-slate-800/80 pt-4 mt-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2.5">
            Planned Features:
          </p>
          <ul className="space-y-1.5">
            {features.map((feat, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                {feat}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
