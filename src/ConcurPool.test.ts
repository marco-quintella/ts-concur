/**
 * @fileoverview Tests for ConcurPool.
 */

import { describe, it, expect } from "vitest";
import { ConcurPool } from "./ConcurPool.js";

describe("ConcurPool", () => {
  it("run() returns results in order", async () => {
    const pool = new ConcurPool({ maxConcurrency: 2 });
    const { results } = await pool.run([() => Promise.resolve("a"), () => Promise.resolve("b")]);
    expect(results.map((r) => (r.ok ? r.value : null))).toEqual(["a", "b"]);
  });

  it("runOne() returns single task result", async () => {
    const pool = new ConcurPool();
    const result = await pool.runOne(() => Promise.resolve(42));
    expect(result).toMatchObject({ ok: true, value: 42 });
    expect(typeof result.durationMs).toBe("number");
  });

  it("run() accepts runOptions (signal, taskTimeoutMs)", async () => {
    const pool = new ConcurPool({ maxConcurrency: 2 });
    const { results } = await pool.run([() => Promise.resolve(1), () => Promise.resolve(2)], {
      taskTimeoutMs: 5000,
    });
    expect(results.map((r) => (r.ok ? r.value : null))).toEqual([1, 2]);
  });

  it("run() respects runOptions.signal", async () => {
    const pool = new ConcurPool();
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(pool.run([() => Promise.resolve(1)], { signal: ctrl.signal })).rejects.toThrow(
      DOMException,
    );
  });

  it("runOne() accepts runOptions", async () => {
    const pool = new ConcurPool();
    const result = await pool.runOne(() => Promise.resolve(99), {
      taskTimeoutMs: 1000,
    });
    expect(result).toMatchObject({ ok: true, value: 99 });
  });
});
