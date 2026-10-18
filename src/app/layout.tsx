import React from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { DemoRoleSwitch } from '@/components/DemoRoleSwitch';
import Aurora from '@/components/Aurora';
import TargetCursor from '@/components/ui/TargetCursor';

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark bg-[#07080b]`}
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
        className="min-h-screen w-full flex flex-col bg-[#07080b] text-slate-100 selection:bg-sky-400 selection:text-[#07080b] relative overflow-x-hidden"
      >
        {/* Ambient WebGL Aurora Background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#06070a]">
          <Aurora
            colorStops={['#2c0fa1', '#104572', '#2284c1']}
            amplitude={1}
            blend={0.5}
            height={0.5}
            speed={1}
            glow={0.6}
            scale={1}
            brightness={1}
            layers={1}
            direction="top"
            mouseInteraction={true}
          />
        </div>

        <React.Suspense fallback={null}>
          <DemoRoleSwitch />
        </React.Suspense>
        <TargetCursor
          spinDuration={6}
          hideDefaultCursor={true}
          parallaxOn={true}
          cursorColor="#ffffff"
          cursorColorOnTarget="#38BDF8"
        />
        <div className="relative z-10 flex-1 flex flex-col w-full">
          {children}
        </div>
      </body>
    </html>
  );
}
