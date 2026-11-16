import { getSessionUser, googleConfigured } from "@/lib/auth";

/** Usuario actual (o null) y si el login está disponible. */
export async function GET() {
  const user = await getSessionUser();
  return Response.json(
    {
      loginEnabled: googleConfigured(),
      user: user ? { name: user.name, email: user.email, picture: user.picture } : null,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
