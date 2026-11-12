CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"name_es" text NOT NULL,
	"name_en" text NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"primary_muscles" text[] DEFAULT '{}' NOT NULL,
	"secondary_muscles" text[] DEFAULT '{}' NOT NULL,
	"equipment" text,
	"level" text,
	"category" text,
	"images" text[] DEFAULT '{}' NOT NULL,
	"instructions_en" text[] DEFAULT '{}' NOT NULL,
	"translated" boolean DEFAULT false NOT NULL,
	"content" jsonb,
	"content_status" text DEFAULT 'pending' NOT NULL,
	"content_model" text,
	"content_generated_at" timestamp with time zone,
	"youtube_video_id" text,
	"youtube_title" text,
	"youtube_channel" text,
	"youtube_source" text,
	"youtube_checked_at" timestamp with time zone,
	"reviewed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_slug_unique" UNIQUE("slug"),
	CONSTRAINT "exercises_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"day" date NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_counters_day_key_pk" PRIMARY KEY("day","key")
);
