import { and, eq, inArray, lt, or, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { exercises, type Exercise } from "../db/schema";
import { aiConfigured, generateExerciseContent, modelLabel } from "./ai";
import { config } from "./config";
import { tryConsume } from "./limits";
import { exerciseContentSchema } from "./schemas";
import { findDemoVideo, youtubeConfigured } from "./youtube";

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_GENERATING_MS = 2 * 60 * 1000;

export function needsContent(ex: Exercise): boolean {
  return ex.contentStatus !== "ready" || !exerciseContentSchema.safeParse(ex.content).success;
}

/** Orden de resolución del video: manual > guardado > búsqueda (con cuota) > sin video. */
export function needsVideoSearch(ex: Exercise, now = Date.now()): boolean {
  if (ex.youtubeSource === "manual") return false;
  if (ex.youtubeVideoId) return false;
  if (!ex.youtubeCheckedAt) return true;
  return now - ex.youtubeCheckedAt.getTime() > DAY_MS;
}

async function getById(id: string): Promise<Exercise | undefined> {
  const db = await getDb();
  const rows = await db.select().from(exercises).where(eq(exercises.id, id));
  return rows[0];
}

/** Toma el trabajo de generar la ficha. Devuelve false si otro pedido ya lo tiene. */
async function claimContent(id: string): Promise<boolean> {
  const db = await getDb();
  const staleBefore = new Date(Date.now() - STALE_GENERATING_MS);
  const rows = await db
    .update(exercises)
    .set({ contentStatus: "generating", updatedAt: new Date() })
    .where(
      and(
        eq(exercises.id, id),
        or(
          inArray(exercises.contentStatus, ["pending", "failed"]),
          and(eq(exercises.contentStatus, "generating"), lt(exercises.updatedAt, staleBefore)),
        ),
      ),
    )
    .returning({ id: exercises.id });
  return rows.length > 0;
}

export type EnrichOutcome = "ready" | "failed" | "generating" | "unavailable" | "limit";

async function enrichContent(ex: Exercise): Promise<EnrichOutcome> {
  if (!needsContent(ex)) return "ready";
  if (!aiConfigured()) return "unavailable";
  if (!(await claimContent(ex.id))) {
    // Otro pedido lo está generando: esperamos un poco y releemos.
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const current = await getById(ex.id);
      if (current?.contentStatus === "ready") return "ready";
      if (current?.contentStatus === "failed") return "failed";
    }
    return "generating";
  }
  const db = await getDb();
  if (!(await tryConsume("llm", config.llmDailyCap))) {
    await db.update(exercises).set({ contentStatus: "pending", updatedAt: new Date() }).where(eq(exercises.id, ex.id));
    return "limit";
  }
  try {
    const content = await generateExerciseContent({
      nameEs: ex.nameEs,
      nameEn: ex.nameEn,
      equipment: ex.equipment,
      primaryMuscles: ex.primaryMuscles,
      secondaryMuscles: ex.secondaryMuscles,
      instructionsEn: ex.instructionsEn,
    });
    await db
      .update(exercises)
      .set({
        content,
        contentStatus: "ready",
        contentModel: modelLabel(),
        contentGeneratedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(exercises.id, ex.id));
    return "ready";
  } catch (error) {
    console.error(`[enrich] falló la ficha de ${ex.slug}:`, error);
    await db.update(exercises).set({ contentStatus: "failed", updatedAt: new Date() }).where(eq(exercises.id, ex.id));
    return "failed";
  }
}

async function enrichVideo(ex: Exercise): Promise<void> {
  if (!needsVideoSearch(ex) || !youtubeConfigured()) return;
  if (!(await tryConsume("youtube", config.youtubeDailyCap))) return;
  const db = await getDb();
  try {
    const video = await findDemoVideo(ex.nameEn);
    // Releemos para no pisar un video manual cargado mientras tanto.
    await db
      .update(exercises)
      .set({
        youtubeVideoId: video?.videoId ?? null,
        youtubeTitle: video?.title ?? null,
        youtubeChannel: video?.channel ?? null,
        youtubeSeconds: video?.seconds ?? null,
        youtubeSource: video ? "search" : null,
        youtubeCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(exercises.id, ex.id), sql`${exercises.youtubeSource} is distinct from 'manual'`));
  } catch (error) {
    console.error(`[enrich] falló la búsqueda de video de ${ex.slug}:`, error);
    await db.update(exercises).set({ youtubeCheckedAt: new Date() }).where(eq(exercises.id, ex.id));
  }
}

/** Completa la ficha y el video que falten. Cada cosa se hace una sola vez y se guarda. */
export async function ensureEnriched(
  ex: Exercise,
  opts: { content?: boolean; video?: boolean } = {},
): Promise<{ outcome: EnrichOutcome; exercise: Exercise }> {
  const { content = true, video = true } = opts;
  const [outcome] = await Promise.all([
    content ? enrichContent(ex) : Promise.resolve<EnrichOutcome>(needsContent(ex) ? "unavailable" : "ready"),
    video ? enrichVideo(ex) : Promise.resolve(),
  ]);
  const exercise = (await getById(ex.id)) ?? ex;
  return { outcome, exercise };
}
