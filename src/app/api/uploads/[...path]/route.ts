import { readLocalImage } from "@/lib/storage";

/** Sirve las imágenes subidas cuando no hay Vercel Blob (uso local). */
export async function GET(_req: Request, ctx: RouteContext<"/api/uploads/[...path]">) {
  const { path } = await ctx.params;
  const file = await readLocalImage(path);
  if (!file) return new Response("No encontrada", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: { "content-type": file.type, "cache-control": "public, max-age=31536000, immutable" },
  });
}
