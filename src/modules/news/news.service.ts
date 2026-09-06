import { and, arrayContains, count, desc, eq, isNull, lte, sql, type SQL } from "drizzle-orm";
import type { CreateNewsRequest, NewsStatus, UpdateNewsRequest } from "@mozar/types";
import type { Database } from "../../platform/db/index.js";
import { schema } from "../../platform/db/index.js";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import { firstOrThrow } from "../../shared/db-helpers.js";
import { slugify, slugifyUnique } from "../../shared/slug.js";
import { sanitizeNewsContent } from "./sanitize.js";

export interface ListNewsFilters {
  status?: NewsStatus;
  categoryId?: string;
  tag?: string;
  featured?: boolean;
  /** Free-text search over title + summary (Portuguese full-text). */
  q?: string;
  page: number;
  perPage: number;
}

async function ensureUniqueSlug(db: Database, title: string, excludeId?: string) {
  const base = slugify(title);
  const [existing] = await db
    .select({ id: schema.news.id })
    .from(schema.news)
    .where(eq(schema.news.slug, base))
    .limit(1);

  if (!existing || existing.id === excludeId) return base;
  return slugifyUnique(title);
}

export function createNewsService(db: Database) {
  return {
    async list(filters: ListNewsFilters) {
      const conditions: SQL[] = [isNull(schema.news.deletedAt)];
      if (filters.status) conditions.push(eq(schema.news.status, filters.status));
      if (filters.categoryId) conditions.push(eq(schema.news.categoryId, filters.categoryId));
      if (filters.featured !== undefined) conditions.push(eq(schema.news.featured, filters.featured));
      if (filters.tag) conditions.push(arrayContains(schema.news.tags, [filters.tag]));
      if (filters.q) {
        // Uses the news_search_idx GIN index (to_tsvector('portuguese', title || ' ' || summary)).
        conditions.push(
          sql`to_tsvector('portuguese', ${schema.news.title} || ' ' || ${schema.news.summary}) @@ plainto_tsquery('portuguese', ${filters.q})`,
        );
      }

      const where = and(...conditions);
      const offset = (filters.page - 1) * filters.perPage;

      const [rows, countRows] = await Promise.all([
        db
          .select()
          .from(schema.news)
          .where(where)
          .orderBy(desc(schema.news.publishedAt), desc(schema.news.createdAt))
          .limit(filters.perPage)
          .offset(offset),
        db.select({ total: count() }).from(schema.news).where(where),
      ]);
      const { total } = firstOrThrow(countRows, "count news");

      return {
        rows,
        total,
        page: filters.page,
        perPage: filters.perPage,
        totalPages: Math.max(1, Math.ceil(total / filters.perPage)),
      };
    },

    async getBySlug(slug: string) {
      const [row] = await db
        .select()
        .from(schema.news)
        .where(and(eq(schema.news.slug, slug), isNull(schema.news.deletedAt)))
        .limit(1);
      if (!row) throw new NotFoundError("News", slug);
      return row;
    },

    async getById(id: string) {
      const [row] = await db
        .select()
        .from(schema.news)
        .where(and(eq(schema.news.id, id), isNull(schema.news.deletedAt)))
        .limit(1);
      if (!row) throw new NotFoundError("News", id);
      return row;
    },

    async create(input: CreateNewsRequest, authorId: string) {
      const slug = await ensureUniqueSlug(db, input.title);
      const now = new Date();
      const isScheduled = !!input.scheduledFor && new Date(input.scheduledFor) > now;

      const rows = await db
        .insert(schema.news)
        .values({
          title: input.title,
          slug,
          summary: input.summary,
          content: sanitizeNewsContent(input.content),
          categoryId: input.categoryId,
          tags: input.tags,
          coverImageKey: input.coverImageKey,
          featured: input.featured,
          scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
          status: isScheduled ? "scheduled" : "draft",
          authorId,
          source: "editorial",
        })
        .returning();
      return firstOrThrow(rows, "insert news");
    },

    async update(id: string, input: UpdateNewsRequest) {
      const patch: Partial<typeof schema.news.$inferInsert> = {};
      if (input.title !== undefined) {
        patch.title = input.title;
        patch.slug = await ensureUniqueSlug(db, input.title, id);
      }
      if (input.summary !== undefined) patch.summary = input.summary;
      if (input.content !== undefined) patch.content = sanitizeNewsContent(input.content);
      if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
      if (input.tags !== undefined) patch.tags = input.tags;
      if (input.coverImageKey !== undefined) patch.coverImageKey = input.coverImageKey;
      if (input.featured !== undefined) patch.featured = input.featured;
      if (input.scheduledFor !== undefined) {
        patch.scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
      }

      const [row] = await db
        .update(schema.news)
        .set(patch)
        .where(and(eq(schema.news.id, id), isNull(schema.news.deletedAt)))
        .returning();
      if (!row) throw new NotFoundError("News", id);
      return row;
    },

    async publish(id: string) {
      const [existing] = await db
        .select({ status: schema.news.status })
        .from(schema.news)
        .where(and(eq(schema.news.id, id), isNull(schema.news.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("News", id);
      if (existing.status === "published") {
        throw new ConflictError("This news item is already published");
      }

      const rows = await db
        .update(schema.news)
        .set({ status: "published", publishedAt: new Date(), scheduledFor: null })
        .where(eq(schema.news.id, id))
        .returning();
      return firstOrThrow(rows, "publish news");
    },

    async unpublish(id: string) {
      const [row] = await db
        .update(schema.news)
        .set({ status: "draft", publishedAt: null })
        .where(eq(schema.news.id, id))
        .returning();
      if (!row) throw new NotFoundError("News", id);
      return row;
    },

    async archive(id: string) {
      const [row] = await db
        .update(schema.news)
        .set({ status: "archived" })
        .where(eq(schema.news.id, id))
        .returning();
      if (!row) throw new NotFoundError("News", id);
      return row;
    },

    async softDelete(id: string) {
      const [row] = await db
        .update(schema.news)
        .set({ deletedAt: new Date() })
        .where(eq(schema.news.id, id))
        .returning();
      if (!row) throw new NotFoundError("News", id);
      return row;
    },

    /**
     * Promotes every `scheduled` news item whose time has come to
     * `published` — driven by the repeatable BullMQ job registered in
     * worker.ts (plan §8, "Agendamento").
     */
    async promoteScheduled(): Promise<number> {
      const rows = await db
        .update(schema.news)
        .set({ status: "published", publishedAt: new Date() })
        .where(and(eq(schema.news.status, "scheduled"), lte(schema.news.scheduledFor, new Date())))
        .returning({ id: schema.news.id });
      return rows.length;
    },
  };
}

export type NewsService = ReturnType<typeof createNewsService>;
