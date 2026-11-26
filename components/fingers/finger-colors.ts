/**
 * Diverging color scale for finger / key speed relative to the user's own overall median.
 * Blue = faster than average, red = slower, gray = about average. Steps are chosen for the
 * app's dark surface (#1e1e1e); the poles are the dataviz reference blue/red dark steps.
 */

export type SpeedBand =
  | 'no-data'
  | 'much-slower'
  | 'slower'
  | 'slightly-slower'
  | 'average'
  | 'slightly-faster'
  | 'faster'
  | 'much-faster';

export const SPEED_BAND_LABELS: Record<SpeedBand, string> = {
  'no-data': 'Not enough data',
  'much-slower': '25%+ slower',
  slower: '12-25% slower',
  'slightly-slower': '5-12% slower',
  average: 'About average',
  'slightly-faster': '5-12% faster',
  faster: '12-25% faster',
  'much-faster': '25%+ faster',
};

export const SPEED_BAND_COLORS: Record<SpeedBand, string> = {
  'no-data': '#2a2a2a',
  'much-slower': '#eb6263',
  slower: '#c4504f',
  'slightly-slower': '#8a4546',
  average: '#4a4a4a',
  'slightly-faster': '#2f5a8c',
  faster: '#2a78d2',
  'much-faster': '#338ced',
};

/** Legend order, slowest to fastest. */
export const SPEED_BANDS_ORDERED: SpeedBand[] = [
  'much-slower',
  'slower',
  'slightly-slower',
  'average',
  'slightly-faster',
  'faster',
  'much-faster',
];

export function speedBand(relativeSpeed: number | null | undefined): SpeedBand {
  if (relativeSpeed === null || relativeSpeed === undefined) return 'no-data';
  if (relativeSpeed <= 1 / 1.25) return 'much-slower';
  if (relativeSpeed <= 1 / 1.12) return 'slower';
  if (relativeSpeed <= 1 / 1.05) return 'slightly-slower';
  if (relativeSpeed < 1.05) return 'average';
  if (relativeSpeed < 1.12) return 'slightly-faster';
  if (relativeSpeed < 1.25) return 'faster';
  return 'much-faster';
}

export function speedColor(relativeSpeed: number | null | undefined): string {
  return SPEED_BAND_COLORS[speedBand(relativeSpeed)];
}

/** Human-readable "+18% faster" / "-9% slower" string. */
export function describeRelativeSpeed(relativeSpeed: number | null | undefined): string {
  if (relativeSpeed === null || relativeSpeed === undefined) return 'no estimate yet';
  const pct = Math.round((relativeSpeed - 1) * 100);
  if (Math.abs(pct) < 1) return 'average speed';
  return pct > 0 ? `${pct}% faster than average` : `${Math.abs(pct)}% slower than average`;
}
