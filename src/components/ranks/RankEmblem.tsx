import React from 'react';
import { RankTier } from '@/types/database';

interface RankEmblemProps {
  rank?: RankTier | { slug: string; name: string; color: string };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showGlow?: boolean;
}

const SIZE_MAP = {
  xs: { box: 18, stroke: 1.5 },
  sm: { box: 24, stroke: 1.5 },
  md: { box: 36, stroke: 2 },
  lg: { box: 48, stroke: 2.2 },
  xl: { box: 64, stroke: 2.5 },
};

/**
 * Original SVG Rank Emblems.
 * Features distinct geometries, unique central symbols, and clear shape+color differences.
 * Provides accessible text alternatives via aria-label and title tags.
 */
export const RankEmblem: React.FC<RankEmblemProps> = ({
  rank,
  size = 'md',
  className = '',
  showGlow = false,
}) => {
  const slug = (rank?.slug || 'apprentice').toLowerCase();
  const name = rank?.name || 'Apprentice';
  const color = rank?.color || '#94A3B8';
  const { box, stroke } = SIZE_MAP[size];

  // Render original geometry according to rank
  const renderEmblemContent = () => {
    switch (slug) {
      case 'apprentice':
        // Hexagon with terminal command prompt (>_)
        return (
          <>
            <polygon
              points="12,2 21,7 21,17 12,22 3,17 3,7"
              fill="rgba(148, 163, 184, 0.12)"
              stroke={color}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            {/* Terminal prompt symbol */}
            <path
              d="M7.5 9L11 12L7.5 15"
              fill="none"
              stroke={color}
              strokeWidth={stroke * 0.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="12.5"
              y1="15"
              x2="16.5"
              y2="15"
              stroke={color}
              strokeWidth={stroke * 0.9}
              strokeLinecap="round"
            />
          </>
        );

      case 'scripter':
        // Rotated Diamond with code brackets (< / >)
        return (
          <>
            <polygon
              points="12,2 22,12 12,22 2,12"
              fill="rgba(56, 189, 248, 0.12)"
              stroke={color}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            {/* Code angle brackets and slash */}
            <path
              d="M8.5 9.5L6.5 12L8.5 14.5"
              fill="none"
              stroke={color}
              strokeWidth={stroke * 0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15.5 9.5L17.5 12L15.5 14.5"
              fill="none"
              stroke={color}
              strokeWidth={stroke * 0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="13"
              y1="9"
              x2="11"
              y2="15"
              stroke={color}
              strokeWidth={stroke * 0.8}
              strokeLinecap="round"
            />
          </>
        );

      case 'debugger':
        // Octagon with bug glyph and diagnostic nodes
        return (
          <>
            <polygon
              points="7,2 17,2 22,7 22,17 17,22 7,22 2,17 2,7"
              fill="rgba(52, 211, 153, 0.12)"
              stroke={color}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            {/* Bug body and antennae */}
            <ellipse cx="12" cy="12.5" rx="3.5" ry="4.5" fill="none" stroke={color} strokeWidth={stroke * 0.8} />
            <line x1="6" y1="11" x2="8.5" y2="12" stroke={color} strokeWidth={stroke * 0.75} strokeLinecap="round" />
            <line x1="18" y1="11" x2="15.5" y2="12" stroke={color} strokeWidth={stroke * 0.75} strokeLinecap="round" />
            <line x1="6" y1="14" x2="8.5" y2="13.5" stroke={color} strokeWidth={stroke * 0.75} strokeLinecap="round" />
            <line x1="18" y1="14" x2="15.5" y2="13.5" stroke={color} strokeWidth={stroke * 0.75} strokeLinecap="round" />
            <path d="M10 8L8 6M14 8L16 6" stroke={color} strokeWidth={stroke * 0.75} strokeLinecap="round" />
          </>
        );

      case 'architect':
        // Shield outline with microprocessor circuit core
        return (
          <>
            <path
              d="M12 2L20 5V12C20 17.5 16.5 21 12 22C7.5 21 4 17.5 4 12V5L12 2Z"
              fill="rgba(129, 140, 248, 0.12)"
              stroke={color}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            {/* CPU die and bus traces */}
            <rect x="8.5" y="8.5" width="7" height="7" rx="1.5" fill="none" stroke={color} strokeWidth={stroke * 0.8} />
            <circle cx="12" cy="12" r="1.5" fill={color} />
            <line x1="12" y1="5.5" x2="12" y2="8.5" stroke={color} strokeWidth={stroke * 0.7} />
            <line x1="12" y1="15.5" x2="12" y2="18.5" stroke={color} strokeWidth={stroke * 0.7} />
            <line x1="5.5" y1="12" x2="8.5" y2="12" stroke={color} strokeWidth={stroke * 0.7} />
            <line x1="15.5" y1="12" x2="18.5" y2="12" stroke={color} strokeWidth={stroke * 0.7} />
          </>
        );

      case 'strategist':
        // Fortress Chevron with fortress battlements
        return (
          <>
            <polygon
              points="12,2 21,6 19,19 12,22 5,19 3,6"
              fill="rgba(245, 158, 11, 0.14)"
              stroke={color}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            {/* Battlements / Citadel Spire */}
            <path
              d="M8 15V10H10V12H14V10H16V15"
              fill="none"
              stroke={color}
              strokeWidth={stroke * 0.8}
              strokeLinejoin="round"
            />
            <path
              d="M12 7L14 9H10L12 7Z"
              fill={color}
            />
          </>
        );

      case 'innovator':
        // 8-Point Faceted Starburst with dual lightning core
        return (
          <>
            <polygon
              points="12,2 15,6 20,4 18,9 22,12 18,15 20,20 15,18 12,22 9,18 4,20 6,15 2,12 6,9 4,4 9,6"
              fill="rgba(236, 72, 153, 0.14)"
              stroke={color}
              strokeWidth={stroke * 0.85}
              strokeLinejoin="round"
            />
            {/* Energy spark */}
            <path
              d="M13 7L9.5 12.5H13.5L11 17L15 11.5H11.5L13 7Z"
              fill={color}
            />
          </>
        );

      case 'grandmaster':
        // Celestial Crown with apex spires and halo gems
        return (
          <>
            <path
              d="M4 18H20L21 8L16 12L12 4L8 12L3 8L4 18Z"
              fill="rgba(168, 85, 247, 0.16)"
              stroke={color}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            <circle cx="12" cy="4" r="1.3" fill={color} />
            <circle cx="3" cy="8" r="1.1" fill={color} />
            <circle cx="21" cy="8" r="1.1" fill={color} />
            <line x1="6" y1="15" x2="18" y2="15" stroke={color} strokeWidth={stroke * 0.8} />
            <circle cx="12" cy="15" r="1" fill={color} />
          </>
        );

      default:
        return (
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="rgba(148, 163, 184, 0.12)"
            stroke={color}
            strokeWidth={stroke}
          />
        );
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{
        filter: showGlow ? `drop-shadow(0 0 8px ${color}66)` : undefined,
      }}
    >
      <svg
        width={box}
        height={box}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`${name} Rank Emblem`}
      >
        <title>{`${name} Rank`}</title>
        {renderEmblemContent()}
      </svg>
    </div>
  );
};
