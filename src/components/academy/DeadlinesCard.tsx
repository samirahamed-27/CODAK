'use client';

import React from 'react';
import { Lock, Scroll, Calendar, Clock } from 'lucide-react';
import { DeadlineItem } from '@/data/studentDashboardData';
import Shuffle from '@/components/Shuffle';

interface DeadlinesCardProps {
  deadlines?: DeadlineItem[];
}

export function DeadlinesCard({ deadlines = [] }: DeadlinesCardProps) {
  return (
    <article
      aria-label="Student Deadlines and Assignments"
      className="game-card p-6 flex flex-col justify-between relative overflow-hidden animate-card-pop"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="font-pixel text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            COURSEWORK
          </span>
          <Shuffle
            text="Deadlines"
            tag="h2"
            effect="slide"
            duration={0.35}
            stagger={0.03}
            triggerOnHover={true}
            color="#FFFFFF"
            accentColor="#7DD3FC"
            style={{ fontSize: '1.25rem', letterSpacing: '0.04em' }}
          />
        </div>

        <div className="w-8 h-8 rounded-xl bg-[#10131E] border border-sky-400/40 flex items-center justify-center text-sky-400">
          <Scroll className="w-4 h-4" />
        </div>
      </div>

      {/* Body: Placeholder State or Renderable List */}
      <div className="flex-1 my-3 flex flex-col justify-center">
        {deadlines.length === 0 ? (
          // Placeholder empty state per prompt specifications
          <div className="p-6 rounded-2xl bg-[#081534]/70 border border-[#1E3A78]/70 text-center flex flex-col items-center justify-center">
            {/* Locked chest / scroll visual icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#06080F] border-2 border-[#1E3A78] shadow-inner flex items-center justify-center text-[#FFB27A] mb-3 relative">
              <Lock className="w-6 h-6 text-[#FFB27A]" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#7CC4FF] animate-ping" />
            </div>

            <h3 className="font-bold text-white text-sm mb-1.5 font-body">
              No assignments yet.
            </h3>
            <p className="text-xs text-[#A9B8D6] max-w-xs leading-relaxed">
              Homework, assignments, and deadlines set by teachers will appear here.
            </p>
          </div>
        ) : (
          // Structured list renderer ready for future backend items
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {deadlines.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[#081534] border border-[#1E3A78] flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <h4 className="font-bold text-white leading-tight">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-[#7CC4FF] font-medium">
                    {item.subject}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#FFB27A]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-[#1E3A78]/70 flex items-center justify-between text-xs text-[#6C7FAD]">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#7CC4FF]" />
          <span>Faculty sync active</span>
        </span>
        <span className="text-[11px] font-pixel text-[#A9B8D6]">0 PENDING</span>
      </div>
    </article>
  );
}
