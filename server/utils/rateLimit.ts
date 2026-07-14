export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly limitPerMinute: number) {}

  check(key: string): boolean {
    const now = Date.now();
    const windowStart = now - 60_000;
    const recent = (this.hits.get(key) ?? []).filter((time) => time >= windowStart);
    if (recent.length >= this.limitPerMinute) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}
