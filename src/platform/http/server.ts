import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import type { Env } from "../config/env.js";
import type { Logger } from "../logger/index.js";
import type { Database } from "../db/index.js";
import { authPlugin } from "../../modules/auth/index.js";
import { usersRoutes } from "../../modules/users/index.js";
import { categoriesRoutes } from "../../modules/categories/index.js";
import { newsRoutes } from "../../modules/news/index.js";
import { mediaRoutes } from "../../modules/media/index.js";
import { errorHandler } from "./error-handler.js";
import { healthRoutes } from "./routes/health.js";
import "./types.js";

export interface BuildServerOptions {
  env: Env;
  logger: Logger;
  db: Database;
}

export async function buildServer({ env, logger, db }: BuildServerOptions) {
  const app = Fastify({
    loggerInstance: logger,
    genReqId: () => randomUUID(),
    trustProxy: true,
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: [env.PUBLIC_WEB_URL, env.PUBLIC_ADMIN_URL],
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  });

  app.setErrorHandler(errorHandler);

  app.decorate("env", env);
  app.decorate("db", db);

  await app.register(healthRoutes, { db });

  // authPlugin must be registered before any module that uses
  // app.authenticate / request.user.
  await app.register(authPlugin);
  await app.register(usersRoutes);
  await app.register(categoriesRoutes);
  await app.register(newsRoutes);
  await app.register(mediaRoutes);

  // Sprint 4+: app.register(instagramRoutes), app.register(jobsRoutes), ...
  // each module owns its own Fastify plugin registered here.

  return app;
}
