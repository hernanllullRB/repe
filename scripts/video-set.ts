import "./_env";
import { assertLocalDbFree } from "./_env";
import { findBySlug } from "../src/lib/exercises";
import { setManualVideo } from "../src/lib/videos";
import { revalidate } from "./_revalidate";

/**
 * Uso: npm run video:set -- <slug> <url-o-id>
 * Carga un video elegido a mano. Ese ejercicio nunca vuelve a buscar en YouTube.
 * También se puede hacer desde el panel /admin.
 */
async function main() {
  await assertLocalDbFree();
  const [slug, input] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!slug || !input) {
    console.error("Uso: npm run video:set -- <slug> <url-o-id>");
    process.exit(1);
  }
  const ex = await findBySlug(slug);
  if (!ex) {
    console.error(`No existe el ejercicio con slug "${slug}".`);
    process.exit(1);
  }
  const result = await setManualVideo(ex, input);
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.warning) console.log(result.warning);
  const e = result.exercise;
  console.log(`Video ${e.youtubeVideoId} cargado en "${e.nameEs}"${e.youtubeTitle ? `: ${e.youtubeTitle}` : ""}.`);
  await revalidate([e.slug]);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
