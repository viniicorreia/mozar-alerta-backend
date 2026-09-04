import {
  bigint,
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { newsSourceEnum, newsStatusEnum, sensitivityEnum } from "./enums.js";
import { categories } from "./categories.js";
import { users } from "./users.js";
import { instagramPosts } from "./instagram.js";

export const news = pgTable(
  "news",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    summary: text("summary").notNull(),
    content: text("content").notNull(),
    coverImageKey: text("cover_image_key"),
    categoryId: uuid("category_id").references(() => categories.id),
    tags: text("tags").array().notNull().default([]),
    source: newsSourceEnum("source").notNull().default("editorial"),
    sourceInstagramPostId: uuid("source_instagram_post_id").references(
      () => instagramPosts.id,
    ),
    sourceUrl: text("source_url"),
    status: newsStatusEnum("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    views: bigint("views", { mode: "number" }).notNull().default(0),
    aiSummary: text("ai_summary"),
    aiSuggestedCategoryId: uuid("ai_suggested_category_id").references(
      () => categories.id,
    ),
    aiTopics: text("ai_topics").array(),
    aiSensitivity: sensitivityEnum("ai_sensitivity").notNull().default("none"),
    aiConfidence: numeric("ai_confidence", { precision: 3, scale: 2 }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("news_status_published_idx").on(table.status, table.publishedAt),
    index("news_featured_idx").on(
      table.status,
      table.featured,
      table.publishedAt,
    ),
    index("news_category_idx").on(
      table.categoryId,
      table.status,
      table.publishedAt,
    ),
  ],
);
