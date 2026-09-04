import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { resumeStatusEnum } from "./enums.js";
import { candidates } from "./candidates.js";

export const resumes = pgTable(
  "resumes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    fileKey: text("file_key").notNull(), // path in the Supabase Storage 'resumes' bucket
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type").notNull(),
    checksum: text("checksum").notNull(),
    version: integer("version").notNull(),
    status: resumeStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("resumes_candidate_status_idx").on(table.candidateId, table.status),
  ],
);
