/**
 * @fileoverview Tests for TaskResult helpers.
 */

import { describe, it, expect } from "vitest";
import type { TaskResult } from "./types.js";
import { partitionTaskResults, unwrapTaskResult } from "./taskResult.js";

describe("unwrapTaskResult", () => {
  it("returns value when ok", () => {
    const r: TaskResult<number> = { ok: true, value: 42, durationMs: 1 };
    expect(unwrapTaskResult(r)).toBe(42);
  });

  it("throws the same error reference when not ok", () => {
    const err = new Error("boom");
    const r: TaskResult<number> = { ok: false, error: err, durationMs: 2 };
    expect(() => unwrapTaskResult(r)).toThrow("boom");
    try {
      unwrapTaskResult(r);
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBe(err);
    }
  });
});

describe("partitionTaskResults", () => {
  it("separates values and failures with indices", () => {
    const results: TaskResult<number>[] = [
      { ok: true, value: 1, durationMs: 10 },
      { ok: false, error: new Error("a"), durationMs: 20 },
      { ok: true, value: 3, durationMs: 30 },
      { ok: false, error: "x", durationMs: 40 },
    ];
    const { values, failures } = partitionTaskResults(results);
    expect(values).toEqual([1, 3]);
    expect(failures).toHaveLength(2);
    expect(failures[0]).toEqual({
      index: 1,
      error: expect.any(Error),
      durationMs: 20,
    });
    expect(failures[1]).toEqual({ index: 3, error: "x", durationMs: 40 });
  });

  it("returns empty arrays for empty input", () => {
    expect(partitionTaskResults([])).toEqual({ values: [], failures: [] });
  });
});
