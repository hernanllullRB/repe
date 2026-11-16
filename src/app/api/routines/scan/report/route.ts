import { getSessionUser, sameOrigin, unauthorized } from "@/lib/auth";
import { saveScanFailure } from "@/lib/scan-failures";

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_RESULT_CHARS = 100_000;

/**
 * El usuario avisa que la lectura de su foto salió mal (días o ejercicios
 * equivocados). Se guarda la foto con lo que había leído la IA y su comentario.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origen inválido" }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File) || file.size > MAX_BYTES) {
    return Response.json({ error: "Falta la imagen." }, { status: 400 });
  }
  const comment = String(form?.get("comment") ?? "").trim().slice(0, 1000);
  const rawResult = String(form?.get("result") ?? "");
  let result: unknown = null;
  if (rawResult && rawResult.length <= MAX_RESULT_CHARS) {
    try {
      result = JSON.parse(rawResult);
    } catch {
      result = null;
    }
  }

  const saved = await saveScanFailure({
    userId: user.id,
    reason: "reported",
    image: new Uint8Array(await file.arrayBuffer()),
    mediaType: file.type,
    fileName: file.name,
    detail: comment || null,
    result,
  });
  if (!saved) return Response.json({ error: "Ya mandaste varios avisos hoy. ¡Gracias!" }, { status: 429 });
  return Response.json({ ok: true });
}
