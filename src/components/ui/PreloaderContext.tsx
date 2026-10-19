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
  cancelPreload: () => void;
}

const PreloaderContext = createContext<PreloaderContextValue>({
  isPreloading: false,
  startPreload: () => {},
  cancelPreload: () => {},
});

export const usePreloader = () => useContext(PreloaderContext);

function RouteWatcher({
  targetDestination,
  onDestinationReached,
  onInitialPath,
}: {
  targetDestination: string | null;
  onDestinationReached: () => void;
  onInitialPath: (pathname: string) => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      onInitialPath(pathname);
    }
  }, [pathname, onInitialPath]);

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

  // On website bootup, start active = true so the stairs preloader plays
  const [active, setActive] = useState(true);
  const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('student');
  const [targetDestination, setTargetDestination] = useState<string | null>(null);
  const [isDestinationReady, setIsDestinationReady] = useState(true);
  const [customText, setCustomText] = useState<string | null>('Welcome to CODAK • Academic Progression Platform');
  const [customSubtext, setCustomSubtext] = useState<string | null>('Initializing XP ledger, course velocity & battle arena...');
  const [customDuration, setCustomDuration] = useState<number>(1000);

  const handleInitialPath = useCallback(
    (currentPath: string) => {
      // Only set bootup text if not performing an explicit targeted navigation
      if (!targetDestination) {
        if (currentPath.startsWith('/admin')) {
          setRole('admin');
          setCustomText('Welcome to CODAK • Entering ADMIN Hub');
        } else if (currentPath.startsWith('/faculty')) {
          setRole('faculty');
          setCustomText('Welcome to CODAK • Entering FACULTY Hub');
        } else if (currentPath.startsWith('/student')) {
          setRole('student');
          setCustomText('Welcome to CODAK • Entering STUDENT Hub');
        } else if (currentPath === '/login') {
          setCustomText('CODAK • Academic Portal');
        } else {
          setCustomText('Welcome to CODAK • Academic Progression Platform');
        }
      }
    },
    [targetDestination]
  );

  const startPreload = useCallback(
    (options: PreloadOptions) => {
      const r = options.role || 'student';
      const dest = options.destination || `/${r}`;
      setRole(r);
      setTargetDestination(dest);
      setIsDestinationReady(false);
      setCustomText(options.text || null);
      setCustomSubtext(options.subtext || null);
      setCustomDuration(options.duration || 1000);

      // 1. Immediately activate preloader covering the viewport
      setActive(true);

      // 2. Prefetch and navigate to destination in the background
      try {
        router.prefetch(dest);
        router.push(dest);
      } catch {
        // Ignore prefetch/push errors
      }
    },
    [router]
  );

  const cancelPreload = useCallback(() => {
    setActive(false);
    setTargetDestination(null);
    setIsDestinationReady(false);
  }, []);

  const handleDestinationReached = useCallback(() => {
    setIsDestinationReady(true);
  }, []);

  const handleComplete = useCallback(() => {
    setActive(false);
    setTargetDestination(null);
    setIsDestinationReady(false);
  }, []);

  return (
    <PreloaderContext.Provider value={{ isPreloading: active, startPreload, cancelPreload }}>
      {children}
      <Suspense fallback={null}>
        <RouteWatcher
          targetDestination={targetDestination}
          onDestinationReached={handleDestinationReached}
          onInitialPath={handleInitialPath}
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
