import { NextResponse } from "next/server";
import { cookieOptions, googleConfigured, OAUTH_COOKIE, startGoogleLogin } from "@/lib/auth";

/** Arranca el login: guarda state + PKCE en una cookie corta y manda a Google. */
export async function GET(request: Request) {
  if (!googleConfigured()) {
    return Response.json({ error: "El login con Google no está configurado." }, { status: 503 });
  }
  const next = new URL(request.url).searchParams.get("next") ?? "/rutinas";
  const { url, cookie } = startGoogleLogin(request, next);
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, cookie, cookieOptions(request, 10 * 60, "/api/auth"));
  return res;
}
