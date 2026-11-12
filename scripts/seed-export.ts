import "./_env";
import { writeFileSync } from "node:fs";
import { asc } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { exercises } from "../src/db/schema";

/** Exporta nombres y alias a data/ejercicios.csv para revisarlos a mano. */
function csv(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

async function main() {
  const db = await getDb();
  const rows = await db.select().from(exercises).orderBy(asc(exercises.nameEs));
  const lines = [
    ["source_id", "slug", "name_en", "name_es", "aliases", "revisado", "video"].join(","),
    ...rows.map((r) =>
      [
        csv(r.sourceId ?? ""),
        csv(r.slug),
        csv(r.nameEn),
        csv(r.nameEs),
        csv(r.aliases.join(" | ")),
        r.reviewed ? "si" : "no",
        csv(r.youtubeVideoId ?? ""),
      ].join(","),
    ),
  ];
  writeFileSync("data/ejercicios.csv", `﻿${lines.join("\n")}\n`);
  console.log(`Exportados ${rows.length} ejercicios a data/ejercicios.csv`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
