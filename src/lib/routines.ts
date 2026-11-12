"use client";

import { useSyncExternalStore } from "react";

/**
 * Rutinas guardadas en este dispositivo (localStorage), sin cuenta.
 * Cada ejercicio guarda una copia de su nombre e imagen para mostrarse sin
 * consultar al servidor.
 */
export interface RoutineItem {
  slug: string;
  name: string;
  image: string | null;
  sets?: string;
  reps?: string;
}

export interface Routine {
  id: string;
  name: string;
  items: RoutineItem[];
  /** Ejercicios tildados hoy. */
  done: string[];
  /** Día (AAAA-MM-DD) al que corresponden los tildes. */
  doneDay: string | null;
  updatedAt: number;
}

const KEY = "repe:rutinas:v1";
let cache: Routine[] | null = null;
const listeners = new Set<() => void>();

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function read(): Routine[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Routine[]) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  // Los tildes son del día: al día siguiente arrancan de cero.
  const t = today();
  cache = cache.map((r) => (r.doneDay && r.doneDay !== t ? { ...r, done: [], doneDay: null } : r));
  return cache;
}

function write(next: Routine[]): void {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Sin espacio o almacenamiento bloqueado: queda en memoria hasta recargar.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Lista de rutinas. En el servidor (y en el primer render) devuelve null: todavía no se leyó. */
export function useRoutines(): Routine[] | null {
  return useSyncExternalStore(
    subscribe,
    () => read(),
    () => null,
  );
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

function update(id: string, fn: (r: Routine) => Routine): void {
  write(read().map((r) => (r.id === id ? { ...fn(r), updatedAt: Date.now() } : r)));
}

export const routines = {
  all(): Routine[] {
    return read();
  },
  create(name: string): Routine {
    const r: Routine = { id: newId(), name: name.trim() || "Mi rutina", items: [], done: [], doneDay: null, updatedAt: Date.now() };
    write([...read(), r]);
    return r;
  },
  rename(id: string, name: string) {
    update(id, (r) => ({ ...r, name: name.trim() || r.name }));
  },
  remove(id: string) {
    write(read().filter((r) => r.id !== id));
  },
  /** Agrega o actualiza un ejercicio en una rutina. */
  upsertItem(id: string, item: RoutineItem) {
    update(id, (r) => {
      const exists = r.items.some((i) => i.slug === item.slug);
      return {
        ...r,
        items: exists ? r.items.map((i) => (i.slug === item.slug ? { ...i, ...item } : i)) : [...r.items, item],
      };
    });
  },
  removeItem(id: string, slug: string) {
    update(id, (r) => ({ ...r, items: r.items.filter((i) => i.slug !== slug), done: r.done.filter((s) => s !== slug) }));
  },
  moveItem(id: string, from: number, to: number) {
    update(id, (r) => {
      if (to < 0 || to >= r.items.length) return r;
      const items = [...r.items];
      const [it] = items.splice(from, 1);
      items.splice(to, 0, it);
      return { ...r, items };
    });
  },
  toggleDone(id: string, slug: string) {
    update(id, (r) => {
      const done = r.done.includes(slug) ? r.done.filter((s) => s !== slug) : [...r.done, slug];
      return { ...r, done, doneDay: today() };
    });
  },
  resetDone(id: string) {
    update(id, (r) => ({ ...r, done: [], doneDay: null }));
  },
};

/** "4 × 10-12", "4 series", "10-12 rep." o null. */
export function doseLabel(item: Pick<RoutineItem, "sets" | "reps">): string | null {
  const sets = item.sets?.trim();
  const reps = item.reps?.trim();
  if (sets && reps) return `${sets} × ${reps}`;
  if (sets) return `${sets} series`;
  if (reps) return `${reps} rep.`;
  return null;
}

