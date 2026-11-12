import "./_env";
import { assertLocalDbFree } from "./_env";
import { revalidate } from "./_revalidate";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { exercises } from "../src/db/schema";
import { aiConfigured, translateNames } from "../src/lib/ai";
import { slugify } from "../src/lib/normalize";
import { intArg } from "./_env";

/**
 * Traduce al español los nombres que todavía están en inglés, en lotes de 20.
 * Reanudable: solo procesa filas con translated=false. Opciones: --limit N
 */
async function main() {
  await assertLocalDbFree();
  if (!aiConfigured()) {
    console.error("Falta configurar la IA (GOOGLE_GENERATIVE_AI_API_KEY en .env.local).");
    process.exit(1);
  }
  const limit = intArg("limit", 10_000);
  const db = await getDb();
  const pending = (await db.select().from(exercises).where(eq(exercises.translated, false))).slice(0, limit);
  const slugs = new Set((await db.select({ slug: exercises.slug }).from(exercises)).map((r) => r.slug));
  console.log(`${pending.length} nombres para traducir.`);

  for (let i = 0; i < pending.length; i += 20) {
    const batch = pending.slice(i, i + 20);
    try {
      const { items } = await translateNames(
        batch.map((b) => ({ id: b.sourceId ?? b.id, name: b.nameEn, equipment: b.equipment })),
      );
      for (const ex of batch) {
        const t = items.find((x) => x.id === (ex.sourceId ?? ex.id));
        if (!t) continue;
        slugs.delete(ex.slug);
        let slug = slugify(t.nameEs);
        if (slugs.has(slug)) slug = slugify(`${t.nameEs} ${ex.equipment ?? ""}`);
        if (slugs.has(slug)) slug = slugify(`${t.nameEs} ${ex.sourceId ?? ex.id}`);
        slugs.add(slug);
        await db
          .update(exercises)
          .set({
            nameEs: t.nameEs,
            slug,
            aliases: [...new Set([...t.aliases, ex.nameEn])],
            translated: true,
            updatedAt: new Date(),
          })
          .where(eq(exercises.id, ex.id));
      }
      console.log(`Traducidos ${Math.min(i + 20, pending.length)}/${pending.length}`);
    } catch (error) {
      console.error(`Falló el lote ${i / 20 + 1}, se reintenta en la próxima corrida:`, error);
    }
  }
  console.log("Listo. Corré npm run seed:overrides para reaplicar las correcciones manuales.");
  await revalidate([], true, true);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
