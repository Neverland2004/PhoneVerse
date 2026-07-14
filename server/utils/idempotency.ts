export interface IdempotencyRecord {
  status: "pending" | "completed" | "failed";
  createdAt: number;
  updatedAt: number;
  result?: unknown;
  error?: { code: string; message: string };
}

export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | undefined>;
  set(key: string, record: IdempotencyRecord): Promise<void>;
}

export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly store = new Map<string, IdempotencyRecord>();
  private readonly ttlMs: number;

  constructor(ttlMs = 15 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  async get(key: string): Promise<IdempotencyRecord | undefined> {
    const record = this.store.get(key);
    if (!record) return undefined;
    if (Date.now() - record.updatedAt > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return record;
  }

  async set(key: string, record: IdempotencyRecord): Promise<void> {
    this.store.set(key, record);
  }
}

export const idempotencyStore = new MemoryIdempotencyStore();
