import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../db/client";
import { sessions, users, type User } from "../db/schema";
import { config } from "./config";

/**
 * Login con Google (OAuth 2.0 + OpenID Connect, flujo "authorization code" con PKCE).
 * La sesión vive en la base: la cookie lleva un token al azar y en la tabla
 * `sessions` se guarda solo su hash, así un volcado de la base no sirve para entrar.
 */

export const SESSION_COOKIE = "repe_session";
export const OAUTH_COOKIE = "repe_oauth";
const SESSION_DAYS = 60;

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export type SessionUser = Pick<User, "id" | "email" | "name" | "picture">;

export function googleConfigured(): boolean {
  return Boolean(config.googleClientId && config.googleClientSecret);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Solo rutas internas ("/rutinas"), nunca "//otro-sitio.com" ni URLs absolutas. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/rutinas";
  return next;
}

/** Origen público del pedido (respeta los encabezados del proxy de Vercel). */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function callbackUrl(request: Request): string {
  return `${requestOrigin(request)}/api/auth/google/callback`;
}

/** Para rutas que modifican datos: rechaza pedidos que vienen de otro sitio. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === requestOrigin(request);
}

// ---------------------------------------------------------------------------
// Paso 1: redirigir a Google

export interface OAuthState {
  state: string;
  verifier: string;
  next: string;
}

export function startGoogleLogin(request: Request, next: string): { url: string; cookie: string } {
  const state = randomToken(16);
  const verifier = randomToken(48);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: callbackUrl(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  const cookie = Buffer.from(JSON.stringify({ state, verifier, next: safeNext(next) } satisfies OAuthState)).toString(
    "base64url",
  );
  return { url: `${GOOGLE_AUTH_URL}?${params}`, cookie };
}

export function parseOAuthCookie(value: string | undefined): OAuthState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<OAuthState>;
    if (typeof parsed.state !== "string" || typeof parsed.verifier !== "string") return null;
    return { state: parsed.state, verifier: parsed.verifier, next: safeNext(parsed.next) };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Paso 2: Google vuelve con un código; lo cambiamos por la identidad del usuario

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

/**
 * Valida los datos del id_token. El token llega directo del endpoint de Google
 * por HTTPS y autenticado con el client secret, así que (según OpenID Connect
 * Core 3.1.3.7) alcanza con validar emisor, audiencia y vencimiento.
 */
export function profileFromIdToken(idToken: string, clientId: string, now = Date.now()): GoogleProfile {
  const [, payload] = idToken.split(".");
  if (!payload) throw new Error("id_token inválido");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
  if (!GOOGLE_ISSUERS.includes(String(claims.iss))) throw new Error("Emisor inválido");
  const aud = claims.aud;
  if (aud !== clientId && !(Array.isArray(aud) && aud.includes(clientId))) throw new Error("Audiencia inválida");
  if (typeof claims.exp !== "number" || claims.exp * 1000 < now) throw new Error("Token vencido");
  if (typeof claims.sub !== "string" || typeof claims.email !== "string") throw new Error("Faltan datos del usuario");
  if (claims.email_verified === false) throw new Error("El email de Google no está verificado");
  return {
    sub: claims.sub,
    email: claims.email,
    name: typeof claims.name === "string" ? claims.name : null,
    picture: typeof claims.picture === "string" ? claims.picture : null,
  };
}

export async function exchangeCode(request: Request, code: string, verifier: string): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: callbackUrl(request),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string };
  if (!res.ok || !data.id_token) throw new Error(`Google rechazó el código: ${data.error ?? res.status}`);
  return profileFromIdToken(data.id_token, config.googleClientId);
}

/** Crea o actualiza el usuario y abre una sesión. Devuelve el token para la cookie. */
export async function loginWithProfile(profile: GoogleProfile): Promise<{ token: string; maxAge: number }> {
  const db = await getDb();
  const [user] = await db
    .insert(users)
    .values({ googleSub: profile.sub, email: profile.email, name: profile.name, picture: profile.picture })
    .onConflictDoUpdate({
      target: users.googleSub,
      set: { email: profile.email, name: profile.name, picture: profile.picture, lastLoginAt: new Date() },
    })
    .returning({ id: users.id });
  const token = randomToken();
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  await db.insert(sessions).values({ id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + maxAge * 1000) });
  // Limpieza oportunista de sesiones vencidas de este usuario.
  await db.delete(sessions).where(and(eq(sessions.userId, user.id), lt(sessions.expiresAt, new Date())));
  return { token, maxAge };
}

// ---------------------------------------------------------------------------
// Sesión actual

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, picture: users.picture })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export async function destroySession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return;
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.id, sha256(token)));
}

export function cookieOptions(request: Request, maxAge: number, path = "/") {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: requestOrigin(request).startsWith("https://"),
    path,
    maxAge,
  };
}

/** Respuesta 401 estándar para las rutas que necesitan sesión. */
export function unauthorized(): Response {
  return Response.json({ error: "Iniciá sesión para seguir." }, { status: 401 });
}
