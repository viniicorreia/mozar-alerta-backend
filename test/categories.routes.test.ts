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
const { categoriesRoutes } = await import("../src/modules/categories/index.js");
const { errorHandler } = await import("../src/platform/http/error-handler.js");

function makeUserRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    email: "admin@example.com",
    name: "Admin",
    role: "ADMIN",
    status: "active",
    ...overrides,
  };
}

function makeCategoryRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    name: "Política",
    slug: "politica",
    description: null,
    color: null,
    icon: null,
    parentId: null,
    order: 0,
    active: true,
    ...overrides,
  };
}

/** Same fake-chain approach as users.routes.test.ts, extended with insert/delete. */
function createFakeDb(state: { authUser: Record<string, unknown> | null; category: Record<string, unknown> }) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (state.authUser ? [state.authUser] : []),
          orderBy: async () => [state.category],
        }),
        orderBy: async () => [state.category],
      }),
    }),
    insert: () => ({
      values: (patch: Record<string, unknown>) => ({
        returning: async () => {
          state.category = { ...state.category, ...patch };
          return [state.category];
        },
      }),
    }),
    update: () => ({
      set: (patch: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            state.category = { ...state.category, ...patch };
            return [state.category];
          },
        }),
      }),
    }),
    delete: () => ({
      where: () => ({
        returning: async () => [state.category],
      }),
    }),
  } as unknown as Database;
}

async function buildTestApp(state: {
  authUser: Record<string, unknown> | null;
  category: Record<string, unknown>;
}) {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  app.decorate("env", {} as Env);
  app.decorate("db", createFakeDb(state));
  await app.register(authPlugin);
  await app.register(categoriesRoutes);
  return app;
}

beforeEach(() => {
  vi.mocked(verifySupabaseToken).mockReset();
});

describe("/categories", () => {
  it("GET /categories works without a token (public)", async () => {
    const app = await buildTestApp({ authUser: null, category: makeCategoryRow() });
    const res = await app.inject({ method: "GET", url: "/categories" });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });

  it("POST /categories is 401 without a token", async () => {
    const app = await buildTestApp({ authUser: null, category: makeCategoryRow() });
    const res = await app.inject({
      method: "POST",
      url: "/categories",
      payload: { name: "Esportes" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /categories is 403 for a non-admin role", async () => {
    const user = makeUserRow({ role: "MODERATOR" });
    vi.mocked(verifySupabaseToken).mockResolvedValue({ supabaseUserId: user.id as string, email: user.email as string });
    const app = await buildTestApp({ authUser: user, category: makeCategoryRow() });

    const res = await app.inject({
      method: "POST",
      url: "/categories",
      headers: { authorization: "Bearer token" },
      payload: { name: "Esportes" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("POST /categories succeeds for an admin and slugifies the name", async () => {
    const admin = makeUserRow();
    vi.mocked(verifySupabaseToken).mockResolvedValue({ supabaseUserId: admin.id as string, email: admin.email as string });
    const app = await buildTestApp({ authUser: admin, category: makeCategoryRow() });

    const res = await app.inject({
      method: "POST",
      url: "/categories",
      headers: { authorization: "Bearer token" },
      payload: { name: "Serviços Públicos" },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.slug).toBe("servicos-publicos");
  });

  it("DELETE /categories/:id is 403 for a non-admin role", async () => {
    const user = makeUserRow({ role: "MODERATOR" });
    vi.mocked(verifySupabaseToken).mockResolvedValue({ supabaseUserId: user.id as string, email: user.email as string });
    const app = await buildTestApp({ authUser: user, category: makeCategoryRow() });

    const res = await app.inject({
      method: "DELETE",
      url: `/categories/${makeCategoryRow().id}`,
      headers: { authorization: "Bearer token" },
    });
    expect(res.statusCode).toBe(403);
  });
});
