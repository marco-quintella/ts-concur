# Cancellation and timeouts

## AbortSignal (`signal`)

Pass an `AbortSignal` (e.g. from `AbortController`) to cancel a run:

- If the signal is already aborted when the run starts, the returned promise **rejects** with the abort reason (like `fetch`).
- During the run, workers stop taking new work when the signal aborts.
- In-flight tasks are not awaited; their slots get `{ ok: false, error: AbortError, durationMs }`.
- Any task that never started is also filled with a cancelled result so `results.length === tasks.length` and order is preserved.

Example with `AbortController`:

```ts
const pool = new ConcurPool({ maxConcurrency: 4 });
const ctrl = new AbortController();
const timeoutId = setTimeout(() => ctrl.abort(), 5000);
const { results } = await pool.run(tasks, { signal: ctrl.signal });
clearTimeout(timeoutId);
// If aborted, some results may be { ok: false, error: AbortError, durationMs }
```

## Per-task timeout (`taskTimeoutMs`)

When set (positive finite number), each task is raced against this timeout. If the task does not settle in time, its result is `{ ok: false, error: TimeoutError, durationMs }`. The underlying task may still run in the background; the pool only stops waiting.

Example:

```ts
const { results } = await runPool(tasks, {
  maxConcurrency: 3,
  taskTimeoutMs: 10_000,
});
// Tasks taking longer than 10s yield { ok: false, error: TimeoutError, durationMs }
```

## Result shape

Cancelled and timed-out tasks use the same `TaskResult` shape: `ok: false` with `error` set to a `DOMException` (name `AbortError` or `TimeoutError`).
