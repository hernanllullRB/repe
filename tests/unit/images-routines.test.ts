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
