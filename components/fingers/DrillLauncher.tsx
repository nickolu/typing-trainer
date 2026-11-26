'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Scale, Crosshair } from 'lucide-react';
import { FingerId, FINGERS, LETTER_FINGERS, getLettersForFinger } from '@/lib/finger-map';
import { FingerReport, rankWeakestFingers } from '@/lib/test-engine/finger-analysis';
import { generateFingerDrill, DrillMode } from '@/lib/finger-drill';
import { calculateRequiredWords } from '@/lib/test-content';
import { useTestStore } from '@/store/test-store';
import { useSettingsStore } from '@/store/settings-store';

export const FINGER_DRILL_LABEL = 'finger-drill';

interface DrillLauncherProps {
  report: FingerReport;
}

export function DrillLauncher({ report }: DrillLauncherProps) {
  const router = useRouter();
  const { initializeTest, resetTest } = useTestStore();
  const { defaultDuration, currentKeyboard } = useSettingsStore();

  const weakest = useMemo(() => rankWeakestFingers(report, 3).map((f) => f.id), [report]);
  const [selected, setSelected] = useState<FingerId[]>([]);
  const chosen = selected.length > 0 ? selected : weakest;

  const toggle = (id: FingerId) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const launch = (mode: DrillMode, targets?: FingerId[]) => {
    const wordCount = defaultDuration === 'content-length' ? 100 : calculateRequiredWords(defaultDuration);
    const words = generateFingerDrill({ mode, wordCount, targetFingers: targets });
    if (words.length === 0) return;

    const letters = (targets ?? []).flatMap((f) => getLettersForFinger(f));
    const labels = [FINGER_DRILL_LABEL, ...(currentKeyboard ? [currentKeyboard] : [])];

    resetTest();
    initializeTest(
      {
        duration: defaultDuration,
        testContentId: mode === 'balanced' ? 'finger-drill-balanced' : `finger-drill-${(targets ?? []).join('-')}`,
        testContentTitle: mode === 'balanced' ? 'Balanced Finger Drill' : 'Targeted Finger Drill',
        testContentCategory: 'Finger Drill',
        isPractice: true,
        practiceSequences: letters,
        userLabels: labels,
      },
      words
    );
    router.push('/');
  };

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
      <div className="mb-3">
        <h2 className="text-xl font-bold mb-1">Drill</h2>
        <p className="text-editor-muted text-sm">
          Drills use your current test duration and save like any other test, so every drill adds to the data above.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Balanced */}
        <div className="border border-editor-muted/40 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-editor-accent" />
            <h3 className="font-semibold">Balanced drill</h3>
          </div>
          <p className="text-sm text-editor-muted flex-1">
            Real words chosen so all eight fingers get an equal share of keystrokes. Best for building up data fast,
            especially for the pinkies, which ordinary text barely touches.
          </p>
          <button
            onClick={() => launch('balanced')}
            className="self-start inline-flex items-center gap-2 px-4 py-2 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            Start balanced drill
          </button>
        </div>

        {/* Targeted */}
        <div className="border border-editor-muted/40 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-[#eb6263]" />
            <h3 className="font-semibold">Targeted drill</h3>
          </div>
          <p className="text-sm text-editor-muted">
            Three quarters of the words lean on the fingers you pick. Defaults to your three weakest.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {LETTER_FINGERS.map((id) => {
              const active = chosen.includes(id);
              const isDefault = selected.length === 0 && weakest.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                    active
                      ? 'bg-[#eb6263]/20 border-[#eb6263]/60 text-[#f0a0a0]'
                      : 'bg-editor-muted/20 border-transparent text-editor-muted hover:bg-editor-muted/40'
                  }`}
                  title={isDefault ? 'One of your weakest fingers' : undefined}
                >
                  {FINGERS[id].hand === 'L' ? 'L' : 'R'} {FINGERS[id].shortName}
                  <span className="ml-1 font-mono opacity-70">{getLettersForFinger(id).join('')}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => launch('targeted', chosen)}
            disabled={chosen.length === 0}
            className="self-start inline-flex items-center gap-2 px-4 py-2 bg-[#c4504f] hover:bg-[#c4504f]/80 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            Drill {chosen.length === 0 ? 'weak fingers' : chosen.map((id) => FINGERS[id].shortName).join(', ')}
          </button>
          {chosen.length === 0 && (
            <p className="text-xs text-editor-muted">Pick fingers above, or collect more data so weak fingers can be detected.</p>
          )}
        </div>
      </div>
    </div>
  );
}
