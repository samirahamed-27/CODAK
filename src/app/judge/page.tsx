import React from 'react';
import type { Metadata } from 'next';
import { JudgeLoginForm } from './JudgeLoginForm';

export const metadata: Metadata = {
  title: 'Evaluator Access • CODAK',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function JudgePage() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-black relative">
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <JudgeLoginForm />
    </main>
  );
}
