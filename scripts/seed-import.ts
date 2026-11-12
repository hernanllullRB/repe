import "./_env";
import { assertLocalDbFree } from "./_env";
import { revalidate } from "./_revalidate";
import { and, eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { exercises } from "../src/db/schema";
import { slugify } from "../src/lib/normalize";
import { datasetExerciseSchema, type DatasetExercise } from "../src/lib/schemas";
import { CATEGORIES, EQUIPMENT, LEVELS, MUSCLES, translate, translateMany } from "../src/lib/taxonomy";
import { readOverrides } from "./_overrides";

/**
 * Importa free-exercise-db (dominio público) fijado en un commit.
 * Es idempotente: hace upsert por source_id y no pisa traducciones,
 * contenido generado ni videos ya cargados.
 */
const COMMIT = "f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5";
const BASE = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}`;

async function main() {
  await assertLocalDbFree();
  console.log("Descargando dataset…");
  const res = await fetch(`${BASE}/dist/exercises.json`);
  if (!res.ok) throw new Error(`No se pudo descargar el dataset: ${res.status}`);
  const raw = (await res.json()) as unknown[];
  const items: DatasetExercise[] = [];
  for (const r of raw) {
    const parsed = datasetExerciseSchema.safeParse(r);
    if (parsed.success) items.push(parsed.data);
    else console.warn("Registro inválido, se omite:", (r as { id?: string }).id);
  }
  console.log(`${items.length} ejercicios válidos.`);

  const overrides = readOverrides();
  const db = await getDb();
  const existing = await db.select({ sourceId: exercises.sourceId, slug: exercises.slug }).from(exercises);
  const slugs = new Set(existing.map((e) => e.slug));
  const known = new Map(existing.map((e) => [e.sourceId, e.slug]));

  let inserted = 0;
  let updated = 0;
  for (const it of items) {
    const base = {
      nameEn: it.name,
      primaryMuscles: translateMany(MUSCLES, it.primaryMuscles),
      secondaryMuscles: translateMany(MUSCLES, it.secondaryMuscles),
      equipment: translate(EQUIPMENT, it.equipment),
      level: translate(LEVELS, it.level),
      category: translate(CATEGORIES, it.category),
      images: it.images.map((p) => `${BASE}/exercises/${p}`),
      instructionsEn: it.instructions,
      updatedAt: new Date(),
    };
    if (known.has(it.id)) {
      // Las imágenes editadas a mano no se pisan.
      const { images, ...rest } = base;
      await db.update(exercises).set(rest).where(eq(exercises.sourceId, it.id));
      await db
        .update(exercises)
        .set({ images })
        .where(and(eq(exercises.sourceId, it.id), eq(exercises.imagesEdited, false)));
      updated++;
      continue;
    }
    const ov = overrides[it.id];
    const nameEs = ov?.nameEs ?? it.name;
    let slug = slugify(nameEs);
    if (slugs.has(slug)) slug = slugify(`${nameEs} ${base.equipment ?? it.id}`);
    if (slugs.has(slug)) slug = slugify(it.id);
    slugs.add(slug);
    await db.insert(exercises).values({
      ...base,
      slug,
      source: "free-exercise-db",
      sourceId: it.id,
      nameEs,
      aliases: [...new Set([...(ov?.aliases ?? []), it.name])],
      translated: Boolean(ov?.nameEs),
      reviewed: Boolean(ov?.nameEs),
    });
    inserted++;
  }
  console.log(`Listo: ${inserted} nuevos, ${updated} actualizados.`);
  console.log("Siguiente paso: npm run seed:overrides y, con una clave de IA, npm run seed:translate");
  await revalidate([], true, true);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
