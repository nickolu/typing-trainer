import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number for display with at most `maxDecimals` decimal places, dropping
 * trailing zeros (97.5 -> "97.5", 97.3333 -> "97.33", 60 -> "60").
 */
export function formatNumber(value: number, maxDecimals: number = 2): string {
  if (!Number.isFinite(value)) return '—';
  return String(Number(value.toFixed(maxDecimals)));
}
