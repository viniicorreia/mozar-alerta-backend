import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    phone: text("phone"),
    city: text("city"),
    professionalSummary: text("professional_summary"),
    skills: text("skills").array().notNull().default([]),
    linkedin: text("linkedin"),
    portfolio: text("portfolio"),
    // FK to resumes.id added at the DB level in a follow-up migration
    // (resumes references candidates, so this avoids a circular definition).
    currentResumeId: uuid("current_resume_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("candidates_city_idx").on(table.city)],
);

export const candidateEducation = pgTable("candidate_education", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  institution: text("institution").notNull(),
  degree: text("degree"),
  field: text("field"),
  startYear: integer("start_year"),
  endYear: integer("end_year"),
});

export const candidateExperience = pgTable("candidate_experience", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  role: text("role").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  description: text("description"),
});
