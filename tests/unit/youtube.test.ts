import { describe, expect, it } from "vitest";
import { parseYouTubeId } from "../../src/lib/youtube";

describe("parseYouTubeId", () => {
  const id = "dQw4w9WgXcQ";
  it.each([
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=30s`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://m.youtube.com/watch?v=${id}`,
    `youtube.com/watch?v=${id}`,
  ])("acepta %s", (input) => {
    expect(parseYouTubeId(input)).toBe(id);
  });
  it.each(["", "hola", "https://vimeo.com/123", "https://www.youtube.com/watch?v=corto"])("rechaza %s", (input) => {
    expect(parseYouTubeId(input)).toBeNull();
  });
});

import { parseDuration, pickDemo, type VideoCandidate } from "../../src/lib/youtube";

describe("parseDuration", () => {
  it.each([
    ["PT45S", 45],
    ["PT1M5S", 65],
    ["PT7M2S", 422],
    ["PT1H", 3600],
    ["P0D", 0],
  ])("%s = %i s", (iso, s) => expect(parseDuration(iso)).toBe(s));
  it("devuelve null si no entiende el formato", () => expect(parseDuration("raro")).toBeNull());
});

describe("pickDemo", () => {
  const v = (id: string, seconds: number | null, embeddable = true): VideoCandidate => ({
    videoId: id, title: id, channel: "c", seconds, embeddable,
  });
  it("elige el primero entre 8 y 90 segundos, respetando la relevancia", () => {
    expect(pickDemo([v("largo", 420), v("demo1", 40), v("demo2", 20)])?.videoId).toBe("demo1");
  });
  it("descarta los que no se pueden insertar y los demasiado cortos", () => {
    expect(pickDemo([v("noembed", 30, false), v("corto", 3), v("ok", 60)])?.videoId).toBe("ok");
  });
  it("si no hay demo ideal, toma el más corto de hasta 4 minutos", () => {
    expect(pickDemo([v("a", 200), v("b", 120), v("c", 600)])?.videoId).toBe("b");
  });
  it("si todos son largos, no elige ninguno", () => {
    expect(pickDemo([v("a", 420), v("b", 900)])).toBeNull();
  });
});
