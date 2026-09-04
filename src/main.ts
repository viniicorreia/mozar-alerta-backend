import { loadEnv } from "./platform/config/env.js";
import { createLogger } from "./platform/logger/index.js";
import { getDb } from "./platform/db/index.js";
import { buildServer } from "./platform/http/server.js";

async function main() {
  const env = loadEnv();
  const logger = createLogger(env);
  const db = getDb(env);

  const app = await buildServer({ env, logger, db });

  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
  logger.info(`api listening on :${env.API_PORT}`);

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, async () => {
      logger.info(`${signal} received, shutting down`);
      await app.close();
      process.exit(0);
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
