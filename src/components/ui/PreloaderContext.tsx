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
      onDestinationReached();
    }
  }, [pathname, onInitialPath, onDestinationReached]);

  return null;
}

export function PreloaderProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [active, setActive] = useState(false);
  const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('student');
  const [targetDestination, setTargetDestination] = useState<string | null>(null);
  const [isDestinationReady, setIsDestinationReady] = useState(false);
  const [customText, setCustomText] = useState<string | null>('Loading CODAK...');
  const [customSubtext, setCustomSubtext] = useState<string | null>('Syncing XP ledger, course velocity & battle arena...');
  const [customDuration, setCustomDuration] = useState<number>(800);

  // 1. Initial page load latency detection: if page takes time to load (> 180ms), show animation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (document.readyState !== 'complete') {
      const initialTimer = setTimeout(() => {
        if (document.readyState !== 'complete') {
          setActive(true);
          setIsDestinationReady(false);
        }
      }, 180);

      const handleWindowLoad = () => {
        clearTimeout(initialTimer);
        setIsDestinationReady(true);
      };

      window.addEventListener('load', handleWindowLoad);
      return () => {
        clearTimeout(initialTimer);
        window.removeEventListener('load', handleWindowLoad);
      };
    }
  }, []);

  // 2. Route navigation latency detection: if navigation takes time (> 160ms), show animation
  useEffect(() => {
    let navTimer: NodeJS.Timeout | null = null;

    const handleAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      const target = anchor.getAttribute('target');

      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('//') &&
        !href.startsWith('/api') &&
        !href.startsWith('#') &&
        target !== '_blank' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey
      ) {
        try {
          const url = new URL(href, window.location.origin);
          if (url.pathname !== window.location.pathname) {
            if (navTimer) clearTimeout(navTimer);

            setTargetDestination(url.pathname);

            // If destination page takes time to load (> 160ms), play animation!
            navTimer = setTimeout(() => {
              setActive(true);
              setIsDestinationReady(false);
              setCustomDuration(750);
            }, 160);
          }
        } catch {
          // ignore url parse error
        }
      }
    };

    document.addEventListener('click', handleAnchorClick, true);
    return () => {
      if (navTimer) clearTimeout(navTimer);
      document.removeEventListener('click', handleAnchorClick, true);
    };
  }, []);

  const handleInitialPath = useCallback(
    (currentPath: string) => {
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
          setCustomText('Loading CODAK Hub...');
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

      // Immediately activate preloader
      setActive(true);

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
