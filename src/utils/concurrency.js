export async function runWithConcurrency(tasks, limit, onError) {
  const results = [];
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= tasks.length) break;
      const fn = tasks[idx];
      try {
        const res = await fn();
        if (Array.isArray(res)) {
          results.push(...res);
        } else if (res) {
          results.push(res);
        }
      } catch (err) {
        onError?.(idx, err);
      }
    }
  }

  const workers = Array.from({ length: limit }, worker);
  await Promise.all(workers);
  return results;
}
