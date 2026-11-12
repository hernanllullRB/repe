import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { exercises, type Exercise } from "../db/schema";
import { writeOverride } from "./overrides-file";
import { getVideo, parseYouTubeId, youtubeConfigured } from "./youtube";

/** Operaciones sobre el video de un ejercicio. Las usan el panel /admin y los scripts. */

export type VideoResult = { ok: true; exercise: Exercise; warning?: string } | { ok: false; error: string };

async function reload(id: string): Promise<Exercise> {
  const db = await getDb();
  const [row] = await db.select().from(exercises).where(eq(exercises.id, id));
  return row;
}

/** Carga un video elegido a mano. Ese ejercicio nunca vuelve a buscar en YouTube. */
export async function setManualVideo(ex: Exercise, input: string): Promise<VideoResult> {
  const videoId = parseYouTubeId(input);
  if (!videoId) return { ok: false, error: "No reconozco un video de YouTube en ese link." };

  let title: string | null = null;
  let channel: string | null = null;
  let seconds: number | null = null;
  let warning: string | undefined;
  if (youtubeConfigured()) {
    const info = await getVideo(videoId); // 1 unidad de cuota
    if (!info) return { ok: false, error: "Ese video no existe o es privado." };
    if (!info.embeddable) return { ok: false, error: "Ese video no permite insertarse en otras páginas. Elegí otro." };
    title = info.title;
    channel = info.channel;
    seconds = info.seconds;
  } else {
    warning = "Sin YOUTUBE_API_KEY no pude validar el video; se guardó igual.";
  }

  const db = await getDb();
  await db
    .update(exercises)
    .set({
      youtubeVideoId: videoId,
      youtubeTitle: title,
      youtubeChannel: channel,
      youtubeSeconds: seconds,
      youtubeSource: "manual",
      youtubeCheckedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(exercises.id, ex.id));
  writeOverride(ex.sourceId ?? ex.slug, { youtubeVideoId: videoId });
  return { ok: true, exercise: await reload(ex.id), warning };
}

/**
 * Borra el video (manual o automático). La próxima visita a la ficha vuelve a
 * buscar una demo, si hay clave de YouTube y cuota.
 */
export async function clearVideo(ex: Exercise): Promise<VideoResult> {
  const db = await getDb();
  await db
    .update(exercises)
    .set({
      youtubeVideoId: null,
      youtubeTitle: null,
      youtubeChannel: null,
      youtubeSeconds: null,
      youtubeSource: null,
      youtubeCheckedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(exercises.id, ex.id));
  if (ex.youtubeSource === "manual") writeOverride(ex.sourceId ?? ex.slug, null, "youtubeVideoId");
  return { ok: true, exercise: await reload(ex.id) };
}
