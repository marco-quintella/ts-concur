# Roadmap

Ideas under consideration (no order or commitment).

- **Progress & observability** — Optional `onProgress({ completed, total })` or event-style hooks for progress bars and metrics.
- **Retries** — Optional retry policy (max attempts, backoff) for failed tasks.
- **Streaming results** — Async iterable or callback that yields results as each task finishes (unordered), for large batches.
- **Rate limiting** — Token-bucket option with burst allowance, or clearer docs for current sliding-window behavior.
- **Priority / lanes** — Priority queue or separate concurrency lanes for mixed critical vs best-effort work.
- **DX** — Better TypeScript inference for heterogeneous task types, or small helpers (e.g. `unwrap` for `TaskResult`).
- **Adaptive tuning** — Configurable step sizes or strategies, or warm restarts using `finalConcurrency` for the next batch.
