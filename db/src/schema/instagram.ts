import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { bytea } from "./custom-types.js";
import {
  igMediaTypeEnum,
  igModerationStatusEnum,
  igSourceStatusEnum,
  sensitivityEnum,
} from "./enums.js";
import { users } from "./users.js";
import { categories } from "./categories.js";

/**
 * SENSITIVE TABLE — no RLS SELECT policy is granted to `authenticated`/`anon`
 * (see packages/db/rls/instagram_sources.sql). Only the backend's
 * service_role client may read access_token_cipher.
 */
export const instagramSources = pgTable(
  "instagram_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instagramUserId: text("instagram_user_id").notNull().unique(),
    username: text("username").notNull(),
    accessTokenCipher: bytea("access_token_cipher").notNull(),
    tokenIv: bytea("token_iv").notNull(),
    tokenTag: bytea("token_tag").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", {
      withTimezone: true,
    }).notNull(),
    status: igSourceStatusEnum("status").notNull().default("active"),
    syncFrequencyMinutes: integer("sync_frequency_minutes").notNull().default(60),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastSyncCursor: text("last_sync_cursor"),
    lastError: jsonb("last_error").$type<{
      at: string;
      code: string;
      message: string;
    }>(),
    ownerConnectedUserId: uuid("owner_connected_user_id").references(
      () => users.id,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("instagram_sources_status_idx").on(table.status, table.lastSyncAt),
  ],
);

export const instagramPosts = pgTable(
  "instagram_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => instagramSources.id, { onDelete: "cascade" }),
    igMediaId: text("ig_media_id").notNull(),
    igPermalink: text("ig_permalink"),
    caption: text("caption"),
    mediaType: igMediaTypeEnum("media_type").notNull(),
    storedMediaKeys: text("stored_media_keys").array().notNull().default([]),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
    moderationStatus: igModerationStatusEnum("moderation_status")
      .notNull()
      .default("imported"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reason: text("reason"),
    publishedNewsId: uuid("published_news_id"), // FK added once `news` table exists
    aiSummary: text("ai_summary"),
    aiSuggestedCategoryId: uuid("ai_suggested_category_id").references(
      () => categories.id,
    ),
    aiTopics: text("ai_topics").array(),
    aiSensitivity: sensitivityEnum("ai_sensitivity").notNull().default("none"),
    contentHash: text("content_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("instagram_posts_source_media_unique").on(
      table.sourceId,
      table.igMediaId,
    ),
    index("instagram_posts_moderation_idx").on(
      table.moderationStatus,
      table.postedAt,
    ),
    index("instagram_posts_hash_idx").on(table.contentHash),
  ],
);
