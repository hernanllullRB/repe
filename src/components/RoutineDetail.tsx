"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { doseLabel, routines, useRoutines } from "@/lib/routines";
import { ExerciseImage } from "./ExerciseImage";
import { ArrowDown, ArrowUp, CheckIcon, ChevronLeft, PlusIcon } from "./icons";

export function RoutineDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const list = useRoutines();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const back = (
    <Link
      href="/rutinas"
      aria-label="Volver a mis rutinas"
      className="press inline-flex h-11 w-11 items-center justify-center rounded-full bg-chip hover:bg-soft"
    >
      <ChevronLeft />
    </Link>
  );

  if (!list) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Cargando rutina">
        {back}
        <div className="h-10 w-1/2 animate-pulse rounded-lg bg-chip" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[86px] animate-pulse rounded-[18px] bg-chip" />
        ))}
      </div>
    );
  }

  const r = list.find((x) => x.id === id);
  if (!r) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <h1 className="font-display text-3xl font-bold tracking-[-0.03em]">No encontramos esta rutina</h1>
        <p className="text-muted">Las rutinas se guardan en el dispositivo donde las creaste.</p>
      </div>
    );
  }

  const done = r.done.filter((s) => r.items.some((i) => i.slug === s)).length;
  const complete = r.items.length > 0 && done === r.items.length;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        {back}
        {r.items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setEditing((e) => !e);
              setConfirmDelete(false);
            }}
            className={`press inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold ${
              editing ? "bg-ink text-bg" : "text-muted hover:text-ink"
            }`}
          >
            {editing ? "Listo" : "Editar"}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {editing ? (
          <>
            <label htmlFor="routine-title" className="text-xs font-semibold text-muted">
              Nombre
            </label>
            <input
              id="routine-title"
              defaultValue={r.name}
              maxLength={40}
              onBlur={(e) => routines.rename(r.id, e.target.value)}
              className="h-12 rounded-xl border border-line bg-surface px-3 font-display text-2xl font-bold tracking-[-0.02em] outline-none ring-accent focus:ring-2"
            />
          </>
        ) : (
          <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">{r.name}</h1>
        )}
        {r.items.length > 0 && !editing && (
          <p className="text-[15px] text-muted" aria-live="polite">
            <span className="font-bold tabular-nums text-ink">
              {done} de {r.items.length}
            </span>{" "}
            hechos hoy
          </p>
        )}
      </div>

      {complete && !editing && (
        <div className="reveal flex items-center gap-3 rounded-[18px] bg-good-soft p-4">
          <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-good text-surface">
            <CheckIcon size={20} />
          </span>
          <p className="text-[15px] font-semibold">¡Rutina completa! Buen entrenamiento.</p>
        </div>
      )}

      {r.items.length === 0 ? (
        <div className="flex flex-col gap-2 rounded-[18px] border border-line bg-surface p-5">
          <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Esta rutina está vacía</h2>
          <p className="text-[15px] leading-normal text-muted">
            Buscá un ejercicio y tocá “Agregar a mi rutina” en su ficha.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {r.items.map((it, i) => {
            const isDone = r.done.includes(it.slug);
            const dose = doseLabel(it);
            return (
              <li
                key={it.slug}
                className={`flex items-center gap-3 rounded-[18px] border border-line bg-surface py-2.5 pl-2.5 pr-3 transition-opacity duration-200 ${
                  isDone && !editing ? "opacity-70" : ""
                }`}
              >
                <Link href={`/ejercicio/${it.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="relative h-16 w-16 flex-none overflow-hidden rounded-[14px]">
                    <ExerciseImage src={it.image} alt="" sizes="64px" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className={`text-base font-semibold ${isDone && !editing ? "line-through decoration-2" : ""}`}>
                      {it.name}
                    </span>
                    {dose && <span className="text-sm font-semibold tabular-nums text-muted">{dose}</span>}
                  </span>
                </Link>
                {editing ? (
                  <div className="flex flex-none items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Subir ${it.name}`}
                      disabled={i === 0}
                      onClick={() => routines.moveItem(r.id, i, i - 1)}
                      className="press inline-flex h-10 w-10 items-center justify-center rounded-xl bg-chip disabled:opacity-30"
                    >
                      <ArrowUp />
                    </button>
                    <button
                      type="button"
                      aria-label={`Bajar ${it.name}`}
                      disabled={i === r.items.length - 1}
                      onClick={() => routines.moveItem(r.id, i, i + 1)}
                      className="press inline-flex h-10 w-10 items-center justify-center rounded-xl bg-chip disabled:opacity-30"
                    >
                      <ArrowDown />
                    </button>
                    <button
                      type="button"
                      aria-label={`Quitar ${it.name}`}
                      onClick={() => routines.removeItem(r.id, it.slug)}
                      className="press inline-flex h-10 w-10 items-center justify-center rounded-xl bg-bad-soft text-lg font-bold text-bad"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-pressed={isDone}
                    aria-label={isDone ? `${it.name}: hecho` : `Marcar ${it.name} como hecho`}
                    onClick={() => routines.toggleDone(r.id, it.slug)}
                    className={`press inline-flex h-11 w-11 flex-none items-center justify-center rounded-full transition-colors duration-150 ${
                      isDone ? "bg-good text-surface" : "border-2 border-line hover:border-good"
                    }`}
                  >
                    {isDone && <CheckIcon size={20} />}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editing ? (
        <div className="flex flex-col items-center gap-2 pt-2">
          {confirmDelete ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm">¿Borrar “{r.name}”? No se puede deshacer.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="press h-10 rounded-full bg-chip px-4 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    routines.remove(r.id);
                    router.push("/rutinas");
                  }}
                  className="press h-10 rounded-full bg-bad px-4 text-sm font-semibold text-surface"
                >
                  Borrar rutina
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm font-semibold text-bad underline">
              Borrar rutina
            </button>
          )}
        </div>
      ) : (
        <>
          <Link
            href="/"
            className="press flex h-[52px] items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-line text-[15px] font-semibold hover:border-accent"
          >
            <PlusIcon />
            Agregar ejercicio
          </Link>
          {done > 0 && (
            <button
              type="button"
              onClick={() => routines.resetDone(r.id)}
              className="self-center text-sm font-semibold text-muted underline hover:text-ink"
            >
              Empezar de nuevo
            </button>
          )}
        </>
      )}
    </div>
  );
}
