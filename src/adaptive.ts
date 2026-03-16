/**
 * @fileoverview Adaptive concurrency: adjust pool size based on response times.
 */

import type { ResponseTimeBounds } from "./types.js";
import { validateAndClampConcurrency } from "./types.js";

const DEFAULT_MIN_MS = 50;
const DEFAULT_MAX_MS = 500;

export interface AdaptiveState {
  /**
   * Current concurrency level; mutable and updated by {@link adjustConcurrency}.
   */
  current: number;
  readonly min: number;
  readonly max: number;
  readonly bounds: Readonly<{ minTimeMs: number; maxTimeMs: number }>;
}

/**
 * Creates initial adaptive state from options.
 */
export function createAdaptiveState(
  minConcurrency: number,
  maxConcurrency: number,
  initialConcurrency: number | undefined,
  responseTimeBounds?: ResponseTimeBounds,
): AdaptiveState {
  const min = validateAndClampConcurrency(minConcurrency, 1);
  const max = Math.max(min, validateAndClampConcurrency(maxConcurrency, min));
  const initialClamped = validateAndClampConcurrency(initialConcurrency, min);
  const current = Math.min(max, Math.max(min, initialClamped));
  return {
    current,
    min,
    max,
    bounds: {
      minTimeMs: responseTimeBounds?.minTimeMs ?? DEFAULT_MIN_MS,
      maxTimeMs: responseTimeBounds?.maxTimeMs ?? DEFAULT_MAX_MS,
    },
  };
}

/** Mutates state.current; returns new concurrency. */
export function adjustConcurrency(state: AdaptiveState, durationMs: number): number {
  const { min, max, bounds } = state;
  let next = state.current;

  if (durationMs > bounds.maxTimeMs) {
    next = Math.max(min, state.current - 1);
  } else if (durationMs < bounds.minTimeMs) {
    next = Math.min(max, state.current + 1);
  }

  state.current = next;
  return next;
}
