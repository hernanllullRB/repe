import { describe, expect, it } from "vitest";
import { profileFromIdToken, safeNext } from "../../src/lib/auth";
import type { SearchEntry } from "../../src/lib/exercises";
import { createMatcher } from "../../src/lib/routine-match";
import { routineBodySchema } from "../../src/lib/schemas";

const entries: SearchEntry[] = [
  { slug: "sentadilla-con-barra", nameEs: "Sentadilla con barra", nameEn: "Barbell Squat", aliases: ["sentadilla"], muscles: ["quadriceps"] },
  { slug: "extension-de-cuadriceps", nameEs: "Extensión de cuádriceps", nameEn: "Leg Extensions", aliases: ["sillón de cuádriceps"], muscles: ["quadriceps"] },
  { slug: "elevacion-de-talones-de-pie", nameEs: "Elevación de talones de pie", nameEn: "Standing Calf Raises", aliases: [], muscles: ["calves"] },
  { slug: "abductores-en-maquina", nameEs: "Abductores en máquina", nameEn: "Thigh Abductor", aliases: [], muscles: ["abductors"] },
  { slug: "aductores-en-maquina", nameEs: "Aductores en máquina", nameEn: "Thigh Adductor", aliases: [], muscles: ["adductors"] },
  { slug: "abdominales-crunch", nameEs: "Abdominales (crunch)", nameEn: "Crunches", aliases: ["abdominales cortos"], muscles: ["abdominals"] },
];

describe("createMatcher", () => {
  const match = createMatcher(entries);

  it("encuentra por alias exacto lo que estaba escrito", () => {
    const r = match({ name: "sillón de cuádriceps", nameEs: "Extensión de cuádriceps", nameEn: "Leg Extensions" });
    expect(r.best?.slug).toBe("extension-de-cuadriceps");
    expect(r.confident).toBe(true);
  });

  it("usa el nombre en inglés cuando el español no coincide", () => {
    const r = match({ name: "Gemelos en maquina parado", nameEs: "Gemelos de pie en máquina", nameEn: "Standing Calf Raises" });
    expect(r.best?.slug).toBe("elevacion-de-talones-de-pie");
  });

  it("distingue aductores de abductores", () => {
    const r = match({ name: "Aductores en maquina", nameEs: "Aductores en máquina", nameEn: "Thigh Adductor" });
    expect(r.best?.slug).toBe("aductores-en-maquina");
  });

  it("sin nada parecido devuelve null", () => {
    const r = match({ name: "zzz", nameEs: "qwerty", nameEn: "xyzzy plugh" });
    expect(r.best).toBeNull();
    expect(r.candidates).toEqual([]);
  });
});

function token(claims: Record<string, unknown>): string {
  const b = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b({ alg: "RS256" })}.${b(claims)}.firma`;
}

describe("profileFromIdToken", () => {
  const base = { iss: "https://accounts.google.com", aud: "cliente", sub: "123", email: "a@b.com", email_verified: true, exp: 2_000_000_000 };

  it("acepta un token válido", () => {
    expect(profileFromIdToken(token(base), "cliente", 1_000_000_000_000)).toMatchObject({ sub: "123", email: "a@b.com" });
  });
  it("rechaza otra audiencia", () => {
    expect(() => profileFromIdToken(token(base), "otro", 1_000_000_000_000)).toThrow();
  });
  it("rechaza un token vencido", () => {
    expect(() => profileFromIdToken(token({ ...base, exp: 1 }), "cliente", 1_000_000_000_000)).toThrow();
  });
});

describe("safeNext", () => {
  it.each([
    ["/rutinas/abc", "/rutinas/abc"],
    ["//evil.com", "/rutinas"],
    ["https://evil.com", "/rutinas"],
    [null, "/rutinas"],
  ])("%s -> %s", (input, out) => expect(safeNext(input)).toBe(out));
});

describe("routineBodySchema", () => {
  it("valida una rutina", () => {
    const ok = routineBodySchema.safeParse({
      name: "Día 3",
      items: [{ slug: "sentadilla-con-barra", name: "Sentadilla", image: null, sets: "5", reps: "15-10" }],
      done: [],
      doneDay: null,
    });
    expect(ok.success).toBe(true);
  });
  it("rechaza fechas mal formadas", () => {
    expect(routineBodySchema.safeParse({ name: "x", items: [], done: [], doneDay: "ayer" }).success).toBe(false);
  });
});

describe("groupScanByDay", () => {
  it("agrupa la lista plana por día en orden", async () => {
    const { groupScanByDay } = await import("../../src/lib/schemas");
    const ex = (day: string, name: string) => ({ day, name, nameEs: name, nameEn: name, sets: "4", reps: "10", notes: "" });
    const r = groupScanByDay({ exercises: [ex("(sin título)", "a"), ex("Día 3", "b"), ex("Día 3", "c"), ex("Día 4", "d")] });
    expect(r.days.map((d) => [d.label, d.exercises.map((e) => e.name)])).toEqual([
      ["(sin título)", ["a"]],
      ["Día 3", ["b", "c"]],
      ["Día 4", ["d"]],
    ]);
  });
});

describe("pickAlternatives", () => {
  it("se queda con hasta 3 coincidencias seguras, sin el propio ejercicio ni repetidos", async () => {
    const { pickAlternatives } = await import("../../src/lib/alternatives");
    const match = createMatcher(entries);
    const picked = pickAlternatives(match, "sentadilla-con-barra", [
      { nameEs: "Sentadilla con barra", nameEn: "Barbell Squat" }, // el mismo: se descarta
      { nameEs: "Extensión de cuádriceps", nameEn: "Leg Extensions" },
      { nameEs: "Extensión de cuádriceps", nameEn: "Leg Extensions" }, // repetido
      { nameEs: "Ejercicio inventado", nameEn: "Xyzzy Plugh" }, // no existe
      { nameEs: "Aductores en máquina", nameEn: "Thigh Adductor" },
      { nameEs: "Abdominales cortos", nameEn: "Crunches" },
      { nameEs: "Elevación de talones de pie", nameEn: "Standing Calf Raises" }, // ya hay 3
    ]);
    expect(picked).toEqual(["extension-de-cuadriceps", "aductores-en-maquina", "abdominales-crunch"]);
  });
});
