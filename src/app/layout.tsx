import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { DemoRoleSwitch } from '@/components/DemoRoleSwitch';
import Aurora from '@/components/Aurora';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Gamify - Gamified Learning Platform',
  description: 'Duolingo for college: Learn, Play, and Compete.',
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
      <body className="min-h-screen w-full flex flex-col bg-[#07080b] text-slate-100 selection:bg-sky-400 selection:text-[#07080b] relative overflow-x-hidden">
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

        <DemoRoleSwitch />
        <div className="relative z-10 flex-1 flex flex-col w-full">
          {children}
        </div>
      </body>
    </html>
  );
}
