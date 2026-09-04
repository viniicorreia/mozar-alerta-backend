import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { applicationStatusEnum } from "./enums.js";
import { jobs } from "./jobs.js";
import { candidates } from "./candidates.js";
import { companies } from "./companies.js";
import { resumes } from "./resumes.js";
import { users } from "./users.js";

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id),
    status: applicationStatusEnum("status").notNull().default("applied"),
    coverLetter: text("cover_letter"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("applications_job_candidate_unique").on(
      table.jobId,
      table.candidateId,
    ),
    index("applications_candidate_idx").on(
      table.candidateId,
      table.createdAt,
    ),
    index("applications_company_status_idx").on(
      table.companyId,
      table.status,
    ),
  ],
);

export const applicationStatusHistory = pgTable(
  "application_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").notNull(),
    note: text("note"),
    byUserId: uuid("by_user_id").references(() => users.id),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
);
