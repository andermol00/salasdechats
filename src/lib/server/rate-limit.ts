type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

/** Sliding-window limiter. Per-process, enough for a single Render instance. */
export function allow(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  const hits = (bucket?.hits ?? []).filter((stamp) => now - stamp < windowMs);

  if (hits.length >= limit) {
    buckets.set(key, { hits });
    return false;
  }

  hits.push(now);
  buckets.set(key, { hits });

  if (buckets.size > 4000) {
    for (const [existingKey, existing] of buckets) {
      if (existing.hits.every((stamp) => now - stamp > windowMs)) {
        buckets.delete(existingKey);
      }
    }
  }

  return true;
}
