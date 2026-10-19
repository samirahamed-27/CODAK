import React from 'react';
import { Preloader } from '@/components/ui/Preloader';

export default function Loading() {
  return (
    <Preloader
      active={true}
      variant="stairs"
      text="Loading CODAK Hub..."
      subtext="Syncing XP ledger, course velocity & battle arena..."
      duration={1000}
    />
  );
}
