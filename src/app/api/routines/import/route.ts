import { getSessionUser, sameOrigin, unauthorized } from "@/lib/auth";
import { listRoutines, MAX_ROUTINES, upsertRoutine } from "@/lib/routines-server";
import { routineImportSchema } from "@/lib/schemas";

/**
 * Al iniciar sesión, el navegador sube las rutinas que tenía guardadas sin cuenta.
 * Si ya existe una con el mismo id (por ejemplo, se importó desde otro
 * dispositivo), se conserva la de la base.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origen inválido" }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const body = routineImportSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Rutinas inválidas" }, { status: 400 });

  const existing = new Set((await listRoutines(user.id)).map((r) => r.id));
  let room = MAX_ROUTINES - existing.size;
  const base = Date.now();
  for (const [i, { id, ...data }] of body.data.routines.entries()) {
    if (existing.has(id) || room <= 0) continue;
    await upsertRoutine(user.id, id, data, new Date(base + i));
    room--;
  }
  return Response.json({ routines: await listRoutines(user.id) });
}
