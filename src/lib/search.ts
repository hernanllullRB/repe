import MiniSearch from "minisearch";
import type { SearchEntry } from "./exercises";
import { normalize } from "./normalize";

/** Motor de búsqueda del navegador. Se usa igual en los tests. */
export function buildSearch(entries: SearchEntry[]) {
  const ms = new MiniSearch<SearchEntry & { id: string; aliasesText: string; musclesText: string }>({
    idField: "id",
    fields: ["nameEs", "aliasesText", "nameEn", "musclesText"],
    storeFields: ["slug", "reviewed"],
    processTerm: (term) => normalize(term) || null,
    searchOptions: {
      prefix: true,
      // Tolerancia a errores solo en palabras de 4+ letras, para no traer ruido.
      fuzzy: (term) => (term.length > 3 ? 0.2 : false),
      combineWith: "AND",
      boost: { nameEs: 3, aliasesText: 2, nameEn: 2, musclesText: 1 },
      boostDocument: (_id, _term, stored) => (stored?.reviewed ? 1.5 : 1),
    },
  });
  ms.addAll(
    entries.map((e) => ({
      ...e,
      id: e.slug,
      aliasesText: e.aliases.join(" | "),
      musclesText: e.muscles.join(" "),
    })),
  );
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  return (query: string, limit = 8): SearchEntry[] => {
    const q = normalize(query);
    if (!q) return [];
    let results = ms.search(q);
    if (results.length === 0) results = ms.search(q, { combineWith: "OR" });
    // Una coincidencia exacta con el nombre o un alias va siempre primero.
    const exact = (slug: string) => {
      const e = bySlug.get(slug);
      if (!e) return false;
      return [e.nameEs, e.nameEn, ...e.aliases].some((n) => normalize(n) === q);
    };
    results = [...results].sort((a, b) => Number(exact(String(b.id))) - Number(exact(String(a.id))));
    return results
      .slice(0, limit)
      .map((r) => bySlug.get(String(r.id)))
      .filter((e): e is SearchEntry => Boolean(e));
  };
}
