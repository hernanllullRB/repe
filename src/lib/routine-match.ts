import type { SearchEntry } from "./exercises";
import { normalize } from "./normalize";
import { buildSearch } from "./search";

/**
 * Busca en el catálogo cada ejercicio leído de una foto. Prueba primero una
 * coincidencia exacta con nombres y alias, y si no, el buscador con el nombre
 * en inglés (el catálogo viene de una base en inglés), el canónico en español
 * y lo que estaba escrito.
 */
export interface ScannedName {
  name: string;
  nameEs: string;
  nameEn: string;
}

export interface MatchResult {
  /** Mejor opción (o null si no hay nada parecido). */
  best: SearchEntry | null;
  /** Hasta 5 opciones para elegir, con la mejor primero. */
  candidates: SearchEntry[];
  /** false si la mejor opción salió de una búsqueda floja: conviene revisarla. */
  confident: boolean;
}

export function createMatcher(entries: SearchEntry[]) {
  const search = buildSearch(entries);
  const byName = new Map<string, SearchEntry>();
  for (const e of entries) {
    for (const n of [e.nameEs, e.nameEn, ...e.aliases]) {
      const key = normalize(n);
      if (key && !byName.has(key)) byName.set(key, e);
    }
  }

  return (item: ScannedName): MatchResult => {
    const queries = [item.nameEn, item.nameEs, item.name].map((q) => q?.trim() ?? "").filter((q) => q.length >= 3);
    const seen = new Map<string, SearchEntry>();
    const add = (e: SearchEntry) => {
      if (!seen.has(e.slug)) seen.set(e.slug, e);
    };

    let exact: SearchEntry | null = null;
    for (const q of queries) {
      const hit = byName.get(normalize(q));
      if (hit) {
        exact = hit;
        break;
      }
    }
    if (exact) add(exact);

    // Resultados de cada consulta, intercalados para no favorecer solo una.
    const lists = queries.map((q) => search(q, 5));
    for (let i = 0; i < 5; i++) for (const l of lists) if (l[i]) add(l[i]);

    const candidates = [...seen.values()].slice(0, 5);
    const best = candidates[0] ?? null;
    // Confiable si fue exacta o si el primer resultado coincide entre dos consultas.
    const confident =
      Boolean(exact) || (best !== null && lists.filter((l) => l[0]?.slug === best.slug).length >= 2);
    return { best, candidates, confident };
  };
}
