import * as schema from "./schema";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

/**
 * Base de datos:
 * - Si DATABASE_URL apunta a Postgres (Neon), usa el driver HTTP de Neon.
 * - Si DATABASE_URL no está definida, usa PGlite: un Postgres embebido que
 *   guarda los datos en la carpeta ./.data/pglite. Sirve para desarrollar
 *   sin crear ninguna cuenta.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { __repeDb?: Promise<Db> };

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith("postgres")) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(neon(url), { schema }) as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dir = process.env.PGLITE_DIR ?? "./.data/pglite";
  if (dir !== "memory") {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dir, { recursive: true });
  }
  const client = dir === "memory" ? new PGlite() : new PGlite(dir);
  const db = drizzle(client, { schema });
  // Con la base local, las migraciones nuevas se aplican solas al arrancar.
  if (dir !== "memory") {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db, { migrationsFolder: "./drizzle" });
  }
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  if (!globalForDb.__repeDb) globalForDb.__repeDb = createDb();
  return globalForDb.__repeDb;
}

export function usingPglite(): boolean {
  const url = process.env.DATABASE_URL;
  return !(url && url.startsWith("postgres"));
}

export { schema };
