import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';
import Shuffle from '@/components/Shuffle';

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
    <div className="bg-[#10131E]/90 border border-[#1D2233] rounded-2xl p-6 sm:p-8 text-white shadow-xl backdrop-blur-sm transition-all hover:border-sky-400/40">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
          <Icon className="w-6 h-6" />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#07080B] border border-sky-400/30 text-sky-300">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          {phase}
        </span>
      </div>

      <div className="mb-2">
        <Shuffle
          text={title}
          tag="h3"
          effect="slide"
          duration={0.35}
          stagger={0.03}
          triggerOnHover={true}
          color="#FFFFFF"
          accentColor="#7DD3FC"
          style={{ fontSize: '1.25rem', letterSpacing: '0.04em' }}
        />
      </div>
      <p className="text-slate-400 text-sm leading-relaxed mb-6">{description}</p>

      {features && features.length > 0 && (
        <div className="border-t border-[#1D2233] pt-4 mt-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2.5">
            Planned Features:
          </p>
          <ul className="space-y-1.5">
            {features.map((feat, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                {feat}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
