import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { userRoleEnum, userStatusEnum } from "./enums.js";

/**
 * Mirrors auth.users (managed by Supabase Auth) — populated by the
 * on_auth_user_created trigger. Never write auth fields (password, etc.) here.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(), // == auth.users.id
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    role: userRoleEnum("role").notNull().default("USER"),
    status: userStatusEnum("status").notNull().default("pending_verification"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    deletionRequestedAt: timestamp("deletion_requested_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("users_role_status_idx").on(table.role, table.status)],
);

export const userConsents = pgTable("user_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'terms' | 'privacy' | 'marketing'
  version: text("version").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ip: text("ip"),
});
