import type { FastifyInstance } from "fastify";
import { updateMeRequestSchema, updateUserRoleRequestSchema } from "@mozar/types";
import type { schema } from "../../platform/db/index.js";
import { PERMISSIONS, requirePermission } from "../rbac/index.js";
import { createAuditService } from "../audit/index.js";
import { UnauthorizedError } from "../../shared/errors.js";
import { createUsersService } from "./users.service.js";

type UserRow = typeof schema.users.$inferSelect;

function serializeUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function usersRoutes(app: FastifyInstance) {
  const users = createUsersService(app.db);
  const audit = createAuditService(app.db);

  app.get("/users/me", { preHandler: [app.authenticate] }, async (request) => {
    const user = await users.getById(request.user!.id);
    return { success: true, data: serializeUser(user) };
  });

  app.patch("/users/me", { preHandler: [app.authenticate] }, async (request) => {
    const body = updateMeRequestSchema.parse(request.body);
    let user = await users.getById(request.user!.id);
    if (body.name) {
      user = await users.updateName(request.user!.id, body.name);
    }
    return { success: true, data: serializeUser(user) };
  });

  app.post(
    "/users/me/deletion-request",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = await users.requestDeletion(request.user!.id);
      await audit.record({
        actorUserId: request.user!.id,
        actorRole: request.user!.role,
        action: "user.deletion_requested",
        entity: "user",
        entityId: request.user!.id,
        ip: request.ip,
        userAgent: request.headers["user-agent"] as string | undefined,
      });
      return reply.status(202).send({ success: true, data: serializeUser(user) });
    },
  );

  app.patch(
    "/admin/users/:id/role",
    {
      preHandler: [app.authenticate, requirePermission(PERMISSIONS.usersManage)],
    },
    async (request) => {
      if (!request.user) throw new UnauthorizedError();
      const { id } = request.params as { id: string };
      const body = updateUserRoleRequestSchema.parse(request.body);

      const user = await users.updateRole(id, body.role);
      await audit.record({
        actorUserId: request.user.id,
        actorRole: request.user.role,
        action: "user.role_changed",
        entity: "user",
        entityId: id,
        ip: request.ip,
        userAgent: request.headers["user-agent"] as string | undefined,
        metadata: { newRole: body.role },
      });
      return { success: true, data: serializeUser(user) };
    },
  );
}
