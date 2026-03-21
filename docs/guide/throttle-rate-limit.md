# Throttling and rate limiting

## Throttle (`delayMs`)

`throttle: { delayMs: number }` sets the **minimum time between starting two tasks**. Use it to avoid bursting: no matter how many slots are free, the pool waits at least `delayMs` before starting the next task.

## Rate limit (`perSecond` / `perMinute`)

`rateLimit: { perSecond?, perMinute? }` caps how many tasks **start** in each time window. If over the limit, the pool waits before starting more.

## Example: cap at 100 requests per minute

Keep up to 5 tasks in flight while respecting a 100-starts-per-minute cap:

```ts
const pool = new ConcurPool({
  maxConcurrency: 5,
  rateLimit: { perMinute: 100 },
});
const { results } = await pool.run(tasks);
```

You can combine throttle and rate limit with concurrency to control both parallelism and throughput.
