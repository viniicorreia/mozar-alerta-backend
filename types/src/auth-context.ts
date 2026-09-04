import { z } from "zod";
import { uuidSchema } from "./common.js";
import { userRoleSchema, userStatusSchema } from "./user.js";

/**
 * Shape of `request.user` after the auth plugin runs — the authenticated
 * identity as known to our own `users` table (role/status), not the raw
 * Supabase Auth session. See apps/api/src/modules/auth.
 */
export const authenticatedUserSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  role: userRoleSchema,
  status: userStatusSchema,
});
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;

export const updateUserRoleRequestSchema = z
  .object({
    role: userRoleSchema,
  })
  .strict();
export type UpdateUserRoleRequest = z.infer<typeof updateUserRoleRequestSchema>;

export const updateMeRequestSchema = z
  .object({
    name: z.string().min(1).max(160).optional(),
  })
  .strict();
export type UpdateMeRequest = z.infer<typeof updateMeRequestSchema>;
