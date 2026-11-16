CREATE TABLE "routines" (
	"user_id" uuid NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"done" text[] DEFAULT '{}' NOT NULL,
	"done_day" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routines_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_sub" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"picture" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub")
);
--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;