/**
 * @fileoverview Main API: ConcurPool for running concurrent promises with adaptive concurrency.
 */

import type { ConcurPoolOptions, RunResult, TaskResult } from "./types.js";
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
   */
  async run<T>(tasks: Array<() => Promise<T>>): Promise<RunResult<T>> {
    return runPool(tasks, this.options);
  }

  /**
   * Runs a single task through the pool (convenience for one-off use with same options).
   */
  async runOne<T>(task: () => Promise<T>): Promise<TaskResult<T>> {
    const { results } = await this.run([task]);
    return results[0]!;
  }
}
