'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { TypingTest } from '@/components/typing-test/TypingTest';
import { ContentPicker } from '@/components/content-picker/ContentPicker';
import { TimeTrialResetNotice } from '@/components/time-trial/TimeTrialResetNotice';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const hasUserSelectedContent = useSettingsStore(s => s.hasUserSelectedContent);

  useEffect(() => setMounted(true), []);

  // During SSR/hydration, render nothing to avoid flash
  if (!mounted) return null;

  return (
    <>
      <TimeTrialResetNotice />
      {hasUserSelectedContent ? <TypingTest /> : <ContentPicker />}
    </>
  );
}
