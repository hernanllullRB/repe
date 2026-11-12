import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { SearchEntry } from "../../src/lib/exercises";
import { slugify } from "../../src/lib/normalize";
import { buildSearch } from "../../src/lib/search";

// Índice de prueba armado con las correcciones reales de data/overrides.json,
// más ejercicios sin traducir que compiten en las búsquedas.
const overrides = JSON.parse(readFileSync("data/overrides.json", "utf8")) as Record<
  string,
  { nameEs?: string; aliases?: string[] }
>;
const entries: SearchEntry[] = Object.entries(overrides)
  .filter(([k, v]) => !k.startsWith("$") && v.nameEs)
  .map(([k, v]) => ({
    slug: slugify(v.nameEs!),
    nameEs: v.nameEs!,
    nameEn: k.replace(/_/g, " "),
    aliases: v.aliases ?? [],
    muscles: [],
    reviewed: true,
  }));
entries.push(
  { slug: "one-arm-floor-press", nameEs: "One Arm Floor Press", nameEn: "One Arm Floor Press", aliases: [], muscles: ["Tríceps"] },
  { slug: "bulgarian-split-squat", nameEs: "Sentadilla búlgara", nameEn: "Split Squat", aliases: ["bulgarian split squat"], muscles: [] },
  { slug: "sentadilla-zercher", nameEs: "Sentadilla zercher", nameEn: "Zercher Squat", aliases: [], muscles: [] },
  { slug: "barbell-curls-lying", nameEs: "Barbell Curls Lying Against An Incline", nameEn: "x", aliases: [], muscles: [] },
);
const search = buildSearch(entries);
const first = (q: string) => search(q)[0]?.slug;

describe("búsqueda", () => {
  it.each([
    ["press arnold", "press-arnold"],
    ["arnold press", "press-arnold"],
    ["pres arnol", "press-arnold"],
    ["press arn", "press-arnold"],
    ["sentadila", "sentadilla-con-barra"],
    ["sentadilla bulgara", "bulgarian-split-squat"],
    ["dominadas", "dominadas"],
    ["pull up", "dominadas"],
    ["peso muerto", "peso-muerto"],
    ["deadlift", "peso-muerto"],
    ["press banca", "press-de-banca"],
    ["vuelos laterales", "elevaciones-laterales"],
  ])("«%s» → %s", (q, slug) => {
    expect(first(q)).toBe(slug);
  });

  it("«curl bi» trae primero un curl de bíceps", () => {
    expect(first("curl bi")).toMatch(/^curl-de-biceps/);
  });

  it("no devuelve nada para una consulta vacía", () => {
    expect(search("   ")).toEqual([]);
  });
});
