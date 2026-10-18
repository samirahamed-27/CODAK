'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  checkCelebrationAction,
  acknowledgeCelebrationAction,
  CelebrationCheckResult,
} from '@/app/actions/celebrations';

// Lazy-load the animation modal so it doesn't impact initial bundle size or Lighthouse score
const CelebrationModal = dynamic(
  () => import('./CelebrationModal').then((mod) => mod.CelebrationModal),
  { ssr: false }
);

export const CELEBRATION_TRIGGER_EVENT = 'gamify:check-celebration';

/**
 * Helper to trigger celebration check from anywhere in the client
 * (e.g., right after quiz finalization, duel submit, quest claim)
 */
export function triggerCelebrationCheck() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CELEBRATION_TRIGGER_EVENT));
  }
}

interface CelebrationManagerProps {
  checkOnMount?: boolean;
}

export const CelebrationManager: React.FC<CelebrationManagerProps> = ({
  checkOnMount = true,
}) => {
  const [celebrationData, setCelebrationData] = useState<CelebrationCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const performCheck = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const res = await checkCelebrationAction();
      if (res.shouldCelebrate && res.newLevel && res.newRank) {
        setCelebrationData(res);
        // Persist server marker immediately so reload or second session does not replay
        await acknowledgeCelebrationAction(res.newLevel, res.newRank.slug);
      }
    } catch (err) {
      console.warn('Failed to check celebration status:', err);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  useEffect(() => {
    if (checkOnMount) {
      // Small timeout to allow initial page render without blocking
      const timer = setTimeout(() => {
        performCheck();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [checkOnMount, performCheck]);

  useEffect(() => {
    const handleTrigger = () => {
      performCheck();
    };
    window.addEventListener(CELEBRATION_TRIGGER_EVENT, handleTrigger);
    return () => window.removeEventListener(CELEBRATION_TRIGGER_EVENT, handleTrigger);
  }, [performCheck]);

  const handleClose = useCallback(() => {
    setCelebrationData(null);
  }, []);

  if (!celebrationData) {
    return null;
  }

  return <CelebrationModal data={celebrationData} onClose={handleClose} />;
};
