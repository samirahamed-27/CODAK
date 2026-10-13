import { BASE_LEVEL_THRESHOLDS, XP_PER_LEVEL_AFTER_BASE } from './config';

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
  currentThreshold: number;
  nextThreshold: number;
}

/**
 * Calculates a student's level, progress into current level, and XP needed for next level.
 *
 * Rules:
 * - Level 1: 0 - 99 XP (needs 100)
 * - Level 2: 100 - 249 XP (needs 150)
 * - Level 3: 250 - 449 XP (needs 200)
 * - Level 4: 450 - 699 XP (needs 250)
 * - Level 5: 700 - 999 XP (needs 300)
 * - Level 6: 1000 - 1349 XP (needs 350)
 * - Level 6+: Each level requires an additional 350 XP.
 */
export function levelFromXp(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));

  // Check base thresholds (Levels 1 to 5)
  for (let i = 0; i < BASE_LEVEL_THRESHOLDS.length - 1; i++) {
    const currentThresh = BASE_LEVEL_THRESHOLDS[i];
    const nextThresh = BASE_LEVEL_THRESHOLDS[i + 1];

    if (xp < nextThresh) {
      const level = i + 1;
      const xpIntoLevel = xp - currentThresh;
      const xpForNextLevel = nextThresh - currentThresh;
      const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100));

      return {
        level,
        xpIntoLevel,
        xpForNextLevel,
        progressPercent,
        currentThreshold: currentThresh,
        nextThreshold: nextThresh,
      };
    }
  }

  // Level 6 and beyond (starting at 1000 XP)
  const maxBaseIndex = BASE_LEVEL_THRESHOLDS.length - 1; // 5
  const baseCeiling = BASE_LEVEL_THRESHOLDS[maxBaseIndex]; // 1000
  const additionalXp = xp - baseCeiling;
  const levelsAboveBase = Math.floor(additionalXp / XP_PER_LEVEL_AFTER_BASE);
  const level = maxBaseIndex + 1 + levelsAboveBase; // 6 + levelsAboveBase

  const currentThresh = baseCeiling + levelsAboveBase * XP_PER_LEVEL_AFTER_BASE;
  const nextThresh = currentThresh + XP_PER_LEVEL_AFTER_BASE;
  const xpIntoLevel = xp - currentThresh;
  const xpForNextLevel = XP_PER_LEVEL_AFTER_BASE;
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100));

  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    progressPercent,
    currentThreshold: currentThresh,
    nextThreshold: nextThresh,
  };
}
