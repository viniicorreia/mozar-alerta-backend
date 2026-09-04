import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { companyStatusEnum } from "./enums.js";
import { users } from "./users.js";

export interface CompanyAddress {
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  zip: string;
}

export interface CompanySocials {
  instagram?: string;
  linkedin?: string;
  facebook?: string;
}

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    cnpj: text("cnpj").notNull().unique(),
    description: text("description"),
    logoKey: text("logo_key"),
    address: jsonb("address").$type<CompanyAddress>(),
    phone: text("phone"),
    website: text("website"),
    socials: jsonb("socials").$type<CompanySocials>(),
    status: companyStatusEnum("status").notNull().default("pending"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("companies_status_idx").on(table.status)],
);
