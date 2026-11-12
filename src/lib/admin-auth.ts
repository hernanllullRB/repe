import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Acceso al panel /admin: se entra con ADMIN_TOKEN y queda una cookie con su
 * hash. Sin ADMIN_TOKEN configurado el panel está deshabilitado.
 */
export const ADMIN_COOKIE = "repe_admin";

function hash(value: string): string {
  return createHash("sha256").update(`repe-admin:${value}`).digest("hex");
}

export function adminEnabled(): boolean {
  return Boolean(process.env.ADMIN_TOKEN);
}

export function checkToken(input: string): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const a = Buffer.from(hash(input));
  const b = Buffer.from(hash(token));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sessionValue(): string {
  return hash(process.env.ADMIN_TOKEN ?? "");
}

export async function isAdmin(): Promise<boolean> {
  if (!adminEnabled()) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return value === sessionValue();
}

/** Para usar al principio de cada acción del panel. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("No autorizado");
}
