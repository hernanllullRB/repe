"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { SearchEntry } from "@/lib/exercises";
import { buildSearch } from "@/lib/search";
import { ExerciseImage } from "./ExerciseImage";
import { loadIndex, resetIndex } from "./search-index";
import { ChevronRight, SearchIcon } from "./icons";

type Props = { variant?: "hero" | "compact"; autoFocus?: boolean };

export function SearchBox({ variant = "hero", autoFocus = false }: Props) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const ensureIndex = useCallback(() => {
    if (entries) return;
    loadIndex()
      .then(setEntries)
      .catch(() => setMessage("No se pudo cargar el buscador. Recargá la página."));
  }, [entries]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (autoFocus) ensureIndex();
  }, [autoFocus, ensureIndex]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const search = useMemo(() => (entries ? buildSearch(entries) : null), [entries]);
  const results = useMemo(() => (search ? search(debounced) : []), [search, debounced]);
  const trimmed = debounced.trim();
  const showCreate = Boolean(search && trimmed.length >= 3 && results.length === 0);
  const showList = open && trimmed.length > 0 && (results.length > 0 || showCreate);

  const go = (slug: string) => {
    setOpen(false);
    router.push(`/ejercicio/${slug}`);
  };

  async function create() {
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/exercises/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = (await res.json()) as { slug?: string; error?: string };
      if (res.ok && data.slug) {
        resetIndex();
        go(data.slug);
      } else {
        setMessage(data.error ?? "No se pudo crear la ficha.");
      }
    } catch {
      setMessage("No se pudo crear la ficha. Probá de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const now = search ? search(query) : [];
      const pick = now[active] ?? now[0];
      if (pick) go(pick.slug);
      else if (query.trim().length >= 3 && search) void create();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const hero = variant === "hero";

  return (
    <div ref={boxRef} className="relative flex flex-col gap-2">
      <label htmlFor={`${id}-input`} className={hero ? "px-0.5 text-[13px] font-semibold text-muted" : "sr-only"}>
        Buscar ejercicio
      </label>
      <div
        className={
          hero
            ? "flex h-[52px] items-center gap-2.5 rounded-[14px] bg-bg px-3.5 ring-accent transition-shadow duration-150 focus-within:ring-2 md:h-14"
            : "flex h-11 items-center gap-2 rounded-[14px] border border-line bg-surface px-3.5 ring-accent transition-shadow duration-150 focus-within:ring-2"
        }
      >
        <SearchIcon size={hero ? 20 : 18} className="flex-none text-muted" />
        <input
          id={`${id}-input`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={hero ? "Press Arnold, sentadilla…" : "Buscar otro ejercicio"}
          value={query}
          onFocus={() => {
            ensureIndex();
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
            setMessage(null);
          }}
          onKeyDown={onKeyDown}
          className={`min-w-0 flex-1 border-0 bg-transparent text-ink outline-none focus-visible:outline-none placeholder:text-muted ${
            hero ? "text-base font-medium md:text-[17px]" : "text-[15px]"
          }`}
        />
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Sugerencias"
          className="pop absolute left-0 right-0 top-full z-30 mt-2 flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto rounded-[18px] border border-line bg-surface p-1.5 shadow-[0_16px_40px_rgba(27,31,59,0.14)]"
        >
          {results.map((r, i) => (
            <li
              key={r.slug}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(r.slug)}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-[14px] p-2 ${
                i === active ? "bg-soft" : ""
              }`}
            >
              <span className="relative h-12 w-12 flex-none overflow-hidden rounded-[10px]">
                <ExerciseImage src={r.image} alt="" sizes="48px" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={`text-base ${i === active ? "font-semibold" : "font-medium"}`}>{r.nameEs}</span>
                {r.muscles.length > 0 && <span className="text-[13px] text-muted">{r.muscles.join(" · ")}</span>}
              </span>
              {i === active && <ChevronRight className="flex-none text-muted" />}
            </li>
          ))}
          {showCreate && (
            <li role="option" aria-selected={false} className="px-3 py-2">
              <p className="mb-2 text-sm text-muted">No encontramos «{trimmed}».</p>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void create()}
                disabled={creating}
                className="press inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60"
              >
                {creating ? "Creando la ficha…" : `Crear la ficha de «${trimmed}»`}
              </button>
            </li>
          )}
        </ul>
      )}
      {message && (
        <p role="status" className="text-sm text-bad">
          {message}
        </p>
      )}
    </div>
  );
}
