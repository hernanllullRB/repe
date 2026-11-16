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

/**
 * Cadena de conexión a Postgres, tolerando errores comunes al pegarla:
 * espacios, comillas o el comando "psql '...'" que muestra Neon.
 * También acepta POSTGRES_URL (la que crea la integración de Neon en Vercel).
 */
export function databaseUrl(): string | null {
  const raw = (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim();
  if (!raw) return null;
  const match = raw.match(/postgres(?:ql)?:\/\/[^\s'"]+/);
  if (!match) {
    throw new Error(
      "DATABASE_URL tiene un formato inválido: tiene que ser la cadena de Neon que empieza con postgresql:// " +
        "(sin comillas ni el comando psql).",
    );
  }
  return match[0];
}

async function createDb(): Promise<Db> {
  const url = databaseUrl();
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(neon(url), { schema }) as unknown as Db;
  }
  if (process.env.VERCEL) {
    throw new Error(
      "Falta DATABASE_URL: en Vercel no hay base local. Cargá la cadena de conexión de Neon " +
        "(postgresql://...) en Settings → Environment Variables, marcá el entorno Production y volvé a desplegar.",
    );
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
  return !databaseUrl();
}

export { schema };
