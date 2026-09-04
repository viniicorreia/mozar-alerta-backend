import type { FastifyInstance } from "fastify";
import { upsertCategoryRequestSchema } from "@mozar/types";
import { PERMISSIONS, requirePermission } from "../rbac/index.js";
import { createAuditService } from "../audit/index.js";
import { createCategoriesService } from "./categories.service.js";

export async function categoriesRoutes(app: FastifyInstance) {
  const categories = createCategoriesService(app.db);
  const audit = createAuditService(app.db);

  app.get("/categories", async (request) => {
    const { all } = request.query as { all?: string };
    const canSeeInactive = request.user
      ? ["ADMIN", "MODERATOR"].includes(request.user.role)
      : false;

    const rows =
      all === "true" && canSeeInactive
        ? await categories.listAll()
        : await categories.listActive();

    return { success: true, data: rows };
  });

  app.get("/categories/:slug", async (request) => {
    const { slug } = request.params as { slug: string };
    const category = await categories.getBySlug(slug);
    return { success: true, data: category };
  });

  app.post(
    "/categories",
    { preHandler: [app.authenticate, requirePermission(PERMISSIONS.categoriesManage)] },
    async (request, reply) => {
      const body = upsertCategoryRequestSchema.parse(request.body);
      const category = await categories.create(body);
      await audit.record({
        actorUserId: request.user!.id,
        actorRole: request.user!.role,
        action: "category.create",
        entity: "category",
        entityId: category.id,
        ip: request.ip,
      });
      return reply.status(201).send({ success: true, data: category });
    },
  );

  app.patch(
    "/categories/:id",
    { preHandler: [app.authenticate, requirePermission(PERMISSIONS.categoriesManage)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = upsertCategoryRequestSchema.partial().parse(request.body);
      const category = await categories.update(id, body);
      await audit.record({
        actorUserId: request.user!.id,
        actorRole: request.user!.role,
        action: "category.update",
        entity: "category",
        entityId: id,
        ip: request.ip,
        metadata: body,
      });
      return { success: true, data: category };
    },
  );

  app.delete(
    "/categories/:id",
    { preHandler: [app.authenticate, requirePermission(PERMISSIONS.categoriesManage)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await categories.remove(id);
      await audit.record({
        actorUserId: request.user!.id,
        actorRole: request.user!.role,
        action: "category.delete",
        entity: "category",
        entityId: id,
        ip: request.ip,
      });
      return reply.status(204).send();
    },
  );
}
