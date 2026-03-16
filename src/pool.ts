/**
 * @fileoverview Core concurrent promise pool with adaptive concurrency, throttle and rate limit.
 */

import type { ConcurPoolOptions, TaskResult, RunResult } from "./types.js";
import { validateAndClampConcurrency } from "./types.js";
import { createRateLimiter } from "./rateLimit.js";
import { createThrottle } from "./throttle.js";
import { createAdaptiveState, adjustConcurrency, type AdaptiveState } from "./adaptive.js";

const DEFAULT_MIN = 1;
const DEFAULT_MAX = 10;
const MAX_TASKS = 1_000_000;

/**
 * Runs an array of task factories with concurrency control, optional throttle and rate limit,
 * and optional adaptive concurrency.
 *
 * When adaptive is enabled, concurrency is fixed at start for this run; adjustments during
 * the run affect only the returned finalConcurrency and the concurrency used on the next run.
 *
 * Validates that `tasks` is an array and that its length does not exceed the configured maximum
 * (default 1_000_000) to prevent DoS via huge allocations.
 *
 * @param tasks - Array of task factories (functions returning promises). Order is preserved in results.
 * @param options - Pool options (concurrency, adaptive, throttle, rate limit, maxTasks).
 * @returns Run result with ordered {@link TaskResult} array and optional finalConcurrency when adaptive.
 * @throws TypeError if `tasks` is not an array or if `tasks.length` exceeds the configured max (see options.maxTasks).
 */
export async function runPool<T>(
  tasks: Array<() => Promise<T>>,
  options: ConcurPoolOptions = {},
): Promise<RunResult<T>> {
  if (!Array.isArray(tasks)) {
    throw new TypeError("tasks must be an array");
  }
  const maxTasksAllowed = options.maxTasks ?? MAX_TASKS;
  if (tasks.length > maxTasksAllowed) {
    throw new TypeError(
      `tasks length ${tasks.length} exceeds maximum ${maxTasksAllowed}`,
    );
  }

  const minCon = validateAndClampConcurrency(options.minConcurrency, DEFAULT_MIN);
  const maxCon = Math.max(minCon, validateAndClampConcurrency(options.maxConcurrency, DEFAULT_MAX));
  const adaptive = options.adaptive ?? false;
  const initialCon = validateAndClampConcurrency(options.initialConcurrency, minCon);
  let concurrency = Math.min(maxCon, Math.max(minCon, initialCon));

  const throttleFn = options.throttle ? createThrottle(options.throttle.delayMs) : async () => {};
  const rateLimitAllow = options.rateLimit ? createRateLimiter(options.rateLimit) : () => true;

  let adaptiveState: AdaptiveState | undefined;
  if (adaptive) {
    adaptiveState = createAdaptiveState(minCon, maxCon, initialCon, options.responseTimeBounds);
    concurrency = adaptiveState.current;
  }

  const results: TaskResult<T>[] = Array.from({ length: tasks.length });
  let index = 0;

  async function runOne(): Promise<void> {
    while (true) {
      const allowedByRate = rateLimitAllow();
      if (!allowedByRate) {
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }
      await throttleFn();
      const i = index++;
      if (i >= tasks.length) break;
      const task = tasks[i];
      if (!task) continue;

      const start = Date.now();
      let value: T | undefined;
      let error: unknown;
      try {
        value = await task();
      } catch (e) {
        error = e;
      }
      const durationMs = Date.now() - start;
      results[i] =
        error === undefined
          ? { ok: true, value: value!, durationMs }
          : { ok: false, error, durationMs };
      if (adaptiveState) {
        concurrency = adjustConcurrency(adaptiveState, durationMs);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => runOne());
  await Promise.all(workers);

  const runResult: RunResult<T> = { results };
  if (adaptive && adaptiveState) {
    runResult.finalConcurrency = adaptiveState.current;
  }
  return runResult;
}
