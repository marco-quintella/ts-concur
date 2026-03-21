# Using with workers

The library runs **promise-returning functions**. You can pass tasks that use workers so the pool controls how many run at once.

## Node.js (worker_threads)

```ts
import { Worker } from "worker_threads";
import { ConcurPool } from "ts-concur";

const pool = new ConcurPool({ maxConcurrency: 4 });
const tasks = items.map((data) => () => runInWorker(new Worker("./job.js"), data));
await pool.run(tasks);
```

## Browser (Web Workers)

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

In both cases, each task returns a Promise; the pool limits how many of these run concurrently.
