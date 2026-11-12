"use client";

import type { SearchEntry } from "@/lib/exercises";

/** Índice del buscador: se descarga una vez por visita y lo comparten los componentes. */
let indexPromise: Promise<SearchEntry[]> | null = null;

export function loadIndex(): Promise<SearchEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch("/api/search-index")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<SearchEntry[]>;
      })
      .catch((e) => {
        indexPromise = null;
        throw e;
      });
  }
  return indexPromise;
}

export function resetIndex(): void {
  indexPromise = null;
}
