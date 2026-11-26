/**
 * Maps characters to the finger that types them under standard QWERTY touch typing.
 *
 * Finger ids: hand letter (L/R) + digit, where 1 = thumb and 5 = pinky.
 * Shifted symbols map to the same physical key as their unshifted form.
 */

export type Hand = 'L' | 'R';
export type FingerId = 'L5' | 'L4' | 'L3' | 'L2' | 'L1' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
export type KeyRow = 'number' | 'top' | 'home' | 'bottom' | 'space';

export interface FingerInfo {
  id: FingerId;
  hand: Hand;
  name: string; // e.g. "Left Index"
  shortName: string; // e.g. "Index"
}

export const FINGER_ORDER: FingerId[] = ['L5', 'L4', 'L3', 'L2', 'L1', 'R1', 'R2', 'R3', 'R4', 'R5'];

/** Fingers that type letters (excludes thumbs, which only hit space). */
export const LETTER_FINGERS: FingerId[] = ['L5', 'L4', 'L3', 'L2', 'R2', 'R3', 'R4', 'R5'];

const FINGER_SHORT_NAMES: Record<number, string> = {
  1: 'Thumb',
  2: 'Index',
  3: 'Middle',
  4: 'Ring',
  5: 'Pinky',
};

export const FINGERS: Record<FingerId, FingerInfo> = Object.fromEntries(
  FINGER_ORDER.map((id) => {
    const hand = id[0] as Hand;
    const digit = Number(id[1]);
    const shortName = FINGER_SHORT_NAMES[digit];
    return [
      id,
      {
        id,
        hand,
        shortName,
        name: `${hand === 'L' ? 'Left' : 'Right'} ${shortName}`,
      },
    ];
  })
) as Record<FingerId, FingerInfo>;

/**
 * Physical keyboard rows. Each entry is [unshifted, shifted] for one key.
 * Order within a row is left to right, which the heatmap relies on.
 */
export interface PhysicalKey {
  base: string;
  shifted: string;
  finger: FingerId;
  row: KeyRow;
}

function row(rowName: KeyRow, keys: Array<[string, string, FingerId]>): PhysicalKey[] {
  return keys.map(([base, shifted, finger]) => ({ base, shifted, finger, row: rowName }));
}

export const KEYBOARD_ROWS: PhysicalKey[][] = [
  row('number', [
    ['`', '~', 'L5'],
    ['1', '!', 'L5'],
    ['2', '@', 'L4'],
    ['3', '#', 'L3'],
    ['4', '$', 'L2'],
    ['5', '%', 'L2'],
    ['6', '^', 'R2'],
    ['7', '&', 'R2'],
    ['8', '*', 'R3'],
    ['9', '(', 'R4'],
    ['0', ')', 'R5'],
    ['-', '_', 'R5'],
    ['=', '+', 'R5'],
  ]),
  row('top', [
    ['q', 'Q', 'L5'],
    ['w', 'W', 'L4'],
    ['e', 'E', 'L3'],
    ['r', 'R', 'L2'],
    ['t', 'T', 'L2'],
    ['y', 'Y', 'R2'],
    ['u', 'U', 'R2'],
    ['i', 'I', 'R3'],
    ['o', 'O', 'R4'],
    ['p', 'P', 'R5'],
    ['[', '{', 'R5'],
    [']', '}', 'R5'],
    ['\\', '|', 'R5'],
  ]),
  row('home', [
    ['a', 'A', 'L5'],
    ['s', 'S', 'L4'],
    ['d', 'D', 'L3'],
    ['f', 'F', 'L2'],
    ['g', 'G', 'L2'],
    ['h', 'H', 'R2'],
    ['j', 'J', 'R2'],
    ['k', 'K', 'R3'],
    ['l', 'L', 'R4'],
    [';', ':', 'R5'],
    ["'", '"', 'R5'],
  ]),
  row('bottom', [
    ['z', 'Z', 'L5'],
    ['x', 'X', 'L4'],
    ['c', 'C', 'L3'],
    ['v', 'V', 'L2'],
    ['b', 'B', 'L2'],
    ['n', 'N', 'R2'],
    ['m', 'M', 'R2'],
    [',', '<', 'R3'],
    ['.', '>', 'R4'],
    ['/', '?', 'R5'],
  ]),
  row('space', [[' ', ' ', 'R1']]),
];

const CHAR_TO_KEY = new Map<string, PhysicalKey>();
for (const keys of KEYBOARD_ROWS) {
  for (const key of keys) {
    CHAR_TO_KEY.set(key.base, key);
    if (!CHAR_TO_KEY.has(key.shifted)) {
      CHAR_TO_KEY.set(key.shifted, key);
    }
  }
}

/** Returns the physical key for a character, or undefined for characters not on the US layout. */
export function getPhysicalKey(char: string): PhysicalKey | undefined {
  return CHAR_TO_KEY.get(char);
}

/** Returns the finger that types a character, or undefined if the character is not mapped. */
export function getFingerForChar(char: string): FingerId | undefined {
  return CHAR_TO_KEY.get(char)?.finger;
}

/** Lowercase letters typed by a given finger (useful for drills). */
export function getLettersForFinger(finger: FingerId): string[] {
  const letters: string[] = [];
  for (const keys of KEYBOARD_ROWS) {
    for (const key of keys) {
      if (key.finger === finger && /^[a-z]$/.test(key.base)) {
        letters.push(key.base);
      }
    }
  }
  return letters;
}
