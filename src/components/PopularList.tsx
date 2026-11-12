"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExerciseImage } from "./ExerciseImage";
import { ChevronRight } from "./icons";
import { loadIndex } from "./search-index";

type Item = { slug: string; name: string; muscles: string };

/** "Los más buscados" con la foto de cada ejercicio (sale del índice del buscador). */
export function PopularList({ items }: { items: Item[] }) {
  const [images, setImages] = useState<Record<string, string | null> | null>(null);

  useEffect(() => {
    loadIndex()
      .then((idx) => {
        const bySlug = new Map(idx.map((e) => [e.slug, e.image ?? null]));
        setImages(Object.fromEntries(items.map((i) => [i.slug, bySlug.get(i.slug) ?? null])));
      })
      .catch(() => setImages({}));
  }, [items]);

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-surface">
      {items.map((p) => (
        <li key={p.slug}>
          <Link
            href={`/ejercicio/${p.slug}`}
            className="group flex min-h-[72px] items-center gap-3 py-2.5 pl-2.5 pr-4 transition-colors duration-150 hover:bg-soft/60"
          >
            <span className="relative h-[52px] w-[52px] flex-none overflow-hidden rounded-xl bg-chip">
              {images ? (
                <ExerciseImage src={images[p.slug]} alt="" sizes="52px" />
              ) : (
                <span className="block h-full w-full animate-pulse bg-chip" />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold">{p.name}</span>
              <span className="text-xs text-muted">{p.muscles}</span>
            </span>
            <ChevronRight className="flex-none text-muted transition-transform duration-150 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
