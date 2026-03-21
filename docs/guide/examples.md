# Examples and use cases

This page shows practical examples and patterns for **ts-concur** in real scenarios.

## Web scraping or crawling

Crawl many URLs while respecting a rate limit and a per-request timeout. Results stay in order so you can map them back to your URL list.

```ts
import { runPool } from "ts-concur";

const urls = ["https://example.com/page/1", "https://example.com/page/2", /* ... */];
const tasks = urls.map((url) => () => fetch(url).then((r) => r.text()));

const { results } = await runPool(tasks, {
  maxConcurrency: 5,
  rateLimit: { perSecond: 2, perMinute: 60 },
  taskTimeoutMs: 15_000,
});

const htmlPages = results
  .filter((r): r is { ok: true; value: string; durationMs: number } => r.ok)
  .map((r) => r.value);

// Optional: log slow or failed requests
results.forEach((r, i) => {
  if (!r.ok) console.warn("Failed", urls[i], r.error);
  else if (r.durationMs > 5000) console.warn("Slow", urls[i], r.durationMs, "ms");
});
```

## Batch file or image processing

Process many files (e.g. read + parse, or resize images) with a fixed concurrency to limit memory and CPU usage.

```ts
import { readFile } from "node:fs/promises";
import { runPool } from "ts-concur";

const filePaths = ["./data/a.json", "./data/b.json", "./data/c.json"];
const tasks = filePaths.map((path) => () =>
  readFile(path, "utf-8").then((raw) => JSON.parse(raw) as Record<string, unknown>),
);

const { results } = await runPool(tasks, { maxConcurrency: 4 });
const parsed = results
  .filter((r): r is { ok: true; value: Record<string, unknown>; durationMs: number } => r.ok)
  .map((r) => r.value);
```

For CPU-heavy work (e.g. image resizing), combine with workers so the pool limits how many workers run at once—see [Using with Workers](/guide/workers).

## Time-bounded run with cancellation

Run as many tasks as possible within a time window, then cancel the rest so the function returns on time.

```ts
import { ConcurPool } from "ts-concur";

const pool = new ConcurPool({ maxConcurrency: 6 });
const ctrl = new AbortController();
const deadline = setTimeout(() => ctrl.abort(), 10_000);

try {
  const { results } = await pool.run(tasks, { signal: ctrl.signal });
  const completed = results.filter((r) => r.ok);
  const cancelled = results.filter((r) => !r.ok && r.error instanceof DOMException && r.error.name === "AbortError");
  console.log("Completed", completed.length, "cancelled", cancelled.length);
} finally {
  clearTimeout(deadline);
}
```

## Third-party API with quota

Stay under a provider’s rate limit and avoid bursting by using both throttle and rate limit.

```ts
import { ConcurPool } from "ts-concur";

const pool = new ConcurPool({
  maxConcurrency: 3,
  throttle: { delayMs: 200 },
  rateLimit: { perSecond: 5, perMinute: 200 },
});

const userIds = [1, 2, 3, /* ... */];
const tasks = userIds.map((id) => () =>
  fetch(`https://api.example.com/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }),
);

const { results } = await pool.run(tasks);
```

## Batch database queries

Run many independent queries with a concurrency cap so the database is not overwhelmed. Use a per-task timeout for stuck queries.

```ts
import { runPool } from "ts-concur";

const ids = [1, 2, 3, /* ... */];
const tasks = ids.map((id) => () => db.query("SELECT * FROM items WHERE id = ?", [id]));

const { results } = await runPool(tasks, {
  maxConcurrency: 10,
  taskTimeoutMs: 5000,
});

const rows = results
  .filter((r): r is { ok: true; value: Item[]; durationMs: number } => r.ok)
  .flatMap((r) => r.value);

const failed = results.filter((r) => !r.ok);
if (failed.length) console.warn("Queries failed or timed out:", failed.length);
```

## Shared throttled API client

Use a single pool as a throttled “client”: every call goes through the pool, so rate limit and concurrency apply across all callers.

```ts
import { ConcurPool } from "ts-concur";

const apiPool = new ConcurPool({
  rateLimit: { perSecond: 10 },
  maxConcurrency: 4,
});

async function fetchUser(id: number) {
  const result = await apiPool.runOne(() =>
    fetch(`https://api.example.com/users/${id}`).then((r) => r.json()),
  );
  if (!result.ok) throw result.error;
  return result.value;
}

const user1 = await fetchUser(1);
const user2 = await fetchUser(2);
```

## Collecting only successful values

Use `partitionTaskResults` to separate successes from failures (failures include the original `index` for retries):

```ts
import { partitionTaskResults } from "ts-concur";

const { results } = await pool.run(tasks);
const { values, failures } = partitionTaskResults(results);
console.log("Succeeded:", values.length, "Failed:", failures.length);
```

## Manual retry for failed tasks

The library does not include retries; you can retry only the failed tasks in a second run:

```ts
import { runPool } from "ts-concur";

const items = [/* ... */];
let toProcess = items.map((item) => ({ item, task: () => processItem(item) }));
const maxAttempts = 2;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const tasks = toProcess.map(({ task }) => task);
  const { results } = await runPool(tasks, { maxConcurrency: 5 });
  const failedIndices = results
    .map((r, i) => (r.ok ? -1 : i))
    .filter((i) => i >= 0);
  if (failedIndices.length === 0) break;
  toProcess = failedIndices.map((i) => toProcess[i]);
  if (attempt === maxAttempts) console.warn("Still failing:", toProcess.length);
}
```

## Adaptive concurrency for variable latency

When task latency varies (e.g. mixed fast cache and slow API), adaptive concurrency can tune the level over runs:

```ts
import { ConcurPool } from "ts-concur";

const pool = new ConcurPool({
  adaptive: true,
  minConcurrency: 2,
  maxConcurrency: 20,
  responseTimeBounds: { minTimeMs: 50, maxTimeMs: 500 },
});

const { results, finalConcurrency } = await pool.run(tasks);
console.log("This run ended with concurrency", finalConcurrency);
// Next pool.run() will use that level as starting point
```

Use `finalConcurrency` to log or to seed the next batch (e.g. when using adaptive across multiple `runPool` calls you’d need to pass it manually since there is no shared pool).
