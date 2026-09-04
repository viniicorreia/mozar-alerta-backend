import { eq } from "drizzle-orm";
import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AuthenticatedUser } from "@mozar/types";
import { UnauthorizedError } from "../../shared/errors.js";
import { schema } from "../../platform/db/index.js";
import { verifySupabaseToken } from "./verify-token.js";

declare module "fastify" {
  interface FastifyRequest {
    user: AuthenticatedUser | null;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Populates `request.user` from the Supabase access token on every request
 * (best-effort — a missing/invalid token just leaves it null), and exposes
 * `app.authenticate` as an opt-in preHandler for routes that require a
 * signed-in user. Role/status are read from `public.users`, not JWT claims,
 * so a role change (e.g. admin promotes a moderator) takes effect on the
 * very next request instead of waiting for token refresh.
 */
export const authPlugin = fp(
  async function authPluginImpl(app: FastifyInstance) {
    app.decorateRequest("user", null);

    app.addHook("onRequest", async (request: FastifyRequest) => {
      const token = extractBearerToken(request);
      if (!token) return;

      const verified = await verifySupabaseToken(app.env, token);
      if (!verified) return;

      const [row] = await app.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, verified.supabaseUserId))
        .limit(1);

      // Suspended accounts never authenticate; pending_verification still can
      // (e.g. to check their own status or resend verification) — routes
      // that require a verified/active account guard for that explicitly.
      if (!row || row.status === "suspended") return;

      request.user = {
        id: row.id,
        email: row.email,
        role: row.role,
        status: row.status,
      };
    });

    app.decorate(
      "authenticate",
      async (request: FastifyRequest, _reply: FastifyReply) => {
        if (!request.user) {
          throw new UnauthorizedError();
        }
      },
    );
  },
  { name: "auth-plugin" },
);
