import { z } from "zod";
import { uuidSchema } from "./common.js";

export const userRoleSchema = z.enum([
  "ADMIN",
  "MODERATOR",
  "COMPANY",
  "CANDIDATE",
  "USER",
]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userStatusSchema = z.enum([
  "active",
  "suspended",
  "pending_verification",
]);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const userSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  name: z.string().min(1).max(160),
  role: userRoleSchema,
  status: userStatusSchema,
  lastLoginAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type User = z.infer<typeof userSchema>;

export const registerRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(72),
    name: z.string().min(1).max(160),
    intent: z.enum(["USER", "CANDIDATE", "COMPANY"]).default("USER"),
    acceptedTermsVersion: z.string().min(1),
  })
  .strict();
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const authResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    accessToken: z.string(),
    user: userSchema,
  }),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
