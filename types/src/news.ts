import { z } from "zod";
import { slugSchema, uuidSchema } from "./common.js";

export const newsStatusSchema = z.enum([
  "draft",
  "scheduled",
  "published",
  "archived",
]);
export type NewsStatus = z.infer<typeof newsStatusSchema>;

export const newsSourceSchema = z.enum(["editorial", "instagram"]);

export const sensitivitySchema = z.enum([
  "none",
  "political",
  "crime",
  "health",
  "accident",
  "accusation",
]);
export type Sensitivity = z.infer<typeof sensitivitySchema>;

export const newsSchema = z.object({
  id: uuidSchema,
  title: z.string().min(3).max(200),
  slug: slugSchema,
  summary: z.string().min(1).max(500),
  content: z.string().min(1),
  coverImageKey: z.string().nullable(),
  categoryId: uuidSchema.nullable(),
  tags: z.array(z.string().max(40)).max(20),
  source: newsSourceSchema,
  sourceUrl: z.string().url().nullable(),
  status: newsStatusSchema,
  featured: z.boolean(),
  publishedAt: z.string().datetime().nullable(),
  scheduledFor: z.string().datetime().nullable(),
  authorId: uuidSchema,
  views: z.number().int().min(0),
  aiSensitivity: sensitivitySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type News = z.infer<typeof newsSchema>;

export const createNewsRequestSchema = z
  .object({
    title: z.string().min(3).max(200),
    summary: z.string().min(1).max(500),
    content: z.string().min(1),
    categoryId: uuidSchema.nullable().default(null),
    tags: z.array(z.string().max(40)).max(20).default([]),
    coverImageKey: z.string().nullable().default(null),
    featured: z.boolean().default(false),
    scheduledFor: z.string().datetime().nullable().default(null),
  })
  .strict();
export type CreateNewsRequest = z.infer<typeof createNewsRequestSchema>;

export const updateNewsRequestSchema = createNewsRequestSchema.partial();
export type UpdateNewsRequest = z.infer<typeof updateNewsRequestSchema>;

export const newsListQuerySchema = z.object({
  categorySlug: z.string().optional(),
  tag: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  status: newsStatusSchema.optional(),
});
export type NewsListQuery = z.infer<typeof newsListQuerySchema>;
