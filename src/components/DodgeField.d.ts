import React from 'react';

export interface DodgeState {
  dodges: number;
  gave: boolean;
  caught: boolean;
  fleeing: boolean;
}

export interface DodgeFieldProps {
  children?: React.ReactNode | ((state: DodgeState) => React.ReactNode);
  taunts?: string[];
  notice?: string;
  inkColor?: string;
  contrastColor?: string;
  fieldHeight?: number;
  reach?: number;
  radius?: number;
  falloff?: number;
  fleeDuration?: number;
  returnDuration?: number;
  returnBounce?: number;
  axis?: 'both' | 'x' | 'y';
  wall?: 'clamp' | 'bounce';
  patience?: number;
  disabled?: boolean;
  onDodge?: (count: number) => void;
  onRelent?: () => void;
  onCatch?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

declare const DodgeField: React.FC<DodgeFieldProps>;

export default DodgeField;
