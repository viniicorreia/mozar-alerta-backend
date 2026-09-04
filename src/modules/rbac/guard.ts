import type { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError, UnauthorizedError } from "../../shared/errors.js";
import { roleHasPermission, type Permission } from "./permissions.js";

/**
 * Fastify preHandler factory — used as `{ preHandler: [app.authenticate,
 * requirePermission(PERMISSIONS.newsPublish)] }`. Only checks the role-level
 * permission; ownership checks (":own", ":self") are the route/service's
 * job and are enforced again at the database via RLS as a second layer
 * (see docs/architecture.md §4).
 */
export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError();
    }
    if (!roleHasPermission(request.user.role, permission)) {
      throw new ForbiddenError();
    }
  };
}
