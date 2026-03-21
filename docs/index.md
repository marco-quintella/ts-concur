---
layout: home

hero:
  name: ts-concur
  text: Concurrent promise pool
  tagline: Adaptive concurrency, throttling and rate limiting for Node.js and the browser. No dependencies.
  image:
    src: /logo.png
    alt: ts-concur
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Examples
      link: /guide/examples
    - theme: alt
      text: API
      link: /api

features:
  - icon: ⚡
    title: Configurable concurrency
    details: Set min/max concurrent tasks. Use a pool instance or one-shot runPool() for single batches.
  - icon: 📈
    title: Adaptive sizing
    details: Optionally adjust concurrency from response times—faster responses increase, slower decrease.
  - icon: 🚦
    title: Throttle & rate limit
    details: Minimum delay between task starts, or cap tasks per second/minute. Control burst and throughput.
  - icon: 🛑
    title: Cancellation & timeouts
    details: AbortSignal support and per-task timeout. Results preserve order with ok/error and durationMs.
  - icon: 🌐
    title: Node & browser
    details: Standard JavaScript only. Use with worker_threads or Web Workers; the pool controls how many run at once.
  - icon: 📦
    title: Scriptable API
    details: No interactive prompts. Deterministic for given inputs—suitable for automation and agents.
---

## Quick example

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

Results preserve task order: each item is `{ ok: true, value, durationMs }` or `{ ok: false, error, durationMs }`.
