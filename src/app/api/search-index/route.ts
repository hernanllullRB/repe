import { connection } from "next/server";
import { getSearchIndex } from "@/lib/data";

export async function GET() {
  // Se resuelve en cada pedido (no al compilar); el índice en sí queda cacheado.
  await connection();
  const index = await getSearchIndex();
  return Response.json(index, {
    headers: { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400" },
  });
}
