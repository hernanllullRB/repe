import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { usageCounters } from "../db/schema";
import { config } from "./config";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Valor actual del contador de hoy. */
export async function getUsage(key: string): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ count: usageCounters.count })
    .from(usageCounters)
    .where(sql`${usageCounters.day} = ${today()} and ${usageCounters.key} = ${key}`);
  return rows[0]?.count ?? 0;
}

/** Incrementa y devuelve el nuevo valor. */
export async function incrementUsage(key: string): Promise<number> {
  const db = await getDb();
  const rows = await db
    .insert(usageCounters)
    .values({ day: today(), key, count: 1 })
    .onConflictDoUpdate({
      target: [usageCounters.day, usageCounters.key],
      set: { count: sql`${usageCounters.count} + 1` },
    })
    .returning({ count: usageCounters.count });
  return rows[0]?.count ?? 1;
}

/**
 * Consume una unidad si no se superó el tope. Devuelve false si ya no hay cupo.
 * Incrementa primero y compara después, para que dos pedidos simultáneos no
 * pasen los dos.
 */
export async function tryConsume(key: string, cap: number): Promise<boolean> {
  if (cap <= 0) return false;
  const value = await incrementUsage(key);
  return value <= cap;
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${config.ipHashSalt}:${ip}`).digest("hex").slice(0, 32);
}
