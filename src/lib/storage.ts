import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Guarda imágenes subidas desde el panel.
 * - Con BLOB_READ_WRITE_TOKEN (Vercel Blob): las sube ahí y devuelve su URL pública.
 * - Sin token (tu computadora): las guarda en .data/uploads y se sirven por /api/uploads/...
 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
export const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

export function imageExtension(type: string): string | null {
  return TYPES[type] ?? null;
}

export async function saveImage(slug: string, file: File): Promise<string> {
  const ext = imageExtension(file.type);
  if (!ext) throw new Error("Formato no soportado. Usá JPG, PNG, WebP, GIF o AVIF.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("La imagen pesa más de 4 MB.");
  const name = `${slug}/${randomUUID()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`ejercicios/${name}`, file, { access: "public", contentType: file.type });
    return blob.url;
  }

  const target = path.join(UPLOAD_DIR, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return `/api/uploads/${name}`;
}

/** Lee una imagen local subida. Devuelve null si no existe o la ruta es inválida. */
export async function readLocalImage(parts: string[]): Promise<{ data: Buffer; type: string } | null> {
  const rel = parts.join("/");
  if (!/^[a-z0-9-]+\/[a-f0-9-]+\.(jpg|png|webp|gif|avif)$/i.test(rel)) return null;
  const ext = rel.split(".").pop()!.toLowerCase();
  const type = Object.entries(TYPES).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
  try {
    return { data: await readFile(path.join(UPLOAD_DIR, rel)), type };
  } catch {
    return null;
  }
}
