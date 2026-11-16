import { getSessionUser, unauthorized } from "@/lib/auth";
import { listRoutines } from "@/lib/routines-server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  return Response.json({ routines: await listRoutines(user.id) }, { headers: { "cache-control": "private, no-store" } });
}
