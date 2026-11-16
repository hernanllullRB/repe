import "./_env";
import { assertLocalDbFree, intArg } from "./_env";
import { revalidate } from "./_revalidate";
import { asc, eq, isNull } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { exercises } from "../src/db/schema";
import { aiConfigured, suggestAlternatives } from "../src/lib/ai";
import { pickAlternatives } from "../src/lib/alternatives";
import { createMatcher } from "../src/lib/routine-match";

/**
 * Busca hasta 3 ejercicios alternativos (con otro equipamiento) para cada
 * ejercicio del catálogo. La IA sugiere nombres en lotes de 20 y cada uno se
 * busca en el catálogo: solo se guardan los que existen.
 * Reanudable: solo procesa los que todavía no se revisaron.
 *   npm run seed:alternatives                 # todos los pendientes
 *   npm run seed:alternatives -- --limit 40   # solo 40
 *   npm run seed:alternatives -- --redo       # vuelve a calcular todos
 *   npm run seed:alternatives -- --delay 6000 # ms entre lotes (por los límites por minuto de la IA)
 */
const BATCH = 20;

async function main() {
  await assertLocalDbFree();
  if (!aiConfigured()) {
    console.error("Falta configurar la IA (GOOGLE_GENERATIVE_AI_API_KEY en .env.local).");
    process.exit(1);
  }
  const limit = intArg("limit", 10_000);
  const delay = intArg("delay", 5000);
  const redo = process.argv.includes("--redo");
  const db = await getDb();

  const all = await db.select().from(exercises).orderBy(asc(exercises.nameEs));
  const match = createMatcher(
    all.map((e) => ({ slug: e.slug, nameEs: e.nameEs, nameEn: e.nameEn, aliases: e.aliases, muscles: e.primaryMuscles })),
  );
  const pending = (redo ? all : all.filter((e) => !e.alternativesCheckedAt))
    // Los revisados a mano (los más buscados) primero.
    .sort((a, b) => Number(b.reviewed) - Number(a.reviewed))
    .slice(0, limit);
  console.log(`${pending.length} ejercicios para buscar alternativas.`);

  const found = [0, 0, 0, 0];
  const changed: string[] = [];
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    try {
      const { items } = await suggestAlternatives(
        batch.map((e) => ({
          id: e.id,
          nameEs: e.nameEs,
          nameEn: e.nameEn,
          equipment: e.equipment,
          muscles: e.primaryMuscles,
        })),
      );
      for (const ex of batch) {
        const suggestions = items.find((x) => x.id === ex.id)?.alternatives ?? [];
        const alternatives = pickAlternatives(match, ex.slug, suggestions);
        found[alternatives.length]++;
        await db
          .update(exercises)
          .set({ alternatives, alternativesCheckedAt: new Date() })
          .where(eq(exercises.id, ex.id));
        changed.push(ex.slug);
      }
      console.log(`Procesados ${Math.min(i + BATCH, pending.length)}/${pending.length}`);
    } catch (error) {
      console.error(`Falló el lote ${i / BATCH + 1}, se reintenta en la próxima corrida:`, error);
    }
    if (i + BATCH < pending.length) await new Promise((r) => setTimeout(r, delay));
  }

  console.log(`\nResultado: ${found[3]} con 3 alternativas, ${found[2]} con 2, ${found[1]} con 1, ${found[0]} sin ninguna.`);
  const left = await db.select({ id: exercises.id }).from(exercises).where(isNull(exercises.alternativesCheckedAt));
  if (left.length) console.log(`Quedan ${left.length} sin revisar: volvé a correr el comando.`);
  await revalidate(changed, false, changed.length > 50);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
