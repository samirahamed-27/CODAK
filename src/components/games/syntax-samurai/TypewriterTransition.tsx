'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface TypewriterTransitionProps {
  codeSnippet: string;
  lineSpeedMs?: number; // 20-40ms per line
  themeColor?: string;
  soundEnabled?: boolean;
  onComplete: () => void;
}

const codeFontStyle: React.CSSProperties = {
  fontFamily:
    "'JetBrains Mono', 'Fira Code', 'VT323', var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: '1.4rem',
  lineHeight: 2.2,
  letterSpacing: '0.04em',
};

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
    let settleTimeout: ReturnType<typeof setTimeout> | null = null;

    const interval = setInterval(() => {
      currentLine++;
      setVisibleLinesCount(currentLine);
      playKeyClack.current();

      if (currentLine >= lines.length) {
        clearInterval(interval);
        // Small settle delay (50ms) then enable katana interaction
        settleTimeout = setTimeout(() => {
          onComplete();
        }, 50);
      }
    }, lineSpeedMs);

    return () => {
      clearInterval(interval);
      if (settleTimeout) clearTimeout(settleTimeout);
    };
  }, [codeSnippet, lineSpeedMs, lines.length, onComplete]);

  return (
    <div className="flex flex-col justify-center min-h-[220px] select-none">
      {lines.slice(0, visibleLinesCount).map((lineStr, idx) => {
        const isCurrentHead = idx === visibleLinesCount - 1;

        return (
          <div
            key={idx}
            className="flex items-center px-3 py-1 rounded-lg transition-opacity duration-75"
            style={{ minHeight: '3.2rem' }}
          >
            <span
              className="w-12 select-none text-right pr-6 text-zinc-600 font-mono text-sm sm:text-base font-bold opacity-60"
              style={{ lineHeight: 'inherit' }}
            >
              {idx + 1}
            </span>
            <span
              className="text-zinc-300 flex-1 whitespace-pre flex items-center"
              style={codeFontStyle}
            >
              <span>{lineStr || ' '}</span>
              {isCurrentHead && (
                <span
                  className="inline-block w-2.5 h-6 ml-1 bg-white animate-pulse"
                  style={{
                    backgroundColor: themeColor,
                    boxShadow: `0 0 10px ${themeColor}`,
                  }}
                />
              )}
            </span>
          </div>
        );
      })}

      {/* Trailing empty placeholder lines if any */}
      {visibleLinesCount === 0 && (
        <div className="flex items-center px-3 py-1" style={{ minHeight: '3.2rem' }}>
          <span
            className="w-12 select-none text-right pr-6 text-zinc-700 font-mono text-sm sm:text-base font-bold opacity-60"
            style={{ lineHeight: 'inherit' }}
          >
            1
          </span>
          <span
            className="inline-block w-2.5 h-6 bg-white animate-pulse"
            style={{ backgroundColor: themeColor }}
          />
        </div>
      )}
    </div>
  );
};

export default TypewriterTransition;
