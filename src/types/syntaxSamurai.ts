/**
 * Syntax Samurai - Type Definitions
 * Phase 1: Data Model & Dojo Selection
 */

export type LanguageEnemy = 'python' | 'javascript' | 'cpp' | 'java';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'codemare';

export interface SyntaxQuestion {
  /** Unique question identifier, e.g., 'py-easy-1', 'js-hard-4' */
  id: string;
  /** Language opponent category */
  language: LanguageEnemy;
  /** Battle tier */
  difficulty: Difficulty;
  /** Code snippet containing a realistic syntax bug */
  codeSnippet: string;
  /** 0-indexed line index where the syntax error resides */
  errorLineIndex: number;
  /** The exact bugged token, missing token indicator, or flawed operator */
  errorToken: string;
  /** Short hint describing the structural flaw or line boundary */
  errorBoundingHint: string;
  /** 4 selectable fix tokens: exactly 1 correct replacement + 3 realistic distractors */
  fixOptions: string[];
  /** The correct replacement token (must match one entry in fixOptions) */
  correctReplacement: string;
  /** Clear educational explanation of why the bug failed compilation/execution and how the fix resolves it */
  explanation: string;
}

export interface EnemyProfile {
  id: LanguageEnemy;
  name: string;
  alias: string;
  kanji: string;
  element: string;
  description: string;
  difficultyRating: number; // 1 to 4
  themeColor: string;
  accentColor: string;
  borderColor: string;
  lore: string;
  avatarIcon: string;
  stats: {
    attackSpeed: string;
    precision: string;
    lethalThreat: string;
  };
}

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  sublabel: string;
  kanji: string;
  questionCount: number;
  timePerQuestionSec: number;
  estimatedTime: string;
  xpReward: number;
  description: string;
  badgeColor: string;
  slashMultiplier: number;
}

export interface LobbySelection {
  enemy: LanguageEnemy;
  difficulty: Difficulty;
}

export interface LobbyScreenProps {
  onStartGame?: (selection: LobbySelection) => void;
  onBack?: () => void;
  initialEnemy?: LanguageEnemy;
  initialDifficulty?: Difficulty;
}

export interface SlashPoint {
  x: number;
  y: number;
  time: number;
  speed: number;
}

export interface TokenBoundingBox {
  id: string;
  isError: boolean;
  lineIndex: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type HitType = 'critical_slash' | 'parry_deflect' | 'none';

export interface SlashHitEvent {
  type: HitType;
  token?: TokenBoundingBox;
  point: { x: number; y: number };
  cutSegment?: { p1: { x: number; y: number }; p2: { x: number; y: number } };
  timestamp: number;
}

export interface BladeSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

