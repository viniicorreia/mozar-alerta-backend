import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../src/platform/db/index.js";
import type { Env } from "../src/platform/config/env.js";
import "../src/platform/http/types.js";

vi.mock("../src/modules/auth/verify-token.js", () => ({
  verifySupabaseToken: vi.fn(),
}));

const { verifySupabaseToken } = await import("../src/modules/auth/verify-token.js");
const { authPlugin } = await import("../src/modules/auth/index.js");
const { usersRoutes } = await import("../src/modules/users/index.js");

const NOW = new Date("2026-01-01T00:00:00.000Z");

function makeUserRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "candidata@example.com",
    name: "Fulana",
    role: "USER",
    status: "active",
    lastLoginAt: null,
    deletionRequestedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/**
 * Minimal fake satisfying only the query shapes the auth plugin / users
 * module actually issue (select().from().where().limit / update().set()
 * .where().returning / insert().values). Good enough for route-level
 * behavior tests without a real Postgres instance.
 */
function createFakeDb(state: { user: Record<string, unknown> | null }) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (state.user ? [state.user] : []),
        }),
      }),
    }),
    update: () => ({
      set: (patch: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            state.user = { ...(state.user as object), ...patch };
            return [state.user];
          },
        }),
      }),
    }),
    insert: () => ({
      values: async () => undefined,
    }),
  } as unknown as Database;
}

async function buildTestApp(state: { user: Record<string, unknown> | null }) {
  const app = Fastify();
  app.decorate("env", {} as Env);
  app.decorate("db", createFakeDb(state));
  await app.register(authPlugin);
  await app.register(usersRoutes);
  return app;
}

beforeEach(() => {
  vi.mocked(verifySupabaseToken).mockReset();
});

describe("auth plugin + /users routes", () => {
  it("GET /users/me returns 401 without a bearer token", async () => {
    const app = await buildTestApp({ user: makeUserRow() });
    const res = await app.inject({ method: "GET", url: "/users/me" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /users/me returns 401 when the token is invalid", async () => {
    vi.mocked(verifySupabaseToken).mockResolvedValue(null);
    const app = await buildTestApp({ user: makeUserRow() });
    const res = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: "Bearer bad-token" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /users/me returns the profile for a valid token", async () => {
    const row = makeUserRow();
    vi.mocked(verifySupabaseToken).mockResolvedValue({
      supabaseUserId: row.id,
      email: row.email,
    });
    const app = await buildTestApp({ user: row });

    const res = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: "Bearer good-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      success: true,
      data: { id: row.id, email: row.email, role: "USER" },
    });
  });

  it("a suspended user is treated as unauthenticated", async () => {
    const row = makeUserRow({ status: "suspended" });
    vi.mocked(verifySupabaseToken).mockResolvedValue({
      supabaseUserId: row.id,
      email: row.email,
    });
    const app = await buildTestApp({ user: row });

    const res = await app.inject({
      method: "GET",
      url: "/users/me",
      headers: { authorization: "Bearer good-token" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("PATCH /admin/users/:id/role is forbidden for a non-admin", async () => {
    const row = makeUserRow({ role: "USER" });
    vi.mocked(verifySupabaseToken).mockResolvedValue({
      supabaseUserId: row.id,
      email: row.email,
    });
    const app = await buildTestApp({ user: row });

    const res = await app.inject({
      method: "PATCH",
      url: `/admin/users/${row.id}/role`,
      headers: { authorization: "Bearer good-token" },
      payload: { role: "MODERATOR" },
    });

    expect(res.statusCode).toBe(403);
  });

  it("PATCH /admin/users/:id/role succeeds for an admin and updates the role", async () => {
    const admin = makeUserRow({
      id: "22222222-2222-2222-2222-222222222222",
      role: "ADMIN",
    });
    vi.mocked(verifySupabaseToken).mockResolvedValue({
      supabaseUserId: admin.id,
      email: admin.email,
    });
    const app = await buildTestApp({ user: admin });

    const res = await app.inject({
      method: "PATCH",
      url: `/admin/users/${admin.id}/role`,
      headers: { authorization: "Bearer good-token" },
      payload: { role: "MODERATOR" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.role).toBe("MODERATOR");
  });
});
