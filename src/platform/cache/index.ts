import { Redis } from "ioredis";
import type { Env } from "../config/env.js";

let client: Redis | undefined;

/** Shared Redis connection — used for caching, rate limiting, and BullMQ. */
export function getRedis(env: Env): Redis {
  if (!client) {
    client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return client;
}
