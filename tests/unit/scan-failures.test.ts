import { existsSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "../../src/db/client";
import { scanFailures } from "../../src/db/schema";
import { looksUnmatched, purgeOldScanFailures, saveScanFailure } from "../../src/lib/scan-failures";

beforeAll(async () => {
  const db = await getDb();
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  await migrate(db as never, { migrationsFolder: "./drizzle" });
});

describe("looksUnmatched", () => {
  const ex = (ok: boolean) => ({ match: ok ? { slug: "x" } : null, confident: ok });
  it("pocos ejercicios no cuentan", () => expect(looksUnmatched([{ exercises: [ex(false), ex(false)] }])).toBe(false));
  it("la mitad o más sin coincidencia es floja", () =>
    expect(looksUnmatched([{ exercises: [ex(true), ex(false), ex(false), ex(true)] }])).toBe(true));
  it("la mayoría bien no es floja", () =>
    expect(looksUnmatched([{ exercises: [ex(true), ex(true), ex(false), ex(true)] }])).toBe(false));
});

describe("saveScanFailure", () => {
  it("guarda el registro y la imagen, y la retención los borra", async () => {
    const ok = await saveScanFailure({
      userId: null,
      reason: "empty",
      image: new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]),
      mediaType: "image/jpeg",
      fileName: "rutina.jpg",
      result: { days: [] },
    });
    expect(ok).toBe(true);
    const db = await getDb();
    const [row] = await db.select().from(scanFailures).where(eq(scanFailures.reason, "empty"));
    expect(row.storagePath).toMatch(/scan-failures.*\.jpg$/);
    const file = path.resolve(process.cwd(), row.storagePath!);
    expect(existsSync(file)).toBe(true);

    // Lo envejecemos más allá de la retención.
    await db.update(scanFailures).set({ createdAt: new Date("2000-01-01") }).where(eq(scanFailures.id, row.id));
    expect(await purgeOldScanFailures()).toBe(1);
    expect(existsSync(file)).toBe(false);
  });
});
