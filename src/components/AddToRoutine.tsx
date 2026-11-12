"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { routines, useRoutines, type Routine } from "@/lib/routines";
import { ExerciseImage } from "./ExerciseImage";
import { CheckIcon, PlusIcon } from "./icons";

type Exercise = { slug: string; name: string; image: string | null };

/** Botón "Agregar a mi rutina" y el panel para elegir rutinas, series y repeticiones. */
export function AddToRoutine({ exercise }: { exercise: Exercise }) {
  const list = useRoutines();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Routine[] | null>(null);
  const inCount = list?.filter((r) => r.items.some((i) => i.slug === exercise.slug)).length ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          setSaved(null);
          setOpen(true);
        }}
        className="press flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-accent text-base font-bold text-accent-ink md:w-auto md:self-start md:px-6"
      >
        {inCount > 0 ? <CheckIcon size={20} /> : <PlusIcon size={20} />}
        {inCount > 0 ? `En ${inCount === 1 ? "1 rutina" : `${inCount} rutinas`} · Editar` : "Agregar a mi rutina"}
      </button>
      {saved && saved.length > 0 && (
        <p role="status" className="reveal text-sm">
          Guardado en {saved.map((r) => r.name).join(", ")} ·{" "}
          <Link href={`/rutinas/${saved[0].id}`} className="font-semibold underline">
            Ver rutina
          </Link>
        </p>
      )}
      {open && list && (
        <Sheet
          exercise={exercise}
          list={list}
          onClose={() => setOpen(false)}
          onSaved={(r) => {
            setSaved(r);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Sheet({
  exercise,
  list,
  onClose,
  onSaved,
}: {
  exercise: Exercise;
  list: Routine[];
  onClose: () => void;
  onSaved: (r: Routine[]) => void;
}) {
  const existing = list.find((r) => r.items.some((i) => i.slug === exercise.slug));
  const current = existing?.items.find((i) => i.slug === exercise.slug);
  const [selected, setSelected] = useState<string[]>(() => {
    const has = list.filter((r) => r.items.some((i) => i.slug === exercise.slug)).map((r) => r.id);
    if (has.length) return has;
    return list.length === 1 ? [list[0].id] : [];
  });
  const [creating, setCreating] = useState(list.length === 0);
  const [newName, setNewName] = useState(list.length === 0 ? "Mi rutina" : "");
  const [sets, setSets] = useState(current?.sets ?? "");
  const [reps, setReps] = useState(current?.reps ?? "");
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("button, input")?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  function save() {
    const ids = [...selected];
    if (creating && newName.trim()) ids.push(routines.create(newName).id);
    const item = { slug: exercise.slug, name: exercise.name, image: exercise.image, sets: sets.trim() || undefined, reps: reps.trim() || undefined };
    for (const r of list) {
      const had = r.items.some((i) => i.slug === exercise.slug);
      if (ids.includes(r.id)) routines.upsertItem(r.id, item);
      else if (had) routines.removeItem(r.id, exercise.slug);
    }
    for (const id of ids) if (!list.some((r) => r.id === id)) routines.upsertItem(id, item);
    onSaved(routines.all().filter((r) => ids.includes(r.id)));
  }

  const target = selected.length + (creating && newName.trim() ? 1 : 0);
  const label =
    target === 0
      ? "Elegí una rutina"
      : target === 1
        ? `Guardar en ${creating && newName.trim() && selected.length === 0 ? newName.trim() : list.find((r) => r.id === selected[0])?.name ?? "la rutina"}`
        : `Guardar en ${target} rutinas`;
  const removingAll = target === 0 && list.some((r) => r.items.some((i) => i.slug === exercise.slug));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-labelledby="add-title">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="backdrop absolute inset-0 cursor-default bg-hero/50" />
      <div
        ref={panel}
        className="sheet relative flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-t-[26px] bg-surface px-5 pb-7 pt-2.5 shadow-[0_-12px_40px_rgba(21,23,43,0.2)] md:max-w-[440px] md:rounded-[26px] md:pt-5"
      >
        <span aria-hidden="true" className="h-[5px] w-10 self-center rounded-full bg-line md:hidden" />
        <div className="flex items-center gap-3">
          <span className="relative h-12 w-12 flex-none overflow-hidden rounded-xl">
            <ExerciseImage src={exercise.image} alt="" sizes="48px" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted">Agregar a una rutina</span>
            <h2 id="add-title" className="font-display text-xl font-bold tracking-[-0.02em]">
              {exercise.name}
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {list.map((r) => {
            const on = selected.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(r.id)}
                className={`press flex min-h-14 items-center gap-3 rounded-[14px] px-3.5 text-left ${on ? "bg-soft" : "bg-bg"}`}
              >
                <span
                  className={`inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg ${
                    on ? "bg-accent text-accent-ink" : "border-2 border-line"
                  }`}
                >
                  {on && <CheckIcon size={16} />}
                </span>
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="text-[15px] font-semibold">{r.name}</span>
                  <span className="text-xs text-muted">
                    {r.items.length === 1 ? "1 ejercicio" : `${r.items.length} ejercicios`}
                  </span>
                </span>
              </button>
            );
          })}
          {creating ? (
            <div className="flex flex-col gap-1.5 rounded-[14px] bg-soft p-3">
              <label htmlFor="new-routine" className="text-xs font-semibold text-muted">
                Nombre de la rutina nueva
              </label>
              <input
                id="new-routine"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Por ejemplo: Tirón, Piernas, Lunes"
                maxLength={40}
                className="h-11 rounded-xl bg-surface px-3 text-[15px] font-semibold outline-none ring-accent focus:ring-2"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="press flex min-h-[52px] items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-line px-3.5 text-[15px] font-semibold hover:border-accent"
            >
              <PlusIcon size={20} />
              Nueva rutina
            </button>
          )}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-semibold text-muted">Cuánto vas a hacer (opcional)</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 rounded-[14px] bg-bg px-3 py-2.5 ring-accent focus-within:ring-2">
              <span className="text-xs text-muted">Series</span>
              <input
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                inputMode="numeric"
                placeholder="4"
                maxLength={8}
                className="bg-transparent font-display text-xl font-bold tabular-nums outline-none placeholder:text-muted/60"
              />
            </label>
            <label className="flex flex-col gap-1 rounded-[14px] bg-bg px-3 py-2.5 ring-accent focus-within:ring-2">
              <span className="text-xs text-muted">Repeticiones</span>
              <input
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="10-12"
                maxLength={16}
                className="bg-transparent font-display text-xl font-bold tabular-nums outline-none placeholder:text-muted/60"
              />
            </label>
          </div>
        </fieldset>

        <button
          type="button"
          onClick={save}
          disabled={target === 0 && !removingAll}
          className="press flex h-[52px] items-center justify-center rounded-2xl bg-accent text-base font-bold text-accent-ink disabled:opacity-50"
        >
          {removingAll ? "Quitar de mis rutinas" : label}
        </button>
      </div>
    </div>
  );
}
