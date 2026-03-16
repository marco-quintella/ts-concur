/**
 * @fileoverview ts-concur: concurrent promise pool for Node and browser.
 *
 * Exports the main pool API, types and optional helpers for use with workers.
 */

export { ConcurPool } from "./ConcurPool.js";
export { runPool } from "./pool.js";
export type {
  ConcurPoolOptions,
  RateLimitConfig,
  ResponseTimeBounds,
  ThrottleConfig,
  TaskResult,
  RunResult,
} from "./types.js";
