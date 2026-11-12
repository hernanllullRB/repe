import "./_env";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { assertLocalDbFree } from "./_env";
import { exercises, type Exercise } from "../src/db/schema";

/**
 * Copia todo de la base local (PGlite) a Neon: ejercicios con sus traducciones,
 * fichas generadas, videos e imágenes. No llama a la IA ni a YouTube.
 *
 * Uso: poné la cadena de Neon en NEON_DATABASE_URL (en .env.local) y corré
 *   npm run db:copy-to-neon
 * Se puede correr varias veces: actualiza lo que ya existe.
 *
 * Si tenés imágenes subidas desde /admin (en .data/uploads) y BLOB_READ_WRITE_TOKEN,
 * también las sube a Vercel Blob y actualiza sus links.
 */
async function main() {
  const target = process.env.NEON_DATABASE_URL;
  if (!target || !target.startsWith("postgres")) {
    console.error("Falta NEON_DATABASE_URL en .env.local (la cadena de conexión de Neon, empieza con postgresql://).");
    process.exit(1);
  }
  await assertLocalDbFree();

  // Origen: la base local.
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle: drizzleLocal } = await import("drizzle-orm/pglite");
  const local = drizzleLocal(new PGlite(process.env.PGLITE_DIR ?? "./.data/pglite"));
  const rows: Exercise[] = await local.select().from(exercises);
  console.log(`Base local: ${rows.length} ejercicios.`);

  // Destino: Neon. Primero crea o actualiza las tablas.
  const { neon } = await import("@neondatabase/serverless");
  const { drizzle: drizzleNeon } = await import("drizzle-orm/neon-http");
  const { migrate } = await import("drizzle-orm/neon-http/migrator");
  const remote = drizzleNeon(neon(target));
  await migrate(remote, { migrationsFolder: "./drizzle" });
  console.log("Tablas listas en Neon.");

  // Imágenes subidas localmente: a Vercel Blob, si hay token.
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  let uploaded = 0;
  let skipped = 0;
  for (const r of rows) {
    if (!r.images.some((i) => i.startsWith("/api/uploads/"))) continue;
    if (!blobToken) {
      skipped++;
      continue;
    }
    const { put } = await import("@vercel/blob");
    r.images = await Promise.all(
      r.images.map(async (img) => {
        if (!img.startsWith("/api/uploads/")) return img;
        const rel = img.replace("/api/uploads/", "");
        const data = await readFile(path.join(".data", "uploads", rel));
        const blob = await put(`ejercicios/${rel}`, data, { access: "public", allowOverwrite: true });
        uploaded++;
        return blob.url;
      }),
    );
  }

  // Copia por tandas, actualizando si ya existe (mismo slug).
  const chunk = 50;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk).map(({ id: _id, ...rest }) => rest);
    await remote
      .insert(exercises)
      .values(batch)
      .onConflictDoUpdate({
        target: exercises.slug,
        set: {
          source: sql`excluded.source`,
          sourceId: sql`excluded.source_id`,
          nameEs: sql`excluded.name_es`,
          nameEn: sql`excluded.name_en`,
          aliases: sql`excluded.aliases`,
          primaryMuscles: sql`excluded.primary_muscles`,
          secondaryMuscles: sql`excluded.secondary_muscles`,
          equipment: sql`excluded.equipment`,
          level: sql`excluded.level`,
          category: sql`excluded.category`,
          images: sql`excluded.images`,
          imagesEdited: sql`excluded.images_edited`,
          instructionsEn: sql`excluded.instructions_en`,
          translated: sql`excluded.translated`,
          content: sql`excluded.content`,
          contentStatus: sql`case when excluded.content_status = 'generating' then 'pending' else excluded.content_status end`,
          contentModel: sql`excluded.content_model`,
          contentGeneratedAt: sql`excluded.content_generated_at`,
          youtubeVideoId: sql`excluded.youtube_video_id`,
          youtubeTitle: sql`excluded.youtube_title`,
          youtubeChannel: sql`excluded.youtube_channel`,
          youtubeSource: sql`excluded.youtube_source`,
          youtubeSeconds: sql`excluded.youtube_seconds`,
          youtubeCheckedAt: sql`excluded.youtube_checked_at`,
          reviewed: sql`excluded.reviewed`,
          updatedAt: sql`now()`,
        },
      });
    console.log(`Copiados ${Math.min(i + chunk, rows.length)}/${rows.length}`);
  }

  // Los contadores de cuota del día no se copian: Neon arranca de cero.
  const fichas = rows.filter((r) => r.contentStatus === "ready").length;
  const videos = rows.filter((r) => r.youtubeVideoId).length;
  console.log(`Listo: ${rows.length} ejercicios, ${fichas} fichas completas y ${videos} videos copiados a Neon.`);
  if (uploaded) console.log(`${uploaded} imágenes subidas a Vercel Blob.`);
  if (skipped) {
    console.log(
      `Atención: ${skipped} ejercicios tienen imágenes subidas desde tu PC. Para que se vean en producción, ` +
        "agregá BLOB_READ_WRITE_TOKEN a .env.local y volvé a correr este comando.",
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
