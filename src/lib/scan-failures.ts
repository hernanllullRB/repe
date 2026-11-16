import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { inArray, lt } from "drizzle-orm";
import { getDb } from "../db/client";
import { scanFailures } from "../db/schema";
import { int } from "./config";
import { tryConsume } from "./limits";

/**
 * Guarda las fotos de rutinas que no se leyeron bien, junto con lo que devolvió
 * la IA, para ver qué estructuras no entendemos y mejorar el prompt.
 *
 * Dónde va la imagen:
 * - SCAN_FAILURES_BLOB_TOKEN (token de un store de Vercel Blob PRIVADO): ahí.
 *   El store de las imágenes de ejercicios es público, por eso va aparte.
 * - En tu computadora: .data/scan-failures/
 * - En Vercel sin ese token: no se guarda la imagen, solo el registro.
 *
 * Todo se borra a los SCAN_FAILURES_RETENTION_DAYS días (30 por defecto).
 * Es "best effort": si algo falla se registra en consola y nunca rompe la respuesta.
 */

export type ScanFailureReason = "ai_error" | "empty" | "unmatched" | "reported" | "format";

export const FAILURES_DIR = path.join(process.cwd(), ".data", "scan-failures");
/** Fotos guardadas por usuario por día, para que nadie llene el almacenamiento. */
const PER_USER_DAILY = 5;
const MAX_STORED_BYTES = 10 * 1024 * 1024;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

/**
 * Credenciales del store PRIVADO de Vercel Blob, o null si no hay.
 * - En Vercel, conectado con el prefijo "SCAN_FAILURES": OIDC + SCAN_FAILURES_STORE_ID.
 * - Con un token fijo (también fuera de Vercel): SCAN_FAILURES_BLOB_TOKEN
 *   (o SCAN_FAILURES_READ_WRITE_TOKEN, el nombre que crea Vercel con ese prefijo).
 * Nunca usa BLOB_STORE_ID / BLOB_READ_WRITE_TOKEN: esas son del store público.
 */
export function scanFailuresBlobAuth(): { storeId: string } | { token: string } | null {
  const storeId = process.env.SCAN_FAILURES_STORE_ID;
  if (storeId && process.env.VERCEL_OIDC_TOKEN) return { storeId };
  const token = process.env.SCAN_FAILURES_BLOB_TOKEN || process.env.SCAN_FAILURES_READ_WRITE_TOKEN;
  return token ? { token } : null;
}

function retentionDays(): number {
  return int("SCAN_FAILURES_RETENTION_DAYS", 30);
}

async function storeImage(id: string, data: Uint8Array, mediaType: string): Promise<string | null> {
  if (data.byteLength === 0 || data.byteLength > MAX_STORED_BYTES) return null;
  const ext = EXT[mediaType] ?? "bin";
  const name = `${new Date().toISOString().slice(0, 10)}/${id}.${ext}`;

  const auth = scanFailuresBlobAuth();
  if (auth) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`scan-failures/${name}`, Buffer.from(data), {
      access: "private",
      ...auth,
      contentType: mediaType || "application/octet-stream",
    });
    return blob.url;
  }
  if (process.env.VERCEL) return null; // Sin store privado no se guarda la imagen en producción.

  const target = path.join(FAILURES_DIR, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  return path.relative(process.cwd(), target);
}

async function removeImage(storagePath: string): Promise<void> {
  if (storagePath.startsWith("https://")) {
    const auth = scanFailuresBlobAuth();
    if (!auth) return;
    const { del } = await import("@vercel/blob");
    await del(storagePath, auth);
    return;
  }
  const full = path.resolve(process.cwd(), storagePath);
  if (!full.startsWith(FAILURES_DIR)) return;
  await unlink(full).catch(() => undefined);
}

/** Borra los registros (y sus imágenes) más viejos que la retención. */
export async function purgeOldScanFailures(): Promise<number> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - retentionDays() * 24 * 60 * 60 * 1000);
  const old = await db
    .select({ id: scanFailures.id, storagePath: scanFailures.storagePath })
    .from(scanFailures)
    .where(lt(scanFailures.createdAt, cutoff))
    .limit(100);
  for (const row of old) {
    if (row.storagePath) await removeImage(row.storagePath).catch((e) => console.error("[scan-failures] borrar:", e));
  }
  if (old.length) await db.delete(scanFailures).where(inArray(scanFailures.id, old.map((r) => r.id)));
  return old.length;
}

export interface ScanFailureInput {
  userId: string | null;
  reason: ScanFailureReason;
  image: Uint8Array;
  mediaType: string;
  fileName?: string | null;
  detail?: string | null;
  result?: unknown;
}

export async function saveScanFailure(input: ScanFailureInput): Promise<boolean> {
  try {
    if (input.userId && !(await tryConsume(`scan_fail:${input.userId}`, PER_USER_DAILY))) return false;
    const id = randomUUID();
    let storagePath: string | null = null;
    try {
      storagePath = await storeImage(id, input.image, input.mediaType);
    } catch (error) {
      console.error("[scan-failures] no se pudo guardar la imagen:", error);
    }
    const db = await getDb();
    const insert = db.insert(scanFailures).values({
      id,
      userId: input.userId,
      reason: input.reason,
      mediaType: input.mediaType || null,
      fileName: input.fileName?.slice(0, 200) || null,
      bytes: input.image.byteLength,
      detail: input.detail?.slice(0, 2000) || null,
      result: input.result ?? null,
      storagePath,
    });
    try {
      await insert;
    } catch (error) {
      // Sin registro, la imagen quedaría huérfana (nadie la borraría).
      if (storagePath) await removeImage(storagePath).catch(() => undefined);
      throw error;
    }
    await purgeOldScanFailures();
    return true;
  } catch (error) {
    console.error("[scan-failures] no se pudo registrar:", error);
    return false;
  }
}

/**
 * Lectura floja: con 3 o más ejercicios, la mitad o más quedaron sin
 * coincidencia o con una dudosa. Suele pasar con estructuras que no entendemos.
 */
export function looksUnmatched(days: { exercises: { match: unknown; confident: boolean }[] }[]): boolean {
  const all = days.flatMap((d) => d.exercises);
  if (all.length < 3) return false;
  const weak = all.filter((e) => !e.match || !e.confident).length;
  return weak / all.length >= 0.5;
}
