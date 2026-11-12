import { cacheLife, cacheTag } from "next/cache";
import { asc, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { exercises } from "../db/schema";
import { aiConfigured } from "./ai";
import { needsContent, needsVideoSearch } from "./enrich";
import { findBySlug, toView, type ExerciseView, type SearchEntry } from "./exercises";
import { youtubeConfigured } from "./youtube";

/** Lecturas cacheadas para las páginas. Se invalidan con revalidateTag. */

export const exerciseTag = (slug: string) => `exercise:${slug}`;
export const SEARCH_INDEX_TAG = "search-index";
/** Todas las fichas: se invalida cuando un script cambia nombres de muchos ejercicios. */
export const ALL_EXERCISES_TAG = "exercises";

export async function getExerciseView(slug: string): Promise<ExerciseView | null> {
  "use cache";
  cacheLife("max");
  cacheTag(exerciseTag(slug), ALL_EXERCISES_TAG);
  const ex = await findBySlug(slug);
  if (!ex) return null;
  const needsEnrich =
    (needsContent(ex) && aiConfigured()) || (needsVideoSearch(ex) && youtubeConfigured());
  return toView(ex, needsEnrich);
}

export async function getSearchIndex(): Promise<SearchEntry[]> {
  "use cache";
  cacheLife("max");
  cacheTag(SEARCH_INDEX_TAG);
  const db = await getDb();
  const rows = await db
    .select({
      slug: exercises.slug,
      nameEs: exercises.nameEs,
      nameEn: exercises.nameEn,
      aliases: exercises.aliases,
      muscles: exercises.primaryMuscles,
      reviewed: exercises.reviewed,
      image: sql<string | null>`${exercises.images}[1]`,
    })
    .from(exercises)
    .orderBy(asc(exercises.nameEs));
  return rows;
}
