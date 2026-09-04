import { z } from "zod";
import { slugSchema, uuidSchema } from "./common.js";

export const categorySchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(80),
  slug: slugSchema,
  description: z.string().max(500).nullable(),
  color: z.string().max(20).nullable(),
  icon: z.string().max(40).nullable(),
  parentId: uuidSchema.nullable(),
  order: z.number().int(),
  active: z.boolean(),
});
export type Category = z.infer<typeof categorySchema>;

// `slug` is never sent by the client — the server derives it from `name`
// (see apps/api/src/modules/categories/categories.service.ts).
export const upsertCategoryRequestSchema = categorySchema
  .omit({ id: true, slug: true })
  .partial({
    description: true,
    color: true,
    icon: true,
    parentId: true,
    order: true,
    active: true,
  })
  .strict();
export type UpsertCategoryRequest = z.infer<typeof upsertCategoryRequestSchema>;
