import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  cookieOptions,
  exchangeCode,
  loginWithProfile,
  OAUTH_COOKIE,
  parseOAuthCookie,
  requestOrigin,
  SESSION_COOKIE,
} from "@/lib/auth";

/** Google vuelve acá con ?code=...&state=... */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  const saved = parseOAuthCookie((await cookies()).get(OAUTH_COOKIE)?.value);
  const code = url.searchParams.get("code");
  const fail = (reason: string) => {
    console.error("[auth] login fallido:", reason);
    const res = NextResponse.redirect(`${origin}/rutinas?login=error`);
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
    return res;
  };

  if (url.searchParams.get("error")) return fail(`Google devolvió ${url.searchParams.get("error")}`);
  if (!saved || !code || url.searchParams.get("state") !== saved.state) return fail("state inválido o vencido");

  try {
    const profile = await exchangeCode(request, code, saved.verifier);
    const { token, maxAge } = await loginWithProfile(profile);
    const res = NextResponse.redirect(`${origin}${saved.next}`);
    res.cookies.set(SESSION_COOKIE, token, cookieOptions(request, maxAge));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
    return res;
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}
