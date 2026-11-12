import { revalidateTag } from "next/cache";
import { z } from "zod";
import { exerciseTag } from "@/lib/data";
import { ensureEnriched, needsContent } from "@/lib/enrich";
import { findBySlug, toView } from "@/lib/exercises";

const bodySchema = z.object({ retry: z.boolean().optional() }).optional();

/** Completa la ficha y el video que falten. La primera visita lo dispara; el resto lee de caché. */
export async function POST(request: Request, ctx: RouteContext<"/api/exercises/[slug]/enrich">) {
  const { slug } = await ctx.params;
  const body = bodySchema.safeParse(await request.json().catch(() => undefined));
  if (!body.success) return Response.json({ error: "Pedido inválido" }, { status: 400 });

  const ex = await findBySlug(slug);
  if (!ex) return Response.json({ error: "No existe" }, { status: 404 });

  const { outcome, exercise } = await ensureEnriched(ex);
  revalidateTag(exerciseTag(slug), { expire: 0 });
  return Response.json({
    outcome: needsContent(exercise) ? outcome : "ready",
    exercise: toView(exercise, false),
  });
}
