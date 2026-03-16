/**
 * @fileoverview Tests for runPool (pool.ts).
 */

import { describe, it, expect } from "vitest";
import { runPool } from "./pool.js";
import { MAX_CONCURRENCY } from "./types.js";

function isError(value: unknown): value is Error {
  return value instanceof Error;
}

describe("runPool", () => {
  it("runs tasks with default concurrency and preserves order", async () => {
    const order: number[] = [];
    const tasks = [1, 2, 3, 4, 5].map((n) => () => {
      order.push(n);
      return Promise.resolve(n * 10);
    });
    const { results } = await runPool(tasks);
    expect(results.map((r) => (r.ok ? r.value : r.error))).toEqual([10, 20, 30, 40, 50]);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it("captures errors and continues", async () => {
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.reject(new Error("fail")),
      () => Promise.resolve(3),
    ];
    const { results } = await runPool(tasks);
    expect(results[0]).toMatchObject({ ok: true, value: 1 });
    const r1 = results[1];
    expect(r1).toBeDefined();
    expect(r1).toMatchObject({ ok: false });
    if (r1 && !r1.ok && isError(r1.error)) {
      expect(r1.error).toBeInstanceOf(Error);
      expect(r1.error.message).toBe("fail");
    }
    expect(results[2]).toMatchObject({ ok: true, value: 3 });
  });

  it("respects maxConcurrency", async () => {
    let inFlight = 0;
    let maxSeen = 0;
    const tasks = Array.from({ length: 10 }, () => async () => {
      inFlight += 1;
      maxSeen = Math.max(maxSeen, inFlight);
      await new Promise((r) => setTimeout(r, 10));
      inFlight -= 1;
      return 1;
    });
    await runPool(tasks, { maxConcurrency: 3 });
    expect(maxSeen).toBeLessThanOrEqual(3);
  });

  it("applies throttle when configured", async () => {
    const starts: number[] = [];
    const tasks = [1, 2, 3].map(() => () => {
      starts.push(Date.now());
      return Promise.resolve(1);
    });
    const delayMs = 50;
    const before = Date.now();
    await runPool(tasks, { throttle: { delayMs }, maxConcurrency: 10 });
    const after = Date.now();
    expect(starts.length).toBe(3);
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(delayMs - 5);
    expect(starts[2]! - starts[1]!).toBeGreaterThanOrEqual(delayMs - 5);
    expect(after - before).toBeGreaterThanOrEqual(2 * delayMs);
  });

  it("applies rate limit per second", async () => {
    const tasks = Array.from({ length: 5 }, () => () => Promise.resolve(1));
    const before = Date.now();
    await runPool(tasks, { rateLimit: { perSecond: 2 }, maxConcurrency: 10 });
    const elapsed = Date.now() - before;
    expect(elapsed).toBeGreaterThanOrEqual(1500);
  });

  it("returns finalConcurrency when adaptive is enabled", async () => {
    const tasks = Array.from({ length: 5 }, () => () => Promise.resolve(1));
    const out = await runPool(tasks, {
      adaptive: true,
      minConcurrency: 1,
      maxConcurrency: 5,
      responseTimeBounds: { minTimeMs: 1, maxTimeMs: 100 },
    });
    expect(out.finalConcurrency).toBeDefined();
    expect(typeof out.finalConcurrency).toBe("number");
  });

  it("handles empty task array", async () => {
    const { results } = await runPool([]);
    expect(results).toEqual([]);
  });

  it("treats invalid throttle delayMs (NaN, negative) as no throttle", async () => {
    const tasks = [1, 2].map((n) => () => Promise.resolve(n));
    const { results } = await runPool(tasks, {
      throttle: { delayMs: Number.NaN },
      maxConcurrency: 10,
    });
    expect(results.map((r) => (r.ok ? r.value : null))).toEqual([1, 2]);
    const { results: results2 } = await runPool(tasks, {
      throttle: { delayMs: -10 },
      maxConcurrency: 10,
    });
    expect(results2.map((r) => (r.ok ? r.value : null))).toEqual([1, 2]);
  });

  it("throws when rateLimit has invalid perSecond", async () => {
    const tasks = [() => Promise.resolve(1)];
    await expect(
      runPool(tasks, { rateLimit: { perSecond: -1 } }),
    ).rejects.toThrow("rateLimit.perSecond must be a positive finite number");
    await expect(
      runPool(tasks, { rateLimit: { perSecond: Number.NaN } }),
    ).rejects.toThrow("rateLimit.perSecond must be a positive finite number");
  });

  it("throws TypeError when tasks is not an array (null)", async () => {
    await expect(runPool(null as unknown as Array<() => Promise<number>>, {})).rejects.toThrow(
      TypeError,
    );
    await expect(runPool(null as unknown as Array<() => Promise<number>>, {})).rejects.toThrow(
      "tasks must be an array",
    );
  });

  it("throws TypeError when tasks is not an array (undefined)", async () => {
    await expect(
      runPool(undefined as unknown as Array<() => Promise<number>>, {}),
    ).rejects.toThrow(TypeError);
    await expect(
      runPool(undefined as unknown as Array<() => Promise<number>>, {}),
    ).rejects.toThrow("tasks must be an array");
  });

  it("throws when tasks.length exceeds maxTasks", async () => {
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.resolve(2),
      () => Promise.resolve(3),
    ];
    await expect(runPool(tasks, { maxTasks: 2 })).rejects.toThrow(TypeError);
    await expect(runPool(tasks, { maxTasks: 2 })).rejects.toThrow(
      "tasks length 3 exceeds maximum 2",
    );
  });

  it("accepts tasks.length equal to maxTasks", async () => {
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.resolve(2),
    ];
    const { results } = await runPool(tasks, { maxTasks: 2 });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  describe("concurrency validation", () => {
    it("throws for NaN minConcurrency", async () => {
      await expect(runPool([() => Promise.resolve(1)], { minConcurrency: Number.NaN })).rejects.toThrow(
        RangeError,
      );
    });

    it("throws for Infinity maxConcurrency", async () => {
      await expect(
        runPool([() => Promise.resolve(1)], { maxConcurrency: Number.POSITIVE_INFINITY }),
      ).rejects.toThrow(RangeError);
    });

    it("clamps negative minConcurrency to 1", async () => {
      const { results } = await runPool([() => Promise.resolve(1)], { minConcurrency: -5 });
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ ok: true, value: 1 });
    });

    it("clamps initialConcurrency above cap to MAX_CONCURRENCY", async () => {
      const tasks = Array.from({ length: 3 }, () => () => Promise.resolve(1));
      const out = await runPool(tasks, {
        minConcurrency: 1,
        maxConcurrency: MAX_CONCURRENCY + 1000,
        initialConcurrency: 1e9,
      });
      expect(out.results).toHaveLength(3);
    });

    it("accepts values at cap", async () => {
      const tasks = [() => Promise.resolve(1)];
      const out = await runPool(tasks, {
        minConcurrency: MAX_CONCURRENCY,
        maxConcurrency: MAX_CONCURRENCY,
      });
      expect(out.results).toHaveLength(1);
      expect(out.results[0]).toMatchObject({ ok: true, value: 1 });
    });
  });
});
