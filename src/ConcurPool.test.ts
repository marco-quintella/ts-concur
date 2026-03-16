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
});
