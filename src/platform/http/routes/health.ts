import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/index.js";

export async function healthRoutes(app: FastifyInstance, opts: { db: Database }) {
  app.get("/health", async () => ({ status: "ok", uptime: process.uptime() }));

  app.get("/health/database", async (_req, reply) => {
    try {
      await opts.db.execute(sql`select 1`);
      return { status: "ok" };
    } catch (err) {
      app.log.error({ err }, "database health check failed");
      return reply.status(503).send({ status: "error" });
    }
  });
}
