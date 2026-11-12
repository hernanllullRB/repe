import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { exercises, type Exercise } from "../db/schema";
import { writeOverride } from "./overrides-file";

/** Imágenes de un ejercicio. La primera es la principal (buscador, rutinas). */
export const MAX_IMAGES = 8;

export function isValidImageUrl(url: string): boolean {
  if (url.startsWith("/api/uploads/")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function setImages(ex: Exercise, images: string[]): Promise<Exercise> {
  const clean = [...new Set(images.map((i) => i.trim()).filter(isValidImageUrl))].slice(0, MAX_IMAGES);
  const db = await getDb();
  const [row] = await db
    .update(exercises)
    .set({ images: clean, imagesEdited: true, updatedAt: new Date() })
    .where(eq(exercises.id, ex.id))
    .returning();
  writeOverride(ex.sourceId ?? ex.slug, { images: clean });
  return row;
}
