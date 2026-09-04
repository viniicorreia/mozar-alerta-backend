import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "ADMIN",
  "MODERATOR",
  "COMPANY",
  "CANDIDATE",
  "USER",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "pending_verification",
]);

export const companyStatusEnum = pgEnum("company_status", [
  "active",
  "pending",
  "blocked",
]);

export const newsStatusEnum = pgEnum("news_status", [
  "draft",
  "scheduled",
  "published",
  "archived",
]);

export const newsSourceEnum = pgEnum("news_source", ["editorial", "instagram"]);

export const sensitivityEnum = pgEnum("sensitivity_type", [
  "none",
  "political",
  "crime",
  "health",
  "accident",
  "accusation",
]);

export const igSourceStatusEnum = pgEnum("ig_source_status", [
  "active",
  "invalid_token",
  "disabled",
  "error",
]);

export const igMediaTypeEnum = pgEnum("ig_media_type", [
  "IMAGE",
  "VIDEO",
  "CAROUSEL_ALBUM",
]);

export const igModerationStatusEnum = pgEnum("ig_moderation_status", [
  "imported",
  "analyzing",
  "pending_review",
  "published",
  "ignored",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "CLT",
  "PJ",
  "INTERNSHIP",
  "TEMPORARY",
  "APPRENTICE",
  "FREELANCE",
  "OTHER",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "draft",
  "published",
  "paused",
  "expired",
  "closed",
]);

export const remoteTypeEnum = pgEnum("remote_type", [
  "onsite",
  "hybrid",
  "remote",
]);

export const salaryTypeEnum = pgEnum("salary_type", [
  "monthly",
  "hourly",
  "undisclosed",
]);

export const resumeStatusEnum = pgEnum("resume_status", [
  "active",
  "replaced",
  "deleted",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "applied",
  "screening",
  "interview",
  "approved",
  "rejected",
  "withdrawn",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "published",
  "archived",
]);

export const notifChannelEnum = pgEnum("notif_channel", [
  "inapp",
  "email",
  "push",
  "whatsapp",
]);

export const notifStatusEnum = pgEnum("notif_status", [
  "pending",
  "sent",
  "failed",
  "read",
]);
