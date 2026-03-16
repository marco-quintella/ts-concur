# ts-concur

TypeScript library for running **concurrent promises** with configurable concurrency, **adaptive sizing**, **throttling**, and **rate limiting**. Uses only standard JavaScript; intended for **Node.js** and the **browser**.

## Install

```bash
npm install ts-concur
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

### One-shot run (no pool instance)

Use `runPool` when you only need a single batch and do not need to reuse options:

```ts
import { runPool } from "ts-concur";

const tasks = [1, 2, 3].map((n) => () => Promise.resolve(n * 2));
const { results } = await runPool(tasks, { maxConcurrency: 2 });
// results: [ { ok: true, value: 2, durationMs: ... }, ... ]
```

### Handling results

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

### Running a single task

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

### Reusing a pool

Create one pool and run multiple batches with the same concurrency/throttle/rate-limit settings:

```ts
const pool = new ConcurPool({ maxConcurrency: 4, rateLimit: { perSecond: 10 } });

const batch1 = await pool.run(urls.slice(0, 20).map((url) => () => fetch(url)));
const batch2 = await pool.run(urls.slice(20, 40).map((url) => () => fetch(url)));
```

### Example: batch API calls with error handling

```ts
import { runPool } from "ts-concur";

const ids = [1, 2, 3, 4, 5];
const tasks = ids.map(
  (id) => () =>
    fetch(`https://api.example.com/items/${id}`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
);

const { results } = await runPool(tasks, { maxConcurrency: 3, rateLimit: { perSecond: 5 } });

const items = results
  .filter((r): r is { ok: true; value: { id: number }; durationMs: number } => r.ok)
  .map((r) => r.value);
const failed = results.filter((r) => !r.ok);
console.log("Loaded", items.length, "items;", failed.length, "failed.");
```

## Examples and use cases

### Web scraping or crawling with rate limit

Respect a site’s crawl rate and cap concurrency to avoid overload:

```ts
import { runPool } from "ts-concur";

const urls = ["https://example.com/a", "https://example.com/b", /* ... */];
const tasks = urls.map((url) => () => fetch(url).then((r) => r.text()));

const { results } = await runPool(tasks, {
  maxConcurrency: 5,
  rateLimit: { perSecond: 2, perMinute: 60 },
  taskTimeoutMs: 15_000,
});

const htmlPages = results
  .filter((r): r is { ok: true; value: string; durationMs: number } => r.ok)
  .map((r) => r.value);
```

### Batch file or image processing

Process many files (e.g. resize images, parse JSON) with a fixed concurrency to limit memory and CPU:

```ts
import { readFile } from "node:fs/promises";
import { runPool } from "ts-concur";

const filePaths = ["./a.json", "./b.json", "./c.json"];
const tasks = filePaths.map((path) => () =>
  readFile(path, "utf-8").then((raw) => JSON.parse(raw) as Record<string, unknown>),
);

const { results } = await runPool(tasks, { maxConcurrency: 4 });
const parsed = results
  .filter((r): r is { ok: true; value: Record<string, unknown>; durationMs: number } => r.ok)
  .map((r) => r.value);
```

### Time-bounded run with cancellation

Run as many tasks as possible within a time window, then cancel the rest:

```ts
import { ConcurPool } from "ts-concur";

const pool = new ConcurPool({ maxConcurrency: 6 });
const ctrl = new AbortController();
const deadline = setTimeout(() => ctrl.abort(), 10_000);

const { results } = await pool.run(tasks, { signal: ctrl.signal });
clearTimeout(deadline);

const completed = results.filter((r) => r.ok);
const cancelled = results.filter((r) => !r.ok && r.error?.name === "AbortError");
console.log("Completed", completed.length, "cancelled", cancelled.length);
```

### Staying under a third-party API quota

Throttle and rate-limit so you never exceed the provider’s limits:

```ts
const pool = new ConcurPool({
  maxConcurrency: 3,
  throttle: { delayMs: 200 },
  rateLimit: { perSecond: 5, perMinute: 200 },
});

const tasks = userIds.map((id) => () =>
  fetch(`https://api.example.com/users/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
);
const { results } = await pool.run(tasks);
```

### Batch database or query execution

Run many independent queries with a concurrency cap so the DB is not overwhelmed:

```ts
import { runPool } from "ts-concur";

const ids = [1, 2, 3, /* ... */];
const tasks = ids.map((id) => () => db.query("SELECT * FROM items WHERE id = ?", [id]));

const { results } = await runPool(tasks, { maxConcurrency: 10, taskTimeoutMs: 5000 });
const rows = results
  .filter((r): r is { ok: true; value: Item[]; durationMs: number } => r.ok)
  .flatMap((r) => r.value);
```

### Single task through a shared pool (throttled API client)

Reuse one pool as a throttled “client”: every call goes through the pool so rate limit and concurrency apply across all calls:

```ts
const apiPool = new ConcurPool({ rateLimit: { perSecond: 10 }, maxConcurrency: 4 });

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

## Configuration

| Option               | Type                         | Description                                                                                                                    |
| -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `minConcurrency`     | number                       | Minimum concurrent tasks (default: 1).                                                                                         |
| `maxConcurrency`     | number                       | Maximum concurrent tasks (default: 10).                                                                                        |
| `initialConcurrency` | number                       | Starting concurrency when using adaptive.                                                                                      |
| `adaptive`           | boolean                      | Adjust concurrency from response times (default: false).                                                                       |
| `responseTimeBounds` | `{ minTimeMs?, maxTimeMs? }` | Target response time window for adaptive: faster than `minTimeMs` increases concurrency, slower than `maxTimeMs` decreases it. |
| `throttle`           | `{ delayMs: number }`        | Minimum delay (ms) between **starting** two tasks.                                                                             |
| `rateLimit`          | `{ perSecond?, perMinute? }` | Max tasks allowed to **start** per second and/or per minute.                                                                   |
| `signal`             | AbortSignal                  | Optional. When aborted, the run stops starting new tasks and does not wait for in-flight tasks.                                |
| `taskTimeoutMs`      | number                       | Optional. Per-task timeout (ms); tasks that exceed it get `{ ok: false, error: TimeoutError, durationMs }`. Must be positive.  |

## Cancellation and timeouts

- **`signal`**: Pass an `AbortSignal` (e.g. from `AbortController`) to cancel a run. If the signal is already aborted when the run starts, the returned promise **rejects** with the abort reason (like `fetch`). During the run, workers stop taking new work when the signal aborts; in-flight tasks are not awaited and their slots get `{ ok: false, error: AbortError, durationMs }`. Any task that never started is also filled with a cancelled result so `results.length === tasks.length` and order is preserved.
- **`taskTimeoutMs`**: When set (positive finite number), each task is raced against this timeout. If the task does not settle in time, its result is `{ ok: false, error: TimeoutError, durationMs }`. The underlying task may still run in the background; the pool only stops waiting.

Cancelled and timed-out tasks use the same `TaskResult` shape: `ok: false` with `error` set to a `DOMException` (name `AbortError` or `TimeoutError`).

Example with AbortController:

```ts
const pool = new ConcurPool({ maxConcurrency: 4 });
const ctrl = new AbortController();
const timeoutId = setTimeout(() => ctrl.abort(), 5000);
const { results } = await pool.run(tasks, { signal: ctrl.signal });
clearTimeout(timeoutId);
// If aborted, some results may be { ok: false, error: AbortError, durationMs }
```

Example with per-task timeout:

```ts
const { results } = await runPool(tasks, { maxConcurrency: 3, taskTimeoutMs: 10_000 });
// Tasks taking longer than 10s yield { ok: false, error: TimeoutError, durationMs }
```

`ConcurPool` supports per-run options via a second argument: `pool.run(tasks, { signal, taskTimeoutMs })` and `pool.runOne(task, { signal, taskTimeoutMs })`.

## Adaptive concurrency

When `adaptive: true`, the pool adjusts the number of concurrent tasks from response times:

- **Faster** than `responseTimeBounds.minTimeMs` → increase concurrency (up to `maxConcurrency`).
- **Slower** than `responseTimeBounds.maxTimeMs` → decrease concurrency (down to `minConcurrency`).

**Important:** Adaptive updates during a run do **not** change how many workers are active for that run. The worker count is fixed at start. Updates only affect the reported `finalConcurrency` in the result and the concurrency used for the **next** run (e.g. the next `pool.run()` or `runPool()` call).

Example:

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

## Throttling and rate limiting

- **Throttle**: `delayMs` is the minimum time between **starting** two tasks. Use it to avoid bursting.
- **Rate limit**: `perSecond` / `perMinute` cap how many tasks **start** in each time window. If over the limit, the pool waits before starting more.

Example: cap at 100 requests per minute while keeping up to 5 in flight:

```ts
const pool = new ConcurPool({
  maxConcurrency: 5,
  rateLimit: { perMinute: 100 },
});
const { results } = await pool.run(tasks);
```

## Using with workers

The library runs **promise-returning functions**. You can pass tasks that use workers so the pool controls how many run at once:

**Node (worker_threads):**

```ts
import { Worker } from "worker_threads";
import { ConcurPool } from "ts-concur";

const pool = new ConcurPool({ maxConcurrency: 4 });
const tasks = items.map((data) => () => runInWorker(new Worker("./job.js"), data));
await pool.run(tasks);
```

**Browser (Web Workers):**

```ts
const pool = new ConcurPool({ maxConcurrency: 4 });
const tasks = items.map((payload) => () => {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL("./worker.ts", import.meta.url));
    w.postMessage(payload);
    w.onmessage = (e) => {
      resolve(e.data);
      w.terminate();
    };
    w.onerror = reject;
  });
});
await pool.run(tasks);
```

## API

The API is scriptable (no interactive prompts; results are deterministic for given inputs).

- **`ConcurPool(options?)`** – creates a pool with the given options.
- **`pool.run(tasks, runOptions?)`** – runs an array of task factories `() => Promise<T>`, returns `Promise<RunResult<T>>`. Optional `runOptions`: `{ signal?, taskTimeoutMs? }`.
- **`pool.runOne(task, runOptions?)`** – runs a single task and returns `Promise<TaskResult<T>>`. Optional `runOptions`: `{ signal?, taskTimeoutMs? }`.
- **`runPool(tasks, options)`** – one-shot run with options (no pool instance). Options may include `signal` and `taskTimeoutMs`.

All options are scriptable; there are no interactive prompts, so the API is suitable for automation and agent-driven use.

**`RunResult<T>`**: `{ results: TaskResult<T>[], finalConcurrency?: number }`.

**`TaskResult<T>`**: `{ ok: true, value: T, durationMs }` or `{ ok: false, error, durationMs }`. Cancelled/timeout tasks have `ok: false` with `error` as a `DOMException` (name `AbortError` or `TimeoutError`).

**`RunOptions`**: `{ signal?: AbortSignal, taskTimeoutMs?: number }` for per-run overrides on `pool.run()` and `pool.runOne()`.

## Possible roadmap

Ideas under consideration (no order or commitment).

- **Progress & observability** – Optional `onProgress({ completed, total })` or event-style hooks for progress bars and metrics.
- **Retries** – Optional retry policy (max attempts, backoff) for failed tasks.
- **Streaming results** – Async iterable or callback that yields results as each task finishes (unordered), for large batches.
- **Rate limiting** – Token-bucket option with burst allowance, or clearer docs for current sliding-window behavior.
- **Priority / lanes** – Priority queue or separate concurrency lanes for mixed critical vs best-effort work.
- **DX** – Better TypeScript inference for heterogeneous task types, or small helpers (e.g. `unwrap` for `TaskResult`).
- **Adaptive tuning** – Configurable step sizes or strategies, or warm restarts using `finalConcurrency` for the next batch.

## Documentation

Interactive documentation is built with [VitePress](https://vitepress.dev/). To run it locally:

```bash
pnpm run docs:dev
```

Then open http://localhost:5173. Build for production with `pnpm run docs:build` and preview with `pnpm run docs:preview`.

### Deploy to GitHub Pages

1. In the repo: **Settings → Pages → Build and deployment → Source** → choose **GitHub Actions**.
2. Push to `main` (or trigger the workflow manually from the Actions tab). The workflow [`.github/workflows/deploy-docs.yml`](.github/workflows/deploy-docs.yml) builds the docs and deploys to GitHub Pages.
3. The site will be at `https://<username>.github.io/ts-concur/`. If your repo has a different name, set the same value in `base` in [`docs/.vitepress/config.ts`](docs/.vitepress/config.ts) (e.g. `base: '/my-repo-name/'`).

## Build and test

The project uses [Vite](https://vite.dev/) for the library build and [Vitest](https://vitest.dev/) for unit tests. Linting and formatting use [Oxlint](https://oxc.rs/docs/guide/usage/linter) and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) (Oxc). All of build, test, lint, fmt, and fmt:check are non-interactive and suitable for CI and automation.

```bash
pnpm install
pnpm run build
pnpm test
pnpm run lint
pnpm run fmt
```

- `pnpm run test:watch` – run tests in watch mode.
- `pnpm run lint` – run oxlint on `src/`.
- `pnpm run fmt` – format with oxfmt; `pnpm run fmt:check` – check only (CI).
- `pnpm run upgrade` – upgrade dependencies to latest (`pnpm update --latest`). Vite and Vitest are kept on 5.x and 2.x for compatibility with Node 18–20 and current tooling.
- `pnpm run taze` – interactive dependency upgrades (requires Node 22+). For non-interactive upgrades use `pnpm run upgrade` or `pnpm run upgrade:check`.

## License

MIT
