"use client";

import { useSyncExternalStore } from "react";

/**
 * Rutinas del usuario.
 * - Con sesión iniciada (Google) se guardan en la base: la lista se carga de
 *   /api/routines y cada cambio se aplica al instante en pantalla y se manda
 *   al servidor en segundo plano, en orden.
 * - Sin sesión siguen en este dispositivo (localStorage). Al iniciar sesión,
 *   esas rutinas se suben a la cuenta y se borran del navegador.
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
  /** Última vez (ms) que se tildaron todos sus ejercicios. */
  lastCompletedAt?: number | null;
  updatedAt: number;
}

export interface SessionInfo {
  status: "loading" | "anonymous" | "user";
  loginEnabled: boolean;
  user: { name: string | null; email: string; picture: string | null } | null;
}

const KEY = "repe:rutinas:v1";

interface State {
  session: SessionInfo;
  list: Routine[] | null;
  /** Hay cambios que no se pudieron guardar en el servidor (se reintenta). */
  syncError: boolean;
}

let state: State = {
  session: { status: "loading", loginEnabled: false, user: null },
  list: null,
  syncError: false,
};
let started = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Los tildes son del día: al día siguiente arrancan de cero. */
function freshDone(list: Routine[]): Routine[] {
  const t = today();
  return list.map((r) => (r.doneDay && r.doneDay !== t ? { ...r, done: [], doneDay: null } : r));
}

const remote = () => state.session.status === "user";

// ---------------------------------------------------------------------------
// Almacenamiento local (sin cuenta)

function readLocal(): Routine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Routine[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(list: Routine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Sin espacio o almacenamiento bloqueado: queda en memoria hasta recargar.
  }
}

function clearLocal() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada
  }
}

// ---------------------------------------------------------------------------
// Sincronización con el servidor: una cola por rutina, en orden.

type Op = "put" | "delete";
const pending = new Map<string, Op>();
let flushing = false;
let retries = 0;

/** Lo que se manda al servidor, recortado a los límites que valida la API. */
function payload(r: Routine) {
  const clip = (v: string | undefined, n: number) => (v ? v.slice(0, n) : undefined);
  const items = r.items.slice(0, 60).map((i) => ({
    slug: i.slug.slice(0, 120),
    name: (i.name || i.slug).slice(0, 120),
    image: i.image && i.image.length <= 500 ? i.image : null,
    sets: clip(i.sets, 20),
    reps: clip(i.reps, 30),
  }));
  return {
    name: r.name.trim().slice(0, 60) || "Mi rutina",
    items,
    done: r.done.filter((s) => items.some((i) => i.slug === s)),
    doneDay: r.doneDay && /^\d{4}-\d{2}-\d{2}$/.test(r.doneDay) ? r.doneDay : null,
    lastCompletedAt: r.lastCompletedAt ?? null,
  };
}

function body(r: Routine) {
  return JSON.stringify(payload(r));
}

async function send(id: string, op: Op): Promise<void> {
  const url = `/api/routines/${encodeURIComponent(id)}`;
  if (op === "delete") {
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new Error(`DELETE ${res.status}`);
    return;
  }
  const r = state.list?.find((x) => x.id === id);
  if (!r) return; // Se borró antes de llegar a mandarse.
  const res = await fetch(url, { method: "PUT", headers: { "content-type": "application/json" }, body: body(r) });
  if (res.status === 401) {
    // La sesión venció: volvemos a preguntar quién es el usuario.
    started = false;
    void start();
    throw new Error("Sesión vencida");
  }
  if (!res.ok) throw new Error(`PUT ${res.status}`);
}

async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    while (pending.size > 0) {
      const [id, op] = pending.entries().next().value as [string, Op];
      pending.delete(id);
      try {
        await send(id, op);
        retries = 0;
        if (state.syncError) setState({ syncError: false });
      } catch (error) {
        console.error("[rutinas] no se pudo guardar:", error);
        if (!pending.has(id)) pending.set(id, op);
        retries++;
        setState({ syncError: true });
        if (retries <= 6) setTimeout(() => void flush(), Math.min(30_000, 1000 * 2 ** retries));
        return;
      }
    }
  } finally {
    flushing = false;
  }
}

function schedule(id: string, op: Op) {
  // Un borrado reemplaza cualquier guardado pendiente de la misma rutina.
  pending.delete(id);
  pending.set(id, op);
  void flush();
}

// ---------------------------------------------------------------------------
// Arranque: quién es el usuario y de dónde salen las rutinas

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`${input}: ${res.status}`);
  return (await res.json()) as T;
}

async function start(): Promise<void> {
  if (started) return;
  started = true;
  let me: { loginEnabled: boolean; user: SessionInfo["user"] };
  try {
    me = await fetchJson("/api/auth/me");
  } catch {
    me = { loginEnabled: false, user: null };
  }

  if (!me.user) {
    setState({
      session: { status: "anonymous", loginEnabled: me.loginEnabled, user: null },
      list: freshDone(readLocal()),
    });
    return;
  }

  const session: SessionInfo = { status: "user", loginEnabled: true, user: me.user };
  try {
    const local = readLocal().filter((r) => r && typeof r.id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(r.id));
    let data: { routines: Routine[] } | null = null;
    if (local.length) {
      try {
        data = await fetchJson<{ routines: Routine[] }>("/api/routines/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ routines: local.slice(0, 50).map((r) => ({ id: r.id, ...payload(r) })) }),
        });
        clearLocal();
      } catch (error) {
        // Quedan en el navegador y se vuelve a intentar en la próxima visita.
        console.error("[rutinas] no se pudieron subir las rutinas del dispositivo:", error);
      }
    }
    data ??= await fetchJson<{ routines: Routine[] }>("/api/routines");
    setState({ session, list: freshDone(data.routines) });
  } catch (error) {
    console.error("[rutinas] no se pudieron cargar:", error);
    setState({ session, list: [], syncError: true });
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void start();
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY && !remote()) setState({ list: freshDone(readLocal()) });
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Lista de rutinas. En el servidor (y mientras carga) devuelve null. */
export function useRoutines(): Routine[] | null {
  return useSyncExternalStore(
    subscribe,
    () => state.list,
    () => null,
  );
}

const SERVER_SESSION: SessionInfo = { status: "loading", loginEnabled: false, user: null };

/** Estado del login. */
export function useSession(): SessionInfo {
  return useSyncExternalStore(
    subscribe,
    () => state.session,
    () => SERVER_SESSION,
  );
}

/** true si hay cambios que todavía no se pudieron guardar en la cuenta. */
export function useSyncError(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.syncError,
    () => false,
  );
}

export function loginUrl(next?: string): string {
  const path = next ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/rutinas");
  return `/api/auth/google?next=${encodeURIComponent(path)}`;
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  // Lo pendiente de la cuenta ya no se puede guardar; se vuelve a las rutinas del dispositivo.
  pending.clear();
  setState({
    session: { status: "anonymous", loginEnabled: true, user: null },
    list: freshDone(readLocal()),
    syncError: false,
  });
}

// ---------------------------------------------------------------------------
// Operaciones

function all(): Routine[] {
  return state.list ?? [];
}

function commit(next: Routine[], changed: string[], op: Op = "put") {
  setState({ list: next });
  if (remote()) changed.forEach((id) => schedule(id, op));
  else writeLocal(next);
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replaceAll("-", "").slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
}

function update(id: string, fn: (r: Routine) => Routine): void {
  commit(
    all().map((r) => (r.id === id ? { ...fn(r), updatedAt: Date.now() } : r)),
    [id],
  );
}

export const routines = {
  all,
  create(name: string, items: RoutineItem[] = []): Routine {
    const r: Routine = {
      id: newId(),
      name: name.trim().slice(0, 60) || "Mi rutina",
      items,
      done: [],
      doneDay: null,
      updatedAt: Date.now(),
    };
    commit([...all(), r], [r.id]);
    return r;
  },
  rename(id: string, name: string) {
    update(id, (r) => ({ ...r, name: name.trim().slice(0, 60) || r.name }));
  },
  remove(id: string) {
    commit(
      all().filter((r) => r.id !== id),
      [id],
      "delete",
    );
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
      // Al tildar el último ejercicio, la rutina queda completada.
      const complete = r.items.length > 0 && r.items.every((i) => done.includes(i.slug));
      return { ...r, done, doneDay: today(), lastCompletedAt: complete ? Date.now() : r.lastCompletedAt };
    });
  },
  resetDone(id: string) {
    update(id, (r) => ({ ...r, done: [], doneDay: null }));
  },
  /** Semana nueva: borra tildes y completadas de todas las rutinas (la sugerencia vuelve a la primera). */
  resetAllProgress() {
    const now = Date.now();
    const changed = all().filter((r) => r.done.length > 0 || r.doneDay || r.lastCompletedAt);
    if (changed.length === 0) return;
    const ids = new Set(changed.map((r) => r.id));
    commit(
      all().map((r) => (ids.has(r.id) ? { ...r, done: [], doneDay: null, lastCompletedAt: null, updatedAt: now } : r)),
      [...ids],
    );
  },
};

/**
 * Rutina para sugerir en el inicio:
 * 1. Una a medias hoy (con algo tildado, sin terminar): para seguirla.
 * 2. La siguiente (en el orden de la lista) a la última completada; después de la última, la primera.
 * 3. Si nunca se completó ninguna, la primera.
 * Solo cuentan las rutinas con ejercicios.
 */
export function suggestRoutine(list: Routine[]): { routine: Routine; reason: "in-progress" | "next" | "first" } | null {
  const withItems = list.filter((r) => r.items.length > 0);
  if (withItems.length === 0) return null;
  const doneCount = (r: Routine) => r.done.filter((s) => r.items.some((i) => i.slug === s)).length;

  const inProgress = withItems
    .filter((r) => doneCount(r) > 0 && doneCount(r) < r.items.length)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (inProgress) return { routine: inProgress, reason: "in-progress" };

  let last = -1;
  withItems.forEach((r, i) => {
    if (r.lastCompletedAt && (last === -1 || r.lastCompletedAt > (withItems[last].lastCompletedAt ?? 0))) last = i;
  });
  if (last === -1) return { routine: withItems[0], reason: "first" };
  return { routine: withItems[(last + 1) % withItems.length], reason: "next" };
}

/** "4 × 10-12", "4 series", "10-12 rep." o null. */
export function doseLabel(item: Pick<RoutineItem, "sets" | "reps">): string | null {
  const sets = item.sets?.trim();
  const reps = item.reps?.trim();
  if (sets && reps) return `${sets} × ${reps}`;
  if (sets) return `${sets} series`;
  if (reps) return `${reps} rep.`;
  return null;
}
