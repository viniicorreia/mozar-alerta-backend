import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  employmentTypeEnum,
  jobStatusEnum,
  remoteTypeEnum,
  salaryTypeEnum,
} from "./enums.js";
import { companies } from "./companies.js";
import { categories } from "./categories.js";

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    requirements: text("requirements"),
    responsibilities: text("responsibilities"),
    benefits: text("benefits").array().notNull().default([]),
    salaryMin: numeric("salary_min", { precision: 10, scale: 2 }),
    salaryMax: numeric("salary_max", { precision: 10, scale: 2 }),
    salaryType: salaryTypeEnum("salary_type").notNull().default("undisclosed"),
    employmentType: employmentTypeEnum("employment_type").notNull(),
    locationCity: text("location_city").notNull(),
    locationState: text("location_state").notNull(),
    locationDistrict: text("location_district"),
    remote: remoteTypeEnum("remote").notNull().default("onsite"),
    categoryId: uuid("category_id").references(() => categories.id),
    status: jobStatusEnum("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    applicationsCount: integer("applications_count").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("jobs_status_published_idx").on(table.status, table.publishedAt),
    index("jobs_company_status_idx").on(table.companyId, table.status),
    index("jobs_expiry_idx").on(table.status, table.expiresAt),
    index("jobs_location_idx").on(
      table.locationCity,
      table.employmentType,
      table.status,
    ),
  ],
);
