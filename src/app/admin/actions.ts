"use server";

import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, checkToken, requireAdmin, sessionValue } from "@/lib/admin-auth";
import { exerciseTag, SEARCH_INDEX_TAG } from "@/lib/data";
import { ensureEnriched } from "@/lib/enrich";
import { findBySlug } from "@/lib/exercises";
import { isValidImageUrl, MAX_IMAGES, setImages } from "@/lib/images";
import { saveImage } from "@/lib/storage";
import { clearVideo, setManualVideo } from "@/lib/videos";
import { youtubeConfigured } from "@/lib/youtube";
import { toAdminRow, type AdminRow } from "./rows";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const token = String(form.get("token") ?? "");
  if (!checkToken(token)) return { error: "Token incorrecto." };
  (await cookies()).set(ADMIN_COOKIE, sessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}

export type ActionResult = { ok: true; row: AdminRow; message?: string } | { ok: false; error: string };

async function load(slug: string) {
  await requireAdmin();
  const ex = await findBySlug(slug);
  if (!ex) throw new Error("No existe el ejercicio");
  return ex;
}

/** Asigna un video elegido a mano (URL o ID de YouTube). */
export async function setVideoAction(slug: string, input: string): Promise<ActionResult> {
  const ex = await load(slug);
  const result = await setManualVideo(ex, input);
  if (!result.ok) return result;
  revalidateTag(exerciseTag(slug), { expire: 0 });
  return { ok: true, row: toAdminRow(result.exercise), message: result.warning ?? "Video guardado." };
}

/** Quita el video. La ficha vuelve a buscar una demo en la próxima visita. */
export async function clearVideoAction(slug: string): Promise<ActionResult> {
  const ex = await load(slug);
  const result = await clearVideo(ex);
  if (!result.ok) return result;
  revalidateTag(exerciseTag(slug), { expire: 0 });
  return { ok: true, row: toAdminRow(result.exercise), message: "Video quitado." };
}

/** Busca ahora una demo en YouTube (gasta ~101 unidades de cuota). */
export async function searchVideoAction(slug: string): Promise<ActionResult> {
  const ex = await load(slug);
  if (!youtubeConfigured()) return { ok: false, error: "Falta YOUTUBE_API_KEY en .env.local." };
  const cleared = await clearVideo(ex);
  if (!cleared.ok) return cleared;
  const { exercise } = await ensureEnriched(cleared.exercise, { content: false, video: true });
  revalidateTag(exerciseTag(slug), { expire: 0 });
  return {
    ok: true,
    row: toAdminRow(exercise),
    message: exercise.youtubeVideoId ? "Encontré una demo." : "No encontré una demo corta (o no queda cuota hoy).",
  };
}

function refreshImages(slug: string) {
  revalidateTag(exerciseTag(slug), { expire: 0 });
  revalidateTag(SEARCH_INDEX_TAG, { expire: 0 });
}

/** Reemplaza la lista de imágenes (quitar, reordenar, elegir principal). */
export async function setImagesAction(slug: string, images: string[]): Promise<ActionResult> {
  const ex = await load(slug);
  const row = await setImages(ex, images);
  refreshImages(slug);
  return { ok: true, row: toAdminRow(row), message: "Imágenes guardadas." };
}

/** Agrega una imagen por link. */
export async function addImageUrlAction(slug: string, url: string): Promise<ActionResult> {
  const ex = await load(slug);
  const clean = url.trim();
  if (!isValidImageUrl(clean)) return { ok: false, error: "Ese link no parece una imagen (tiene que empezar con https://)." };
  if (ex.images.length >= MAX_IMAGES) return { ok: false, error: `Máximo ${MAX_IMAGES} imágenes por ejercicio.` };
  const row = await setImages(ex, [...ex.images, clean]);
  refreshImages(slug);
  return { ok: true, row: toAdminRow(row), message: "Imagen agregada." };
}

/** Sube un archivo de imagen. */
export async function uploadImageAction(slug: string, form: FormData): Promise<ActionResult> {
  const ex = await load(slug);
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Elegí una imagen." };
  if (ex.images.length >= MAX_IMAGES) return { ok: false, error: `Máximo ${MAX_IMAGES} imágenes por ejercicio.` };
  try {
    const url = await saveImage(slug, file);
    const row = await setImages(ex, [...ex.images, url]);
    refreshImages(slug);
    return { ok: true, row: toAdminRow(row), message: "Imagen subida." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo subir la imagen." };
  }
}
