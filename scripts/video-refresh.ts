import "./_env";
import { assertLocalDbFree } from "./_env";
import { and, eq, isNotNull, or } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { exercises } from "../src/db/schema";
import { revalidate } from "./_revalidate";

/**
 * Borra los videos elegidos por la búsqueda automática para que se vuelvan a
 * buscar (por ejemplo, después de cambiar el criterio de búsqueda).
 * Nunca toca los videos cargados a mano.
 * Uso: npm run video:refresh -- <slug>     (uno)
 *      npm run video:refresh -- --all      (todos los automáticos)
 */
async function main() {
  await assertLocalDbFree();
  const all = process.argv.includes("--all");
  const slug = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!all && !slug) {
    console.error("Uso: npm run video:refresh -- <slug>   o   npm run video:refresh -- --all");
    process.exit(1);
  }
  const db = await getDb();
  const automatic = or(eq(exercises.youtubeSource, "search"), isNotNull(exercises.youtubeCheckedAt));
  const where = all ? automatic : and(eq(exercises.slug, slug!), automatic);
  const rows = await db.select({ slug: exercises.slug, source: exercises.youtubeSource }).from(exercises).where(where);
  const targets = rows.filter((r) => r.source !== "manual");
  for (const t of targets) {
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
      .where(eq(exercises.slug, t.slug));
  }
  console.log(
    targets.length
      ? `Se van a volver a buscar ${targets.length} videos la próxima vez que se abra cada ficha.`
      : "No había videos automáticos para borrar (los manuales no se tocan).",
  );
  await revalidate(targets.map((t) => t.slug));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
