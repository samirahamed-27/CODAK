import React from 'react';

export interface ShuffleProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  effect?: 'slide' | 'flip' | 'blur';
  shuffleDirection?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  maxDelay?: number;
  ease?: string | ((progress: number) => number);
  threshold?: number;
  rootMargin?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  textAlign?: 'left' | 'right' | 'center' | 'justify' | 'initial' | 'inherit';
  onShuffleComplete?: () => void;
  shuffleTimes?: number;
  animationMode?: 'evenodd' | 'sequence' | 'center' | 'random';
  loop?: boolean;
  loopDelay?: number;
  stagger?: number;
  scrambleCharset?: string;
  motionBlur?: boolean;
  color?: string;
  accentColor?: string;
  colorFrom?: string;
  colorTo?: string;
  triggerOnce?: boolean;
  respectReducedMotion?: boolean;
  triggerOnHover?: boolean;
  hoverRadius?: number;
}

declare const Shuffle: React.FC<ShuffleProps>;
export default Shuffle;
