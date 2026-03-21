# API

The API is scriptable (no interactive prompts; results are deterministic for given inputs).

## ConcurPool

**`new ConcurPool(options?)`**

Creates a pool with the given options. All configuration options are optional.

## Pool methods

### pool.run(tasks, runOptions?)

Runs an array of task factories `() => Promise<T>`, returns `Promise<RunResult<T>>`.

- **tasks**: Array of functions that return a Promise.
- **runOptions** (optional): `{ signal?: AbortSignal, taskTimeoutMs?: number }`.

### pool.runOne(task, runOptions?)

Runs a single task and returns `Promise<TaskResult<T>>`. Respects throttle and rate limit if configured.

- **runOptions** (optional): `{ signal?: AbortSignal, taskTimeoutMs?: number }`.

## One-shot run

### runPool(tasks, options)

Runs tasks with the given options without creating a pool instance. Options may include all pool options plus `signal` and `taskTimeoutMs`.

## Types

### RunResult&lt;T&gt;

```ts
{
  results: TaskResult<T>[];
  finalConcurrency?: number;  // Present when adaptive is used
}
```

### TaskResult&lt;T&gt;

Either:

- `{ ok: true; value: T; durationMs: number }`
- `{ ok: false; error: unknown; durationMs: number }`

Cancelled/timeout tasks have `ok: false` with `error` as a `DOMException` (name `AbortError` or `TimeoutError`).

### RunOptions

`{ signal?: AbortSignal; taskTimeoutMs?: number }` — per-run overrides for `pool.run()` and `pool.runOne()`.

## TaskResult helpers

### unwrapTaskResult(result)

Returns `value` when `result.ok` is true; otherwise throws `result.error`.

### partitionTaskResults(results)

Splits a `readonly TaskResult<T>[]` into `{ values: T[]; failures: TaskFailure[] }`. Each failure includes `index` (position in the input array), `error`, and `durationMs`.

### TaskFailure

`{ index: number; error: unknown; durationMs: number }`.
