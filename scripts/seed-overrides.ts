import "./_env";
import { assertLocalDbFree } from "./_env";
import { revalidate } from "./_revalidate";
import { eq, or } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { exercises } from "../src/db/schema";
import { slugify } from "../src/lib/normalize";
import { parseYouTubeId } from "../src/lib/youtube";
import { readOverrides } from "./_overrides";

/**
 * Aplica data/overrides.json: nombres y alias corregidos a mano y videos
 * de YouTube elegidos a mano. Lo que se carga acá queda con reviewed=true
 * (nombre) o youtube_source='manual' (video) y nunca se pisa.
 */
async function main() {
  await assertLocalDbFree();
  const overrides = readOverrides();
  const db = await getDb();
  let applied = 0;
  for (const [key, ov] of Object.entries(overrides)) {
    const rows = await db
      .select()
      .from(exercises)
      .where(or(eq(exercises.sourceId, key), eq(exercises.slug, key)));
    const ex = rows[0];
    if (!ex) {
      console.warn(`No existe el ejercicio "${key}", se omite.`);
      continue;
    }
    const set: Partial<typeof exercises.$inferInsert> = { updatedAt: new Date() };
    if (ov.nameEs && ov.nameEs !== ex.nameEs) {
      const slug = slugify(ov.nameEs);
      const taken = await db.select({ id: exercises.id }).from(exercises).where(eq(exercises.slug, slug));
      set.nameEs = ov.nameEs;
      if (!taken.length || taken[0].id === ex.id) set.slug = slug;
      set.translated = true;
      set.reviewed = true;
    }
    if (ov.aliases) set.aliases = [...new Set([...ov.aliases, ex.nameEn])];
    if (ov.images) {
      set.images = ov.images;
      set.imagesEdited = true;
    }
    if (ov.youtubeVideoId) {
      const id = parseYouTubeId(ov.youtubeVideoId);
      if (!id) {
        console.warn(`Video inválido para "${key}": ${ov.youtubeVideoId}`);
      } else {
        set.youtubeVideoId = id;
        set.youtubeSource = "manual";
        set.youtubeCheckedAt = new Date();
      }
    }
    await db.update(exercises).set(set).where(eq(exercises.id, ex.id));
    applied++;
  }
  console.log(`Overrides aplicados: ${applied}.`);
  await revalidate([], true, true);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
