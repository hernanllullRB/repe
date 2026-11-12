import "./_env";
import { assertLocalDbFree } from "./_env";
import { getDb } from "../src/db/client";
import { exercises } from "../src/db/schema";
import { aiConfigured } from "../src/lib/ai";
import { ensureEnriched, needsContent, needsVideoSearch } from "../src/lib/enrich";
import { youtubeConfigured } from "../src/lib/youtube";
import { arg, intArg } from "./_env";
import { revalidate } from "./_revalidate";

/**
 * Pregenera fichas y/o videos para que el público nunca dispare la IA.
 * Uso: npm run seed:enrich -- --limit 50 [--only content|videos]
 * Respeta los topes diarios (LLM_DAILY_CAP, YOUTUBE_DAILY_CAP).
 */
async function main() {
  await assertLocalDbFree();
  const limit = intArg("limit", 50);
  const only = arg("only");
  const db = await getDb();
  const all = await db.select().from(exercises);
  const wantContent = only !== "videos" && aiConfigured();
  const wantVideos = only !== "content" && youtubeConfigured();
  if (!wantContent && !wantVideos) {
    console.error("No hay nada que hacer: configurá GOOGLE_GENERATIVE_AI_API_KEY y/o YOUTUBE_API_KEY.");
    process.exit(1);
  }
  const todo = all
    .filter((e) => (wantContent && needsContent(e)) || (wantVideos && needsVideoSearch(e)))
    // Primero los revisados a mano (los más buscados), después el resto.
    .sort((a, b) => Number(b.reviewed) - Number(a.reviewed))
    .slice(0, limit);
  console.log(`${todo.length} ejercicios para completar.`);
  const done: string[] = [];
  for (const [i, ex] of todo.entries()) {
    const { outcome, exercise } = await ensureEnriched(ex, { content: wantContent, video: wantVideos });
    console.log(
      `${i + 1}/${todo.length} ${ex.slug}: ficha=${wantContent ? outcome : "-"} video=${exercise.youtubeVideoId ?? "sin video"}`,
    );
    if (outcome === "limit") {
      console.log("Se alcanzó el tope diario de IA. Seguí mañana.");
      break;
    }
    done.push(ex.slug);
  }
  await revalidate(done);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
