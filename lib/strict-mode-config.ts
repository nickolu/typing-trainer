/**
 * Configuration for strict mode behavior
 */
export const STRICT_MODE_CONFIG = {
  /**
   * Delay in milliseconds before user can type again after making a mistake
   * This penalty makes mistakes impact WPM
   */
  MISTAKE_DELAY_MS: 250,
} as const;
