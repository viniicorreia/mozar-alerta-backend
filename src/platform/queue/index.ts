import { Queue, Worker, type Processor } from "bullmq";
import type { Redis } from "ioredis";

/**
 * Queue names — one per background workload. Adding a queue here is the
 * seam every future domain (instagram sync, AI classification, email,
 * job expiry, metrics) plugs into instead of doing work inline in the API.
 */
export const QUEUE_NAMES = {
  instagramSync: "instagram.sync",
  instagramRefreshToken: "instagram.refreshToken",
  aiClassify: "ai.classify",
  email: "notifications.email",
  jobExpiry: "jobs.expire",
  newsPublishScheduled: "news.publishScheduled",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export function createQueue(name: QueueName, connection: Redis) {
  return new Queue(name, { connection });
}

export function createWorker<T = unknown>(
  name: QueueName,
  connection: Redis,
  processor: Processor<T>,
) {
  return new Worker<T>(name, processor, {
    connection,
    concurrency: 5,
  });
}
