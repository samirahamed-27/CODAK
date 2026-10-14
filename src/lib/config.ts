/**
 * Application Configuration & Constants
 *
 * Golden Rule: Use one fixed timezone (Asia/Kolkata) with midnight cut-offs
 * for all streak calculations, daily quizzes, and league resets.
 */

export const TIMEZONE = 'Asia/Kolkata';

/**
 * Demo Mode Flag
 * When true, allows developers/evaluators to quickly switch roles in the UI.
 * Gated by NEXT_PUBLIC_DEMO_MODE (default: false).
 */
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * Level Threshold Configuration (re-exported from levels.ts)
 */
export { BASE_LEVEL_THRESHOLDS, XP_PER_LEVEL_AFTER_BASE } from './levels';

