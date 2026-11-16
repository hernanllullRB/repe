import { describe, expect, it } from "vitest";
import { isValidImageUrl } from "../../src/lib/images";
import { doseLabel } from "../../src/lib/routines";

describe("isValidImageUrl", () => {
  it.each(["https://example.com/a.jpg", "http://x.com/b.png", "/api/uploads/press-arnold/abc.jpg"])("acepta %s", (u) =>
    expect(isValidImageUrl(u)).toBe(true),
  );
  it.each(["", "foto.jpg", "javascript:alert(1)", "ftp://x.com/a.jpg"])("rechaza %s", (u) =>
    expect(isValidImageUrl(u)).toBe(false),
  );
});

describe("doseLabel", () => {
  it("arma series × repeticiones", () => expect(doseLabel({ sets: "4", reps: "10-12" })).toBe("4 × 10-12"));
  it("solo series", () => expect(doseLabel({ sets: "3" })).toBe("3 series"));
  it("solo repeticiones", () => expect(doseLabel({ reps: "15" })).toBe("15 rep."));
  it("nada", () => expect(doseLabel({})).toBeNull());
});

describe("suggestRoutine", async () => {
  const { suggestRoutine } = await import("../../src/lib/routines");
  const item = (slug: string) => ({ slug, name: slug, image: null });
  const r = (id: string, extra: Partial<import("../../src/lib/routines").Routine> = {}) => ({
    id,
    name: id,
    items: [item("a"), item("b")],
    done: [] as string[],
    doneDay: null,
    updatedAt: 1,
    ...extra,
  });

  it("sin nada completado sugiere la primera", () => {
    expect(suggestRoutine([r("d1"), r("d2", { updatedAt: 99 }), r("d3")])).toMatchObject({ routine: { id: "d1" }, reason: "first" });
  });
  it("sugiere la siguiente a la última completada", () => {
    const list = [r("d1", { lastCompletedAt: 100 }), r("d2", { lastCompletedAt: 200 }), r("d3")];
    expect(suggestRoutine(list)).toMatchObject({ routine: { id: "d3" }, reason: "next" });
  });
  it("después de la última vuelve a la primera", () => {
    const list = [r("d1", { lastCompletedAt: 100 }), r("d2"), r("d3", { lastCompletedAt: 300 })];
    expect(suggestRoutine(list)).toMatchObject({ routine: { id: "d1" }, reason: "next" });
  });
  it("una a medias tiene prioridad", () => {
    const list = [r("d1", { lastCompletedAt: 100 }), r("d2"), r("d3", { done: ["a"] })];
    expect(suggestRoutine(list)).toMatchObject({ routine: { id: "d3" }, reason: "in-progress" });
  });
  it("ignora las rutinas vacías", () => {
    expect(suggestRoutine([r("vacia", { items: [] }), r("d1")])?.routine.id).toBe("d1");
    expect(suggestRoutine([r("vacia", { items: [] })])).toBeNull();
  });
});
