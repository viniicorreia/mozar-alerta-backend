import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { notifChannelEnum, notifStatusEnum } from "./enums.js";
import { users } from "./users.js";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    channel: notifChannelEnum("channel").notNull(),
    payload: jsonb("payload").notNull(),
    status: notifStatusEnum("status").notNull().default("pending"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notifications_user_status_idx").on(
      table.userId,
      table.status,
      table.createdAt,
    ),
  ],
);
