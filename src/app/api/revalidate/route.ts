import { revalidateTag } from "next/cache";
import { z } from "zod";
import { ALL_EXERCISES_TAG, exerciseTag, SEARCH_INDEX_TAG } from "@/lib/data";

const bodySchema = z.object({
  slugs: z.array(z.string()).max(1000).default([]),
  searchIndex: z.boolean().default(false),
  all: z.boolean().default(false),
});

/** Lo usan los scripts (video:set, seed:enrich) para refrescar la caché. Requiere ADMIN_TOKEN. */
export async function POST(request: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || request.headers.get("x-admin-token") !== token) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: "Pedido inválido" }, { status: 400 });
  for (const slug of body.data.slugs) revalidateTag(exerciseTag(slug), { expire: 0 });
  if (body.data.searchIndex || body.data.all) revalidateTag(SEARCH_INDEX_TAG, { expire: 0 });
  if (body.data.all) revalidateTag(ALL_EXERCISES_TAG, { expire: 0 });
  return Response.json({ ok: true, revalidated: body.data.slugs.length });
}
