import type { Env } from "../config/env.js";
import type { Database } from "../db/index.js";

declare module "fastify" {
  interface FastifyInstance {
    env: Env;
    db: Database;
  }
}
