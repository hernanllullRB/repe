"use client";

import Link from "next/link";
import { useRoutines } from "@/lib/routines";
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

/** Tarjeta para seguir con la rutina de hoy (la que tiene ejercicios tildados, o la última usada). */
export function ResumeRoutine() {
  const list = useRoutines();
  if (!list) return null;
  const withItems = list.filter((r) => r.items.length > 0);
  if (withItems.length === 0) return null;
  const inProgress = withItems.filter((r) => r.done.length > 0 && r.done.length < r.items.length);
  const r = (inProgress.length ? inProgress : withItems).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const done = r.done.filter((s) => r.items.some((i) => i.slug === s)).length;
  const started = done > 0;

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
            : r.items.length === 1
              ? "1 ejercicio"
              : `${r.items.length} ejercicios`}
        </span>
      </span>
      <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-accent text-accent-ink">
        <ChevronRight />
      </span>
    </Link>
  );
}
