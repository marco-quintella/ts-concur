/**
 * @fileoverview Main API: ConcurPool for running concurrent promises with adaptive concurrency.
 */

import type { ConcurPoolOptions, RunOptions, RunResult, TaskResult } from "./types.js";
import { runPool } from "./pool.js";

/**
 * Pool for running concurrent promise-returning tasks with optional
 * adaptive concurrency, throttling and rate limiting.
 * Works in Node.js and browser.
 */
export class ConcurPool {
  private readonly options: ConcurPoolOptions;

  constructor(options: ConcurPoolOptions = {}) {
    this.options = { ...options };
  }

  /**
   * Runs all task factories with the pool's concurrency and limits.
   * Preserves order of results to match the order of tasks.
   * Optional runOptions (signal, taskTimeoutMs) are merged with the pool options for this run.
   */
  async run<T>(tasks: Array<() => Promise<T>>, runOptions?: RunOptions): Promise<RunResult<T>> {
    const opts = runOptions ? { ...this.options, ...runOptions } : this.options;
    return runPool(tasks, opts);
  }

  /**
   * Runs a single task through the pool (convenience for one-off use with same options).
   * Optional runOptions (signal, taskTimeoutMs) are merged with the pool options for this run.
   */
  async runOne<T>(task: () => Promise<T>, runOptions?: RunOptions): Promise<TaskResult<T>> {
    const { results } = await this.run([task], runOptions);
    return results[0]!;
  }
}
