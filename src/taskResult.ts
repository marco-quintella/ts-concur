/**
 * @fileoverview Small helpers for working with {@link TaskResult} values after a run.
 */

import type { TaskResult } from "./types.js";

/**
 * Describes a failed task at a given index in a result list.
 */
export interface TaskFailure {
  /** Index in the original `results` array. */
  readonly index: number;
  /** The error carried by the task result. */
  readonly error: unknown;
  /** Duration recorded for that task. */
  readonly durationMs: number;
}

/**
 * Extracts the success value from a TaskResult or throws its contained error.
 *
 * @param result - The TaskResult to unwrap
 * @returns The success `value` when `result.ok` is true
 * @throws The `error` from `result` when `result.ok` is false
 */
export function unwrapTaskResult<T>(result: TaskResult<T>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}

/**
 * Splits ordered task results into successful values and failures (with indices).
 *
 * @param results - Ordered `results` array from `runPool` or `pool.run`.
 * @returns `values` in success order only; `failures` preserve original indices for retries or logging.
 */
export function partitionTaskResults<T>(results: readonly TaskResult<T>[]): {
  values: T[];
  failures: TaskFailure[];
} {
  const values: T[] = [];
  const failures: TaskFailure[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    if (r.ok) {
      values.push(r.value);
    } else {
      failures.push({ index: i, error: r.error, durationMs: r.durationMs });
    }
  }
  return { values, failures };
}
