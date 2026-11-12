import { config } from "dotenv";

// Mismo orden que Next.js: .env.local pisa a .env
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) return process.argv[i + 1];
  return undefined;
}

export function intArg(name: string, fallback: number): number {
  const v = arg(name);
  const n = v ? Number.parseInt(v, 10) : Number.NaN;
  return Number.isFinite(n) ? n : fallback;
}

/**
 * La base local (PGlite) no se puede usar desde dos procesos a la vez: si la
 * app está corriendo, no ve los cambios del script y puede pisarlos. Con Neon
 * (DATABASE_URL) no hay problema.
 */
export async function assertLocalDbFree(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith("postgres")) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const ports = new Set([site, "http://localhost:3000"]);
  for (const base of ports) {
    try {
      await fetch(base, { signal: AbortSignal.timeout(1500) });
      console.error(
        `La app está corriendo en ${base}. Con la base local hay que cerrarla antes de correr este comando:\n` +
          "  1. En la terminal de npm run dev apretá Ctrl+C\n" +
          "  2. Corré este comando de nuevo\n" +
          "  3. Volvé a levantar npm run dev",
      );
      process.exit(1);
    } catch {
      // No responde: la base está libre.
    }
  }
}
