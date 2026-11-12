import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// YouTube y la IA se reemplazan: los tests nunca consumen cuota.
vi.mock("../../src/lib/youtube", async (orig) => {
  const real = await orig<typeof import("../../src/lib/youtube")>();
  return {
    ...real,
    youtubeConfigured: () => true,
    findDemoVideo: vi.fn(async () => ({ videoId: "abcdefghijk", title: "Video de prueba", channel: "Canal" })),
  };
});
vi.mock("../../src/lib/ai", async (orig) => {
  const real = await orig<typeof import("../../src/lib/ai")>();
  return { ...real, generateExerciseContent: vi.fn(real.generateExerciseContent) };
});

import { getDb } from "../../src/db/client";
import { exercises, usageCounters } from "../../src/db/schema";
import { generateExerciseContent } from "../../src/lib/ai";
import { ensureEnriched } from "../../src/lib/enrich";
import { findDemoVideo as searchVideo } from "../../src/lib/youtube";

async function insert(slug: string, extra: Partial<typeof exercises.$inferInsert> = {}) {
  const db = await getDb();
  const [row] = await db
    .insert(exercises)
    .values({ slug, source: "test", nameEs: slug, nameEn: slug, ...extra })
    .returning();
  return row;
}

beforeAll(async () => {
  const db = await getDb();
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  await migrate(db as never, { migrationsFolder: "./drizzle" });
});

beforeEach(async () => {
  vi.clearAllMocks();
  const db = await getDb();
  await db.delete(usageCounters);
});

describe("ensureEnriched", () => {
  it("genera la ficha una sola vez y la guarda", async () => {
    const ex = await insert("press-test");
    const first = await ensureEnriched(ex);
    expect(first.outcome).toBe("ready");
    expect(first.exercise.content?.steps.length).toBeGreaterThan(0);
    expect(first.exercise.youtubeVideoId).toBe("abcdefghijk");
    expect(first.exercise.youtubeSource).toBe("search");

    const second = await ensureEnriched(first.exercise);
    expect(second.outcome).toBe("ready");
    expect(generateExerciseContent).toHaveBeenCalledTimes(1);
    expect(searchVideo).toHaveBeenCalledTimes(1);
  });

  it("un video manual nunca dispara la búsqueda", async () => {
    const ex = await insert("manual-test", { youtubeVideoId: "zzzzzzzzzzz", youtubeSource: "manual" });
    const { exercise } = await ensureEnriched(ex);
    expect(searchVideo).not.toHaveBeenCalled();
    expect(exercise.youtubeVideoId).toBe("zzzzzzzzzzz");
    expect(exercise.youtubeSource).toBe("manual");
  });

  it("con la cuota de YouTube agotada no busca y deja la ficha sin video", async () => {
    const db = await getDb();
    await db.insert(usageCounters).values({ day: new Date().toISOString().slice(0, 10), key: "youtube", count: 999 });
    const ex = await insert("cuota-test");
    const { exercise } = await ensureEnriched(ex);
    expect(searchVideo).not.toHaveBeenCalled();
    expect(exercise.youtubeVideoId).toBeNull();
  });

  it("si la IA falla queda en failed y se puede reintentar", async () => {
    vi.mocked(generateExerciseContent).mockRejectedValueOnce(new Error("caída"));
    const ex = await insert("falla-test");
    const failed = await ensureEnriched(ex);
    expect(failed.outcome).toBe("failed");
    expect(failed.exercise.contentStatus).toBe("failed");

    const retried = await ensureEnriched(failed.exercise);
    expect(retried.outcome).toBe("ready");
    const db = await getDb();
    const [row] = await db.select().from(exercises).where(eq(exercises.id, ex.id));
    expect(row.contentStatus).toBe("ready");
  });
});
