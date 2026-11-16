"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { routines, useSession, type RoutineItem } from "@/lib/routines";
import { GoogleLoginButton } from "./Account";
import { ExerciseImage } from "./ExerciseImage";
import { CameraIcon, ChevronLeft, WarnIcon } from "./icons";

interface Option {
  slug: string;
  name: string;
  image: string | null;
}

interface ScannedExercise {
  name: string;
  nameEs: string;
  sets: string | null;
  reps: string | null;
  notes: string | null;
  match: Option | null;
  confident: boolean;
  candidates: Option[];
}

interface ScannedDay {
  label: string;
  exercises: ScannedExercise[];
}

const NEW = "__new";
const SKIP = "__skip";

interface RowState {
  choice: string;
  sets: string;
  reps: string;
}

/** Achica la foto antes de subirla (las del celular pesan varios MB). Si no se puede, va la original. */
async function prepareImage(file: File): Promise<{ blob: Blob; name: string }> {
  const converted = await toJpeg(file);
  return converted ? { blob: converted, name: "rutina.jpg" } : { blob: file, name: file.name || "rutina" };
}

async function toJpeg(file: File): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.88));
  } catch {
    return null;
  }
}

const KEPT_NOTE = " Guardamos la imagen para revisar por qué no la pudimos leer.";

function initialRows(day: ScannedDay): RowState[] {
  return day.exercises.map((ex) => ({
    choice: ex.match ? ex.match.slug : NEW,
    sets: ex.sets ?? "",
    reps: ex.reps ?? "",
  }));
}

/** Primer día con título (la captura puede empezar a mitad de otro día). */
function defaultDay(days: ScannedDay[]): number {
  const i = days.findIndex((d) => d.label !== "(sin título)");
  return i === -1 ? 0 : i;
}

export function ImportRoutine() {
  const session = useSession();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "review" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [days, setDays] = useState<ScannedDay[]>([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [rows, setRows] = useState<RowState[]>([]);
  const [name, setName] = useState("");
  /** Última imagen enviada, para poder reportar una lectura equivocada. */
  const sent = useRef<{ blob: Blob; name: string } | null>(null);
  const [report, setReport] = useState<"closed" | "open" | "sending" | "sent">("closed");
  const [comment, setComment] = useState("");

  function reset() {
    sent.current = null;
    setReport("closed");
    setComment("");
    setStatus("idle");
    setError(null);
    setDays([]);
    setDayIndex(0);
    setRows([]);
    setName("");
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    if (input.current) input.current.value = "";
  }

  // Con cacheComponents, Next oculta la página al navegar (<Activity>) en vez de
  // desmontarla y al volver restaura el estado. Cada visita tiene que arrancar de cero.
  useLayoutEffect(() => reset, []);

  const back = (
    <Link
      href="/rutinas"
      aria-label="Volver a mis rutinas"
      className="press inline-flex h-11 w-11 items-center justify-center rounded-full bg-chip hover:bg-soft"
    >
      <ChevronLeft />
    </Link>
  );

  function pickDay(i: number, list = days) {
    setDayIndex(i);
    setRows(initialRows(list[i]));
    setName(list[i].label === "(sin título)" ? "Rutina importada" : list[i].label);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setStatus("reading");
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    setReport("closed");
    setComment("");
    try {
      const prepared = await prepareImage(file);
      sent.current = prepared;
      const form = new FormData();
      form.append("image", prepared.blob, prepared.name);
      const res = await fetch("/api/routines/scan", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { days?: ScannedDay[]; error?: string; kept?: boolean };
      const note = data.kept ? KEPT_NOTE : "";
      if (!res.ok || !data.days) throw new Error((data.error ?? "No pudimos leer la imagen. Probá de nuevo.") + note);
      if (data.days.length === 0) throw new Error("No encontramos ejercicios en la imagen." + note);
      setDays(data.days);
      pickDay(defaultDay(data.days), data.days);
      setStatus("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos leer la imagen.");
      setStatus("idle");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  async function sendReport() {
    if (!sent.current) return;
    setReport("sending");
    try {
      const form = new FormData();
      form.append("image", sent.current.blob, sent.current.name);
      form.append("result", JSON.stringify(days));
      form.append("comment", comment);
      const res = await fetch("/api/routines/scan/report", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No pudimos mandar el aviso.");
      setReport("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos mandar el aviso.");
      setReport("open");
    }
  }

  async function save() {
    const day = days[dayIndex];
    setError(null);
    setStatus("saving");
    try {
      const items: RoutineItem[] = [];
      for (const [i, row] of rows.entries()) {
        if (row.choice === SKIP) continue;
        const ex = day.exercises[i];
        let opt: Option | undefined;
        if (row.choice === NEW) {
          // Ejercicio que no está en el catálogo: se crea la ficha (como desde el buscador).
          const res = await fetch("/api/exercises/resolve", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ query: (ex.nameEs || ex.name).slice(0, 80) }),
          });
          const data = (await res.json().catch(() => ({}))) as { slug?: string; error?: string };
          if (!res.ok || !data.slug) throw new Error(`«${ex.name}»: ${data.error ?? "no se pudo crear la ficha."}`);
          opt = { slug: data.slug, name: ex.nameEs || ex.name, image: null };
        } else {
          opt = ex.candidates.find((c) => c.slug === row.choice);
        }
        if (!opt || items.some((it) => it.slug === opt.slug)) continue;
        items.push({
          slug: opt.slug,
          name: opt.name,
          image: opt.image,
          sets: row.sets.trim() || undefined,
          reps: row.reps.trim() || undefined,
        });
      }
      if (items.length === 0) throw new Error("Elegí al menos un ejercicio.");
      const r = routines.create(name, items);
      reset();
      router.push(`/rutinas/${r.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la rutina.");
      setStatus("review");
    }
  }

  if (session.status === "loading") {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Cargando">
        {back}
        <div className="h-10 w-2/3 animate-pulse rounded-lg bg-chip" />
      </div>
    );
  }

  const title = (
    <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">
      Importar desde una foto
    </h1>
  );

  if (session.status === "anonymous") {
    return (
      <div className="flex flex-col gap-5">
        {back}
        {title}
        <p className="text-[15px] leading-normal text-muted">
          Para importar una rutina desde una foto o captura necesitás entrar con tu cuenta de Google. Así la rutina
          queda guardada en tu cuenta.
        </p>
        {session.loginEnabled ? (
          <GoogleLoginButton next="/rutinas/importar" />
        ) : (
          <p className="text-sm text-muted">El inicio de sesión no está disponible por ahora.</p>
        )}
      </div>
    );
  }

  const day = days[dayIndex];
  const chosen = rows.filter((r) => r.choice !== SKIP).length;

  return (
    <div className="flex flex-col gap-5">
      {back}
      {title}

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Elegir foto de la rutina"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />

      {status !== "review" && status !== "saving" && (
        <>
          <p className="text-[15px] leading-normal text-muted">
            Subí una captura de pantalla o una foto de tu rutina. La leemos con IA, buscamos cada ejercicio en Repe y
            elegís qué día importar antes de guardarla.
          </p>
          <button
            type="button"
            disabled={status === "reading"}
            onClick={() => input.current?.click()}
            className="press flex h-[56px] items-center justify-center gap-2 rounded-2xl bg-accent text-base font-bold text-accent-ink disabled:opacity-60"
          >
            <CameraIcon />
            {status === "reading" ? "Leyendo la rutina…" : "Elegir foto o captura"}
          </button>
          <p className="text-xs leading-normal text-muted">
            Si no la podemos leer bien, guardamos la imagen en privado por 30 días para mejorar la lectura de rutinas.
          </p>
          {status === "reading" && preview && (
            <div className="flex items-center gap-3" role="status">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="h-24 w-16 animate-pulse rounded-lg object-cover object-top" />
              <span className="text-sm text-muted">Esto tarda unos segundos.</span>
            </div>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">
          {error}
        </p>
      )}

      {(status === "review" || status === "saving") && day && (
        <div className="flex flex-col gap-5">
          {days.length > 1 && (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-muted">¿Qué día querés importar?</span>
              <div className="flex flex-wrap gap-1.5" role="tablist">
                {days.map((d, i) => (
                  <button
                    key={`${d.label}-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={i === dayIndex}
                    onClick={() => pickDay(i)}
                    className={`press inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold ${
                      i === dayIndex ? "bg-ink text-bg" : "bg-chip hover:bg-soft"
                    }`}
                  >
                    {d.label} · {d.exercises.length}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">Nombre de la rutina</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="h-12 rounded-xl border border-line bg-surface px-3 text-[15px] font-semibold outline-none ring-accent focus:ring-2"
            />
          </label>

          <ul className="flex flex-col gap-2.5">
            {day.exercises.map((ex, i) => {
              const row = rows[i];
              if (!row) return null;
              const selected = ex.candidates.find((c) => c.slug === row.choice);
              const set = (patch: Partial<RowState>) =>
                setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
              const review = row.choice === NEW || (row.choice !== SKIP && !ex.confident && row.choice === ex.match?.slug);
              return (
                <li
                  key={i}
                  className={`flex flex-col gap-2.5 rounded-[18px] border border-line bg-surface p-3.5 ${
                    row.choice === SKIP ? "opacity-55" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="relative h-12 w-12 flex-none overflow-hidden rounded-xl">
                      <ExerciseImage src={selected?.image} alt="" sizes="48px" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-xs text-muted">En la foto: “{ex.name}”</span>
                      <select
                        value={row.choice}
                        onChange={(e) => set({ choice: e.target.value })}
                        aria-label={`Ejercicio para ${ex.name}`}
                        className="min-w-0 rounded-lg bg-transparent py-1 font-display text-[17px] font-bold tracking-[-0.01em] outline-none ring-accent focus:ring-2"
                      >
                        {ex.candidates.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                        <option value={NEW}>Crear ficha nueva: {ex.nameEs || ex.name}</option>
                        <option value={SKIP}>No agregar</option>
                      </select>
                      {review && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-warn-ink">
                          <WarnIcon size={14} />
                          {row.choice === NEW ? "No está en Repe: se crea la ficha al guardar" : "Revisá que sea el correcto"}
                        </span>
                      )}
                      {ex.notes && <span className="text-xs text-muted">{ex.notes}</span>}
                    </div>
                  </div>
                  {row.choice !== SKIP && (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-0.5 rounded-xl bg-bg px-3 py-2 ring-accent focus-within:ring-2">
                        <span className="text-[11px] text-muted">Series</span>
                        <input
                          value={row.sets}
                          onChange={(e) => set({ sets: e.target.value })}
                          inputMode="numeric"
                          maxLength={8}
                          className="bg-transparent font-display text-lg font-bold tabular-nums outline-none"
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 rounded-xl bg-bg px-3 py-2 ring-accent focus-within:ring-2">
                        <span className="text-[11px] text-muted">Repeticiones</span>
                        <input
                          value={row.reps}
                          onChange={(e) => set({ reps: e.target.value })}
                          maxLength={16}
                          className="bg-transparent font-display text-lg font-bold tabular-nums outline-none"
                        />
                      </label>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            disabled={status === "saving" || chosen === 0}
            onClick={() => void save()}
            className="press flex h-[56px] items-center justify-center rounded-2xl bg-accent text-base font-bold text-accent-ink disabled:opacity-60"
          >
            {status === "saving"
              ? "Creando rutina…"
              : `Crear rutina con ${chosen === 1 ? "1 ejercicio" : `${chosen} ejercicios`}`}
          </button>
          <button
            type="button"
            disabled={status === "saving"}
            onClick={() => input.current?.click()}
            className="press h-11 text-sm font-semibold text-muted hover:text-ink"
          >
            Probar con otra foto
          </button>

          {report === "closed" && (
            <button
              type="button"
              onClick={() => setReport("open")}
              className="press -mt-3 h-10 text-sm font-semibold text-muted underline hover:text-ink"
            >
              ¿La lectura salió mal? Avisanos
            </button>
          )}
          {(report === "open" || report === "sending") && (
            <div className="flex flex-col gap-2 rounded-[18px] bg-soft p-3.5">
              <label htmlFor="report-comment" className="text-[13px] font-semibold">
                ¿Qué leímos mal? (opcional)
              </label>
              <textarea
                id="report-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Por ejemplo: mezcló dos días, faltan ejercicios, las series están en otra columna…"
                className="rounded-xl bg-surface px-3 py-2 text-[15px] outline-none ring-accent focus:ring-2"
              />
              <p className="text-xs text-muted">Guardamos la foto y lo que leímos, en privado por 30 días.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={report === "sending"}
                  onClick={() => void sendReport()}
                  className="press h-11 flex-1 rounded-xl bg-ink text-sm font-bold text-bg disabled:opacity-60"
                >
                  {report === "sending" ? "Enviando…" : "Enviar aviso"}
                </button>
                <button
                  type="button"
                  onClick={() => setReport("closed")}
                  className="press h-11 rounded-xl px-4 text-sm font-semibold text-muted hover:text-ink"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {report === "sent" && (
            <p role="status" className="-mt-2 text-center text-sm text-muted">
              ¡Gracias! Guardamos la foto para mejorar la lectura de rutinas como esta.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
