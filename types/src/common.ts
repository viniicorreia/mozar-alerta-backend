import { z } from "zod";

/** Cursor/offset pagination shared by every list endpoint. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function paginatedResponseSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(item),
    meta: z.object({
      page: z.number().int(),
      perPage: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
    }),
  });
}

export function successResponseSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    success: z.literal(true),
    data: item,
  });
}

/** Global error envelope — see plan section 31. Never leaks a stack trace. */
export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const uuidSchema = z.string().uuid();
export const slugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a kebab-case slug");
