import "./_env";
import { assertLocalDbFree } from "./_env";
import { findBySlug } from "../src/lib/exercises";
import { clearVideo } from "../src/lib/videos";
import { revalidate } from "./_revalidate";

/** Uso: npm run video:unset -- <slug>. Borra el video; la ficha vuelve a buscar una demo. */
async function main() {
  await assertLocalDbFree();
  const slug = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!slug) {
    console.error("Uso: npm run video:unset -- <slug>");
    process.exit(1);
  }
  const ex = await findBySlug(slug);
  if (!ex) {
    console.error(`No existe el ejercicio con slug "${slug}".`);
    process.exit(1);
  }
  await clearVideo(ex);
  console.log(`Video borrado de "${ex.nameEs}".`);
  await revalidate([ex.slug]);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
