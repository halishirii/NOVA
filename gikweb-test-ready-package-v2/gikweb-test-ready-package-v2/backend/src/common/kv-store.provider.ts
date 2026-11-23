import Redis from 'ioredis';

export interface KvStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export function createKvStore(): KvStore {
  const memory = new Map<string, { value: string; expiresAt: number | null }>();
  let redis: Redis | null = null;
  let redisHealthy = false;

  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    redis.on('ready', () => { redisHealthy = true; });
    redis.on('error', () => { redisHealthy = false; });
    redis.connect().catch(() => { redisHealthy = false; });
  } catch {
    redisHealthy = false;
  }

  return {
    async get(key: string) {
      if (redis && redisHealthy) {
        return redis.get(key);
      }
      const entry = memory.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        memory.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key: string, value: string, ttlSeconds?: number) {
      if (redis && redisHealthy) {
        if (ttlSeconds) await redis.set(key, value, 'EX', ttlSeconds);
        else await redis.set(key, value);
        return;
      }
      memory.set(key, {
        value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
      });
    },
    async del(key: string) {
      if (redis && redisHealthy) {
        await redis.del(key);
      }
      memory.delete(key);
    },
  };
}
