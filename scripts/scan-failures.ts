import "./_env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { desc } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { scanFailures } from "../src/db/schema";
import { scanFailuresBlobAuth } from "../src/lib/scan-failures";
import { arg, intArg } from "./_env";

/**
 * Lista las fotos de rutinas que no se leyeron bien.
 *   npm run scan:failures                 # las últimas 20
 *   npm run scan:failures -- --limit 50
 *   npm run scan:failures -- --download   # baja las del Blob privado a .data/scan-failures-download
 */
async function main() {
  const db = await getDb();
  const rows = await db.select().from(scanFailures).orderBy(desc(scanFailures.createdAt)).limit(intArg("limit", 20));
  if (rows.length === 0) return console.log("No hay fotos guardadas.");

  const download = process.argv.includes("--download") || arg("download") !== undefined;
  const outDir = path.join(process.cwd(), ".data", "scan-failures-download");
  for (const r of rows) {
    console.log(`\n${r.createdAt.toISOString()}  ${r.reason}  ${r.mediaType ?? "?"}  ${(r.bytes / 1024).toFixed(0)} KB  ${r.fileName ?? ""}`);
    if (r.detail) console.log(`  detalle: ${r.detail}`);
    if (r.result) console.log(`  resultado IA: ${JSON.stringify(r.result).slice(0, 300)}`);
    if (!r.storagePath) {
      console.log("  (imagen no guardada)");
      continue;
    }
    if (download && r.storagePath.startsWith("https://")) {
      const auth = scanFailuresBlobAuth();
      if (!auth) {
        console.log("  (falta SCAN_FAILURES_BLOB_TOKEN, o SCAN_FAILURES_STORE_ID con `vercel env pull`, para bajarla)");
        continue;
      }
      const { get } = await import("@vercel/blob");
      const blob = await get(r.storagePath, { access: "private", ...auth });
      if (!blob) {
        console.log("  (ya no está en el Blob)");
        continue;
      }
      await mkdir(outDir, { recursive: true });
      const target = path.join(outDir, `${r.id}${path.extname(new URL(r.storagePath).pathname)}`);
      await writeFile(target, Buffer.from(await new Response(blob.stream).arrayBuffer()));
      console.log(`  imagen: ${path.relative(process.cwd(), target)}`);
    } else {
      console.log(`  imagen: ${r.storagePath}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
