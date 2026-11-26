import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeystrokeEvent } from '@/lib/types';
import { analyzeFingers } from '@/lib/test-engine/finger-analysis';
import { HandMap } from '../HandMap';
import { KeyboardHeatmap } from '../KeyboardHeatmap';
import { FingerTable } from '../FingerTable';
import { DataProgress } from '../DataProgress';
import { DrillLauncher } from '../DrillLauncher';

/** Realistic-ish synthetic session: every letter typed, with per-finger speed differences. */
function syntheticKeystrokes(): KeystrokeEvent[] {
  const text = 'the quick brown fox jumps over the lazy dog pack my box with five dozen liquor jugs '.repeat(12);
  const slowChars = new Set(['q', 'a', 'z', 'p']); // pinkies slow
  const events: KeystrokeEvent[] = [];
  let t = 1000;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    t += slowChars.has(ch) ? 260 : 140 + (i % 5) * 10;
    events.push({
      timestamp: t,
      key: ch,
      wordIndex: 0,
      charIndex: i,
      expectedChar: ch,
      wasCorrect: i % 37 !== 0, // sprinkle errors
      isBackspace: false,
    });
  }
  return events;
}

const report = analyzeFingers([syntheticKeystrokes()]);

describe('finger components', () => {
  it('HandMap renders every finger and shows details on hover', () => {
    render(<HandMap report={report} />);
    expect(screen.getByText('Finger Speed Map')).toBeInTheDocument();
    const leftPinky = screen.getByLabelText(/^Left Pinky/);
    fireEvent.mouseEnter(leftPinky);
    expect(screen.getByText('Left Pinky')).toBeInTheDocument();
    expect(screen.getAllByText(/slower than average/).length).toBeGreaterThan(0);
  });

  it('KeyboardHeatmap renders keys and details on hover', () => {
    render(<KeyboardHeatmap report={report} />);
    const qKey = screen.getByLabelText(/^q key/);
    fireEvent.mouseEnter(qKey);
    expect(screen.getByText('Left Pinky')).toBeInTheDocument();
  });

  it('FingerTable lists all ten fingers weakest first', () => {
    render(<FingerTable report={report} />);
    const rows = screen.getAllByRole('row').slice(1); // drop header
    expect(rows).toHaveLength(10);
    expect(rows[0]).toHaveTextContent(/Pinky/);
  });

  it('DataProgress shows readiness percent', () => {
    render(<DataProgress report={report} />);
    expect(screen.getByText(/Collecting data/)).toBeInTheDocument();
    expect(screen.getByText(/%$/)).toBeInTheDocument();
  });

  it('DrillLauncher defaults the targeted drill to the weakest fingers', () => {
    render(<DrillLauncher report={report} />);
    expect(screen.getByText('Start balanced drill')).toBeInTheDocument();
    const pressed = screen.getAllByRole('button', { pressed: true });
    expect(pressed.length).toBe(3);
    expect(pressed.some((b) => b.textContent?.includes('Pinky'))).toBe(true);
  });
});
