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
import type { RoutineItemData } from "../lib/schemas";
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

// ---------------------------------------------------------------------------
// Usuarios (login con Google), sesiones y rutinas guardadas

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  googleSub: text("google_sub").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  picture: text("picture"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;

/** Sesiones: en la cookie va un token al azar; acá se guarda solo su hash. */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Rutinas de cada usuario. El id lo genera el navegador y es único por usuario. */
export const routines = pgTable(
  "routines",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    name: text("name").notNull(),
    items: jsonb("items").$type<RoutineItemData[]>().notNull().default([]),
    done: text("done").array().notNull().default([]),
    doneDay: text("done_day"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export type RoutineRow = typeof routines.$inferSelect;

/**
 * Fotos de rutinas que no se leyeron bien: error de la IA, sin ejercicios, la
 * mayoría sin coincidencia en el catálogo o reportadas por el usuario. Sirven
 * para ver qué estructuras de rutina (de otros gimnasios, apps, planillas) no
 * entendemos y mejorar el prompt. La imagen va a almacenamiento privado y todo
 * se borra a los 30 días.
 */
export const scanFailures = pgTable("scan_failures", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  /** 'ai_error' | 'empty' | 'unmatched' | 'reported' | 'format' */
  reason: text("reason").notNull(),
  mediaType: text("media_type"),
  fileName: text("file_name"),
  bytes: integer("bytes").notNull(),
  /** Mensaje de error o comentario del usuario. */
  detail: text("detail"),
  /** Lo que devolvió la IA (días y ejercicios con su coincidencia), si llegó a responder. */
  result: jsonb("result"),
  /** Ruta local o URL del blob privado; null si no se guardó la imagen. */
  storagePath: text("storage_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ScanFailure = typeof scanFailures.$inferSelect;
