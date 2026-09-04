CREATE TYPE "public"."application_status" AS ENUM('applied', 'screening', 'interview', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."company_status" AS ENUM('active', 'pending', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('CLT', 'PJ', 'INTERNSHIP', 'TEMPORARY', 'APPRENTICE', 'FREELANCE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."ig_media_type" AS ENUM('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM');--> statement-breakpoint
CREATE TYPE "public"."ig_moderation_status" AS ENUM('imported', 'analyzing', 'pending_review', 'published', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."ig_source_status" AS ENUM('active', 'invalid_token', 'disabled', 'error');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('draft', 'published', 'paused', 'expired', 'closed');--> statement-breakpoint
CREATE TYPE "public"."news_source" AS ENUM('editorial', 'instagram');--> statement-breakpoint
CREATE TYPE "public"."news_status" AS ENUM('draft', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."notif_channel" AS ENUM('inapp', 'email', 'push', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."notif_status" AS ENUM('pending', 'sent', 'failed', 'read');--> statement-breakpoint
CREATE TYPE "public"."remote_type" AS ENUM('onsite', 'hybrid', 'remote');--> statement-breakpoint
CREATE TYPE "public"."resume_status" AS ENUM('active', 'replaced', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."salary_type" AS ENUM('monthly', 'hourly', 'undisclosed');--> statement-breakpoint
CREATE TYPE "public"."sensitivity_type" AS ENUM('none', 'political', 'crime', 'health', 'accident', 'accusation');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'MODERATOR', 'COMPANY', 'CANDIDATE', 'USER');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'pending_verification');--> statement-breakpoint
CREATE TABLE "application_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"status" "application_status" NOT NULL,
	"note" text,
	"by_user_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"resume_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'applied' NOT NULL,
	"cover_letter" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_job_candidate_unique" UNIQUE("job_id","candidate_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"ip" "inet",
	"user_agent" text,
	"metadata" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"institution" text NOT NULL,
	"degree" text,
	"field" text,
	"start_year" integer,
	"end_year" integer
);
--> statement-breakpoint
CREATE TABLE "candidate_experience" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"phone" text,
	"city" text,
	"professional_summary" text,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"linkedin" text,
	"portfolio" text,
	"current_resume_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidates_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text,
	"icon" text,
	"parent_id" uuid,
	"order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"cnpj" text NOT NULL,
	"description" text,
	"logo_key" text,
	"address" jsonb,
	"phone" text,
	"website" text,
	"socials" jsonb,
	"status" "company_status" DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug"),
	CONSTRAINT "companies_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"cover_image_key" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"location" jsonb,
	"category_id" uuid,
	"organizer" text,
	"external_url" text,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"version" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"status" "user_status" DEFAULT 'pending_verification' NOT NULL,
	"last_login_at" timestamp with time zone,
	"deletion_requested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text NOT NULL,
	"content" text NOT NULL,
	"cover_image_key" text,
	"category_id" uuid,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"source" "news_source" DEFAULT 'editorial' NOT NULL,
	"source_instagram_post_id" uuid,
	"source_url" text,
	"status" "news_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"scheduled_for" timestamp with time zone,
	"author_id" uuid NOT NULL,
	"views" bigint DEFAULT 0 NOT NULL,
	"ai_summary" text,
	"ai_suggested_category_id" uuid,
	"ai_topics" text[],
	"ai_sensitivity" "sensitivity_type" DEFAULT 'none' NOT NULL,
	"ai_confidence" numeric(3, 2),
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "instagram_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"ig_media_id" text NOT NULL,
	"ig_permalink" text,
	"caption" text,
	"media_type" "ig_media_type" NOT NULL,
	"stored_media_keys" text[] DEFAULT '{}' NOT NULL,
	"posted_at" timestamp with time zone NOT NULL,
	"moderation_status" "ig_moderation_status" DEFAULT 'imported' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"reason" text,
	"published_news_id" uuid,
	"ai_summary" text,
	"ai_suggested_category_id" uuid,
	"ai_topics" text[],
	"ai_sensitivity" "sensitivity_type" DEFAULT 'none' NOT NULL,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instagram_posts_source_media_unique" UNIQUE("source_id","ig_media_id")
);
--> statement-breakpoint
CREATE TABLE "instagram_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instagram_user_id" text NOT NULL,
	"username" text NOT NULL,
	"access_token_cipher" "bytea" NOT NULL,
	"token_iv" "bytea" NOT NULL,
	"token_tag" "bytea" NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"status" "ig_source_status" DEFAULT 'active' NOT NULL,
	"sync_frequency_minutes" integer DEFAULT 60 NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_sync_cursor" text,
	"last_error" jsonb,
	"owner_connected_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instagram_sources_instagram_user_id_unique" UNIQUE("instagram_user_id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"requirements" text,
	"responsibilities" text,
	"benefits" text[] DEFAULT '{}' NOT NULL,
	"salary_min" numeric(10, 2),
	"salary_max" numeric(10, 2),
	"salary_type" "salary_type" DEFAULT 'undisclosed' NOT NULL,
	"employment_type" "employment_type" NOT NULL,
	"location_city" text NOT NULL,
	"location_state" text NOT NULL,
	"location_district" text,
	"remote" "remote_type" DEFAULT 'onsite' NOT NULL,
	"category_id" uuid,
	"status" "job_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"applications_count" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"file_key" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"checksum" text NOT NULL,
	"version" integer NOT NULL,
	"status" "resume_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"channel" "notif_channel" NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "notif_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_by_user_id_users_id_fk" FOREIGN KEY ("by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_education" ADD CONSTRAINT "candidate_education_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_experience" ADD CONSTRAINT "candidate_experience_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_source_instagram_post_id_instagram_posts_id_fk" FOREIGN KEY ("source_instagram_post_id") REFERENCES "public"."instagram_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_ai_suggested_category_id_categories_id_fk" FOREIGN KEY ("ai_suggested_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_posts" ADD CONSTRAINT "instagram_posts_source_id_instagram_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."instagram_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_posts" ADD CONSTRAINT "instagram_posts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_posts" ADD CONSTRAINT "instagram_posts_ai_suggested_category_id_categories_id_fk" FOREIGN KEY ("ai_suggested_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_sources" ADD CONSTRAINT "instagram_sources_owner_connected_user_id_users_id_fk" FOREIGN KEY ("owner_connected_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_candidate_idx" ON "applications" USING btree ("candidate_id","created_at");--> statement-breakpoint
CREATE INDEX "applications_company_status_idx" ON "applications" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity","entity_id","at");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_user_id","at");--> statement-breakpoint
CREATE INDEX "candidates_city_idx" ON "candidates" USING btree ("city");--> statement-breakpoint
CREATE INDEX "companies_status_idx" ON "companies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_status_starts_idx" ON "events" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "users_role_status_idx" ON "users" USING btree ("role","status");--> statement-breakpoint
CREATE INDEX "news_status_published_idx" ON "news" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "news_featured_idx" ON "news" USING btree ("status","featured","published_at");--> statement-breakpoint
CREATE INDEX "news_category_idx" ON "news" USING btree ("category_id","status","published_at");--> statement-breakpoint
CREATE INDEX "instagram_posts_moderation_idx" ON "instagram_posts" USING btree ("moderation_status","posted_at");--> statement-breakpoint
CREATE INDEX "instagram_posts_hash_idx" ON "instagram_posts" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "instagram_sources_status_idx" ON "instagram_sources" USING btree ("status","last_sync_at");--> statement-breakpoint
CREATE INDEX "jobs_status_published_idx" ON "jobs" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "jobs_company_status_idx" ON "jobs" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "jobs_expiry_idx" ON "jobs" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "jobs_location_idx" ON "jobs" USING btree ("location_city","employment_type","status");--> statement-breakpoint
CREATE INDEX "resumes_candidate_status_idx" ON "resumes" USING btree ("candidate_id","status");--> statement-breakpoint
CREATE INDEX "notifications_user_status_idx" ON "notifications" USING btree ("user_id","status","created_at");