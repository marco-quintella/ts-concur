/**
 * @fileoverview Throttle: enforces minimum delay between starting tasks.
 */

/** Max throttle delay (1 hour) to avoid exhausting timers. */
const MAX_DELAY_MS = 3_600_000;

/**
 * Returns a function that resolves after the throttle delay has passed since last call.
 * Call it before starting a task; await it to enforce spacing.
 * Non-finite, negative, or zero delayMs is treated as no throttle (returns a no-op).
 * Delay is capped at {@link MAX_DELAY_MS}.
 *
 * @param delayMs - Minimum delay in ms between starting two tasks.
 * @returns A function that returns a Promise resolving when the next task may start.
 */
export function createThrottle(delayMs: number): () => Promise<void> {
  if (
    typeof delayMs !== "number" ||
    !Number.isFinite(delayMs) ||
    delayMs <= 0
  ) {
    return async () => {};
  }

  const capped = Math.min(delayMs, MAX_DELAY_MS);
  let lastStart = 0;

  return function wait(): Promise<void> {
    return new Promise((resolve) => {
      const now = Date.now();
      const elapsed = now - lastStart;
      const waitMs = Math.max(0, capped - elapsed);
      lastStart = now + waitMs;
      if (waitMs === 0) {
        resolve();
        return;
      }
      setTimeout(resolve, waitMs);
    });
  };
}
