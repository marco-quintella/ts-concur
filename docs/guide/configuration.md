# Configuration

All options for `ConcurPool` and `runPool`:

| Option               | Type                         | Description                                                                                                                                 |
| -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `minConcurrency`     | number                       | Minimum concurrent tasks (default: 1).                                                                                                     |
| `maxConcurrency`     | number                       | Maximum concurrent tasks (default: 10).                                                                                                    |
| `initialConcurrency` | number                       | Starting concurrency when using adaptive.                                                                                                  |
| `adaptive`           | boolean                      | Adjust concurrency from response times (default: false).                                                                                    |
| `responseTimeBounds` | `{ minTimeMs?, maxTimeMs? }` | Target response time window for adaptive: faster than `minTimeMs` increases concurrency, slower than `maxTimeMs` decreases it.             |
| `throttle`           | `{ delayMs: number }`        | Minimum delay (ms) between **starting** two tasks.                                                                                         |
| `rateLimit`          | `{ perSecond?, perMinute? }` | Max tasks allowed to **start** per second and/or per minute.                                                                               |
| `signal`             | AbortSignal                  | Optional. When aborted, the run stops starting new tasks and does not wait for in-flight tasks.                                             |
| `taskTimeoutMs`      | number                       | Optional. Per-task timeout (ms); tasks that exceed it get `{ ok: false, error: TimeoutError, durationMs }`. Must be positive.               |

## Per-run options

`ConcurPool` supports per-run overrides via the second argument to `run` and `runOne`:

- `pool.run(tasks, { signal, taskTimeoutMs })`
- `pool.runOne(task, { signal, taskTimeoutMs })`

These override or complement the pool’s own options for that run only.
