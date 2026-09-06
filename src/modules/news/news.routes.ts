import type { FastifyInstance } from "fastify";
import {
  createNewsRequestSchema,
  newsListQuerySchema,
  paginationQuerySchema,
  updateNewsRequestSchema,
} from "@mozar/types";
import { PERMISSIONS, requirePermission } from "../rbac/index.js";
import { createCategoriesService } from "../categories/index.js";
import { createAuditService } from "../audit/index.js";
import { ForbiddenError } from "../../shared/errors.js";
import { createNewsService } from "./news.service.js";

const STAFF_ROLES = new Set(["ADMIN", "MODERATOR"]);

export async function newsRoutes(app: FastifyInstance) {
  const news = createNewsService(app.db);
  const categories = createCategoriesService(app.db);
  const audit = createAuditService(app.db);

  app.get("/news", async (request) => {
    const query = { ...paginationQuerySchema.parse(request.query), ...newsListQuerySchema.parse(request.query) };
    const isStaff = !!request.user && STAFF_ROLES.has(request.user.role);

    let categoryId: string | undefined;
    if (query.categorySlug) {
      categoryId = (await categories.getBySlug(query.categorySlug)).id;
    }

    const status = isStaff ? query.status : "published";

    const result = await news.list({
      status,
      categoryId,
      tag: query.tag,
      featured: query.featured,
      q: query.q,
      page: query.page,
      perPage: query.perPage,
    });

    return {
      success: true,
      data: result.rows,
      meta: {
        page: result.page,
        perPage: result.perPage,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  });

  app.get("/news/:slug", async (request) => {
    const { slug } = request.params as { slug: string };
    const item = await news.getBySlug(slug);

    const isStaff = !!request.user && STAFF_ROLES.has(request.user.role);
    if (item.status !== "published" && !isStaff) {
      throw new ForbiddenError();
    }

    return { success: true, data: item };
  });

  app.post(
    "/news",
    { preHandler: [app.authenticate, requirePermission(PERMISSIONS.newsCreate)] },
    async (request, reply) => {
      const body = createNewsRequestSchema.parse(request.body);
      const item = await news.create(body, request.user!.id);
      await audit.record({
        actorUserId: request.user!.id,
        actorRole: request.user!.role,
        action: "news.create",
        entity: "news",
        entityId: item.id,
        ip: request.ip,
      });
      return reply.status(201).send({ success: true, data: item });
    },
  );

  app.put(
    "/news/:id",
    { preHandler: [app.authenticate, requirePermission(PERMISSIONS.newsCreate)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = updateNewsRequestSchema.parse(request.body);
      const item = await news.update(id, body);
      await audit.record({
        actorUserId: request.user!.id,
        actorRole: request.user!.role,
        action: "news.update",
        entity: "news",
        entityId: id,
        ip: request.ip,
      });
      return { success: true, data: item };
    },
  );

  app.post(
    "/news/:id/publish",
    { preHandler: [app.authenticate, requirePermission(PERMISSIONS.newsPublish)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const item = await news.publish(id);
      await audit.record({
        actorUserId: request.user!.id,
        actorRole: request.user!.role,
        action: "news.publish",
        entity: "news",
        entityId: id,
        ip: request.ip,
      });
      return { success: true, data: item };
    },
  );

  app.post(
    "/news/:id/unpublish",
    { preHandler: [app.authenticate, requirePermission(PERMISSIONS.newsPublish)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const item = await news.unpublish(id);
      await audit.record({
        actorUserId: request.user!.id,
        actorRole: request.user!.role,
        action: "news.unpublish",
        entity: "news",
        entityId: id,
        ip: request.ip,
      });
      return { success: true, data: item };
    },
  );

  app.post(
    "/news/:id/archive",
    { preHandler: [app.authenticate, requirePermission(PERMISSIONS.newsModerate)] },
    async (request) => {
      const { id } = request.params as { id: string };
      const item = await news.archive(id);
      await audit.record({
        actorUserId: request.user!.id,
        actorRole: request.user!.role,
        action: "news.archive",
        entity: "news",
        entityId: id,
        ip: request.ip,
      });
      return { success: true, data: item };
    },
  );

  app.delete(
    "/news/:id",
    { preHandler: [app.authenticate, requirePermission(PERMISSIONS.newsModerate)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await news.softDelete(id);
      await audit.record({
        actorUserId: request.user!.id,
        actorRole: request.user!.role,
        action: "news.delete",
        entity: "news",
        entityId: id,
        ip: request.ip,
      });
      return reply.status(204).send();
    },
  );
}
