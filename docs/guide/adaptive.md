# Adaptive concurrency

When `adaptive: true`, the pool adjusts the number of concurrent tasks from response times:

- **Faster** than `responseTimeBounds.minTimeMs` → increase concurrency (up to `maxConcurrency`).
- **Slower** than `responseTimeBounds.maxTimeMs` → decrease concurrency (down to `minConcurrency`).

::: warning Important
Adaptive updates during a run do **not** change how many workers are active for that run. The worker count is fixed at start. Updates only affect the reported `finalConcurrency` in the result and the concurrency used for the **next** run (e.g. the next `pool.run()` or `runPool()` call).
:::

## Example

```ts
const pool = new ConcurPool({
  adaptive: true,
  minConcurrency: 1,
  maxConcurrency: 20,
  responseTimeBounds: { minTimeMs: 50, maxTimeMs: 500 },
});
const { results, finalConcurrency } = await pool.run(tasks);
console.log("Ended with concurrency:", finalConcurrency);
```

Use `finalConcurrency` to understand how the pool adapted and to tune `minConcurrency` / `maxConcurrency` for future runs.
