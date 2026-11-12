"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ExerciseView } from "@/lib/exercises";
import type { ExerciseContent } from "@/lib/schemas";
import { AddToRoutine } from "./AddToRoutine";
import { Pill } from "./Chrome";
import { ExerciseImage } from "./ExerciseImage";
import { CheckIcon, ChevronLeft } from "./icons";
import { SearchSheet } from "./SearchSheet";
import { VideoBlock } from "./VideoBlock";

type Phase = "idle" | "loading" | "failed" | "unavailable" | "limit";

/**
 * Ficha completa (diseño B). Se renderiza en el servidor con los datos
 * cacheados; si falta la ficha o el video, los pide una sola vez y se
 * actualiza sola.
 */
export function ExerciseDetail({ initial }: { initial: ExerciseView }) {
  const [view, setView] = useState(initial);
  const [phase, setPhase] = useState<Phase>(initial.needsEnrich ? "loading" : "idle");
  const [arrived, setArrived] = useState(false);
  const started = useRef(false);

  async function enrich(retry = false) {
    setPhase("loading");
    try {
      const res = await fetch(`/api/exercises/${encodeURIComponent(view.slug)}/enrich`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ retry }),
      });
      const data = (await res.json()) as { outcome: string; exercise?: ExerciseView };
      if (data.exercise) {
        if (!view.content && data.exercise.content) setArrived(true);
        setView(data.exercise);
      }
      if (data.outcome === "ready") setPhase("idle");
      else if (data.outcome === "limit") setPhase("limit");
      else if (data.outcome === "unavailable") setPhase("unavailable");
      else setPhase("failed");
    } catch {
      setPhase("failed");
    }
  }

  useEffect(() => {
    if (initial.needsEnrich && !started.current) {
      started.current = true;
      void enrich();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const c = view.content;
  const aliases = view.aliases.filter((a) => a.toLowerCase() !== view.nameEs.toLowerCase()).slice(0, 3);
  const reveal = arrived ? "reveal" : "";

  return (
    <div className="mx-auto w-full max-w-[1180px] md:flex md:items-start md:gap-10 md:px-[5%] md:pb-16 md:pt-6">
      <div className="min-w-0 md:flex-[999_1_560px]">
        {/* Video: de borde a borde en el celular, redondeado en escritorio. */}
        <div className="relative">
          <VideoBlock
            name={view.nameEs}
            nameEn={view.nameEn}
            video={view.video}
            images={view.images}
            loading={phase === "loading"}
            className="md:rounded-3xl"
            playSize="lg"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-3.5 md:hidden">
            <Link
              href="/"
              aria-label="Volver al inicio"
              className="press pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md hover:bg-white/25"
            >
              <ChevronLeft />
            </Link>
            <div className="pointer-events-auto">
              <SearchSheet />
            </div>
          </div>
        </div>

        <section className="relative -mt-5 flex flex-col gap-2.5 rounded-t-3xl bg-bg px-5 pb-5 pt-[22px] md:mt-6 md:gap-3 md:rounded-none md:px-0 md:pt-0">
          <div className="flex flex-wrap gap-1.5">
            {view.primaryMuscles.map((m) => (
              <Pill key={m} accent>
                {m}
              </Pill>
            ))}
            {view.equipment && <Pill>{view.equipment}</Pill>}
            {view.level && <Pill>{view.level}</Pill>}
          </div>
          <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[52px] md:leading-none md:tracking-[-0.035em]">
            {view.nameEs}
          </h1>
          {aliases.length > 0 && <p className="text-[13px] text-muted">También: {aliases.join(" · ")}</p>}
          <Gallery name={view.nameEs} images={view.images} fromCatalog={!view.imagesEdited} />
          {c?.summary && (
            <p className={`max-w-[65ch] text-[15px] leading-[1.55] text-muted md:text-[17px] ${reveal}`}>{c.summary}</p>
          )}
          <AddToRoutine exercise={{ slug: view.slug, name: view.nameEs, image: view.images[0] ?? null }} />
        </section>

        <div className="flex flex-col gap-8 px-5 pb-10 pt-6 md:gap-10 md:px-0 md:pb-0 md:pt-4">
          {c ? (
            <>
              <section id="musculos" className={`flex flex-col gap-3.5 md:hidden ${reveal}`} aria-labelledby="h-musculos">
                <SectionTitle id="h-musculos">Qué trabaja</SectionTitle>
                <Muscles content={c} />
              </section>

              <section id="tecnica" className={`flex flex-col gap-3.5 md:gap-4 ${reveal}`} aria-labelledby="h-tecnica">
                <SectionTitle id="h-tecnica">Cómo hacerlo</SectionTitle>
                <Steps steps={c.steps} />
                <div className="md:hidden">
                  <BeforeYouStart tips={c.tips} />
                </div>
              </section>

              <section id="errores" className={`flex flex-col gap-3.5 md:gap-4 ${reveal}`} aria-labelledby="h-errores">
                <SectionTitle id="h-errores">Errores comunes</SectionTitle>
                <Mistakes content={c} />
              </section>

              <p className="max-w-[65ch] text-sm leading-normal text-muted md:hidden">{c.safetyNote}</p>
            </>
          ) : (
            <>
              <Pending phase={phase} onRetry={() => void enrich(true)} />
              {phase !== "loading" && <OriginalInstructions steps={view.instructionsEn} />}
            </>
          )}
        </div>
      </div>

      {c && (
        <aside className={`sticky top-6 hidden min-w-0 flex-[1_1_320px] flex-col gap-4 md:flex ${reveal}`}>
          <section className="flex flex-col gap-4 rounded-[22px] border border-line bg-surface p-5" aria-labelledby="h-musculos-d">
            <SectionTitle id="h-musculos-d" small>
              Qué trabaja
            </SectionTitle>
            <Muscles content={c} />
          </section>
          <BeforeYouStart tips={c.tips} />
          <p className="px-1 text-[13px] leading-normal text-muted">{c.safetyNote}</p>
        </aside>
      )}
    </div>
  );
}

/** Fotos del ejercicio: se entiende el movimiento sin abrir el video. */
function Gallery({ name, images, fromCatalog }: { name: string; images: string[]; fromCatalog: boolean }) {
  if (images.length === 0) return null;
  const shown = images.slice(0, 4);
  const startEnd = fromCatalog && shown.length === 2;
  const caption = (i: number) => (startEnd ? (i === 0 ? "1 · Inicio" : "2 · Final") : `${i + 1}`);
  const alt = (i: number) =>
    startEnd ? `${name}: ${i === 0 ? "posición inicial" : "posición final"}` : `${name}: foto ${i + 1}`;
  return (
    <div className={`grid max-w-[640px] gap-2 ${shown.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {shown.map((src, i) => (
        <figure key={src} className="m-0 flex flex-col gap-1.5">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[14px] bg-chip">
            <ExerciseImage src={src} alt={alt(i)} sizes="(min-width: 768px) 320px, 50vw" priority={i < 2} />
          </div>
          {shown.length > 1 && <figcaption className="text-xs font-semibold text-muted">{caption(i)}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

function SectionTitle({ children, id, small = false }: { children: React.ReactNode; id: string; small?: boolean }) {
  return (
    <h2
      id={id}
      className={`font-display font-bold tracking-[-0.02em] ${small ? "text-[22px]" : "text-[22px] md:text-2xl"}`}
    >
      {children}
    </h2>
  );
}

function Muscles({ content }: { content: ExerciseContent }) {
  const muscles = [...content.musclesWorked.muscles].sort(
    (a, b) =>
      Number(b.role === "principal") - Number(a.role === "principal") || (b.intensity ?? 0) - (a.intensity ?? 0),
  );
  return (
    <>
      <p className="max-w-[65ch] text-[15px] leading-[1.55]">{content.musclesWorked.overview}</p>
      <ul className="flex flex-col gap-4 md:gap-4 max-md:rounded-[18px] max-md:border max-md:border-line max-md:bg-surface max-md:p-4">
        {muscles.map((m) => {
          const pct = m.intensity ? m.intensity * 20 : m.role === "principal" ? 100 : 45;
          return (
            <li key={m.name} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[15px] font-semibold md:text-base">{m.name}</h3>
                <span className="flex-none text-xs font-semibold text-muted">
                  {m.role === "principal" ? "Principal" : "Secundario"}
                </span>
              </div>
              <div
                className="h-2 rounded-full bg-chip"
                role="meter"
                aria-label={`Participación de ${m.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
              >
                <div
                  className={`h-2 origin-left rounded-full ${m.role === "principal" ? "bg-accent" : "bg-muted"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-sm leading-normal text-muted">
                <span className="font-semibold text-ink">{m.technicalName}.</span> {m.explanation}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col md:grid md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:gap-3">
      {steps.map((s, i) => (
        <li
          key={i}
          className="flex gap-3.5 md:flex-col md:gap-2.5 md:rounded-[18px] md:border md:border-line md:bg-surface md:p-4"
        >
          <div className="flex flex-col items-center md:items-start">
            <span className="inline-flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-accent text-sm font-bold tabular-nums text-accent-ink">
              {i + 1}
            </span>
            {i < steps.length - 1 && <span aria-hidden="true" className="w-0.5 flex-1 bg-line md:hidden" />}
          </div>
          <p className={`pt-1 text-[15px] leading-normal md:pt-0 ${i < steps.length - 1 ? "mb-[18px] md:mb-0" : ""}`}>{s}</p>
        </li>
      ))}
    </ol>
  );
}

function BeforeYouStart({ tips }: { tips: string[] }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[18px] bg-soft p-4 md:rounded-[22px] md:p-5">
      <h3 className="text-[15px] font-bold md:text-base">Antes de empezar</h3>
      <ul className="flex flex-col gap-2 text-sm leading-normal">
        {tips.map((t, i) => (
          <li key={i} className="flex gap-2">
            <CheckIcon size={16} className="mt-[3px] flex-none" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Mistakes({ content }: { content: ExerciseContent }) {
  return (
    <div className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
      {content.commonMistakes.map((m, i) => (
        <article key={i} className="flex flex-col overflow-hidden rounded-[18px] border border-line bg-surface">
          <h3 className="px-4 pb-2.5 pt-3.5 text-base font-semibold leading-snug">{m.mistake}</h3>
          <div className="flex gap-2.5 bg-bad-soft px-4 py-2.5">
            <span className="w-[62px] flex-none whitespace-nowrap pt-px text-xs font-bold tracking-wide text-bad">POR QUÉ</span>
            <p className="text-sm leading-normal">{m.why}</p>
          </div>
          <div className="flex flex-1 gap-2.5 bg-good-soft px-4 pb-3.5 pt-2.5">
            <span className="w-[62px] flex-none whitespace-nowrap pt-px text-xs font-bold tracking-wide text-good">HACÉ</span>
            <p className="text-sm leading-normal">{m.fix}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function Pending({ phase, onRetry }: { phase: Phase; onRetry: () => void }) {
  if (phase === "loading") {
    return (
      <div className="flex flex-col gap-3" role="status" aria-label="Preparando la ficha">
        <p className="text-[15px] text-muted">Estamos preparando la ficha de este ejercicio. Tarda unos segundos, una sola vez.</p>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-[18px] bg-chip" />
        ))}
      </div>
    );
  }
  const text =
    phase === "limit"
      ? "Hoy ya preparamos muchas fichas nuevas. Volvé a intentarlo mañana."
      : phase === "failed"
        ? "No pudimos preparar la ficha de este ejercicio."
        : "La ficha completa de este ejercicio todavía no está disponible.";
  return (
    <div className="flex flex-col items-start gap-3 rounded-[18px] border border-line bg-surface p-4">
      <p className="text-[15px] leading-normal">{text}</p>
      {phase === "failed" && (
        <button
          type="button"
          onClick={onRetry}
          className="press inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

function OriginalInstructions({ steps }: { steps: string[] }) {
  if (!steps.length) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="h-original">
      <SectionTitle id="h-original">Instrucciones originales</SectionTitle>
      <p className="text-sm text-muted">Mientras tanto, estas son las instrucciones de la fuente original, en inglés.</p>
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-[15px] leading-normal marker:font-semibold marker:text-muted" lang="en">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </section>
  );
}
