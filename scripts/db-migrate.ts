import "./_env";
import { assertLocalDbFree } from "./_env";
import { getDb, usingPglite } from "../src/db/client";

async function main() {
  await assertLocalDbFree();
  const db = await getDb();
  if (usingPglite()) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder: "./drizzle" });
    console.log("Migraciones aplicadas en la base local (PGlite).");
  } else {
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    await migrate(db as never, { migrationsFolder: "./drizzle" });
    console.log("Migraciones aplicadas en Postgres (DATABASE_URL).");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
