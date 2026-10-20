import React from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Aurora from '@/components/Aurora';
import TargetCursor from '@/components/ui/TargetCursor';
import { DemoRoleSwitch } from '@/components/DemoRoleSwitch';
import { PreloaderProvider } from '@/components/ui/PreloaderContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CODAK - Gamified Learning Platform',
  description: 'CODAK - Next-Gen Gamified Academic Platform: Learn, Play, and Compete.',
  icons: {
    icon: [
      { url: '/favicon.ico?v=3', sizes: 'any' },
      { url: '/codak-logo.png', type: 'image/png', sizes: '64x64' },
      { url: '/icon.png?v=3', type: 'image/png', sizes: '64x64' },
      { url: '/assets/icons/icon-32.png?v=3', type: 'image/png', sizes: '32x32' },
      { url: '/assets/icons/icon-16.png?v=3', type: 'image/png', sizes: '16x16' },
    ],
    shortcut: '/favicon.ico?v=3',
    apple: [
      { url: '/apple-icon.png?v=3', sizes: '64x64', type: 'image/png' },
    ],
  },
};

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark bg-black`}
    >
      <head>
        {/* Instant Data URI favicon to bypass any browser SQLite disk caching */}
        <link rel="icon" type="image/png" href="data:image/png;base64,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" />
        <link rel="icon" href="/favicon.ico?v=3" sizes="any" />
        <link rel="icon" href="/codak-logo.png" type="image/png" sizes="64x64" />
        <link rel="icon" href="/icon.png?v=3" type="image/png" sizes="64x64" />
        <link rel="icon" href="/assets/icons/icon-32.png?v=3" type="image/png" sizes="32x32" />
        <link rel="icon" href="/assets/icons/icon-16.png?v=3" type="image/png" sizes="16x16" />
        <link rel="shortcut icon" href="/favicon.ico?v=3" />
        <link rel="apple-touch-icon" href="/apple-icon.png?v=3" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&family=Pixelify+Sans:wght@400..700&family=Poppins:wght@300;400;500;600;700;800&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen w-full flex flex-col bg-black text-zinc-100 selection:bg-white selection:text-black relative overflow-x-hidden"
      >
        {/* Ambient WebGL Aurora Background - Duotone Monochrome */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
          <Aurora
            colorStops={['#ffffff', '#27272a', '#09090b']}
            amplitude={1}
            blend={0.5}
            height={0.5}
            speed={1}
            glow={0.5}
            scale={1}
            brightness={0.9}
            layers={1}
            direction="top"
            mouseInteraction={true}
          />
        </div>

        <React.Suspense fallback={null}>
          <DemoRoleSwitch />
        </React.Suspense>
        <TargetCursor
          spinDuration={3}
          hideDefaultCursor={true}
          parallaxOn={true}
          cursorColor="#ffffff"
          cursorColorOnTarget="#ffffff"
          blendMode="normal"
        />

        <PreloaderProvider>
          <div className="relative z-10 flex-1 flex flex-col w-full">
            {children}
          </div>
        </PreloaderProvider>
      </body>
    </html>
  );
}
