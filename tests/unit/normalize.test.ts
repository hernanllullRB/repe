import { describe, expect, it } from "vitest";
import { normalize, slugify } from "../../src/lib/normalize";

describe("normalize", () => {
  it("saca acentos, signos y mayúsculas", () => {
    expect(normalize("  Sentadilla   Búlgara! ")).toBe("sentadilla bulgara");
    expect(normalize("Curl de BÍCEPS")).toBe("curl de biceps");
  });
  it("arma slugs en kebab-case", () => {
    expect(slugify("Press Arnold")).toBe("press-arnold");
    expect(slugify("Extensión de cuádriceps")).toBe("extension-de-cuadriceps");
    expect(slugify("Peso muerto / rumano")).toBe("peso-muerto-rumano");
  });
});
