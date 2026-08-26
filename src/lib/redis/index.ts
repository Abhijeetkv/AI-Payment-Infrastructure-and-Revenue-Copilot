import Redis, { RedisOptions } from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 100, 2000);
  },
  lazyConnect: true,
  enableOfflineQueue: false,
};

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const client = new Redis(url, redisOptions);

  client.on("error", (err) => {
    // Only log as warning to allow graceful fallback in development if Redis isn't running yet
    if (process.env.NODE_ENV === "development") {
      console.warn("[Redis] Connection error or offline:", err.message);
    } else {
      console.error("[Redis] Error:", err);
    }
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

/**
 * Helper to set a key with TTL (seconds)
 */
export async function setWithExpiry<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    await redis.set(key, serialized, "EX", ttlSeconds);
  } catch (error) {
    console.warn(`[Redis] Failed to setWithExpiry for key ${key}:`, error);
  }
}

/**
 * Helper to get and parse JSON from Redis
 */
export async function getAndParse<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  } catch (error) {
    console.warn(`[Redis] Failed to getAndParse for key ${key}:`, error);
    return null;
  }
}

/**
 * Acquire a distributed lock with TTL
 */
export async function acquireLock(
  lockKey: string,
  ttlSeconds: number = 10
): Promise<boolean> {
  try {
    const result = await redis.set(
      `lock:${lockKey}`,
      "1",
      "EX",
      ttlSeconds,
      "NX"
    );
    return result === "OK";
  } catch (error) {
    console.warn(`[Redis] Failed to acquireLock for ${lockKey}:`, error);
    // If Redis is unreachable in development, allow proceeding
    return true;
  }
}

/**
 * Release a distributed lock
 */
export async function releaseLock(lockKey: string): Promise<void> {
  try {
    await redis.del(`lock:${lockKey}`);
  } catch (error) {
    console.warn(`[Redis] Failed to releaseLock for ${lockKey}:`, error);
  }
}

export default redis;
