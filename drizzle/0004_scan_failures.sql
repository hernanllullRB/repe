CREATE TABLE "scan_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"reason" text NOT NULL,
	"media_type" text,
	"file_name" text,
	"bytes" integer NOT NULL,
	"detail" text,
	"result" jsonb,
	"storage_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scan_failures" ADD CONSTRAINT "scan_failures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;