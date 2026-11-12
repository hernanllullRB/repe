/**
 * Las páginas se sirven desde caché. Cuando un script cambia datos, avisa a la
 * app para que invalide esas fichas. Necesita NEXT_PUBLIC_SITE_URL y ADMIN_TOKEN;
 * si la app no está corriendo, no pasa nada: el cambio se ve al reiniciarla.
 */
export async function revalidate(slugs: string[], searchIndex = false, all = false): Promise<void> {
  // Con la base local la app tiene que estar cerrada al correr scripts: al
  // levantarla de nuevo arranca con la caché limpia.
  const url = process.env.DATABASE_URL;
  if (!(url && url.startsWith("postgres"))) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    console.log("(Sin ADMIN_TOKEN en .env.local: reiniciá npm run dev para ver los cambios.)");
    return;
  }
  try {
    const res = await fetch(`${site}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ slugs, searchIndex, all }),
    });
    if (res.ok) console.log(`Caché actualizada en ${site}.`);
    else console.log(`No se pudo actualizar la caché en ${site} (${res.status}). Reiniciá npm run dev.`);
  } catch {
    console.log(`La app no responde en ${site}; el cambio se verá al iniciarla.`);
  }
}
