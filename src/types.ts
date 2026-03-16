/**
 * @fileoverview Configuration and result types for the concurrent promise pool.
 */

/** Maximum allowed concurrency (cap to prevent DoS). */
export const MAX_CONCURRENCY = 65_536;

/**
 * Validates and clamps a concurrency value to [1, MAX_CONCURRENCY].
 * Throws for NaN or non-finite values; clamps negative/zero to 1 and values above cap to MAX_CONCURRENCY.
 *
 * @param value - Raw value (optional; use default when undefined).
 * @param defaultVal - Default when value is undefined.
 * @returns Integer in [1, MAX_CONCURRENCY].
 */
export function validateAndClampConcurrency(value: number | undefined, defaultVal: number): number {
  const n = value ?? defaultVal;
  if (typeof n !== "number" || Number.isNaN(n) || !Number.isFinite(n)) {
    throw new RangeError(`Concurrency must be a finite number, got ${String(value)}`);
  }
  const clamped = Math.max(1, Math.min(MAX_CONCURRENCY, n));
  return Math.floor(clamped);
}

/**
 * Rate limit: max number of tasks that can start per time window.
 */
export interface RateLimitConfig {
  /** Max tasks per second (optional). */
  perSecond?: number;
  /** Max tasks per minute (optional). */
  perMinute?: number;
}

/**
 * Time bounds used by adaptive concurrency.
 * Response times outside these bounds trigger concurrency adjustments.
 */
export interface ResponseTimeBounds {
  /** Target minimum response time (ms). Faster responses may increase concurrency. */
  minTimeMs?: number;
  /** Target maximum response time (ms). Slower responses decrease concurrency. */
  maxTimeMs?: number;
}

/**
 * Throttle: minimum delay between starting consecutive tasks.
 */
export interface ThrottleConfig {
  /** Minimum delay in ms between starting two tasks. */
  delayMs: number;
}

/**
 * Options for the concurrent promise pool.
 */
export interface ConcurPoolOptions {
  /** Minimum number of concurrent tasks. Default: 1. */
  minConcurrency?: number;
  /** Maximum number of concurrent tasks. Default: 10. */
  maxConcurrency?: number;
  /** Initial concurrency when adaptive is enabled. Default: minConcurrency. */
  initialConcurrency?: number;
  /**
   * Enable adaptive concurrency based on response times. Default: false.
   * When true, adjustments affect only the reported finalConcurrency and the next run;
   * worker count does not change during the current run.
   */
  adaptive?: boolean;
  /** Bounds for adaptive concurrency (used when adaptive is true). */
  responseTimeBounds?: ResponseTimeBounds;
  /** Throttle: min delay between starting tasks. */
  throttle?: ThrottleConfig;
  /** Rate limit: max tasks per second/minute. */
  rateLimit?: RateLimitConfig;
  /** Maximum number of tasks allowed per run. Default: 1_000_000. Exceeding throws TypeError. */
  maxTasks?: number;
  /** Optional AbortSignal to cancel the run; when aborted, in-flight tasks are not awaited. */
  signal?: AbortSignal;
  /**
   * Per-task timeout in ms. When set, each task is raced with this timeout; on timeout the result
   * is { ok: false, error: TimeoutError, durationMs }. Must be a positive finite number.
   */
  taskTimeoutMs?: number;
}

/**
 * Per-run options merged with pool options for ConcurPool.run() and runOne().
 */
export interface RunOptions {
  /** Optional AbortSignal to cancel this run. */
  signal?: AbortSignal;
  /** Per-task timeout in ms (positive finite number). */
  taskTimeoutMs?: number;
}

/**
 * Discriminated union for a single task result (success or error).
 *
 * @remarks
 * Narrow with `result.ok`: when `true`, use `result.value`; when `false`, use `result.error`.
 */
export type TaskResult<T> =
  | { ok: true; value: T; durationMs: number }
  | { ok: false; error: unknown; durationMs: number };

/**
 * Result of running a batch of tasks.
 */
export interface RunResult<T> {
  /** Ordered task results (read-only). */
  readonly results: readonly TaskResult<T>[];
  /**
   * Final concurrency level when adaptive was enabled. Reflects the last adjustment;
   * the actual worker count for this run was fixed at start.
   */
  finalConcurrency?: number;
}
