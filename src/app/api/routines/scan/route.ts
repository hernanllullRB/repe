import { after } from "next/server";
import { aiConfigured, extractRoutineFromImage } from "@/lib/ai";
import { getSessionUser, sameOrigin, unauthorized } from "@/lib/auth";
import { config } from "@/lib/config";
import { getSearchIndex } from "@/lib/data";
import { tryConsume } from "@/lib/limits";
import { createMatcher } from "@/lib/routine-match";
import { looksUnmatched, saveScanFailure, type ScanFailureReason } from "@/lib/scan-failures";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Ejercicio del catálogo tal como lo necesita la pantalla de importación. */
function option(e: { slug: string; nameEs: string; image?: string | null }) {
  return { slug: e.slug, name: e.nameEs, image: e.image ?? null };
}

/**
 * Lee una rutina desde una foto o captura: la IA extrae días y ejercicios, y
 * cada ejercicio se busca en el catálogo. No guarda la rutina: el usuario
 * revisa y confirma en la pantalla de importación.
 * Si la lectura falla o sale floja, la foto se guarda (en privado, 30 días)
 * para revisar qué estructura de rutina no entendimos.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origen inválido" }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!aiConfigured()) return Response.json({ error: "La lectura de fotos no está disponible." }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return Response.json({ error: "Subí una imagen." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "La imagen pesa más de 4 MB." }, { status: 413 });
  const image = new Uint8Array(await file.arrayBuffer());

  // Se guarda después de responder, para no demorar al usuario.
  const keep = (reason: ScanFailureReason, detail: string | null, result?: unknown) =>
    after(() =>
      saveScanFailure({ userId: user.id, reason, image, mediaType: file.type, fileName: file.name, detail, result }).then(
        () => undefined,
      ),
    );

  if (!TYPES.includes(file.type)) {
    keep("format", `Tipo no aceptado: "${file.type || "(vacío)"}"`);
    return Response.json(
      { error: "La imagen tiene que ser JPG, PNG o WebP.", kept: true },
      { status: 415 },
    );
  }

  if (!(await tryConsume(`scan:${user.id}`, config.scanUserDailyCap))) {
    return Response.json({ error: "Llegaste al límite de fotos por hoy. Probá mañana." }, { status: 429 });
  }
  if (!(await tryConsume("llm", config.llmDailyCap))) {
    return Response.json({ error: "Hoy la IA está muy pedida. Probá más tarde." }, { status: 429 });
  }

  let scan: Awaited<ReturnType<typeof extractRoutineFromImage>>;
  try {
    scan = await extractRoutineFromImage(image, file.type);
  } catch (error) {
    console.error("[scan] falló la IA:", error);
    keep("ai_error", error instanceof Error ? error.message : String(error));
    return Response.json({ error: "No pudimos leer la imagen. Probá de nuevo.", kept: true }, { status: 502 });
  }

  const match = createMatcher(await getSearchIndex());
  const days = scan.days
    .filter((d) => d.exercises.length > 0)
    .map((d) => ({
      label: d.label.trim() || "(sin título)",
      exercises: d.exercises.map((ex) => {
        const m = match(ex);
        return {
          name: ex.name.trim(),
          nameEs: ex.nameEs.trim(),
          nameEn: ex.nameEn.trim(),
          sets: ex.sets?.trim() || null,
          reps: ex.reps?.trim() || null,
          notes: ex.notes?.trim() || null,
          match: m.best ? option(m.best) : null,
          confident: m.confident,
          candidates: m.candidates.map(option),
        };
      }),
    }));

  if (days.length === 0) {
    keep("empty", null, scan);
    return Response.json({ days, kept: true });
  }
  if (looksUnmatched(days)) keep("unmatched", null, days);
  return Response.json({ days });
}
