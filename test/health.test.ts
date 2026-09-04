import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { healthRoutes } from "../src/platform/http/routes/health.js";
import type { Database } from "../src/platform/db/index.js";

describe("GET /health", () => {
  it("returns ok without touching the database", async () => {
    const app = Fastify();
    const fakeDb = {} as Database;
    await app.register(healthRoutes, { db: fakeDb });

    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok" });
  });

  it("returns 503 when the database check throws", async () => {
    const app = Fastify();
    const fakeDb = {
      execute: async () => {
        throw new Error("connection refused");
      },
    } as unknown as Database;
    await app.register(healthRoutes, { db: fakeDb });

    const res = await app.inject({ method: "GET", url: "/health/database" });

    expect(res.statusCode).toBe(503);
  });
});
