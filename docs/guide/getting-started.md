# Getting Started

## Install

```bash
npm install ts-concur
```

Or with pnpm:

```bash
pnpm add ts-concur
```

## Quick start

```ts
import { ConcurPool } from "ts-concur";

const pool = new ConcurPool({
  minConcurrency: 2,
  maxConcurrency: 10,
  adaptive: true,
  throttle: { delayMs: 100 },
  rateLimit: { perSecond: 5 },
});

const tasks = urls.map((url) => () => fetch(url).then((r) => r.json()));
const { results, finalConcurrency } = await pool.run(tasks);
```

## One-shot run (no pool instance)

Use `runPool` when you only need a single batch and do not need to reuse options:

```ts
import { runPool } from "ts-concur";

const tasks = [1, 2, 3].map((n) => () => Promise.resolve(n * 2));
const { results } = await runPool(tasks, { maxConcurrency: 2 });
// results: [ { ok: true, value: 2, durationMs: ... }, ... ]
```

## Handling results

Results preserve task order. Each item is either `{ ok: true, value, durationMs }` or `{ ok: false, error, durationMs }`:

```ts
const { results } = await pool.run(tasks);

const values = results
  .filter((r): r is { ok: true; value: string; durationMs: number } => r.ok)
  .map((r) => r.value);

const failures = results.filter((r) => !r.ok);
for (const r of failures) {
  if (!r.ok) console.error("Task failed:", r.error, "after", r.durationMs, "ms");
}
```

## Running a single task

Use `runOne` to run one task through the pool (respects throttle/rate limit if configured):

```ts
const pool = new ConcurPool({ throttle: { delayMs: 50 } });
const result = await pool.runOne(() => fetch("/api/user").then((r) => r.json()));
if (result.ok) {
  console.log(result.value, "in", result.durationMs, "ms");
} else {
  console.error(result.error);
}
```

## Reusing a pool

Create one pool and run multiple batches with the same concurrency/throttle/rate-limit settings:

```ts
const pool = new ConcurPool({ maxConcurrency: 4, rateLimit: { perSecond: 10 } });

const batch1 = await pool.run(urls.slice(0, 20).map((url) => () => fetch(url)));
const batch2 = await pool.run(urls.slice(20, 40).map((url) => () => fetch(url)));
```

## Example: batch API calls with error handling

```ts
import { runPool } from "ts-concur";

const ids = [1, 2, 3, 4, 5];
const tasks = ids.map(
  (id) =>
    () =>
      fetch(`https://api.example.com/items/${id}`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
);

const { results } = await runPool(tasks, {
  maxConcurrency: 3,
  rateLimit: { perSecond: 5 },
});

const items = results
  .filter(
    (r): r is { ok: true; value: { id: number }; durationMs: number } => r.ok,
  )
  .map((r) => r.value);
const failed = results.filter((r) => !r.ok);
console.log("Loaded", items.length, "items;", failed.length, "failed.");
```
