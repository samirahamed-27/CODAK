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
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '64x64' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '64x64', type: 'image/png' },
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&family=Poppins:wght@300;400;500;600;700;800&family=Press+Start+2P&display=swap"
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
