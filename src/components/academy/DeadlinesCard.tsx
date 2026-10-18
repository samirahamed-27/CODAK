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
      className="game-card p-5 flex flex-col justify-between relative overflow-hidden h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 block mb-0.5">
            Coursework
          </span>
          <Shuffle
            text="Deadlines"
            tag="h2"
            effect="slide"
            duration={0.35}
            stagger={0.03}
            triggerOnHover={true}
            color="#FFFFFF"
            accentColor="#A1A1AA"
            style={{ fontSize: '1.15rem', letterSpacing: '0.02em', fontWeight: 600 }}
          />
        </div>

        <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center text-white">
          <Scroll className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 my-3 flex flex-col justify-center">
        {deadlines.length === 0 ? (
          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-zinc-400 mb-2.5">
              <Lock className="w-4 h-4 text-zinc-400" />
            </div>

            <h3 className="font-semibold text-white text-xs mb-1">
              No assignments pending
            </h3>
            <p className="text-[11px] text-zinc-400 max-w-xs leading-relaxed">
              Teacher assignments and homework deadlines will automatically sync here.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {deadlines.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <h4 className="font-medium text-white leading-tight">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-zinc-300 font-mono">
                    {item.subject}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>{item.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-white" />
          <span>Faculty sync active</span>
        </span>
        <span className="text-zinc-400 font-medium">0 PENDING</span>
      </div>
    </article>
  );
}
