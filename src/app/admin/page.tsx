import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDb } from "@/db/client";
import { exercises } from "@/db/schema";
import { adminEnabled, isAdmin } from "@/lib/admin-auth";
import { youtubeConfigured } from "@/lib/youtube";
import { AdminPanel } from "./AdminPanel";
import { LoginForm } from "./LoginForm";
import { toAdminRow } from "./rows";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

async function Gate() {
  // Siempre en tiempo de pedido: depende de ADMIN_TOKEN y de la cookie.
  await connection();
  if (!adminEnabled()) {
    return (
      <p className="rounded-xl border border-line bg-surface p-4">
        El panel está deshabilitado. Definí <code>ADMIN_TOKEN</code> en <code>.env.local</code> y reiniciá la app.
      </p>
    );
  }
  if (!(await isAdmin())) return <LoginForm />;
  const db = await getDb();
  const rows = (await db.select().from(exercises).orderBy(asc(exercises.nameEs))).map(toAdminRow);
  return <AdminPanel initialRows={rows} youtubeReady={youtubeConfigured()} />;
}

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 md:px-8">
      <h1 className="mb-6 font-display text-4xl font-bold tracking-[-0.03em]">Repe · Admin</h1>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Gate />
      </Suspense>
    </main>
  );
}
