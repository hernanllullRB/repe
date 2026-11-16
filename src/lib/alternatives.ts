import type { SearchEntry } from "./exercises";
import { createMatcher } from "./routine-match";

/** Cantidad máxima de alternativas por ejercicio. */
export const MAX_ALTERNATIVES = 3;

/**
 * Convierte los nombres que sugirió la IA en ejercicios del catálogo: solo
 * coincidencias seguras, sin el propio ejercicio, sin repetidos y hasta 3.
 */
export function pickAlternatives(
  match: ReturnType<typeof createMatcher>,
  selfSlug: string,
  suggestions: { nameEs: string; nameEn: string }[],
): string[] {
  const picked: string[] = [];
  for (const s of suggestions) {
    const m = match({ name: s.nameEs, nameEs: s.nameEs, nameEn: s.nameEn });
    const slug = m.best?.slug;
    if (!m.confident || !slug || slug === selfSlug || picked.includes(slug)) continue;
    picked.push(slug);
    if (picked.length === MAX_ALTERNATIVES) break;
  }
  return picked;
}

export type { SearchEntry };
