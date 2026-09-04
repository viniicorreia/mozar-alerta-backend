import { asc, eq } from "drizzle-orm";
import type { UpsertCategoryRequest } from "@mozar/types";
import type { Database } from "../../platform/db/index.js";
import { schema } from "../../platform/db/index.js";
import { NotFoundError } from "../../shared/errors.js";
import { firstOrThrow } from "../../shared/db-helpers.js";
import { slugify } from "../../shared/slug.js";

export function createCategoriesService(db: Database) {
  return {
    async listAll() {
      return db.select().from(schema.categories).orderBy(asc(schema.categories.order));
    },

    async listActive() {
      return db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.active, true))
        .orderBy(asc(schema.categories.order));
    },

    async getBySlug(slug: string) {
      const [row] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.slug, slug))
        .limit(1);
      if (!row) throw new NotFoundError("Category", slug);
      return row;
    },

    async create(input: UpsertCategoryRequest) {
      const rows = await db
        .insert(schema.categories)
        .values({
          name: input.name,
          slug: slugify(input.name),
          description: input.description ?? null,
          color: input.color ?? null,
          icon: input.icon ?? null,
          parentId: input.parentId ?? null,
          order: input.order ?? 0,
          active: input.active ?? true,
        })
        .returning();
      return firstOrThrow(rows, "insert category");
    },

    async update(id: string, input: Partial<UpsertCategoryRequest>) {
      const patch: Partial<typeof schema.categories.$inferInsert> = { ...input };
      if (input.name) patch.slug = slugify(input.name);

      const [row] = await db
        .update(schema.categories)
        .set(patch)
        .where(eq(schema.categories.id, id))
        .returning();
      if (!row) throw new NotFoundError("Category", id);
      return row;
    },

    async remove(id: string) {
      const [row] = await db
        .delete(schema.categories)
        .where(eq(schema.categories.id, id))
        .returning();
      if (!row) throw new NotFoundError("Category", id);
      return row;
    },
  };
}

export type CategoriesService = ReturnType<typeof createCategoriesService>;
