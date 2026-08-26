import { db } from "@/lib/db";
import { getAndParse, setWithExpiry, acquireLock, releaseLock } from "@/lib/redis";
import { DuplicateError } from "@/server/errors";
import { logger } from "@/lib/logger";

export interface IdempotencyResult<T> {
  cached: boolean;
  statusCode: number;
  data: T;
}

export interface ExecuteWithIdempotencyOptions {
  ttlSeconds?: number;
  lockTtlSeconds?: number;
  operation: string;
}

/**
 * Multi-tiered idempotency execution:
 * 1. Check Redis Cache
 * 2. Check Database IdempotencyRecord
 * 3. Acquire distributed Redis lock
 * 4. Execute atomic business operation
 * 5. Persist result in Redis & DB
 * 6. Release lock
 */
export async function withIdempotency<T>(
  merchantId: string,
  idempotencyKey: string | null | undefined,
  operation: string,
  handler: () => Promise<{ statusCode?: number; data: T }>,
  options: { ttlSeconds?: number; lockTtlSeconds?: number } = {}
): Promise<IdempotencyResult<T>> {
  // If no idempotency key is provided, execute handler directly
  if (!idempotencyKey || idempotencyKey.trim().length === 0) {
    const result = await handler();
    return {
      cached: false,
      statusCode: result.statusCode || 200,
      data: result.data,
    };
  }

  const ttl = options.ttlSeconds || 86400; // 24 hours default
  const lockTtl = options.lockTtlSeconds || 10;
  const redisCacheKey = `idemp:${merchantId}:${idempotencyKey}`;

  // 1. Tier 1: Check Redis Cache (Fast path)
  const cachedRedis = await getAndParse<{ statusCode: number; data: T }>(
    redisCacheKey
  );
  if (cachedRedis) {
    logger.info("Idempotency HIT (Redis)", { merchantId, idempotencyKey });
    return {
      cached: true,
      statusCode: cachedRedis.statusCode,
      data: cachedRedis.data,
    };
  }

  // 2. Tier 2: Check Database IdempotencyRecord (Persistence safety)
  const existingDbRecord = await db.idempotencyRecord.findUnique({
    where: { key: idempotencyKey },
  });

  if (existingDbRecord) {
    // Check if expired
    if (new Date() < existingDbRecord.expiresAt) {
      logger.info("Idempotency HIT (Database)", { merchantId, idempotencyKey });
      const parsedData = existingDbRecord.responseBody as T;
      // Re-populate Redis
      await setWithExpiry(
        redisCacheKey,
        { statusCode: existingDbRecord.statusCode, data: parsedData },
        ttl
      );
      return {
        cached: true,
        statusCode: existingDbRecord.statusCode,
        data: parsedData,
      };
    }
  }

  // 3. Acquire Distributed Lock to prevent concurrent execution race conditions
  const lockAcquired = await acquireLock(
    `idemp:${merchantId}:${idempotencyKey}`,
    lockTtl
  );

  if (!lockAcquired) {
    logger.warn("Idempotency concurrent lock collision", {
      merchantId,
      idempotencyKey,
    });
    throw new DuplicateError(
      "A concurrent request with this Idempotency-Key is already being processed"
    );
  }

  try {
    // Re-check DB in case concurrent request finished right before lock acquisition
    const doubleCheck = await db.idempotencyRecord.findUnique({
      where: { key: idempotencyKey },
    });
    if (doubleCheck && new Date() < doubleCheck.expiresAt) {
      return {
        cached: true,
        statusCode: doubleCheck.statusCode,
        data: doubleCheck.responseBody as T,
      };
    }

    // 4. Execute actual handler
    const response = await handler();
    const statusCode = response.statusCode || 200;
    const expiresAt = new Date(Date.now() + ttl * 1000);

    // 5. Store in Redis
    await setWithExpiry(
      redisCacheKey,
      { statusCode, data: response.data },
      ttl
    );

    // 6. Store in Database
    try {
      await db.idempotencyRecord.create({
        data: {
          merchantId,
          key: idempotencyKey,
          operation,
          statusCode,
          responseBody: JSON.parse(JSON.stringify(response.data)),
          expiresAt,
        },
      });
    } catch (dbErr) {
      logger.warn(
        "Failed to write DB idempotency record (possible race condition)",
        { idempotencyKey },
        dbErr
      );
    }

    return {
      cached: false,
      statusCode,
      data: response.data,
    };
  } finally {
    // 7. Always release distributed lock
    await releaseLock(`idemp:${merchantId}:${idempotencyKey}`);
  }
}
