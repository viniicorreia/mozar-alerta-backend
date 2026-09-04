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
const { newsRoutes } = await import("../src/modules/news/index.js");
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

function makeNewsRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    title: "Prefeitura anuncia nova obra",
    slug: "prefeitura-anuncia-nova-obra",
    summary: "Resumo",
    content: "<p>Conteúdo</p>",
    status: "draft",
    featured: false,
    tags: [],
    categoryId: null,
    coverImageKey: null,
    scheduledFor: null,
    publishedAt: null,
    ...overrides,
  };
}

/**
 * `select().from().where().limit()` is queued: the auth plugin's user
 * lookup consumes the first queued response, `ensureUniqueSlug`'s lookup
 * consumes the next one — matching the real per-request call order.
 */
function createFakeDb(state: {
  selectLimitQueue: unknown[][];
  news: Record<string, unknown>;
}) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => state.selectLimitQueue.shift() ?? [],
        }),
      }),
    }),
    insert: () => ({
      values: (patch: Record<string, unknown>) => ({
        returning: async () => {
          state.news = { ...state.news, ...patch };
          return [state.news];
        },
      }),
    }),
    update: () => ({
      set: (patch: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            state.news = { ...state.news, ...patch };
            return [state.news];
          },
        }),
      }),
    }),
  } as unknown as Database;
}

async function buildTestApp(state: { selectLimitQueue: unknown[][]; news: Record<string, unknown> }) {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  app.decorate("env", {} as Env);
  app.decorate("db", createFakeDb(state));
  await app.register(authPlugin);
  await app.register(newsRoutes);
  return app;
}

beforeEach(() => {
  vi.mocked(verifySupabaseToken).mockReset();
});

describe("/news write endpoints", () => {
  it("POST /news is 401 without a token", async () => {
    const app = await buildTestApp({ selectLimitQueue: [], news: makeNewsRow() });
    const res = await app.inject({
      method: "POST",
      url: "/news",
      payload: { title: "X", summary: "Y", content: "<p>Z</p>" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /news is 403 for a CANDIDATE", async () => {
    const user = makeUserRow({ role: "CANDIDATE" });
    vi.mocked(verifySupabaseToken).mockResolvedValue({
      supabaseUserId: user.id as string,
      email: user.email as string,
    });
    const app = await buildTestApp({ selectLimitQueue: [[user]], news: makeNewsRow() });

    const res = await app.inject({
      method: "POST",
      url: "/news",
      headers: { authorization: "Bearer token" },
      payload: { title: "X", summary: "Y", content: "<p>Z</p>" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("POST /news succeeds for a MODERATOR and sanitizes content", async () => {
    const user = makeUserRow({ role: "MODERATOR" });
    vi.mocked(verifySupabaseToken).mockResolvedValue({
      supabaseUserId: user.id as string,
      email: user.email as string,
    });
    const app = await buildTestApp({
      selectLimitQueue: [[user], []], // auth lookup, then "no slug conflict"
      news: makeNewsRow(),
    });

    const res = await app.inject({
      method: "POST",
      url: "/news",
      headers: { authorization: "Bearer token" },
      payload: {
        title: "Prefeitura anuncia nova obra",
        summary: "Resumo",
        content: '<p>Texto</p><script>alert(1)</script>',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.content).not.toContain("<script>");
  });

  it("POST /news/:id/publish is 403 for a COMPANY", async () => {
    const user = makeUserRow({ role: "COMPANY" });
    vi.mocked(verifySupabaseToken).mockResolvedValue({
      supabaseUserId: user.id as string,
      email: user.email as string,
    });
    const app = await buildTestApp({ selectLimitQueue: [[user]], news: makeNewsRow() });

    const res = await app.inject({
      method: "POST",
      url: `/news/${makeNewsRow().id}/publish`,
      headers: { authorization: "Bearer token" },
    });
    expect(res.statusCode).toBe(403);
  });
});
