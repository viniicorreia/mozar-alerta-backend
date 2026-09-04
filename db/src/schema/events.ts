import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { eventStatusEnum } from "./enums.js";
import { categories } from "./categories.js";

export interface EventLocation {
  name: string;
  address: string;
  city: string;
}

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    coverImageKey: text("cover_image_key"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    location: jsonb("location").$type<EventLocation>(),
    categoryId: uuid("category_id").references(() => categories.id),
    organizer: text("organizer"),
    externalUrl: text("external_url"),
    status: eventStatusEnum("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("events_status_starts_idx").on(table.status, table.startsAt),
  ],
);
