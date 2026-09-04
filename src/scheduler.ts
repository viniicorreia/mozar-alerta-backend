import { loadEnv } from "./platform/config/env.js";
import { createLogger } from "./platform/logger/index.js";
import { getRedis } from "./platform/cache/index.js";
import { createQueue, QUEUE_NAMES } from "./platform/queue/index.js";

/**
 * Scheduler process — a single replica that enqueues recurring jobs (cron)
 * onto the BullMQ queues the worker consumes. BullMQ's `repeat` option
 * itself guarantees a single active instance of each repeatable job
 * regardless of how many times `add` is called, so re-running this file
 * (e.g. on deploy) never double-schedules.
 */
async function main() {
  const env = loadEnv();
  const logger = createLogger(env);
  const redis = getRedis(env);

  const newsQueue = createQueue(QUEUE_NAMES.newsPublishScheduled, redis);
  await newsQueue.add(
    "promote-scheduled-news",
    {},
    { repeat: { every: 60_000 }, removeOnComplete: true, removeOnFail: 50 },
  );
  logger.info("scheduled: news.publishScheduled every 60s");

  logger.info("scheduler started");

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      logger.info(`${signal} received, shutting down scheduler`);
      process.exit(0);
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
