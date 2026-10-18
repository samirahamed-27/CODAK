'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Preloader } from './Preloader';

export interface PreloadOptions {
  role?: 'student' | 'faculty' | 'admin';
  destination?: string;
  text?: string;
  subtext?: string;
  duration?: number;
}

interface PreloaderContextValue {
  isPreloading: boolean;
  startPreload: (options: PreloadOptions) => void;
}

const PreloaderContext = createContext<PreloaderContextValue>({
  isPreloading: false,
  startPreload: () => {},
});

export const usePreloader = () => useContext(PreloaderContext);

function RouteWatcher({
  targetDestination,
  onDestinationReached,
}: {
  targetDestination: string | null;
  onDestinationReached: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!targetDestination) return;
    if (
      pathname === targetDestination ||
      (targetDestination !== '/' && pathname.startsWith(targetDestination))
    ) {
      onDestinationReached();
    }
  }, [pathname, targetDestination, onDestinationReached]);

  return null;
}

export function PreloaderProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [active, setActive] = useState(false);
  const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('student');
  const [targetDestination, setTargetDestination] = useState<string | null>(null);
  const [isDestinationReady, setIsDestinationReady] = useState(false);
  const [customText, setCustomText] = useState<string | null>(null);
  const [customSubtext, setCustomSubtext] = useState<string | null>(null);
  const [customDuration, setCustomDuration] = useState<number>(1800);

  const startPreload = useCallback(
    (options: PreloadOptions) => {
      const r = options.role || 'student';
      const dest = options.destination || `/${r}`;
      setRole(r);
      setTargetDestination(dest);
      setIsDestinationReady(false);
      setCustomText(options.text || null);
      setCustomSubtext(options.subtext || null);
      setCustomDuration(options.duration || 1800);

      // 1. Immediately activate preloader covering the viewport
      setActive(true);

      // 2. Prefetch and navigate to destination in the background
      try {
        router.prefetch(dest);
      } catch {
        // Ignore prefetch errors
      }

      // Kick off navigation immediately so destination page mounts while preloader runs
      setTimeout(() => {
        router.push(dest);
        router.refresh();
      }, 60);
    },
    [router]
  );

  const handleDestinationReached = useCallback(() => {
    setIsDestinationReady(true);
  }, []);

  const handleComplete = useCallback(() => {
    setActive(false);
    setTargetDestination(null);
    setIsDestinationReady(false);
  }, []);

  return (
    <PreloaderContext.Provider value={{ isPreloading: active, startPreload }}>
      {children}
      <Suspense fallback={null}>
        <RouteWatcher
          targetDestination={targetDestination}
          onDestinationReached={handleDestinationReached}
        />
      </Suspense>
      <Preloader
        active={active}
        variant="stairs"
        text={customText || `Welcome to CODAK • Entering ${role.toUpperCase()} Hub`}
        subtext={customSubtext || 'Initializing XP ledger, course velocity & battle arena...'}
        duration={customDuration}
        readyToExit={isDestinationReady}
        onComplete={handleComplete}
      />
    </PreloaderContext.Provider>
  );
}
