import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { exercises, type Exercise } from "../db/schema";
import { exerciseContentSchema, type ExerciseContent } from "./schemas";

/** Lecturas sin caché (para route handlers y scripts). */
export async function findBySlug(slug: string): Promise<Exercise | undefined> {
  const db = await getDb();
  const rows = await db.select().from(exercises).where(eq(exercises.slug, slug));
  return rows[0];
}

/** Datos que necesita la interfaz. Se serializa al cliente. */
export interface ExerciseView {
  slug: string;
  nameEs: string;
  nameEn: string;
  aliases: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  level: string | null;
  images: string[];
  imagesEdited: boolean;
  instructionsEn: string[];
  content: ExerciseContent | null;
  contentStatus: Exercise["contentStatus"];
  video: { id: string; title: string | null; channel: string | null; seconds: number | null } | null;
  needsEnrich: boolean;
}

export function toView(ex: Exercise, needsEnrich: boolean): ExerciseView {
  const parsed = exerciseContentSchema.safeParse(ex.content);
  return {
    slug: ex.slug,
    nameEs: ex.nameEs,
    nameEn: ex.nameEn,
    aliases: ex.aliases,
    primaryMuscles: ex.primaryMuscles,
    secondaryMuscles: ex.secondaryMuscles,
    equipment: ex.equipment,
    level: ex.level,
    images: ex.images,
    imagesEdited: ex.imagesEdited,
    instructionsEn: ex.instructionsEn,
    content: parsed.success ? parsed.data : null,
    contentStatus: ex.contentStatus,
    video: ex.youtubeVideoId
      ? { id: ex.youtubeVideoId, title: ex.youtubeTitle, channel: ex.youtubeChannel, seconds: ex.youtubeSeconds }
      : null,
    needsEnrich,
  };
}

export interface SearchEntry {
  slug: string;
  nameEs: string;
  nameEn: string;
  aliases: string[];
  muscles: string[];
  /** Revisado a mano: suelen ser los más buscados y suben en los resultados. */
  reviewed?: boolean;
  /** Imagen principal (la primera). */
  image?: string | null;
}
