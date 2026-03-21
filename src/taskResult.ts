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
 * Unwraps a TaskResult and returns its success value or throws the contained error.
 *
 * @param result - The TaskResult to unwrap.
 * @returns The success `value` from `result`.
 * @throws The `error` contained in `result` when it represents a failure.
 */
export function unwrapTaskResult<T>(result: TaskResult<T>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}

/**
 * Partition an ordered array of TaskResult into successful values and failure records.
 *
 * @param results - Ordered results array produced by `runPool` or `pool.run`.
 * @returns An object with `values`: successful result values in the same relative order as in `results`, and `failures`: entries preserving each failure's original `index`, `error`, and `durationMs`.
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
