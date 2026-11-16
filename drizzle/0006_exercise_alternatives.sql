ALTER TABLE "exercises" ADD COLUMN "alternatives" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "alternatives_checked_at" timestamp with time zone;