'use client';

import { TypingTest } from '@/components/typing-test/TypingTest';
import { TimeTrialResetNotice } from '@/components/time-trial/TimeTrialResetNotice';

export default function Home() {
  return (
    <>
      <TimeTrialResetNotice />
      <TypingTest />
    </>
  );
}
