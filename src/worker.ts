import { loadEnv } from "./platform/config/env.js";
import { createLogger } from "./platform/logger/index.js";
import { getDb } from "./platform/db/index.js";
import { getRedis } from "./platform/cache/index.js";
import { createWorker, QUEUE_NAMES } from "./platform/queue/index.js";
import { createNewsService } from "./modules/news/index.js";

/**
 * Worker process — consumes BullMQ queues (instagram sync, AI
 * classification, email, job expiry, ...). Boots independently from the
 * API so a slow background job never blocks HTTP request/response.
 */
async function main() {
  const env = loadEnv();
  const logger = createLogger(env);
  const db = getDb(env);
  const redis = getRedis(env);

  const news = createNewsService(db);
  const newsPublishWorker = createWorker(QUEUE_NAMES.newsPublishScheduled, redis, async () => {
    const promoted = news.promoteScheduled();
    const count = await promoted;
    if (count > 0) logger.info({ count }, "promoted scheduled news to published");
  });
  newsPublishWorker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id }, "news.publishScheduled job failed");
  });

  logger.info("worker started — consuming: news.publishScheduled");

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, async () => {
      logger.info(`${signal} received, shutting down worker`);
      await newsPublishWorker.close();
      process.exit(0);
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
