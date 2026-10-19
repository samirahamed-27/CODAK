'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface TypewriterTransitionProps {
  codeSnippet: string;
  lineSpeedMs?: number; // 20-40ms per line
  themeColor?: string;
  soundEnabled?: boolean;
  onComplete: () => void;
}

export const TypewriterTransition: React.FC<TypewriterTransitionProps> = ({
  codeSnippet,
  lineSpeedMs = 26,
  themeColor = '#10b981',
  soundEnabled = true,
  onComplete,
}) => {
  const lines = codeSnippet.split('\n');
  const [visibleLinesCount, setVisibleLinesCount] = useState<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play retro terminal keystroke tick
  const playKeyClack = useRef(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current && typeof window !== 'undefined') {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Sharp micro-click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400 + Math.random() * 400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.015);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.016);
    } catch {
      // Audio fallback
    }
  });

  useEffect(() => {
    let currentLine = 0;

    const interval = setInterval(() => {
      currentLine++;
      setVisibleLinesCount(currentLine);
      playKeyClack.current();

      if (currentLine >= lines.length) {
        clearInterval(interval);
        // Small settle delay (40ms) then enable katana interaction
        setTimeout(() => {
          onComplete();
        }, 50);
      }
    }, lineSpeedMs);

    return () => clearInterval(interval);
  }, [codeSnippet, lineSpeedMs, lines.length, onComplete]);

  return (
    <div className="flex flex-col justify-center min-h-[160px] select-none font-mono text-sm tracking-wide">
      {lines.slice(0, visibleLinesCount).map((lineStr, idx) => {
        const isCurrentHead = idx === visibleLinesCount - 1;

        return (
          <div
            key={idx}
            className="flex items-center px-2 py-0.5 rounded transition-opacity duration-75"
          >
            <span className="w-8 select-none text-right pr-4 text-zinc-600 text-xs">
              {idx + 1}
            </span>
            <span className="text-zinc-300 flex-1 whitespace-pre flex items-center">
              <span>{lineStr || ' '}</span>
              {isCurrentHead && (
                <span
                  className="inline-block w-2 h-4 ml-1 bg-white animate-pulse"
                  style={{
                    backgroundColor: themeColor,
                    boxShadow: `0 0 8px ${themeColor}`,
                  }}
                />
              )}
            </span>
          </div>
        );
      })}

      {/* Trailing empty placeholder lines if any */}
      {visibleLinesCount === 0 && (
        <div className="flex items-center px-2 py-0.5">
          <span className="w-8 select-none text-right pr-4 text-zinc-700 text-xs">
            1
          </span>
          <span
            className="inline-block w-2 h-4 bg-white animate-pulse"
            style={{ backgroundColor: themeColor }}
          />
        </div>
      )}
    </div>
  );
};

export default TypewriterTransition;
