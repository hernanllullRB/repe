import { and, asc, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { getDb } from "../db/client";
import { routines, type RoutineRow } from "../db/schema";
import type { routineBodySchema } from "./schemas";

/** Rutinas de cada usuario en la base. Lo usan las rutas de /api/routines. */

export type RoutineBody = z.infer<typeof routineBodySchema>;

export interface RoutineDto extends Omit<RoutineBody, "lastCompletedAt"> {
  id: string;
  lastCompletedAt: number | null;
  updatedAt: number;
}

export function toDto(r: RoutineRow): RoutineDto {
  return {
    id: r.id,
    name: r.name,
    items: r.items,
    done: r.done,
    doneDay: r.doneDay,
    lastCompletedAt: r.lastCompletedAt?.getTime() ?? null,
    updatedAt: r.updatedAt.getTime(),
  };
}

export async function listRoutines(userId: string): Promise<RoutineDto[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(routines)
    .where(eq(routines.userId, userId))
    .orderBy(asc(routines.createdAt), asc(routines.id));
  return rows.map(toDto);
}

export async function countRoutines(userId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(routines).where(eq(routines.userId, userId));
  return rows[0]?.n ?? 0;
}

export async function routineExists(userId: string, id: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ id: routines.id })
    .from(routines)
    .where(and(eq(routines.userId, userId), eq(routines.id, id)))
    .limit(1);
  return rows.length > 0;
}

export async function upsertRoutine(userId: string, id: string, body: RoutineBody, createdAt?: Date): Promise<RoutineDto> {
  const db = await getDb();
  const now = new Date();
  const lastCompletedAt = body.lastCompletedAt ? new Date(body.lastCompletedAt) : null;
  const data = { name: body.name, items: body.items, done: body.done, doneDay: body.doneDay, lastCompletedAt };
  const [row] = await db
    .insert(routines)
    .values({ userId, id, ...data, createdAt: createdAt ?? now, updatedAt: now })
    .onConflictDoUpdate({
      target: [routines.userId, routines.id],
      set: { ...data, updatedAt: now },
    })
    .returning();
  return toDto(row);
}

export async function deleteRoutine(userId: string, id: string): Promise<void> {
  const db = await getDb();
  await db.delete(routines).where(and(eq(routines.userId, userId), eq(routines.id, id)));
}

/** Tope de rutinas por usuario, para que nadie llene la base. */
export const MAX_ROUTINES = 100;
