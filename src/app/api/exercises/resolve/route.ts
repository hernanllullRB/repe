import { revalidateTag } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { exercises } from "@/db/schema";
import { aiConfigured, classifyQuery } from "@/lib/ai";
import { config } from "@/lib/config";
import { exerciseTag, SEARCH_INDEX_TAG } from "@/lib/data";
import { findBySlug } from "@/lib/exercises";
import { getUsage, hashIp, incrementUsage } from "@/lib/limits";
import { normalize, slugify } from "@/lib/normalize";
import { EQUIPMENT_VALUES, LEVEL_VALUES, MUSCLE_VALUES } from "@/lib/taxonomy";

const bodySchema = z.object({ query: z.string().trim().min(3).max(80) });

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

/** Alta bajo demanda de un ejercicio que no está en el catálogo. */
export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Escribí al menos 3 letras." }, { status: 400 });
  const query = body.data.query;
  const db = await getDb();

  // 1. ¿Ya existe con ese nombre o alias?
  const norm = normalize(query);
  const direct = await findBySlug(slugify(query));
  if (direct) return Response.json({ slug: direct.slug });
  const all = await db.select({ slug: exercises.slug, aliases: exercises.aliases, nameEn: exercises.nameEn }).from(exercises);
  const match = all.find((e) => normalize(e.nameEn) === norm || e.aliases.some((a) => normalize(a) === norm));
  if (match) return Response.json({ slug: match.slug });

  if (!aiConfigured()) {
    return Response.json({ error: "Por ahora no podemos crear fichas nuevas." }, { status: 503 });
  }

  // 2. Topes: por IP y global, por día.
  const ipKey = `new_exercise:${hashIp(clientIp(request))}`;
  if ((await getUsage(ipKey)) >= config.newExerciseIpCap) {
    return Response.json({ error: "Llegaste al límite de fichas nuevas por hoy. Probá mañana." }, { status: 429 });
  }
  if ((await getUsage("new_exercise")) >= config.newExerciseDailyCap) {
    return Response.json({ error: "Hoy ya se crearon muchas fichas nuevas. Probá mañana." }, { status: 429 });
  }
  await incrementUsage(ipKey);
  await incrementUsage("new_exercise");

  // 3. La IA decide si es un ejercicio real y lo clasifica.
  let info: Awaited<ReturnType<typeof classifyQuery>>;
  try {
    info = await classifyQuery(query);
  } catch (error) {
    console.error("[resolve] falló la IA:", error);
    return Response.json({ error: "No pudimos crear la ficha. Probá de nuevo." }, { status: 502 });
  }
  if (!info.isExercise || !info.nameEs.trim()) {
    return Response.json({ error: `«${query}» no parece un ejercicio. Revisá cómo lo escribiste.` }, { status: 422 });
  }

  // 4. Si el nombre canónico ya existe, sumamos la búsqueda como alias.
  const slug = slugify(info.nameEs);
  const existing = await findBySlug(slug);
  if (existing) {
    if (!existing.aliases.some((a) => normalize(a) === norm)) {
      await db
        .update(exercises)
        .set({ aliases: sql`array_append(${exercises.aliases}, ${query})`, updatedAt: new Date() })
        .where(eq(exercises.id, existing.id));
      revalidateTag(SEARCH_INDEX_TAG, { expire: 0 });
    }
    return Response.json({ slug: existing.slug });
  }

  // 5. Ejercicio nuevo: se guarda y la ficha se completa en la primera visita.
  const keep = (list: string[], allowed: string[]) => list.filter((m) => allowed.includes(m));
  await db.insert(exercises).values({
    slug,
    source: "ai",
    nameEs: info.nameEs.trim(),
    nameEn: info.nameEn.trim() || info.nameEs.trim(),
    aliases: [...new Set([query, ...info.aliases, info.nameEn].filter(Boolean))],
    primaryMuscles: keep(info.primaryMuscles, MUSCLE_VALUES),
    secondaryMuscles: keep(info.secondaryMuscles, MUSCLE_VALUES),
    equipment: info.equipment && EQUIPMENT_VALUES.includes(info.equipment) ? info.equipment : null,
    level: info.level && LEVEL_VALUES.includes(info.level) ? info.level : null,
    translated: true,
  });
  revalidateTag(SEARCH_INDEX_TAG, { expire: 0 });
  revalidateTag(exerciseTag(slug), { expire: 0 });
  return Response.json({ slug }, { status: 201 });
}
