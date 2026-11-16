import { getSessionUser, sameOrigin, unauthorized } from "@/lib/auth";
import { countRoutines, deleteRoutine, MAX_ROUTINES, routineExists, upsertRoutine } from "@/lib/routines-server";
import { isRoutineId, routineBodySchema } from "@/lib/schemas";

/** Crea o reemplaza una rutina del usuario (el navegador manda el estado completo). */
export async function PUT(request: Request, ctx: RouteContext<"/api/routines/[id]">) {
  if (!sameOrigin(request)) return Response.json({ error: "Origen inválido" }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!isRoutineId(id)) return Response.json({ error: "Id inválido" }, { status: 400 });
  const body = routineBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Rutina inválida" }, { status: 400 });
  // El tope solo bloquea altas: actualizar una existente sigue funcionando.
  if ((await countRoutines(user.id)) >= MAX_ROUTINES && !(await routineExists(user.id, id))) {
    return Response.json({ error: `Podés tener hasta ${MAX_ROUTINES} rutinas.` }, { status: 409 });
  }
  return Response.json({ routine: await upsertRoutine(user.id, id, body.data) });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/routines/[id]">) {
  if (!sameOrigin(request)) return Response.json({ error: "Origen inválido" }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!isRoutineId(id)) return Response.json({ error: "Id inválido" }, { status: 400 });
  await deleteRoutine(user.id, id);
  return Response.json({ ok: true });
}
