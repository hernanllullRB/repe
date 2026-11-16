"use client";

import Link from "next/link";
import { suggestRoutine, useRoutines } from "@/lib/routines";
import { ChevronRight, ListIcon } from "./icons";
import { RoutineThumbs } from "./RoutineThumbs";

export function RoutinesButton() {
  return (
    <Link
      href="/rutinas"
      className="press inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold hover:bg-soft"
    >
      <ListIcon />
      Mis rutinas
    </Link>
  );
}

/** Tarjeta con la rutina sugerida para hoy: la que está a medias, la siguiente a la última completada o la primera. */
export function ResumeRoutine() {
  const list = useRoutines();
  if (!list) return null;
  const suggestion = suggestRoutine(list);
  if (!suggestion) return null;
  const r = suggestion.routine;
  const done = r.done.filter((s) => r.items.some((i) => i.slug === s)).length;
  const started = suggestion.reason === "in-progress";

  return (
    <Link
      href={`/rutinas/${r.id}`}
      className="press reveal flex items-center gap-3 rounded-[18px] bg-ink px-3.5 py-3 text-bg"
    >
      <RoutineThumbs items={r.items} size={36} ring="ring-ink" />
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="truncate text-[15px] font-bold">
          {started ? `Seguir con ${r.name}` : `Empezar ${r.name}`}
        </span>
        <span className="text-xs opacity-75">
          {started
            ? `${done} de ${r.items.length} ejercicios hechos`
            : `${suggestion.reason === "next" ? "Te toca hoy · " : ""}${
                r.items.length === 1 ? "1 ejercicio" : `${r.items.length} ejercicios`
              }`}
        </span>
      </span>
      <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-accent text-accent-ink">
        <ChevronRight />
      </span>
    </Link>
  );
}
