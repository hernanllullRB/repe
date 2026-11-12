import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { ExerciseContent } from "../lib/schemas";

export const CONTENT_STATUS = ["pending", "generating", "ready", "failed"] as const;
export type ContentStatus = (typeof CONTENT_STATUS)[number];

export const YOUTUBE_SOURCE = ["manual", "search"] as const;
export type YoutubeSource = (typeof YOUTUBE_SOURCE)[number];

export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  source: text("source").notNull(), // 'free-exercise-db' | 'ai'
  sourceId: text("source_id").unique(),
  nameEs: text("name_es").notNull(),
  nameEn: text("name_en").notNull(),
  aliases: text("aliases").array().notNull().default([]),
  primaryMuscles: text("primary_muscles").array().notNull().default([]),
  secondaryMuscles: text("secondary_muscles").array().notNull().default([]),
  equipment: text("equipment"),
  level: text("level"),
  category: text("category"),
  images: text("images").array().notNull().default([]),
  /** true cuando las imágenes se editaron a mano (el seed ya no las pisa). */
  imagesEdited: boolean("images_edited").notNull().default(false),
  instructionsEn: text("instructions_en").array().notNull().default([]),
  translated: boolean("translated").notNull().default(false),
  content: jsonb("content").$type<ExerciseContent>(),
  contentStatus: text("content_status").$type<ContentStatus>().notNull().default("pending"),
  contentModel: text("content_model"),
  contentGeneratedAt: timestamp("content_generated_at", { withTimezone: true }),
  youtubeVideoId: text("youtube_video_id"),
  youtubeTitle: text("youtube_title"),
  youtubeChannel: text("youtube_channel"),
  youtubeSource: text("youtube_source").$type<YoutubeSource>(),
  youtubeSeconds: integer("youtube_seconds"),
  youtubeCheckedAt: timestamp("youtube_checked_at", { withTimezone: true }),
  reviewed: boolean("reviewed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

export const usageCounters = pgTable(
  "usage_counters",
  {
    day: date("day").notNull(),
    key: text("key").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.key] })],
);
